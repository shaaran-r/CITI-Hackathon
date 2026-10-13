import { Body, Controller, ForbiddenException, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/auth.types.js';
import { Roles } from '../common/roles.decorator.js';
import { RecommendOpportunityDto, UpdateFacilitatorApplicationDto } from './opportunities.dto.js';
import { OpportunitiesService } from './opportunities.service.js';

@ApiTags('facilitator-opportunities')
@ApiBearerAuth()
@Roles('FACILITATOR')
@Controller('facilitator')
export class FacilitatorOpportunitiesController {
  constructor(private readonly opportunities: OpportunitiesService) {}

  @Post('opportunities/recommend')
  @ApiOperation({
    summary: 'Recommend an opportunity to an assigned student with a facilitator note',
  })
  recommend(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RecommendOpportunityDto,
  ): Promise<Record<string, unknown>> {
    if (!user.facilitatorId) throw new ForbiddenException();
    return this.opportunities.recommendByFacilitator(user.facilitatorId, user.sub, dto);
  }

  @Get('students/:studentId/opportunities')
  @ApiOperation({
    summary: 'Review an assigned student’s matched and facilitator-recommended opportunities',
  })
  studentOpportunities(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
  ): Promise<Record<string, unknown>[]> {
    if (!user.facilitatorId) throw new ForbiddenException();
    return this.opportunities.getFacilitatorStudentOpportunities(user.facilitatorId, studentId);
  }

  @Get('applications')
  @ApiOperation({ summary: 'List submitted or help-requested applications from assigned students' })
  applicationQueue(@CurrentUser() user: AuthenticatedUser): Promise<Record<string, unknown>[]> {
    if (!user.facilitatorId) throw new ForbiddenException();
    return this.opportunities.getFacilitatorApplicationQueue(user.facilitatorId);
  }

  @Patch('applications/:id/status')
  @ApiOperation({ summary: 'Update an in-scope application and leave a facilitator note' })
  updateApplication(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateFacilitatorApplicationDto,
  ): Promise<Record<string, unknown>> {
    if (!user.facilitatorId) throw new ForbiddenException();
    return this.opportunities.updateApplicationByFacilitator(user.facilitatorId, user.sub, id, dto);
  }
}
