import { strict as assert } from 'assert';
import axios from 'axios';
import { normalizePair } from 'crypto-pair';
import { Market, MarketType } from '../pojo/market';

// doc: https://docs.bitfinex.com/docs

async function getNameMapping(): Promise<{ [key: string]: string }> {
  const response = await axios.get('https://api-pub.bitfinex.com/v2/conf/pub:map:currency:sym');
  const arr = response.data[0] as [string, string][];
  const result: { [key: string]: string } = {};
  arr.sort().forEach((x) => {
    const [key, value] = x;
    result[key] = value.toUpperCase();
  });
  return result;
}

function extractNormalizedPair(
  rawPair: string,
  mapping: { [key: string]: string },
): [string, string] {
  rawPair = rawPair.toUpperCase(); // eslint-disable-line no-param-reassign

  let baseSymbol = '';
  let quoteSymbol = '';
  if (rawPair.includes(':')) {
    [baseSymbol, quoteSymbol] = rawPair.split(':');
    if (baseSymbol.endsWith('F0')) baseSymbol = baseSymbol.substring(0, baseSymbol.length - 2);
    if (quoteSymbol.endsWith('F0')) quoteSymbol = quoteSymbol.substring(0, quoteSymbol.length - 2);
  } else {
    baseSymbol = rawPair.slice(0, rawPair.length - 3);
    quoteSymbol = rawPair.slice(rawPair.length - 3);
  }

  if (baseSymbol in mapping) baseSymbol = mapping[baseSymbol];
  if (quoteSymbol in mapping) quoteSymbol = mapping[quoteSymbol];

  if (baseSymbol === 'HOT') baseSymbol = 'HYDRO';
  if (baseSymbol === 'ORS') baseSymbol = 'ORSGROUP';

  return [baseSymbol, quoteSymbol];
}

// eslint-disable-next-line import/prefer-default-export
export async function fetchMarkets(marketType?: MarketType): Promise<readonly Market[]> {
  const response = await axios.get('https://api.bitfinex.com/v1/symbols_details');
  assert.equal(response.status, 200);
  assert.equal(response.statusText, 'OK');

  const mapping = await getNameMapping();
  const arr = response.data as ReadonlyArray<{
    pair: string;
    price_precision: number;
    initial_margin: string;
    minimum_margin: string;
    maximum_order_size: string;
    minimum_order_size: string;
    expiration: string;
    margin: boolean;
  }>;

  const result: Market[] = arr
    .map((pair) => {
      const [baseSymbol, quoteSymbol] = extractNormalizedPair(pair.pair, mapping);

      const market: Market = {
        exchange: 'Bitfinex',
        type: pair.pair.endsWith(':ustf0') ? 'Swap' : 'Spot',
        id: pair.pair,
        pair: `${baseSymbol}_${quoteSymbol}`,
        base: baseSymbol,
        quote: quoteSymbol,
        baseId: baseSymbol,
        quoteId: quoteSymbol,
        active: true,
        // see https://www.bitfinex.com/fees
        fees: {
          maker: 0.001,
          taker: 0.002,
        },
        precision: {
          price: pair.price_precision,
          base: 8, // see https://github.com/bitfinexcom/bfx-api-node-util/blob/master/lib/precision.js
        },
        minQuantity: { base: parseFloat(pair.minimum_order_size) },
        info: pair,
      };
      assert.equal(market.pair, normalizePair(market.id, 'Bitfinex'));

      return market;
    })
    .sort((x, y) => x.pair.localeCompare(y.pair));

  return marketType ? result.filter((x) => x.type === marketType) : result;
}
