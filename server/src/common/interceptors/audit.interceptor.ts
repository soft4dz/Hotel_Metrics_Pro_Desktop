import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma.service';

const AUDITED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, user, body, ip } = req;

    if (!AUDITED_METHODS.includes(method)) return next.handle();

    const before = Date.now();

    return next.handle().pipe(
      tap(async (result) => {
        try {
          const module = url.split('/')[3] ?? 'unknown';
          const action = method.toLowerCase();
          const entityId = result?.id?.toString() ?? null;
          const payload = JSON.stringify({ url, body: body ?? null, result });
          const hash = createHash('sha256')
            .update(`${user?.id ?? 0}|${module}|${action}|${Date.now()}|${payload}`)
            .digest('hex');

          await this.prisma.auditLog.create({
            data: {
              userId: user?.id ?? null,
              userEmail: user?.email ?? null,
              module,
              action,
              entityId,
              newValue: result ?? null,
              ipAddress: ip,
              hash,
            },
          });
        } catch {
          // audit failure must never break the main flow
        }
      }),
    );
  }
}
