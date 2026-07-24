import { generateSystemNotifications } from './notifications.service';
import { runRelancesAutomatiques } from './creances.service';
import { logger } from '../utils/logger';

let schedulerStarted = false;

/** Planificateur MVP — notifications + relances créances (daily). */
export function startPhase5Scheduler(actorUserId = 1): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const runDaily = () => {
    try {
      generateSystemNotifications(actorUserId);
      runRelancesAutomatiques(actorUserId);
    } catch (err) {
      logger.error('Phase5 scheduler error', err);
    }
  };

  runDaily();
  setInterval(runDaily, 24 * 60 * 60 * 1000);
}
