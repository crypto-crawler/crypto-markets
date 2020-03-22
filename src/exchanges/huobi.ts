import { strict as assert } from 'assert';
import Axios from 'axios';
import { normalizeSymbol } from 'crypto-pair';
import { Market, MarketType } from '../pojo/market';
import { mergeMarkets } from '../utils';

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
  return `${baseSymbol}/${pairInfo['quote-currency']}`.toUpperCase();
}

export async function fetchSpotMarkets(): Promise<{ [key: string]: Market[] }> {
  const response = await Axios.get('https://api.huobi.pro/v1/common/symbols');
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
      // see https://www.huobi.com/en-us/fee/
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

    // assert.equal(market.pair, normalizePair(market.id, 'Huobi')); // todo: change _ to / in crypto-pair

    if (!(market.pair in result)) result[market.pair] = [];
    result[market.pair].push(market);
  });

  return result;
}

export async function fetchFuturesMarkets(): Promise<{ [key: string]: Market[] }> {
  const response = await Axios.get('https://api.hbdm.com/api/v1/contract_contract_info');
  assert.equal(response.status, 200);
  assert.equal(response.data.status, 'ok');

  const result: { [key: string]: Market[] } = {};

  const arr = response.data.data as ReadonlyArray<{
    symbol: string;
    contract_code: string;
    contract_type: string;
    contract_size: number;
    price_tick: number;
    delivery_date: string;
    create_date: string;
    contract_status: number;
  }>;

  arr.forEach((p) => {
    const market: Market = {
      exchange: 'Huobi',
      id: p.contract_code,
      pair: `${p.symbol}/USD`,
      base: p.symbol,
      quote: 'USD',
      baseId: p.symbol,
      quoteId: 'USD',
      active: p.contract_status === 1,
      marketType: 'Futures',
      // see https://huobiglobal.zendesk.com/hc/en-us/articles/360000113122
      fees: {
        maker: 0.002,
        taker: 0.003,
      },
      precision: {
        price: -Math.log10(p.price_tick),
        base: -1,
      },
      info: p,
    };

    if (!(market.pair in result)) result[market.pair] = [];
    result[market.pair].push(market);
  });

  return result;
}

export async function fetchMarkets(marketType?: MarketType): Promise<{ [key: string]: Market[] }> {
  if (marketType) {
    switch (marketType) {
      case 'Spot':
        return fetchSpotMarkets();
      case 'Futures':
        return fetchFuturesMarkets();
      default:
        throw new Error(`Unkown marketType ${marketType}`);
    }
  }
  const spot = await fetchSpotMarkets();
  const futures = await fetchFuturesMarkets();

  const result: { [key: string]: Market[] } = { ...spot };

  mergeMarkets(result, futures);

  return result;
}
