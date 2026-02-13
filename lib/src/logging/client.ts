import { pino } from 'pino';

export function getLogger(options: { apiLogsEndpoint: string; logLevel: string }) {
  return pino({
    level: options.logLevel,
    timestamp: pino.stdTimeFunctions.isoTime,
    browser: {
      transmit: {
        level: options.logLevel,
        send: function (level, logEvent) {
          fetch(options.apiLogsEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...logEvent,
              messages: logEvent.messages.map((message) =>
                typeof message === 'object' ? JSON.stringify(message) : message.toString(),
              ),
            }),
          });
        },
      },
    },
  });
}

export type Logger = ReturnType<typeof getLogger>;
