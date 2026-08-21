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
  openConflictCount: number;
  quarantinedCount: number;
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
  conflicts: number;
  quarantined: number;
  message: string;
}

export interface SyncConflictItem {
  id: number;
  entityType: string;
  entityUuid: string;
  remoteAction: string;
  resolution: string;
  reason: string;
  status: 'open' | 'resolved';
  createdAt: string;
  resolvedAt: string | null;
}
