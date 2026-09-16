import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { GAME_CODES } from '../games/game-seeds';
import { CompleteLevelDto } from './dto/complete-level.dto';

interface LevelRow {
  id: string;
  max_score: number;
  order_no: number;
}

interface ProgressRow {
  game_code: string;
  level: number;
  score: number;
  max_score: number;
  completed_at: Date;
}

@Injectable()
export class ProgressService {
  constructor(private readonly database: DatabaseService) {}

  async getProgress(userId: string) {
    const [recordsResult, userResult] = await Promise.all([
      this.database.query<ProgressRow>(
        `SELECT
           l.game_code,
           l.level_no AS level,
           up.best_score AS score,
           l.max_score,
           up.completed_at
         FROM user_progress up
         JOIN levels l ON l.id = up.level_id
         JOIN games g ON g.code = l.game_code
         WHERE up.user_id = $1
         ORDER BY g.order_no, l.level_no`,
        [userId],
      ),
      this.database.query<{ total_score: number }>(
        'SELECT total_score FROM users WHERE id = $1',
        [userId],
      ),
    ]);

    const completedLevels = recordsResult.rows.map((row) => ({
      gameCode: row.game_code,
      level: Number(row.level),
      score: Number(row.score),
      maxScore: Number(row.max_score),
      completedAt: row.completed_at,
    }));
    const completedKeys = new Set(
      completedLevels.map((record) => `${record.gameCode}:${record.level}`),
    );
    const unlockedGames = GAME_CODES.filter(
      (_code, index) => index === 0 || completedKeys.has(`${GAME_CODES[index - 1]}:3`),
    );

    return {
      totalScore: Number(userResult.rows[0]?.total_score ?? 0),
      completedCount: completedLevels.length,
      unlockedGames,
      completedLevels,
      progress: completedLevels,
    };
  }

  async complete(userId: string, dto: CompleteLevelDto) {
    await this.database.transaction(async (client) => {
      // Блокировка пользователя делает одновременное начисление очков безопасным.
      const userLock = await client.query(
        'SELECT 1 FROM users WHERE id = $1 FOR UPDATE',
        [userId],
      );
      if (userLock.rowCount === 0) throw new NotFoundException('Пользователь не найден');

      const levelResult = await client.query<LevelRow>(
        `SELECT l.id, l.max_score, g.order_no
         FROM levels l
         JOIN games g ON g.code = l.game_code
         WHERE l.game_code = $1 AND l.level_no = $2
         FOR UPDATE`,
        [dto.gameCode, dto.level],
      );
      const level = levelResult.rows[0];
      if (!level) throw new NotFoundException('Уровень не найден');

      const officialMaxScore = Number(level.max_score);
      if (dto.maxScore !== officialMaxScore || dto.score > officialMaxScore) {
        throw new BadRequestException('Некорректное количество очков');
      }
      if (dto.score < Math.ceil(officialMaxScore / 2)) {
        throw new BadRequestException('Для прохождения нужно набрать хотя бы половину очков');
      }

      await this.assertUnlocked(client, userId, dto.gameCode, dto.level, Number(level.order_no));

      await client.query(
        `INSERT INTO attempts (user_id, level_id, score)
         VALUES ($1, $2, $3)`,
        [userId, level.id, dto.score],
      );

      const previous = await client.query<{ best_score: number }>(
        `SELECT best_score
         FROM user_progress
         WHERE user_id = $1 AND level_id = $2
         FOR UPDATE`,
        [userId, level.id],
      );
      const oldBest = Number(previous.rows[0]?.best_score ?? 0);
      const newBest = Math.max(oldBest, dto.score);

      await client.query(
        `INSERT INTO user_progress (user_id, level_id, best_score, completed_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, level_id) DO UPDATE SET
           best_score = GREATEST(user_progress.best_score, EXCLUDED.best_score),
           completed_at = CASE
             WHEN EXCLUDED.best_score > user_progress.best_score THEN NOW()
             ELSE user_progress.completed_at
           END`,
        [userId, level.id, dto.score],
      );

      if (newBest > oldBest) {
        await client.query(
          `UPDATE users
           SET total_score = total_score + $1
           WHERE id = $2`,
          [newBest - oldBest, userId],
        );
      }
    });

    return this.getProgress(userId);
  }

  private async assertUnlocked(
    client: PoolClient,
    userId: string,
    gameCode: string,
    levelNumber: number,
    gameOrder: number,
  ): Promise<void> {
    if (levelNumber > 1) {
      const previousLevel = await client.query(
        `SELECT 1
         FROM user_progress up
         JOIN levels l ON l.id = up.level_id
         WHERE up.user_id = $1 AND l.game_code = $2 AND l.level_no = $3`,
        [userId, gameCode, levelNumber - 1],
      );
      if (previousLevel.rowCount === 0) {
        throw new BadRequestException('Сначала пройдите предыдущий уровень');
      }
    }

    if (gameOrder > 1) {
      const previousGame = await client.query(
        `SELECT 1
         FROM user_progress up
         JOIN levels l ON l.id = up.level_id
         JOIN games g ON g.code = l.game_code
         WHERE up.user_id = $1 AND g.order_no = $2 AND l.level_no = 3`,
        [userId, gameOrder - 1],
      );
      if (previousGame.rowCount === 0) {
        throw new BadRequestException('Эта игра пока закрыта');
      }
    }
  }
}
