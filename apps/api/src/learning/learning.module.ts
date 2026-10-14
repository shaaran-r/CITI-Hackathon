import { Module } from '@nestjs/common';
import {
  FacilitatorLearningController,
  LearningAdviceController,
  LearningCatalogController,
} from './learning.controller.js';
import { LearningAdviceService } from './learning-advice.service.js';
import { LearningService } from './learning.service.js';

@Module({
  controllers: [LearningCatalogController, FacilitatorLearningController, LearningAdviceController],
  providers: [LearningService, LearningAdviceService],
})
export class LearningModule {}
