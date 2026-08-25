import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

const attempts = new Map<string, { count: number; resetAt: number }>();

@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const now = Date.now();
    const key = String(request.ip ?? request.socket?.remoteAddress ?? 'unknown');
    const previous = attempts.get(key);
    const bucket = !previous || previous.resetAt <= now
      ? { count: 0, resetAt: now + 60_000 }
      : previous;
    bucket.count += 1;
    attempts.set(key, bucket);
    if (bucket.count > 10) {
      throw new HttpException('Trop de tentatives de connexion.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
