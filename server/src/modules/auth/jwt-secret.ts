import { ConfigService } from '@nestjs/config';

export function requireStrongJwtSecret(cfg: ConfigService): string {
  const secret = cfg.getOrThrow<string>('JWT_SECRET');
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('JWT_SECRET doit contenir au moins 32 octets.');
  }
  return secret;
}
