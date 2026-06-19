import type { IpcResult } from '@/shared/types/admin';

export class IpcForbiddenError extends Error {
  readonly code = 'FORBIDDEN' as const;
  constructor(message: string) { super(message); this.name = 'IpcForbiddenError'; }
}

export class IpcSessionExpiredError extends Error {
  readonly code = 'SESSION_EXPIRED' as const;
  constructor(message: string) { super(message); this.name = 'IpcSessionExpiredError'; }
}

export class IpcNotFoundError extends Error {
  readonly code = 'NOT_FOUND' as const;
  constructor(message: string) { super(message); this.name = 'IpcNotFoundError'; }
}

export class IpcServerError extends Error {
  readonly code = 'SERVER_ERROR' as const;
  constructor(message: string) { super(message); this.name = 'IpcServerError'; }
}

export type IpcError = IpcForbiddenError | IpcSessionExpiredError | IpcNotFoundError | IpcServerError;

export function unwrapIpc<T>(result: IpcResult<T>): T {
  if (result.ok) return result.data;
  switch (result.errorCode) {
    case 'FORBIDDEN':       throw new IpcForbiddenError(result.error);
    case 'SESSION_EXPIRED': throw new IpcSessionExpiredError(result.error);
    case 'NOT_FOUND':       throw new IpcNotFoundError(result.error);
    default:                throw new IpcServerError(result.error);
  }
}

export function isIpcError(err: unknown): err is IpcError {
  return (
    err instanceof IpcForbiddenError ||
    err instanceof IpcSessionExpiredError ||
    err instanceof IpcNotFoundError ||
    err instanceof IpcServerError
  );
}
