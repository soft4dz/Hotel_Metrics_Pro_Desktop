import { runPointeuseSyncCycle } from './rh-pointeuse-sync.service';
import { startPhase5Scheduler } from './phase5-scheduler.service';
import { logger } from '../utils/logger';

let bisStarted = false;

/** Phase 6 bis — sync pointeuses ZKTeco (5 min) + hérite scheduler Phase 5. */
export function startPhase6BisScheduler(actorUserId = 1): void {
  startPhase5Scheduler(actorUserId);
  if (bisStarted) return;
  bisStarted = true;

  const runSync = () => {
    void runPointeuseSyncCycle(actorUserId).catch((err) => logger.error('Phase6 bis pointeuse sync', err));
  };

  runSync();
  setInterval(runSync, 5 * 60 * 1000);
}
