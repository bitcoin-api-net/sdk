import { Symbols, Exchanges } from 'shared/src/constants.js';
import { logProcessErrors, logger } from 'shared/src/logging.js';
import { redis } from 'shared/src/redis.js';
import { pricesRepository } from 'shared/src/repositories/prices.repository.js';
import { pricesBroker } from 'shared/src/brokers/prices.broker.js';
import { binanceProvider } from '#src/providers/binance.provider.js';

logProcessErrors();

process.on('SIGINT', async () => {
  await redis.disconnectAll();
  process.exit(0);
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
      pricesBroker.broadcastLastPrice({
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

main();
