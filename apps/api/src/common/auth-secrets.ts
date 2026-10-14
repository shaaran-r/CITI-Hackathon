import { randomBytes } from 'node:crypto';

export interface AuthSecretEnvironment {
  NODE_ENV?: string;
  JWT_ACCESS_SECRET?: string;
  JWT_REFRESH_SECRET?: string;
}

export function resolveAuthSecrets(environment: AuthSecretEnvironment): {
  accessTokenSecret: string;
  refreshTokenSecret: string;
} {
  const production = environment.NODE_ENV === 'production';
  const resolve = (name: string, configured: string | undefined): string => {
    const secret = configured?.trim();
    if (secret && secret.length < 32) {
      throw new Error(`${name} must be at least 32 characters long`);
    }
    if (secret) return secret;
    if (production) throw new Error(`${name} must be configured in production`);
    return randomBytes(32).toString('hex');
  };

  const accessTokenSecret = resolve('JWT_ACCESS_SECRET', environment.JWT_ACCESS_SECRET);
  const refreshTokenSecret = resolve('JWT_REFRESH_SECRET', environment.JWT_REFRESH_SECRET);
  if (production && accessTokenSecret === refreshTokenSecret) {
    throw new Error('JWT access and refresh secrets must be different in production');
  }
  return { accessTokenSecret, refreshTokenSecret };
}

const secrets = resolveAuthSecrets(process.env);

export const accessTokenSecret = secrets.accessTokenSecret;
export const refreshTokenSecret = secrets.refreshTokenSecret;
