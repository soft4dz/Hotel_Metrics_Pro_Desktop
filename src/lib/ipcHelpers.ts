import type { IpcResult } from '@/shared/types/admin';

export function unwrapIpc<T>(result: IpcResult<T>): T {
  if (!result.ok) {
    throw new Error(result.error ?? 'Erreur IPC');
  }
  return result.data as T;
}
