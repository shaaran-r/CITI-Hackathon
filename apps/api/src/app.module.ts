import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module.js';
import { accessTokenSecret } from './common/auth-secrets.js';
import { JwtAuthGuard } from './common/jwt-auth.guard.js';
import { RolesGuard } from './common/roles.guard.js';
import { DatabaseModule } from './database.module.js';
import { HealthController } from './health.controller.js';
import { InitiativesModule } from './initiatives/initiatives.module.js';
import { LearningModule } from './learning/learning.module.js';
import { MissionsModule } from './missions/missions.module.js';
import { OpportunitiesModule } from './opportunities/opportunities.module.js';
import { ParentModule } from './parent/parent.module.js';
import { PartnersModule } from './partners/partners.module.js';
import { PathwaysModule } from './pathways/pathways.module.js';
import { ProfilingModule } from './profiling/profiling.module.js';
import { StudentsModule } from './students/students.module.js';
import { WalletModule } from './wallet/wallet.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: resolve(process.cwd(), '../../.env') }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    JwtModule.register({ global: true, secret: accessTokenSecret }),
    DatabaseModule,
    AuthModule,
    StudentsModule,
    ProfilingModule,
    InitiativesModule,
    LearningModule,
    PartnersModule,
    PathwaysModule,
    MissionsModule,
    OpportunitiesModule,
    WalletModule,
    ParentModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
