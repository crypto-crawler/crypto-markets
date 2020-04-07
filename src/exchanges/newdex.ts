import { strict as assert } from 'assert';
import Axios from 'axios';
import { normalizePair } from 'crypto-pair';
import { EOS_API_ENDPOINTS, getTableRows, TableRows } from 'eos-utils';
import { Market, MarketType } from '../pojo/market';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const promiseAny = require('promise.any');

interface NewdexPairInfo {
  pair_id: number;
  price_precision: number;
  status: number;
  base_symbol: {
    contract: string;
    sym: string;
  };
  quote_symbol: {
    contract: string;
    sym: string;
  };
  manager: string;
  list_time: string;
  pair_symbol: string;
  pair_fee: number;
}

async function getTableRowsRobust(table: string, lower_bound?: number): Promise<TableRows> {
  return promiseAny(
    EOS_API_ENDPOINTS.map((url) =>
      getTableRows(
        {
          code: 'newdexpublic',
          scope: 'newdexpublic',
          table,
          lower_bound,
        },
        url,
      ),
    ),
  );
}

async function getGlobalConfig(): Promise<{
  status: boolean;
  maker_fee: number;
  taker_fee: number;
}> {
  const tableRows = await getTableRowsRobust('globalconfig');
  assert.ok(!tableRows.more);

  const arr = tableRows.rows as Array<{
    global_id: number;
    key: string;
    value: string;
    memo: string;
  }>;

  const result = {
    status: arr[1].value === '1', // 交易所运行状态(1-正常，0-维护)
    taker_fee: parseInt(arr[2].value, 10) / 10000,
    maker_fee: parseInt(arr[3].value, 10) / 10000,
  };
  return result;
}

// For repeated pairs, for example, bitpietokens-eeth-eos and
// ethsidechain-eeth-eos both has the same pair EETH_EOS, choose
// the one with larger trading volume
async function removePairByVolume(): Promise<readonly string[]> {
  // Get 24 hour volume
  const response = await Axios.get('https://api.newdex.io/v1/tickers');

  assert.equal(response.status, 200);
  assert.equal(response.data.code, 200);

  interface Ticker24hr {
    pair: string;
    symbol: string;
    contract: string;
    currency: string;
    last: number;
    change: number;
    high: number;
    low: number;
    amount: number;
    volume: number;
  }

  const arr = response.data.data as ReadonlyArray<Ticker24hr>;

  arr.forEach((x) => {
    x.pair = normalizePair(x.symbol, 'Newdex'); // eslint-disable-line no-param-reassign
  });

  const pairTickers: { [key: string]: Ticker24hr[] } = {};
  arr.forEach((x) => {
    if (!(x.pair in pairTickers)) pairTickers[x.pair] = [];
    pairTickers[x.pair].push(x);
  });

  const toBeRemoved: string[] = [];

  Object.keys(pairTickers).forEach((pair) => {
    const tickers = pairTickers[pair].sort((x, y) => x.volume - y.volume);
    if (tickers.length <= 1) return;

    const removed = tickers.slice(0, tickers.length - 1).map((x) => x.symbol);
    toBeRemoved.push(...removed);
  });

  return arr.map((x) => x.symbol).filter((x) => !toBeRemoved.includes(x));
}

export async function fetchSpotMarkets(): Promise<readonly Market[]> {
  const arr: NewdexPairInfo[] = [];
  let more = true;
  let lowerBound = 1;
  while (more) {
    // eslint-disable-next-line no-await-in-loop
    const result = await getTableRowsRobust('exchangepair', lowerBound);
    const pairs = result.rows as NewdexPairInfo[];
    // if (filter !== 'All') pairs = pairs.filter((x) => x.status === 0);
    arr.push(...pairs);
    more = result.more;
    if (pairs.length > 0) {
      lowerBound = Math.max(...pairs.map((x) => x.pair_id)) + 1;
    }
  }

  const config = await getGlobalConfig();
  const marketWithVolume = await removePairByVolume();

  const result: Market[] = arr.map((pairInfo) => {
    let baseSymbol = pairInfo.base_symbol.sym.split(',')[1];
    if (baseSymbol === 'KEY') baseSymbol = 'MYKEY';
    const quoteSymbol = pairInfo.quote_symbol.sym.split(',')[1];

    const market: Market = {
      exchange: 'Newdex',
      type: 'Spot',
      id: pairInfo.pair_symbol,
      pair: `${baseSymbol}_${quoteSymbol}`,
      base: baseSymbol,
      quote: quoteSymbol,
      baseId: baseSymbol,
      quoteId: quoteSymbol,
      active: pairInfo.status === 0,
      // see https://newdex.zendesk.com/hc/en-us/articles/360015745751-Rate-standard
      fees: {
        maker: config.maker_fee,
        taker: config.taker_fee,
      },
      precision: {
        price: pairInfo.price_precision,
        base: parseInt(pairInfo.base_symbol.sym.split(',')[0], 10),
        quote: parseInt(pairInfo.quote_symbol.sym.split(',')[0], 10),
      },
      minQuantity: {
        quote: 0.01, // for EOS
      },
      info: pairInfo,
    };
    assert.equal(market.pair, normalizePair(market.id, 'Newdex'));

    delete market.info.current_price;

    return market;
  });

  return result
    .filter((x) => marketWithVolume.includes(x.id))
    .sort((x, y) => x.pair.localeCompare(y.pair));
}

export async function fetchMarkets(marketType?: MarketType): Promise<readonly Market[]> {
  if (marketType) {
    return marketType === 'Spot' ? fetchSpotMarkets() : [];
  }
  return fetchSpotMarkets();
}
