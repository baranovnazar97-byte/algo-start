import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { GAME_SEEDS } from '../games/game-seeds';

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;

  constructor() {
    const sslEnabled = process.env.DB_SSL === 'true';
    const commonConfig = {
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
    };

    this.pool = process.env.DATABASE_URL
      ? new Pool({ connectionString: process.env.DATABASE_URL, ...commonConfig })
      : new Pool({
          host: process.env.DB_HOST ?? 'localhost',
          port: Number(process.env.DB_PORT ?? 5432),
          database: process.env.DB_NAME ?? 'algorithmika',
          user: process.env.DB_USER ?? 'postgres',
          password: process.env.DB_PASSWORD ?? 'root',
          ...commonConfig,
        });
  }

  async onModuleInit(): Promise<void> {
    const attempts = 10;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        await this.pool.query('SELECT 1');
        await this.createSchema();
        await this.seedGames();
        this.logger.log('PostgreSQL connection and schema are ready');
        return;
      } catch (error) {
        if (attempt === attempts) throw error;
        this.logger.warn(`PostgreSQL is not ready (${attempt}/${attempts}), retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }

  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values: unknown[] = [],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, values);
  }

  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async createSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        email VARCHAR(254) NOT NULL,
        password_hash VARCHAR(60) NOT NULL,
        total_score INTEGER NOT NULL DEFAULT 0 CHECK (total_score >= 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
        ON users (LOWER(email));

      CREATE TABLE IF NOT EXISTS games (
        code VARCHAR(32) PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        short_title VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        icon VARCHAR(16) NOT NULL,
        color VARCHAR(16) NOT NULL,
        order_no SMALLINT NOT NULL UNIQUE CHECK (order_no > 0)
      );

      CREATE TABLE IF NOT EXISTS levels (
        id BIGSERIAL PRIMARY KEY,
        game_code VARCHAR(32) NOT NULL REFERENCES games(code) ON DELETE CASCADE,
        level_no SMALLINT NOT NULL CHECK (level_no > 0),
        title VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        max_score INTEGER NOT NULL DEFAULT 100 CHECK (max_score > 0),
        content JSONB NOT NULL DEFAULT '{}'::jsonb,
        UNIQUE (game_code, level_no)
      );

      CREATE TABLE IF NOT EXISTS user_progress (
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        level_id BIGINT NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
        best_score INTEGER NOT NULL CHECK (best_score >= 0),
        completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, level_id)
      );

      CREATE TABLE IF NOT EXISTS attempts (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        level_id BIGINT NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
        score INTEGER NOT NULL CHECK (score >= 0),
        attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS attempts_user_time_idx
        ON attempts (user_id, attempted_at DESC);
    `);
  }

  private async seedGames(): Promise<void> {
    await this.transaction(async (client) => {
      for (const game of GAME_SEEDS) {
        await client.query(
          `INSERT INTO games (code, title, short_title, description, icon, color, order_no)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (code) DO UPDATE SET
             title = EXCLUDED.title,
             short_title = EXCLUDED.short_title,
             description = EXCLUDED.description,
             icon = EXCLUDED.icon,
             color = EXCLUDED.color,
             order_no = EXCLUDED.order_no`,
          [
            game.code,
            game.title,
            game.shortTitle,
            game.description,
            game.icon,
            game.color,
            game.order,
          ],
        );

        for (const level of game.levels) {
          await client.query(
            `INSERT INTO levels
               (game_code, level_no, title, description, max_score, content)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb)
             ON CONFLICT (game_code, level_no) DO UPDATE SET
               title = EXCLUDED.title,
               description = EXCLUDED.description,
               max_score = EXCLUDED.max_score,
               content = EXCLUDED.content`,
            [
              game.code,
              level.level,
              level.title,
              level.description,
              level.maxScore,
              JSON.stringify(level.content),
            ],
          );
        }
      }
    });
  }
}
