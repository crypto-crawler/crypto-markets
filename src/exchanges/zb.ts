import { strict as assert } from 'assert';
import axios from 'axios';
import { normalizePair } from 'crypto-pair';
import { Market, MarketType } from '../pojo/market';

interface ZBPairInfo {
  amountScale: number;
  priceScale: number;
}

export async function fetchSpotMarkets(): Promise<readonly Market[]> {
  const response = await axios.get('http://api.zb.plus/data/v1/markets');
  assert.equal(response.status, 200);
  assert.equal(response.statusText, 'OK');

  const result: Market[] = [];

  const myMap = response.data as { [key: string]: ZBPairInfo };
  Object.keys(myMap).forEach((rawPair) => {
    const pair = rawPair.toUpperCase();
    const [base, quote] = pair.split('_');
    const [baseId, quoteId] = rawPair.split('_');

    const market: Market = {
      exchange: 'ZB',
      type: 'Spot',
      id: rawPair,
      pair,
      base,
      quote,
      baseId,
      quoteId,
      active: true,
      // see https://whaleex.zendesk.com/hc/zh-cn/articles/360015324891-%E4%BA%A4%E6%98%93%E6%89%8B%E7%BB%AD%E8%B4%B9
      fees: {
        maker: 0.001,
        taker: 0.001,
      },
      precision: {
        price: myMap[rawPair].priceScale,
        base: myMap[rawPair].amountScale,
      },
      minQuantity: {
        base: 10 ** -myMap[rawPair].amountScale,
      },
      info: myMap[rawPair],
    };
    assert.equal(market.pair, normalizePair(market.id, 'Biki'));

    result.push(market);
  });

  return result.sort((x, y) => x.pair.localeCompare(y.pair));
}

export async function fetchMarkets(marketType?: MarketType): Promise<readonly Market[]> {
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
