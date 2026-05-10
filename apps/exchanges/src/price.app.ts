import { binanceProvider } from '#src/providers/binance.provider.js';
import { pricesBroker } from 'shared/src/brokers/prices.broker.js';
import { Exchanges, KlineIntervals, Symbols } from 'shared/src/constants.js';
import { logProcessErrors, logger } from 'shared/src/logging.js';
import { redis } from 'shared/src/redis.js';
import { pricesRepository } from 'shared/src/repositories/prices.repository.js';

logProcessErrors();

process.on('SIGINT', async () => {
  await redis.disconnectAll();
  process.exit(0);
});

const INTERVALS = Object.values(KlineIntervals);

async function main() {
  await redis.connect();

  // 1. Last Price Monitoring
  let tradeMessageCount = 0;
  binanceProvider.subscribeTradeStream(Symbols.btcusdt, {
    onMessage: (message) => {
      tradeMessageCount++;
      const lastPrice = {
        symbol: Symbols.btcusdt,
        exchange: Exchanges.binance,
        price: message.price,
        time: message.time,
      };
      pricesRepository.saveLastPrice(lastPrice);
      pricesBroker.broadcastLastPrice(lastPrice);
      if (tradeMessageCount % 1000 === 0) logger.info(`Processed ${tradeMessageCount} trade messages`);
    },
    onError: (error) => {
      logger.error(error, 'Error subscribing to trade stream');
    },
    onClose: () => {
      logger.info('Closed trade stream');
    },
  });
  logger.info('Subscribed to trade stream');

  // 2. Kline Monitoring
  for (const interval of INTERVALS) {
    // a. Backfill
    const historicalKlines = await binanceProvider.fetchHistoricalKlines(Symbols.btcusdt, interval, 1000);
    await pricesRepository.bulkSaveClosedKlines({
      symbol: Symbols.btcusdt,
      exchange: Exchanges.binance,
      interval,
      klines: historicalKlines,
    });
    logger.info(`Backfilled ${historicalKlines.length} klines for btcusdt:${interval}`);

    // b. Subscribe
    let klineMessageCount = 0;
    binanceProvider.subscribeKlineStream(Symbols.btcusdt, interval, {
      onMessage: (message) => {
        klineMessageCount++;
        const { kline, isClosed } = message;
        const data = {
          symbol: Symbols.btcusdt,
          exchange: Exchanges.binance,
          interval,
          kline,
        };

        if (isClosed) {
          pricesRepository.saveClosedKline(data);
          pricesBroker.broadcastClosedKline(data);
        } else {
          pricesRepository.saveCurrentKline(data);
          pricesBroker.broadcastCurrentKline(data);
        }

        if (klineMessageCount % 100 === 0) {
          logger.info(`Processed ${klineMessageCount} kline messages for ${interval}`);
        }
      },
      onError: (error) => {
        logger.error(error, `Error subscribing to kline stream for ${interval}`);
      },
      onClose: () => {
        logger.info(`Closed kline stream for ${interval}`);
      },
    });
    logger.info(`Subscribed to kline stream btcusdt@kline_${interval}`);
  }
}

main();
