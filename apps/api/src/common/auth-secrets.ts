import { randomBytes } from 'node:crypto';

export const accessTokenSecret = process.env.JWT_ACCESS_SECRET ?? randomBytes(32).toString('hex');
export const refreshTokenSecret = process.env.JWT_REFRESH_SECRET ?? randomBytes(32).toString('hex');
