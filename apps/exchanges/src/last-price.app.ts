import { Symbols } from 'core/src/constants.js';
import { errorsHandler } from 'lib/src/errors.js';
import { binanceProvider } from '#src/providers/binance.provider.js';
import { redis } from 'lib/src/redis.js';
import { processHandler } from 'lib/src/process.js';
import { pricesRepository } from 'core/src/repositories/prices.repository.js';
import { Exchanges } from 'core/src/constants.js';
import { logger } from 'lib/src/logging/server.js';

processHandler.logErrors();
processHandler.onExit(async () => {
  await redis.disconnect();
});

async function main() {
  await redis.connect();
  let messageCount = 0;
  binanceProvider.subscribeTradeStream(Symbols.btcusdt, {
    onMessage: (message) => {
      messageCount++;
      pricesRepository.saveLastPrice({
        symbol: Symbols.btcusdt,
        exchange: Exchanges.binance,
        price: message.price,
        time: message.time,
      });
      if (messageCount % 100 === 0) logger.info(`Processed ${messageCount} messages`);
    },
    onError: (error) => {
      logger.error(error, 'Error subscribing to trade stream');
    },
    onClose: () => {
      logger.info('Closed trade stream');
    },
  });
  logger.info('Subscribed to trade stream');
}

await main();
