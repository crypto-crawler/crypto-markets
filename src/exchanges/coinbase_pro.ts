import { strict as assert } from 'assert';
import axios from 'axios';
import { normalizePair } from 'crypto-pair';
import { Market, MarketType } from '../pojo/market';
import { calcPrecision } from '../utils';

export async function fetchSpotMarkets(): Promise<readonly Market[]> {
  const response = await axios.get('https://api.pro.coinbase.com/products');
  assert.equal(response.status, 200);
  assert.equal(response.statusText, 'OK');
  const arr = response.data as ReadonlyArray<{
    id: string;
    base_currency: string;
    quote_currency: string;
    base_min_size: string;
    base_max_size: string;
    quote_increment: string;
    base_increment: string;
    display_name: string;
    min_market_funds: string;
    max_market_funds: string;
    margin_enabled: boolean;
    post_only: boolean;
    limit_only: boolean;
    cancel_only: boolean;
    status: string;
    status_message: string;
  }>;

  const result: Market[] = arr.map((pair) => {
    const market: Market = {
      exchange: 'CoinbasePro',
      type: 'Spot',
      id: pair.id,
      pair: `${pair.base_currency}_${pair.quote_currency}`,
      base: pair.base_currency,
      quote: pair.quote_currency,
      baseId: pair.base_currency,
      quoteId: pair.quote_currency,
      active: pair.status === 'online',
      // see https://pro.coinbase.com/fees, https://pro.coinbase.com/orders/fees
      fees: {
        maker: 0.005,
        taker: 0.005,
      },
      precision: {
        price: calcPrecision(pair.quote_increment),
        base: calcPrecision(pair.base_increment),
        quote: calcPrecision(pair.quote_increment),
      },
      minQuantity: {
        base: parseFloat(pair.base_min_size),
        quote: parseFloat(pair.min_market_funds),
      },
      info: pair,
    };

    assert.equal(market.pair, normalizePair(market.id, 'CoinbasePro'));

    return market;
  });

  return result;
}

export async function fetchMarkets(marketType?: MarketType): Promise<readonly Market[]> {
  if (marketType) {
    return marketType === 'Spot' ? fetchSpotMarkets() : [];
  }
  return fetchSpotMarkets();
}
