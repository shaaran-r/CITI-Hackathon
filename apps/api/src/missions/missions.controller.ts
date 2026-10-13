import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Patch,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/auth.types.js';
import { Roles } from '../common/roles.decorator.js';
import {
  AssignMissionDto,
  ReviewMissionSubmissionDto,
  SubmitMissionEvidenceDto,
} from './missions.dto.js';
import { MissionsService } from './missions.service.js';

@ApiTags('missions')
@ApiBearerAuth()
@Controller('missions')
export class MissionsController {
  constructor(private readonly missions: MissionsService) {}

  @Get('assigned/:studentId')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'List the signed-in student’s assigned missions and submission states' })
  listAssigned(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
  ): Promise<Record<string, unknown>[]> {
    if (!user.studentId || user.studentId !== studentId) throw new ForbiddenException();
    return this.missions.listAssigned(studentId);
  }

  @Post('assign')
  @Roles('FACILITATOR')
  @ApiOperation({ summary: 'Assign a published mission to a student in the facilitator’s group' })
  assign(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AssignMissionDto,
  ): Promise<Record<string, unknown>> {
    if (!user.facilitatorId) throw new ForbiddenException();
    return this.missions.assign(user.facilitatorId, dto);
  }

  @Post('submissions')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Submit text or checklist evidence for an assigned mission' })
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitMissionEvidenceDto,
  ): Promise<Record<string, unknown>> {
    if (!user.studentId) throw new NotFoundException();
    return this.missions.submit(user.studentId, dto);
  }

  @Get('submissions/:assignmentId')
  @Roles('FACILITATOR')
  @ApiOperation({ summary: 'List submission history for an in-scope assignment' })
  history(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string,
  ): Promise<Record<string, unknown>[]> {
    if (!user.facilitatorId) throw new ForbiddenException();
    return this.missions.getSubmissionHistory(user.facilitatorId, assignmentId);
  }

  @Patch('submissions/:id/review')
  @Roles('FACILITATOR')
  @ApiOperation({
    summary: 'Approve, reject, or request a resubmission for an in-scope submission',
  })
  review(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewMissionSubmissionDto,
  ): Promise<Record<string, unknown>> {
    if (!user.facilitatorId) throw new ForbiddenException();
    return this.missions.review(user.facilitatorId, user.sub, id, dto);
  }
}
