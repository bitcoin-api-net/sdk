import { pino } from 'pino';
import env, { required } from 'lib/src/env.js';

const NODE_ENV = required(env.NODE_ENV);
const LOG_LEVEL = required(env.LOG_LEVEL);

export type TransportTarget = {
  target: string;
  level: string;
  options?: Record<string, unknown>;
};

export type LoggerOptions = {
  level: string;
  timestamp: () => string;
  transport: {
    targets: TransportTarget[];
  };
  redact: { paths: string[]; censor: string; remove?: boolean };
};

export function createLogger() {
  const targets: TransportTarget[] = [];
  if (NODE_ENV === 'development') {
    targets.push({ target: 'pino-pretty', level: LOG_LEVEL, options: { destination: 1 } });
  }

  if (NODE_ENV === 'production') {
    targets.push({ target: 'pino/file', level: LOG_LEVEL, options: { destination: 1 } });
  }
  const options: LoggerOptions = {
    level: LOG_LEVEL,
    timestamp: pino.stdTimeFunctions.isoTime,
    transport: {
      targets,
    },
    redact: {
      censor: '[REDACTED]',
      paths: ['payload.password'],
    },
  };

  const logger = pino(options);
  return {
    logger,
    options,
  };
}

export const { logger, options } = createLogger();
