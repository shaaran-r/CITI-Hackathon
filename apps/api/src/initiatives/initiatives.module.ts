import { Module } from '@nestjs/common';
import { InitiativesController } from './initiatives.controller.js';
import { InitiativesService } from './initiatives.service.js';

@Module({
  controllers: [InitiativesController],
  providers: [InitiativesService],
})
export class InitiativesModule {}
