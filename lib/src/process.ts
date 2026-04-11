import { logger } from 'lib/src/logging/server.js';

export class Process {
  nodeProcess = process;

  private exiting = false;

  public logErrors() {
    this.nodeProcess.on('uncaughtException', (error) => {
      logger.error(error, 'Uncaught exception');
    });
    this.nodeProcess.on('unhandledRejection', (reason) => {
      logger.error(reason, 'Unhandled rejection');
    });
  }

  public onExit(handler: () => Promise<void> | void): void {
    const exit = async (payload: { code: number }): Promise<void> => {
      if (this.exiting) return;
      this.exiting = true;

      const { code } = payload;

      try {
        await handler();
      } finally {
        this.nodeProcess.exit(code);
      }
    };

    const signals: Array<NodeJS.Signals> = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

    signals.forEach((signal) => {
      this.nodeProcess.once(signal, () => exit({ code: 0 }));
    });

    this.nodeProcess.once('uncaughtException', () => {
      exit({ code: 1 });
    });
    this.nodeProcess.once('unhandledRejection', () => {
      exit({ code: 1 });
    });
  }
}

export const processHandler = new Process();
