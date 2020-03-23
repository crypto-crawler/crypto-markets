import * as Biki from './exchanges/biki';
import * as Binance from './exchanges/binance';
import * as Huobi from './exchanges/huobi';
import * as OKEx from './exchanges/okex';
import { Market, MarketType } from './pojo/market';
import { SupportedExchange } from './pojo/supported_exchange';

export { MarketType, MARKET_TYPES } from './pojo/market';
export { SupportedExchange, SUPPORTED_EXCHANGES } from './pojo/supported_exchange';

/**
 * Fetch trading markets of a crypto exchange.
 * @param exchange The crypto exchange name
 * @param marketType Market type, if not provided, fetch all market types
 * @returns All trading markets
 */
export default async function fetchMarkets(
  exchange: SupportedExchange,
  marketType?: MarketType,
): Promise<Market[]> {
  switch (exchange) {
    case 'Biki':
      return Biki.fetchMarkets(marketType);
    case 'Binance':
      return Binance.fetchMarkets(marketType);
    case 'Huobi': {
      if (marketType !== undefined && marketType !== 'Spot') {
        throw new Error('Huobi only has Spot market, for other types please use HuobiDM');
      }
      return Huobi.fetchMarkets();
    }
    case 'OKEx':
      return OKEx.fetchMarkets(marketType);
    default:
      throw new Error(`Unknown exchange: ${exchange}`);
  }
}
