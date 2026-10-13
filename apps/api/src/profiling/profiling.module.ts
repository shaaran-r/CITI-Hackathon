import { Module } from '@nestjs/common';
import { ProfilingController } from './profiling.controller.js';
import { ProfilingService } from './profiling.service.js';

@Module({
  controllers: [ProfilingController],
  providers: [ProfilingService],
  exports: [ProfilingService],
})
export class ProfilingModule {}
