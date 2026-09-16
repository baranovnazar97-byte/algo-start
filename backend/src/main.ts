import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableShutdownHooks();
  // На VPS запрос проходит через Nginx хоста и Nginx frontend-контейнера.
  // На локальном Docker-запуске остаётся один proxy hop.
  app.set('trust proxy', process.env.TRUST_PROXY_HOPS === '1' ? 1 : 2);
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 500,
      standardHeaders: true,
      legacyHeaders: false,
      message: { statusCode: 429, message: 'Слишком много запросов. Попробуйте позднее.' },
    }),
  );
  app.use(json({ limit: '100kb' }));
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 50,
      standardHeaders: true,
      legacyHeaders: false,
      message: { statusCode: 429, message: 'Слишком много попыток. Попробуйте позднее.' },
    }),
  );
  app.enableCors({
    origin: (process.env.FRONTEND_URL ?? 'http://localhost:5173')
      .split(',')
      .map((url) => url.trim()),
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
