import { Body, Controller, ForbiddenException, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/auth.types.js';
import { Roles } from '../common/roles.decorator.js';
import { SelectPathwayDto } from './pathways.dto.js';
import { PathwaysService } from './pathways.service.js';

@ApiTags('pathways')
@ApiBearerAuth()
@Roles('STUDENT')
@Controller()
export class PathwaysController {
  constructor(private readonly pathways: PathwaysService) {}

  @Get('pathways/recommended/:studentId')
  @ApiOperation({ summary: 'Get the signed-in student’s three ranked pathways' })
  recommended(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
  ): Promise<Record<string, unknown>[]> {
    if (user.studentId !== studentId) throw new ForbiddenException();
    return this.pathways.recommended(studentId);
  }

  @Post('student-pathways/select')
  @ApiOperation({ summary: 'Select one of the signed-in student’s recommendations' })
  select(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SelectPathwayDto,
  ): Promise<{ selectedPathwayId: string }> {
    if (!user.studentId) throw new ForbiddenException();
    return this.pathways.select(user.studentId, dto.pathwayId);
  }
}
