import { strict as assert } from 'assert';
import axios from 'axios';
import { normalizePair } from 'crypto-pair';
import { Market, MarketType } from '../pojo/market';

// https://support.kraken.com/hc/en-us/articles/205893708-Minimum-order-size-volume-
const MIN_BASE_QUANTITY: { [key: string]: number } = {
  ADA: 1,
  ATOM: 1,
  BAT: 50,
  BCH: 0.000002,
  BTC: 0.002,
  DAI: 10,
  DASH: 0.03,
  DOGE: 3000,
  EOS: 3,
  ETC: 0.3,
  ETH: 0.02,
  GNO: 0.03,
  ICX: 50,
  LINK: 10,
  LSK: 10,
  LTC: 0.1,
  MLN: 0.1,
  NANO: 10,
  OMG: 10,
  PAXG: 0.01,
  QTUM: 0.1,
  REP: 0.3,
  SC: 5000,
  USDC: 5,
  USDT: 5,
  WAVES: 10,
  XLM: 30,
  XMR: 0.1,
  XRP: 30,
  XTZ: 1,
  ZEC: 0.03,
};

function safeCurrencyCode(currencyId: string): string {
  let result = currencyId;
  if (currencyId.length > 3) {
    if (currencyId.indexOf('X') === 0 || currencyId.indexOf('Z') === 0) {
      result = currencyId.slice(1);
    }
  }

  if (result === 'XBT') result = 'BTC';
  if (result === 'XDG') result = 'DOGE';

  return result;
}

function extractNormalizedPair(pairInfo: KrakenPairInfo): [string, string] {
  const arr = pairInfo.wsname.split('/');
  assert.equal(arr.length, 2);
  for (let i = 0; i < arr.length; i += 1) {
    if (arr[i] === 'XBT') arr[i] = 'BTC';
    if (arr[i] === 'XDG') arr[i] = 'DOGE';
  }

  const base = safeCurrencyCode(pairInfo.base);
  const quote = safeCurrencyCode(pairInfo.quote);
  assert.equal(`${arr[0]}_${arr[1]}`, `${base}_${quote}`);

  return [base, quote];
}

interface KrakenPairInfo {
  altname: string;
  wsname: string;
  aclass_base: string;
  base: string;
  aclass_quote: string;
  quote: string;
  lot: string;
  pair_decimals: number;
  lot_decimals: number;
  lot_multiplier: number;
  fees: number[][];
  fees_maker: number[][];
  fee_volume_currency: string;
  margin_call: number;
  margin_stop: number;
}

export async function fetchSpotMarkets(): Promise<readonly Market[]> {
  const response = await axios.get('https://api.kraken.com/0/public/AssetPairs');
  assert.equal(response.status, 200);
  assert.equal(response.statusText, 'OK');
  assert.equal(response.data.error.length, 0);

  const data = response.data.result as { [key: string]: KrakenPairInfo };

  const result: Market[] = [];

  Object.keys(data).forEach((id) => {
    const pair = data[id];
    if (!pair.wsname) return;

    const [base, quote] = extractNormalizedPair(pair);

    const market: Market = {
      exchange: 'CoinbasePro',
      type: 'Spot',
      id,
      pair: `${base}_${quote}`,
      base,
      quote,
      baseId: base,
      quoteId: quote,
      active: true,
      // see https://support.kraken.com/hc/en-us/articles/360000526126-What-are-Maker-and-Taker-fees-
      fees: {
        maker: 0.0016,
        taker: 0.0026,
      },
      precision: {
        price: pair.pair_decimals,
        base: pair.lot_decimals,
        quote: pair.pair_decimals,
      },
      minQuantity: {
        base: MIN_BASE_QUANTITY[base],
      },
      info: pair,
    };

    assert.equal(market.pair, normalizePair(market.id, 'Kraken'));

    result.push(market);
  });

  return result.sort((x, y) => x.pair.localeCompare(y.pair));
}

export async function fetchMarkets(marketType?: MarketType): Promise<readonly Market[]> {
  if (marketType) {
    return marketType === 'Spot' ? fetchSpotMarkets() : [];
  }
  return fetchSpotMarkets();
}
