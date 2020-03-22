import { strict as assert } from 'assert';
import axios from 'axios';
import { normalizePair, normalizeSymbol } from 'crypto-pair';
import { Market } from '../pojo/market';

interface HuobiPairInfo {
  'base-currency': string;
  'quote-currency': string;
  'price-precision': number;
  'amount-precision': number;
  'symbol-partition': string;
  symbol: string;
  state: string;
  'value-precision': number;
  'min-order-amt': number;
  'max-order-amt': number;
  'min-order-value': number;
}

function extractNormalizedPair(pairInfo: HuobiPairInfo): string {
  let baseSymbol = pairInfo['base-currency'];
  if (baseSymbol === 'hot') baseSymbol = 'Hydro';
  return `${baseSymbol}_${pairInfo['quote-currency']}`.toUpperCase();
}

// eslint-disable-next-line import/prefer-default-export
export async function fetchMarkets(): Promise<{ [key: string]: Market[] }> {
  const response = await axios.get('https://api.huobi.pro/v1/common/symbols');
  assert.equal(response.status, 200);
  assert.equal(response.statusText, 'OK');
  assert.equal(response.data.status, 'ok');

  const result: { [key: string]: Market[] } = {};

  const arr = response.data.data as ReadonlyArray<HuobiPairInfo>;

  arr.forEach((p) => {
    const market: Market = {
      exchange: 'Huobi',
      id: p.symbol,
      pair: extractNormalizedPair(p),
      base: normalizeSymbol(p['base-currency'], 'Huobi'),
      quote: normalizeSymbol(p['quote-currency'], 'Huobi'),
      baseId: p['base-currency'],
      quoteId: p['quote-currency'],
      active: p.state === 'online',
      marketType: 'Spot',
      fees: {
        maker: 0.002,
        taker: 0.002,
      },
      precision: {
        price: p['price-precision'],
        base: p['amount-precision'],
        quote: p['value-precision'],
      },
      minQuantity: {
        base: p['min-order-amt'],
        quote: p['min-order-value'],
      },
      info: p,
    };

    assert.equal(market.pair, normalizePair(market.id, 'Huobi'));

    if (!(market.pair in result)) result[market.pair] = [];
    result[market.pair].push(market);
  });

  return result;
}
