import { Module } from '@nestjs/common';
import { FacilitatorMissionsController } from './facilitator-missions.controller.js';
import { MissionsController } from './missions.controller.js';
import { MissionsService } from './missions.service.js';

@Module({
  controllers: [MissionsController, FacilitatorMissionsController],
  providers: [MissionsService],
})
export class MissionsModule {}
