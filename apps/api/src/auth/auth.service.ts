import { createHash, timingSafeEqual } from 'node:crypto';
import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service.js';
import type { RefreshTokenDto, SendOtpDto, VerifyOtpDto } from './auth.dto.js';
import { accessTokenSecret, refreshTokenSecret } from '../common/auth-secrets.js';
import { resolveOtpProvider } from './otp-provider.js';

interface TokenClaims {
  sub: string;
  phone: string;
  role: string;
  studentId?: string;
  facilitatorId?: string;
  parentId?: string;
  tokenType: 'access' | 'refresh';
}

interface OtpEntry {
  code: string;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  private readonly pendingCodes = new Map<string, OtpEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async sendOtp(dto: SendOtpDto): Promise<{ accepted: true; devCode?: string }> {
    const provider = this.otpProvider();
    if (provider === 'twilio-verify') {
      await this.requestTwilioCode(dto.phone);
      return { accepted: true };
    }

    const code = this.config.get<string>('DEV_OTP_CODE') ?? '123456';
    this.pendingCodes.set(dto.phone, { code, expiresAt: Date.now() + 5 * 60_000 });
    return { accepted: true, devCode: code };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<Record<string, unknown>> {
    const provider = this.otpProvider();
    if (provider === 'twilio-verify') {
      const approved = await this.verifyTwilioCode(dto.phone, dto.code);
      if (!approved) throw new UnauthorizedException('Code is invalid or expired');
    } else {
      const pending = this.pendingCodes.get(dto.phone);
      this.pendingCodes.delete(dto.phone);
      if (!pending || pending.expiresAt < Date.now() || pending.code !== dto.code) {
        throw new UnauthorizedException('Code is invalid or expired');
      }
    }

    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing && !['STUDENT', 'FACILITATOR', 'PARENT'].includes(existing.role)) {
      throw new UnauthorizedException('This phone is not registered for this demo flow');
    }

    const user = await this.prisma.user.upsert({
      where: { phone: dto.phone },
      update: { phoneVerifiedAt: new Date(), isActive: true },
      create: { phone: dto.phone, role: 'STUDENT', phoneVerifiedAt: new Date() },
    });

    if (user.role === 'FACILITATOR') {
      const facilitator = await this.prisma.facilitator.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, fullName: 'Facilitator' },
      });
      return this.issueTokens({
        sub: user.id,
        phone: user.phone,
        role: user.role,
        facilitatorId: facilitator.id,
      });
    }

    if (user.role === 'PARENT') {
      const parent = await this.prisma.parent.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, fullName: 'Family member' },
      });
      return this.issueTokens({
        sub: user.id,
        phone: user.phone,
        role: user.role,
        parentId: parent.id,
      });
    }

    const student = await this.prisma.student.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, displayName: 'Student' },
    });

    return this.issueTokens({
      sub: user.id,
      phone: user.phone,
      role: user.role,
      studentId: student.id,
    });
  }

  async refresh(dto: RefreshTokenDto): Promise<Record<string, unknown>> {
    let claims: TokenClaims;
    try {
      claims = await this.jwtService.verifyAsync<TokenClaims>(dto.refreshToken, {
        secret: refreshTokenSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (claims.tokenType !== 'refresh') throw new UnauthorizedException('Refresh token required');

    const user = await this.prisma.user.findUnique({
      where: { id: claims.sub },
      include: { student: true, facilitator: true, parent: true },
    });
    const storedHash = user?.refreshTokenHash;
    const presentedHash = this.hash(dto.refreshToken);
    if (
      !user?.isActive ||
      !storedHash ||
      !timingSafeEqual(Buffer.from(storedHash), Buffer.from(presentedHash))
    ) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const identity: Omit<TokenClaims, 'tokenType'> | undefined =
      user.role === 'STUDENT' && user.student
        ? {
            sub: user.id,
            phone: user.phone,
            role: user.role,
            studentId: user.student.id,
          }
        : user.role === 'FACILITATOR' && user.facilitator
          ? {
              sub: user.id,
              phone: user.phone,
              role: user.role,
              facilitatorId: user.facilitator.id,
            }
          : user.role === 'PARENT' && user.parent
            ? {
                sub: user.id,
                phone: user.phone,
                role: user.role,
                parentId: user.parent.id,
              }
            : undefined;
    if (!identity) throw new UnauthorizedException('Account role is not supported');

    return this.issueTokens(identity);
  }

  private async issueTokens(
    identity: Omit<TokenClaims, 'tokenType'>,
  ): Promise<Record<string, unknown>> {
    const payload = { ...identity };
    const accessToken = await this.jwtService.signAsync(
      { ...payload, tokenType: 'access' },
      { secret: accessTokenSecret, expiresIn: 15 * 60 },
    );
    const refreshToken = await this.jwtService.signAsync(
      { ...payload, tokenType: 'refresh' },
      { secret: refreshTokenSecret, expiresIn: 30 * 24 * 60 * 60 },
    );
    await this.prisma.user.update({
      where: { id: identity.sub },
      data: { refreshTokenHash: this.hash(refreshToken) },
    });
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      ...(identity.studentId ? { studentId: identity.studentId } : {}),
      ...(identity.facilitatorId ? { facilitatorId: identity.facilitatorId } : {}),
      ...(identity.parentId ? { parentId: identity.parentId } : {}),
    };
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private otpProvider(): 'mock' | 'twilio-verify' {
    try {
      return resolveOtpProvider({
        NODE_ENV: process.env.NODE_ENV,
        OTP_PROVIDER: this.config.get<string>('OTP_PROVIDER'),
        TWILIO_ACCOUNT_SID: this.config.get<string>('TWILIO_ACCOUNT_SID'),
        TWILIO_AUTH_TOKEN: this.config.get<string>('TWILIO_AUTH_TOKEN'),
        TWILIO_VERIFY_SERVICE_SID: this.config.get<string>('TWILIO_VERIFY_SERVICE_SID'),
      });
    } catch {
      throw new ServiceUnavailableException('Configure OTP_PROVIDER as twilio-verify');
    }
  }

  private async requestTwilioCode(phone: string): Promise<void> {
    await this.twilioVerifyRequest('Verifications', { To: phone, Channel: 'sms' });
  }

  private async verifyTwilioCode(phone: string, code: string): Promise<boolean> {
    const result = await this.twilioVerifyRequest('VerificationCheck', { To: phone, Code: code });
    return result.status === 'approved';
  }

  private async twilioVerifyRequest(
    action: 'Verifications' | 'VerificationCheck',
    fields: Record<string, string>,
  ): Promise<{ status?: string }> {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID')?.trim();
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN')?.trim();
    const serviceSid = this.config.get<string>('TWILIO_VERIFY_SERVICE_SID')?.trim();
    if (!accountSid || !authToken || !serviceSid) {
      throw new ServiceUnavailableException('Twilio Verify is not fully configured');
    }

    const authorization = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const body = new URLSearchParams(fields);
    let response: Response;
    try {
      response = await fetch(
        `https://verify.twilio.com/v2/Services/${encodeURIComponent(serviceSid)}/${action}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${authorization}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body,
          signal: AbortSignal.timeout(10_000),
        },
      );
    } catch {
      throw new ServiceUnavailableException('OTP delivery service is unavailable');
    }
    if (!response.ok) {
      throw new ServiceUnavailableException('OTP delivery service rejected the request');
    }
    return (await response.json()) as { status?: string };
  }
}
