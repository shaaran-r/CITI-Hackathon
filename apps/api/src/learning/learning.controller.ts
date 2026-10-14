import { Body, Controller, ForbiddenException, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/auth.types.js';
import { Public } from '../common/public.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import { CreateLearningModuleDto } from './learning.dto.js';
import { LearningAdviceService } from './learning-advice.service.js';
import { LearningService } from './learning.service.js';

@ApiTags('learning')
@Controller('learning/modules')
export class LearningCatalogController {
  constructor(private readonly learning: LearningService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published facilitator learning modules' })
  list(): Promise<Record<string, unknown>[]> {
    return this.learning.listPublished();
  }
}

@ApiTags('facilitator learning')
@ApiBearerAuth()
@Roles('FACILITATOR')
@Controller('facilitator/modules')
export class FacilitatorLearningController {
  constructor(private readonly learning: LearningService) {}

  @Get()
  @ApiOperation({ summary: 'List modules owned by the signed-in facilitator' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<Record<string, unknown>[]> {
    if (!user.facilitatorId) throw new ForbiddenException();
    return this.learning.listForFacilitator(user.facilitatorId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a draft learning module and choose its pricing model' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLearningModuleDto,
  ): Promise<Record<string, unknown>> {
    if (!user.facilitatorId) throw new ForbiddenException();
    return this.learning.create(user.facilitatorId, dto);
  }

  @Patch(':moduleId/publish')
  @ApiOperation({ summary: 'Publish one of the facilitator’s own modules' })
  publish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('moduleId') moduleId: string,
  ): Promise<Record<string, unknown>> {
    if (!user.facilitatorId) throw new ForbiddenException();
    return this.learning.publish(user.facilitatorId, moduleId);
  }
}

@ApiTags('learning advice')
@ApiBearerAuth()
@Roles('STUDENT')
@Controller('learning')
export class LearningAdviceController {
  constructor(private readonly advice: LearningAdviceService) {}

  @Get('advice/:studentId')
  @ApiOperation({ summary: 'Get source-grounded study guidance for the signed-in student' })
  forStudent(@CurrentUser() user: AuthenticatedUser, @Param('studentId') studentId: string) {
    if (user.studentId !== studentId) throw new ForbiddenException();
    return this.advice.forStudent(studentId);
  }
}
