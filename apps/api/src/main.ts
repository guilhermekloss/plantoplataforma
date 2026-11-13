import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Env } from './config/env.schema';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService<Env, true>);

  // CORS: lista explícita de origens (nunca "*").
  const origins = config
    .get('CORS_ORIGINS', { infer: true })
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });

  app.setGlobalPrefix('api');
  // Validação de input é feita por ZodValidationPipe em cada endpoint.
  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(`Plantor API rodando em http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
