import { pino, Logger } from 'pino';
import env, { required } from 'lib/src/env.js';

const NODE_ENV = required(env.NODE_ENV);
const LOG_LEVEL = required(env.LOG_LEVEL);

const pinoPrettyTarget = { target: 'pino-pretty', level: LOG_LEVEL, options: { destination: 1 } };
const pinoFileTarget = { target: 'pino/file', level: LOG_LEVEL, options: { destination: 1 } };

export const defaultOptions = {
  level: LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: {
    targets: NODE_ENV === 'development' ? [pinoPrettyTarget] : [pinoFileTarget],
  },
  redact: {
    censor: '[REDACTED]',
    paths: ['payload.password'],
  },
};

export const logger = pino(defaultOptions);

export function logProcessErrors(_process?: NodeJS.Process, _logger?: Logger) {
  const __logger = _logger ?? logger;
  const __process = _process ?? process;
  __process.on('unhandledRejection', (reason) => {
    __logger.error(reason, 'Unhandled rejection');
  });
  __process.on('uncaughtException', (error) => {
    __logger.error(error, 'Uncaught exception');
  });
}
