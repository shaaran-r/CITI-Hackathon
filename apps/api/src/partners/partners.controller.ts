import { Body, Controller, ForbiddenException, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/auth.types.js';
import { Public } from '../common/public.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import { CreatePartnerApplicationDto, UpdatePartnerApplicationStatusDto } from './partners.dto.js';
import { PartnersService } from './partners.service.js';

@ApiTags('partners')
@Controller('partners')
export class PartnerIntakeController {
  constructor(private readonly partners: PartnersService) {}

  @Public()
  @Post('applications')
  @ApiOperation({ summary: 'Submit a consent-based mentor, employer, or NGO interest application' })
  submit(@Body() dto: CreatePartnerApplicationDto): Promise<Record<string, unknown>> {
    return this.partners.submit(dto);
  }
}

@ApiTags('facilitator partners')
@ApiBearerAuth()
@Roles('FACILITATOR')
@Controller('facilitator/partner-applications')
export class FacilitatorPartnerController {
  constructor(private readonly partners: PartnersService) {}

  @Get()
  @ApiOperation({ summary: 'List partner applications awaiting facilitator review' })
  list(): Promise<Record<string, unknown>[]> {
    return this.partners.listForReview();
  }

  @Patch(':applicationId/status')
  @ApiOperation({ summary: 'Update a partner application’s review status' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('applicationId') applicationId: string,
    @Body() dto: UpdatePartnerApplicationStatusDto,
  ): Promise<Record<string, unknown>> {
    if (!user.facilitatorId) throw new ForbiddenException();
    return this.partners.updateStatus(applicationId, user.facilitatorId, dto);
  }
}
