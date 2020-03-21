import * as OKEx from './exchanges/okex';
import { Market, MarketType } from './pojo/market';
import { SupportedExchange } from './pojo/supported_exchange';

export { MarketType, MARKET_TYPES } from './pojo/market';
export { SupportedExchange, SUPPORTED_EXCHANGES } from './pojo/supported_exchange';

/**
 * Fetch trading markets of a crypto exchange.
 * @param exchange The crypto exchange name
 * @param marketType Market type
 * @returns All trading markets
 */
export default async function fetchMarkets(
  exchange: SupportedExchange,
  marketType?: MarketType,
): Promise<{ [key: string]: Market[] }> {
  switch (exchange) {
    case 'OKEx':
      return OKEx.fetchMarkets(marketType);
    default:
      throw new Error(`Unknown exchange: ${exchange}`);
  }
}
