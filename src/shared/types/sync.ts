export interface SyncConfigDto {
  apiBaseUrl: string;
  deviceId: string;
  lastSyncAt: string | null;
  autoSync: boolean;
}

export interface SyncStatusDto {
  online: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncAt: string | null;
  apiBaseUrl: string;
}

export interface SyncQueueItem {
  id: number;
  entityType: string;
  action: string;
  status: string;
  attempts: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface SyncRunResult {
  pushed: number;
  pulled: number;
  failed: number;
  message: string;
}
