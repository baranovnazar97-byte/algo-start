import './config/load-env';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { GamesModule } from './games/games.module';
import { HealthController } from './health.controller';
import { ProgressModule } from './progress/progress.module';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  return 'local-development-secret-change-me';
}

function getJwtExpiresIn(): StringValue | number {
  return (process.env.JWT_EXPIRES_IN ?? '7d') as StringValue;
}

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      global: true,
      secret: getJwtSecret(),
      signOptions: { expiresIn: getJwtExpiresIn() },
    }),
    AuthModule,
    GamesModule,
    ProgressModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
