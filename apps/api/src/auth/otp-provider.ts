export interface OtpProviderEnvironment {
  NODE_ENV?: string | undefined;
  OTP_PROVIDER?: string | undefined;
  TWILIO_ACCOUNT_SID?: string | undefined;
  TWILIO_AUTH_TOKEN?: string | undefined;
  TWILIO_VERIFY_SERVICE_SID?: string | undefined;
}

export type OtpProvider = 'mock' | 'twilio-verify';

export function resolveOtpProvider(environment: OtpProviderEnvironment): OtpProvider {
  const production = environment.NODE_ENV === 'production';
  const configured = environment.OTP_PROVIDER?.trim();
  const provider = configured || (production ? '' : 'mock');

  if (provider === 'mock') {
    if (production) throw new Error('Mock OTP cannot be used in production');
    return 'mock';
  }
  if (provider !== 'twilio-verify') {
    throw new Error('Set OTP_PROVIDER=twilio-verify');
  }

  const required = [
    environment.TWILIO_ACCOUNT_SID,
    environment.TWILIO_AUTH_TOKEN,
    environment.TWILIO_VERIFY_SERVICE_SID,
  ];
  if (required.some((value) => !value?.trim())) {
    throw new Error('Twilio Verify credentials are required');
  }
  return 'twilio-verify';
}
