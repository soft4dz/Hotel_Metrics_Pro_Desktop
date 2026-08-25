import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class LicenseAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest()?.user as { role?: string } | undefined;
    if (user?.role !== 'GLOBAL_ADMIN') {
      throw new ForbiddenException('Administration des licences réservée au GLOBAL_ADMIN Raqmi.');
    }
    return true;
  }
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

@Injectable()
export class LicensePublicRateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const now = Date.now();
    const route = request.route?.path ?? request.url ?? 'licenses';
    const key = `${request.ip ?? request.socket?.remoteAddress ?? 'unknown'}:${route}`;
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + WINDOW_MS }
      : current;
    bucket.count += 1;
    buckets.set(key, bucket);
    if (bucket.count > MAX_REQUESTS) {
      throw new HttpException('Trop de tentatives — réessayez dans une minute.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
