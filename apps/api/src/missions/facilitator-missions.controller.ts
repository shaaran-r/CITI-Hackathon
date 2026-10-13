import { Controller, ForbiddenException, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/auth.types.js';
import { Roles } from '../common/roles.decorator.js';
import { MissionsService } from './missions.service.js';

@ApiTags('facilitator')
@ApiBearerAuth()
@Roles('FACILITATOR')
@Controller('facilitator')
export class FacilitatorMissionsController {
  constructor(private readonly missions: MissionsService) {}

  @Get('review-queue')
  @ApiOperation({ summary: 'List pending submissions from the facilitator’s assigned students' })
  reviewQueue(@CurrentUser() user: AuthenticatedUser): Promise<Record<string, unknown>[]> {
    if (!user.facilitatorId) throw new ForbiddenException();
    return this.missions.getReviewQueue(user.facilitatorId);
  }
}
