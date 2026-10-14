import { Module } from '@nestjs/common';
import { FacilitatorPartnerController, PartnerIntakeController } from './partners.controller.js';
import { PartnersService } from './partners.service.js';

@Module({
  controllers: [PartnerIntakeController, FacilitatorPartnerController],
  providers: [PartnersService],
})
export class PartnersModule {}
