type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatMessage(level: LogLevel, message: string): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level.toUpperCase()}] ${message}`;
}

export const logger = {
  info: (message: string) => console.log(formatMessage('info', message)),
  warn: (message: string) => console.warn(formatMessage('warn', message)),
  error: (message: string, err?: unknown) => {
    console.error(formatMessage('error', message), err ?? '');
  },
  debug: (message: string) => {
    if (process.env.HMP_DEBUG === '1') {
      console.debug(formatMessage('debug', message));
    }
  },
};
