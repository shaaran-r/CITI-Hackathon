import { Body, Controller, Get, Param, Post, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/auth.types.js';
import { Roles } from '../common/roles.decorator.js';
import { CompleteProfileDto } from './profiling.dto.js';
import { ProfilingService } from './profiling.service.js';

@ApiTags('profiling')
@ApiBearerAuth()
@Roles('STUDENT')
@Controller('profiling')
export class ProfilingController {
  constructor(private readonly profiling: ProfilingService) {}

  @Post('complete')
  @ApiOperation({ summary: 'Save onboarding answers and generate three pathway recommendations' })
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CompleteProfileDto,
  ): Promise<Record<string, unknown>> {
    if (!user.studentId) throw new ForbiddenException();
    return this.profiling.complete(user.studentId, dto);
  }

  @Get(':studentId/result')
  @ApiOperation({ summary: 'Get the signed-in student profile and pathway recommendations' })
  result(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
  ): Promise<Record<string, unknown>> {
    if (user.studentId !== studentId) throw new ForbiddenException();
    return this.profiling.getResult(studentId);
  }
}
