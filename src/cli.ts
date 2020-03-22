#!/usr/bin/env node
/* eslint-disable no-console */
import yargs from 'yargs';
import fetchMarkets, { MARKET_TYPES, SupportedExchange, SUPPORTED_EXCHANGES } from './index';
import { MarketType } from './pojo/market';

const { argv } = yargs
  // eslint-disable-next-line no-shadow
  .command('$0 <exchange> [filter]', 'Get exchange info', (yargs) => {
    yargs
      .positional('exchange', {
        choices: SUPPORTED_EXCHANGES,
        type: 'string',
        describe: 'The exchange name',
      })
      .options({
        marketType: {
          choices: MARKET_TYPES,
          type: 'string',
        },
      });
  });

(async (): Promise<void> => {
  const result = await fetchMarkets(
    argv.exchange as SupportedExchange,
    argv.marketType as MarketType,
  );
  console.info(result);
})();
