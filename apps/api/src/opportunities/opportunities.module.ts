import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller.js';
import { FacilitatorOpportunitiesController } from './facilitator-opportunities.controller.js';
import { OpportunitiesController } from './opportunities.controller.js';
import { OpportunitiesService } from './opportunities.service.js';

@Module({
  controllers: [
    OpportunitiesController,
    ApplicationsController,
    FacilitatorOpportunitiesController,
  ],
  providers: [OpportunitiesService],
})
export class OpportunitiesModule {}
