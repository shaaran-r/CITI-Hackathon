import assert from 'node:assert/strict';
import test from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../src/prisma.service.js';
import { resolveAuthSecrets } from '../src/common/auth-secrets.js';
import { AuthService } from '../src/auth/auth.service.js';
import { resolveOtpProvider } from '../src/auth/otp-provider.js';

test('production auth requires long, distinct configured secrets', () => {
  const access = 'access-secret-'.repeat(3);
  const refresh = 'refresh-secret-'.repeat(3);
  const resolved = resolveAuthSecrets({
    NODE_ENV: 'production',
    JWT_ACCESS_SECRET: access,
    JWT_REFRESH_SECRET: refresh,
  });

  assert.equal(resolved.accessTokenSecret, access);
  assert.equal(resolved.refreshTokenSecret, refresh);
  assert.throws(
    () => resolveAuthSecrets({ NODE_ENV: 'production', JWT_REFRESH_SECRET: refresh }),
    /JWT_ACCESS_SECRET must be configured/,
  );
  assert.throws(
    () =>
      resolveAuthSecrets({
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: access,
        JWT_REFRESH_SECRET: access,
      }),
    /must be different in production/,
  );
});

test('development can still create ephemeral signing secrets', () => {
  const first = resolveAuthSecrets({ NODE_ENV: 'development' });
  const second = resolveAuthSecrets({ NODE_ENV: 'development' });

  assert.equal(first.accessTokenSecret.length, 64);
  assert.notEqual(first.accessTokenSecret, second.accessTokenSecret);
});

test('production requires a configured Twilio Verify provider', () => {
  assert.throws(
    () => resolveOtpProvider({ NODE_ENV: 'production', OTP_PROVIDER: 'mock' }),
    /Mock OTP cannot be used/,
  );
  assert.throws(
    () => resolveOtpProvider({ NODE_ENV: 'production', OTP_PROVIDER: 'twilio-verify' }),
    /Twilio Verify credentials are required/,
  );
  assert.equal(
    resolveOtpProvider({
      NODE_ENV: 'production',
      OTP_PROVIDER: 'twilio-verify',
      TWILIO_ACCOUNT_SID: 'AC123',
      TWILIO_AUTH_TOKEN: 'token',
      TWILIO_VERIFY_SERVICE_SID: 'VA123',
    }),
    'twilio-verify',
  );
});

test('Twilio Verify sends SMS without exposing the verification code', async () => {
  const values: Record<string, string> = {
    OTP_PROVIDER: 'twilio-verify',
    TWILIO_ACCOUNT_SID: 'AC123',
    TWILIO_AUTH_TOKEN: 'auth-token',
    TWILIO_VERIFY_SERVICE_SID: 'VA123',
  };
  const config = { get: (key: string) => values[key] } as unknown as ConfigService;
  const service = new AuthService({} as PrismaService, {} as JwtService, config);
  const originalFetch = globalThis.fetch;
  let requestUrl = '';
  let requestAuthorization = '';
  let requestForm = new URLSearchParams();
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestAuthorization = new Headers(init?.headers).get('Authorization') ?? '';
    requestForm = new URLSearchParams(String(init?.body ?? ''));
    return new Response(JSON.stringify({ status: 'pending' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    assert.deepEqual(await service.sendOtp({ phone: '+919000000001' }), { accepted: true });
    assert.equal(requestUrl, 'https://verify.twilio.com/v2/Services/VA123/Verifications');
    assert.equal(requestForm.get('To'), '+919000000001');
    assert.equal(requestForm.get('Channel'), 'sms');
    assert.equal(requestAuthorization.startsWith('Basic '), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Twilio Verify rejects an unapproved code before creating an account', async () => {
  const values: Record<string, string> = {
    OTP_PROVIDER: 'twilio-verify',
    TWILIO_ACCOUNT_SID: 'AC123',
    TWILIO_AUTH_TOKEN: 'auth-token',
    TWILIO_VERIFY_SERVICE_SID: 'VA123',
  };
  const config = { get: (key: string) => values[key] } as unknown as ConfigService;
  const service = new AuthService({} as PrismaService, {} as JwtService, config);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ status: 'pending' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    await assert.rejects(
      service.verifyOtp({ phone: '+919000000001', code: '123456' }),
      UnauthorizedException,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
