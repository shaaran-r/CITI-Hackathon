import { createHash, timingSafeEqual } from 'node:crypto';
import { Injectable, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service.js';
import type { RefreshTokenDto, SendOtpDto, VerifyOtpDto } from './auth.dto.js';
import { accessTokenSecret, refreshTokenSecret } from '../common/auth-secrets.js';

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
    if (this.config.get('OTP_PROVIDER', 'mock') !== 'mock') {
      throw new UnprocessableEntityException('Only mock OTP is configured in this build');
    }

    const code = this.config.get<string>('DEV_OTP_CODE') ?? '123456';
    this.pendingCodes.set(dto.phone, { code, expiresAt: Date.now() + 5 * 60_000 });
    if (process.env.NODE_ENV !== 'production') return { accepted: true, devCode: code };
    return { accepted: true };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<Record<string, unknown>> {
    const pending = this.pendingCodes.get(dto.phone);
    this.pendingCodes.delete(dto.phone);
    if (!pending || pending.expiresAt < Date.now() || pending.code !== dto.code) {
      throw new UnauthorizedException('Code is invalid or expired');
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
}
