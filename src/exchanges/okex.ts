import { strict as assert } from 'assert';
import Axios from 'axios';
import { Market, MarketType } from '../pojo/market';

// see https://www.okex.com/pages/products/fees.html
const fees = {
  Spot: {
    taker: 0.0015,
    maker: 0.001,
  },
  Futures: {
    taker: 0.0005,
    maker: 0.0002,
  },
  Swap: {
    taker: 0.0005,
    maker: 0.0002,
  },
  Option: {
    taker: 0.0005,
    maker: 0.0002,
  },
};

export async function fetchMarketsByType(marketType: MarketType): Promise<Market[]> {
  const response = await Axios.get(
    `https://www.okex.com/api/${marketType.toLowerCase()}/v3/instruments`,
  );
  assert.equal(response.status, 200);

  const arr = response.data as Array<{
    base_currency: string;
    instrument_id: string;
    min_size: string;
    quote_currency: string;
    size_increment: string;
    trade_increment: string;
    tick_size: string;
    contract_val: string;
  }>;

  const result: Market[] = arr.map((p) => {
    const market: Market = {
      exchange: 'OKEx',
      id: p.instrument_id,
      pair: `${p.base_currency}/${p.quote_currency}`,
      base: p.base_currency,
      quote: p.quote_currency,
      baseId: p.base_currency,
      quoteId: p.quote_currency,
      active: true,
      marketType,
      fees: fees[marketType],
      precision: {
        price: -Math.log10(parseFloat(p.tick_size)),
        base: 0,
      },
      minQuantity: { base: 0 },
      info: p,
    };

    switch (marketType) {
      case 'Spot': {
        market.precision.base = -Math.log10(parseFloat(p.size_increment));
        market.minQuantity!.base = parseFloat(p.min_size);
        break;
      }
      case 'Futures': {
        if (p.quote_currency === 'USDT') {
          const minBaseQuantity = parseFloat(p.trade_increment) * parseFloat(p.contract_val);
          market.precision.base = -Math.log10(minBaseQuantity);
          market.minQuantity!.base = minBaseQuantity;
        } else {
          assert.equal(p.quote_currency, 'USD'); // TODO
        }
        break;
      }
      case 'Swap': {
        // TODO
        market.precision.base = -1;
        market.minQuantity!.base = -1;
        break;
      }
      default:
        throw new Error(`Unknown marketType: ${marketType}`);
    }

    return market;
  });

  return result;
}

export async function fetchMarkets(marketType?: MarketType): Promise<Market[]> {
  if (marketType) {
    return fetchMarketsByType(marketType);
  }
  const spot = await fetchMarketsByType('Spot');
  const futures = await fetchMarketsByType('Futures');
  const swap = await fetchMarketsByType('Swap');

  return spot.concat(futures).concat(swap);
}
