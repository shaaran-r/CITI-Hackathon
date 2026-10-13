import { Controller, ForbiddenException, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/auth.types.js';
import { Roles } from '../common/roles.decorator.js';
import { ParentService } from './parent.service.js';

@ApiTags('parent-trust')
@ApiBearerAuth()
@Roles('PARENT')
@Controller('parent')
export class ParentController {
  constructor(private readonly parent: ParentService) {}

  @Get('children')
  @ApiOperation({ summary: 'List children explicitly linked to the signed-in parent' })
  children(@CurrentUser() user: AuthenticatedUser): Promise<Record<string, unknown>[]> {
    if (!user.parentId) throw new ForbiddenException();
    return this.parent.listChildren(user.parentId);
  }

  @Get('children/:studentId/summary')
  @ApiOperation({
    summary: 'Get a linked child’s pathway, verified skills, and opportunity summary',
  })
  summary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
  ): Promise<Record<string, unknown>> {
    if (!user.parentId) throw new ForbiddenException();
    return this.parent.getSummary(user.parentId, studentId);
  }

  @Get('children/:studentId/timeline')
  @ApiOperation({ summary: 'Get the linked child’s Door-Opener timeline and who helped' })
  timeline(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
  ): Promise<Record<string, unknown>[]> {
    if (!user.parentId) throw new ForbiddenException();
    return this.parent.getTimeline(user.parentId, studentId);
  }
}
