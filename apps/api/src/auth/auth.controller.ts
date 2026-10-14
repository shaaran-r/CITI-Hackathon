import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/public.decorator.js';
import { AuthService } from './auth.service.js';
import { RefreshTokenDto, SendOtpDto, VerifyOtpDto } from './auth.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({
    default: {
      limit: 5,
      ttl: 10 * 60 * 1000,
      getTracker: (request) => `${request.ip ?? 'unknown'}:${request.body?.phone ?? ''}`,
    },
  })
  @Post('send-otp')
  @ApiOperation({ summary: 'Request an OTP for student, facilitator, or family sign-in' })
  sendOtp(@Body() dto: SendOtpDto): Promise<{ accepted: true; devCode?: string }> {
    return this.auth.sendOtp(dto);
  }

  @Public()
  @Throttle({
    default: {
      limit: 10,
      ttl: 10 * 60 * 1000,
      getTracker: (request) => `${request.ip ?? 'unknown'}:${request.body?.phone ?? ''}`,
    },
  })
  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify an OTP and create or resume a student account' })
  verifyOtp(@Body() dto: VerifyOtpDto): Promise<Record<string, unknown>> {
    return this.auth.verifyOtp(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate access and refresh tokens' })
  refresh(@Body() dto: RefreshTokenDto): Promise<Record<string, unknown>> {
    return this.auth.refresh(dto);
  }
}
