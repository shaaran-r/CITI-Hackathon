import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { resolveOtpProvider } from './auth/otp-provider.js';

function validateProductionConfiguration(): void {
  if (process.env.NODE_ENV !== 'production') return;
  resolveOtpProvider(process.env);
  if (!process.env.CORS_ORIGINS?.trim() && !process.env.WEB_BASE_URL?.trim()) {
    throw new Error('Set CORS_ORIGINS or WEB_BASE_URL in production');
  }
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS);
  if (!Number.isSafeInteger(trustProxyHops) || trustProxyHops < 1) {
    throw new Error('Set TRUST_PROXY_HOPS to the number of trusted reverse proxies');
  }
}

async function bootstrap(): Promise<void> {
  validateProductionConfiguration();
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
  if (!Number.isSafeInteger(trustProxyHops) || trustProxyHops < 0) {
    throw new Error('TRUST_PROXY_HOPS must be a non-negative integer');
  }
  const app = await NestFactory.create(AppModule);
  if (trustProxyHops > 0) {
    app.getHttpAdapter().getInstance().set('trust proxy', trustProxyHops);
  }
  const configuredOrigins = (process.env.CORS_ORIGINS ?? process.env.WEB_BASE_URL ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origins =
    process.env.NODE_ENV === 'production'
      ? configuredOrigins
      : [...new Set([...configuredOrigins, 'http://localhost:3000', 'http://localhost:8081'])];
  app.enableCors({ origin: origins });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('KaushalSetu API')
      .setDescription('Student onboarding and explainable pathway recommendations.')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));
  }

  await app.listen(Number(process.env.PORT ?? 3001), '0.0.0.0');
}

void bootstrap();
