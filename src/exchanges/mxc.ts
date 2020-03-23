import { strict as assert } from 'assert';
import axios from 'axios';
import { normalizePair } from 'crypto-pair';
import { Market, MarketType } from '../pojo/market';

export async function fetchSpotMarkets(): Promise<Market[]> {
  const response = await axios.get('https://www.mxc.com/open/api/v1/data/markets_info');
  assert.equal(response.status, 200);
  assert.equal(response.data.code, 200);

  const data = response.data.data as {
    [key: string]: {
      priceScale: number;
      quantityScale: number;
      minAmount: number;
      buyFeeRate: number;
      sellFeeRate: number;
    };
  };

  const result: Market[] = [];
  Object.keys(data).forEach((key) => {
    const pairInfo = data[key];
    const [base, quote] = key.split('_');

    const market: Market = {
      exchange: 'MXC',
      id: key,
      pair: key,
      base,
      quote,
      baseId: base,
      quoteId: quote,
      active: true,
      marketType: 'Spot',
      // see https://www.mxc.com/intro/fees
      fees: {
        maker: 0.002,
        taker: 0.002,
      },
      precision: {
        price: pairInfo.priceScale,
        base: pairInfo.quantityScale,
        quote: pairInfo.priceScale,
      },
      minQuantity: {
        base: 0,
        quote: pairInfo.minAmount,
      },
      info: pairInfo,
    };
    assert.equal(market.pair, normalizePair(market.id, 'MXC'));

    result.push(market);
  });

  return result;
}

export async function fetchMarkets(marketType?: MarketType): Promise<Market[]> {
  if (marketType) {
    return marketType === 'Spot' ? fetchSpotMarkets() : [];
  }
  return fetchSpotMarkets();
}
