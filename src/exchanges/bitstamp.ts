import { strict as assert } from 'assert';
import axios from 'axios';
import { normalizePair } from 'crypto-pair';
import { Market, MarketType } from '../pojo/market';

export async function fetchSpotMarkets(): Promise<readonly Market[]> {
  const response = await axios.get('https://www.bitstamp.net/api/v2/trading-pairs-info/');
  assert.equal(response.status, 200);
  assert.equal(response.statusText, 'OK');

  const arr = response.data as ReadonlyArray<{
    base_decimals: number;
    minimum_order: string;
    name: string;
    counter_decimals: number;
    trading: string;
    url_symbol: string;
    description: string;
  }>;

  const result: Market[] = arr.map((pair) => {
    const [base, quote] = pair.name.split('/');

    const market: Market = {
      exchange: 'Bitstamp',
      type: 'Spot',
      id: pair.url_symbol,
      pair: `${base}_${quote}`,
      base,
      quote,
      baseId: base,
      quoteId: quote,
      active: pair.trading === 'Enabled',
      // see https://www.bitstamp.net/fee-schedule/
      fees: {
        maker: 0.005,
        taker: 0.005,
      },
      precision: {
        price: pair.counter_decimals,
        base: pair.base_decimals,
        quote: pair.counter_decimals,
      },
      minQuantity: {
        quote: parseFloat(pair.minimum_order.split(' ')[0]),
      },
      info: pair,
    };
    assert.equal(market.pair, normalizePair(market.id, 'Bitstamp'));

    return market;
  });

  return result.sort((x, y) => x.pair.localeCompare(y.pair));
}

export async function fetchMarkets(marketType?: MarketType): Promise<readonly Market[]> {
  if (marketType) {
    return marketType === 'Spot' ? fetchSpotMarkets() : [];
  }
  return fetchSpotMarkets();
}
