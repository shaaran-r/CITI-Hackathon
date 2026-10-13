import { Controller, ForbiddenException, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/auth.types.js';
import { Roles } from '../common/roles.decorator.js';
import { WalletService } from './wallet.service.js';

@ApiTags('wallet')
@ApiBearerAuth()
@Roles('STUDENT')
@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get(':studentId/history')
  @ApiOperation({ summary: 'Get recent mission validation history for the signed-in student' })
  history(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
  ): Promise<Record<string, unknown>[]> {
    if (!user.studentId || user.studentId !== studentId) throw new ForbiddenException();
    return this.wallet.getHistory(studentId);
  }

  @Get(':studentId')
  @ApiOperation({ summary: 'Get approved missions, verified skills, badges, and readiness' })
  getWallet(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
  ): Promise<Record<string, unknown>> {
    if (!user.studentId || user.studentId !== studentId) throw new ForbiddenException();
    return this.wallet.getWallet(studentId);
  }
}
