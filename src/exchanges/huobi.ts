import { strict as assert } from 'assert';
import Axios from 'axios';
import { normalizePair, normalizeSymbol } from 'crypto-pair';
import { Market, MarketType } from '../pojo/market';

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

export async function fetchSpotMarkets(): Promise<readonly Market[]> {
  const response = await Axios.get('https://api.huobi.pro/v1/common/symbols');
  assert.equal(response.status, 200);
  assert.equal(response.statusText, 'OK');
  assert.equal(response.data.status, 'ok');

  const result: Market[] = [];

  const arr = response.data.data as ReadonlyArray<HuobiPairInfo>;

  arr.forEach((p) => {
    const market: Market = {
      exchange: 'Huobi',
      type: 'Spot',
      id: p.symbol,
      pair: extractNormalizedPair(p),
      base: normalizeSymbol(p['base-currency'], 'Huobi'),
      quote: normalizeSymbol(p['quote-currency'], 'Huobi'),
      baseId: p['base-currency'],
      quoteId: p['quote-currency'],
      active: p.state === 'online',
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

    assert.equal(market.pair, normalizePair(market.id, 'Huobi'));

    result.push(market);
  });

  return result;
}

export async function fetchFuturesMarkets(): Promise<readonly Market[]> {
  const response = await Axios.get('https://api.hbdm.com/api/v1/contract_contract_info');
  assert.equal(response.status, 200);
  assert.equal(response.data.status, 'ok');

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

  const result: Market[] = arr.map((p) => ({
    exchange: 'Huobi',
    type: 'Futures',
    id: p.contract_code,
    pair: `${p.symbol}_USD`,
    base: p.symbol,
    quote: 'USD',
    baseId: p.symbol,
    quoteId: 'USD',
    active: p.contract_status === 1,
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
  }));

  return result;
}

export async function fetchMarkets(marketType?: MarketType): Promise<readonly Market[]> {
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

  return spot.concat(futures);
}
