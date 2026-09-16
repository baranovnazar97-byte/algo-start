import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { GAME_CODES, GameCode } from './game-seeds';

interface GameRow {
  code: GameCode;
  title: string;
  short_title: string;
  description: string;
  icon: string;
  color: string;
  order_no: number;
}

interface LevelRow {
  level: number;
  title: string;
  description: string;
  max_score: number;
  content: Record<string, unknown>;
}

@Injectable()
export class GamesService {
  constructor(private readonly database: DatabaseService) {}

  async findAll() {
    const result = await this.database.query<GameRow>(
      `SELECT code, title, short_title, description, icon, color, order_no
       FROM games
       ORDER BY order_no`,
    );

    return {
      games: result.rows.map((row) => ({
        code: row.code,
        title: row.title,
        shortTitle: row.short_title,
        description: row.description,
        icon: row.icon,
        color: row.color,
        order: Number(row.order_no),
        path: `/games/${row.code}/1`,
      })),
    };
  }

  async findOne(code: string) {
    if (!GAME_CODES.includes(code as GameCode)) {
      throw new NotFoundException('Игра не найдена');
    }

    const gameResult = await this.database.query<GameRow>(
      `SELECT code, title, short_title, description, icon, color, order_no
       FROM games
       WHERE code = $1`,
      [code],
    );
    const game = gameResult.rows[0];
    if (!game) throw new NotFoundException('Игра не найдена');

    const levelsResult = await this.database.query<LevelRow>(
      `SELECT level_no AS level, title, description, max_score, content
       FROM levels
       WHERE game_code = $1
       ORDER BY level_no`,
      [code],
    );

    return {
      code: game.code,
      title: game.title,
      shortTitle: game.short_title,
      description: game.description,
      icon: game.icon,
      color: game.color,
      order: Number(game.order_no),
      levels: levelsResult.rows.map((level) => ({
        level: Number(level.level),
        title: level.title,
        description: level.description,
        maxScore: Number(level.max_score),
        content: level.content,
      })),
    };
  }
}
