import { Body, Controller, ForbiddenException, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/auth.types.js';
import { Roles } from '../common/roles.decorator.js';
import { UpdateStudentDto } from './students.dto.js';
import { StudentsService } from './students.service.js';

@ApiTags('students')
@ApiBearerAuth()
@Roles('STUDENT')
@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the signed-in student profile' })
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<Record<string, unknown>> {
    if (!user.studentId) throw new ForbiddenException();
    return this.students.getById(user.studentId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the signed-in student name or grade' })
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateStudentDto,
  ): Promise<Record<string, unknown>> {
    if (!user.studentId) throw new ForbiddenException();
    return this.students.update(user.studentId, dto);
  }
}
