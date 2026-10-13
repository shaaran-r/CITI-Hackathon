import { Body, Controller, ForbiddenException, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/auth.types.js';
import { Roles } from '../common/roles.decorator.js';
import { BookmarkOpportunityDto } from './opportunities.dto.js';
import { OpportunitiesService } from './opportunities.service.js';

@ApiTags('opportunities')
@ApiBearerAuth()
@Roles('STUDENT')
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunities: OpportunitiesService) {}

  @Get('matched/:studentId')
  @ApiOperation({
    summary: 'Get eligible opportunities ranked using profile and verified wallet evidence',
  })
  matched(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
  ): Promise<Record<string, unknown>[]> {
    if (!user.studentId || user.studentId !== studentId) throw new ForbiddenException();
    return this.opportunities.list(studentId, true);
  }

  @Get()
  @ApiOperation({ summary: 'List published opportunities with eligibility and fit explanations' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<Record<string, unknown>[]> {
    if (!user.studentId) throw new ForbiddenException();
    return this.opportunities.list(user.studentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get opportunity details and the signed-in student’s fit' })
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Record<string, unknown>> {
    if (!user.studentId) throw new ForbiddenException();
    return this.opportunities.detail(user.studentId, id);
  }

  @Post('bookmark')
  @ApiOperation({ summary: 'Save or remove a published opportunity from the student’s list' })
  bookmark(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BookmarkOpportunityDto,
  ): Promise<{ opportunityId: string; savedAt: Date | null }> {
    if (!user.studentId) throw new ForbiddenException();
    return this.opportunities.bookmark(user.studentId, dto);
  }
}
