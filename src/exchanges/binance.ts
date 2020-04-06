import { strict as assert } from 'assert';
import Axios from 'axios';
import { normalizePair } from 'crypto-pair';
import { Market, MarketType } from '../pojo/market';
import { calcPrecision } from '../utils';

export async function fetchSpotMarkets(): Promise<readonly Market[]> {
  const response = await Axios.get('https://api.binance.com/api/v3/exchangeInfo');
  assert.equal(response.status, 200);
  assert.equal(response.statusText, 'OK');

  const arr = (
    response.data.symbols as
    ReadonlyArray<{
      symbol: string;
      status: string;
      baseAsset: string;
      baseAssetPrecision: number;
      quoteAsset: string;
      quotePrecision: number;
      isSpotTradingAllowed: boolean;
      filters: ReadonlyArray<{ filterType: string; [key: string]: string | number }>;
    }>
  ).filter((x) => x.isSpotTradingAllowed);

  const result: Market[] = arr.map((pair) => {
    pair.filters.forEach((f) => {
      delete f.maxQty; // eslint-disable-line no-param-reassign
    });

    const market: Market = {
      exchange: 'Binance',
      type: 'Spot',
      id: pair.symbol,
      pair: `${pair.baseAsset}_${pair.quoteAsset}`,
      base: pair.baseAsset,
      quote: pair.quoteAsset,
      baseId: pair.baseAsset,
      quoteId: pair.quoteAsset,
      active: pair.status === 'TRADING',
      // see https://www.binance.com/en/fee/trading
      fees: {
        maker: 0.001,
        taker: 0.001,
      },
      precision: {
        price: calcPrecision(
          pair.filters.filter((x) => x.filterType === 'PRICE_FILTER')[0].tickSize as string,
        ),
        base: calcPrecision(
          pair.filters.filter((x) => x.filterType === 'LOT_SIZE')[0].stepSize as string,
        ),
      },
      minQuantity: {
        base: parseFloat(
          pair.filters.filter((x) => x.filterType === 'LOT_SIZE')[0].minQty as string,
        ),
        quote: parseFloat(
          pair.filters.filter((x) => x.filterType === 'MIN_NOTIONAL')[0].minNotional as string,
        ),
      },
      info: pair,
    };

    assert.equal(market.pair, normalizePair(market.id, 'Binance'));

    return market;
  });

  return result.sort((x, y) => x.pair.localeCompare(y.pair));
}

export async function fetchSwapMarkets(): Promise<readonly Market[]> {
  const response = await Axios.get('https://fapi.binance.com/fapi/v1/exchangeInfo');
  assert.equal(response.status, 200);
  assert.equal(response.statusText, 'OK');

  const arr =
    response.data.symbols as
    ReadonlyArray<{
      symbol: string;
      status: string;
      maintMarginPercent: string;
      requiredMarginPercent: string;
      baseAsset: string;
      quoteAsset: string;
      pricePrecision: number;
      quantityPrecision: number;
      baseAssetPrecision: number;
      quotePrecision: number;
      filters: ReadonlyArray<{ filterType: string; [key: string]: string | number }>;
      orderTypes: string[];
      timeInForce: string;
    }>;

  const result: Market[] = arr.map((pair) => {
    pair.filters.forEach((f) => {
      delete f.maxQty; // eslint-disable-line no-param-reassign
    });

    const market: Market = {
      exchange: 'Binance',
      type: 'Swap', // see https://binance.zendesk.com/hc/en-us/articles/360033524991-Differences-Between-a-Perpetual-Contract-and-a-Traditional-Futures-Contract
      id: pair.symbol,
      pair: `${pair.baseAsset}_${pair.quoteAsset}`,
      base: pair.baseAsset,
      quote: pair.quoteAsset,
      baseId: pair.baseAsset,
      quoteId: pair.quoteAsset,
      active: pair.status === 'TRADING',
      // see https://www.binance.com/en/fee/futureFee
      fees: {
        maker: 0.0002,
        taker: 0.0004,
      },
      precision: {
        price: pair.pricePrecision,
        base: pair.quantityPrecision,
      },
      minQuantity: {
        base: parseFloat(
          pair.filters.filter((x) => x.filterType === 'LOT_SIZE')[0].minQty as string,
        ),
      },
      info: pair,
    };

    assert.equal(
      market.precision.price,
      calcPrecision(
        pair.filters.filter((x) => x.filterType === 'PRICE_FILTER')[0].tickSize as string,
      ),
    );
    assert.equal(
      market.precision.base,
      calcPrecision(pair.filters.filter((x) => x.filterType === 'LOT_SIZE')[0].stepSize as string),
    );

    // assert.equal(market.pair, normalizePair(market.id, 'Binance'));

    return market;
  });

  return result.sort((x, y) => x.pair.localeCompare(y.pair));
}

export async function fetchMarkets(marketType?: MarketType): Promise<readonly Market[]> {
  if (marketType) {
    switch (marketType) {
      case 'Spot':
        return fetchSpotMarkets();
      case 'Swap':
        return fetchSwapMarkets();
      default:
        throw new Error(`Unkown marketType ${marketType}, Binance has only Spot and Swap markets.`);
    }
  }
  const spot = await fetchSpotMarkets();
  const swap = await fetchSwapMarkets();

  return spot.concat(swap);
}
