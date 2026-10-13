import { Body, Controller, ForbiddenException, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/auth.types.js';
import { Roles } from '../common/roles.decorator.js';
import {
  RequestApplicationHelpDto,
  StartOpportunityApplicationDto,
  UpdateStudentApplicationDto,
} from './opportunities.dto.js';
import { OpportunitiesService } from './opportunities.service.js';

@ApiTags('applications')
@ApiBearerAuth()
@Roles('STUDENT')
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly opportunities: OpportunitiesService) {}

  @Post()
  @ApiOperation({ summary: 'Start or resume one application for a matched opportunity' })
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartOpportunityApplicationDto,
  ): Promise<Record<string, unknown>> {
    if (!user.studentId) throw new ForbiddenException();
    return this.opportunities.startApplication(user.studentId, dto);
  }

  @Get('student/:studentId')
  @ApiOperation({ summary: 'List the signed-in student’s tracked applications' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
  ): Promise<Record<string, unknown>[]> {
    if (!user.studentId || user.studentId !== studentId) throw new ForbiddenException();
    return this.opportunities.listApplications(studentId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Mark a student application in progress or submitted' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStudentApplicationDto,
  ): Promise<Record<string, unknown>> {
    if (!user.studentId) throw new ForbiddenException();
    return this.opportunities.updateStudentApplication(user.studentId, id, dto);
  }

  @Post(':id/help')
  @ApiOperation({ summary: 'Request facilitator support with an application' })
  requestHelp(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RequestApplicationHelpDto,
  ): Promise<{ id: string; helpRequestedAt: Date }> {
    if (!user.studentId) throw new ForbiddenException();
    return this.opportunities.requestHelp(user.studentId, id, dto);
  }
}
