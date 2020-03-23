import { strict as assert } from 'assert';
import axios from 'axios';
import { normalizePair } from 'crypto-pair';
import { Market, MarketType } from '../pojo/market';

export async function fetchSpotMarkets(): Promise<Market[]> {
  const response = await axios.get('https://openapi.biki.com/open/api/common/symbols');
  assert.equal(response.status, 200);
  assert.equal(response.data.code, '0');
  assert.equal(response.data.msg, 'suc');

  const arr = response.data.data as ReadonlyArray<{
    symbol: string;
    count_coin: string;
    amount_precision: number;
    base_coin: string;
    limit_volume_min: string;
    price_precision: number;
  }>;

  const result: Market[] = arr.map((pair) => {
    const market: Market = {
      exchange: 'Biki',
      id: pair.symbol,
      pair: `${pair.base_coin}_${pair.count_coin}`,
      base: pair.base_coin,
      quote: pair.count_coin,
      baseId: pair.base_coin,
      quoteId: pair.count_coin,
      active: true,
      marketType: 'Spot',
      // see https://bikiuser.zendesk.com/hc/en-us/articles/360016487751-Announcement-on-canceling-the-free-trading-fee-for-four-trading-pairs
      fees: {
        maker: 0.0015,
        taker: 0.0015,
      },
      precision: {
        price: pair.price_precision,
        base: pair.amount_precision,
      },
      minQuantity: {
        base: 0, // TODO
        quote: parseFloat(pair.limit_volume_min),
      },
      info: pair,
    };
    assert.equal(market.pair, normalizePair(market.id, 'Biki'));

    return market;
  });

  return result;
}

export async function fetchMarkets(marketType?: MarketType): Promise<Market[]> {
  if (marketType) {
    switch (marketType) {
      case 'Spot':
        return fetchSpotMarkets();
      default:
        throw new Error(`Unknown marketType ${marketType}`);
    }
  }
  const spot = await fetchSpotMarkets();
  return spot;
}