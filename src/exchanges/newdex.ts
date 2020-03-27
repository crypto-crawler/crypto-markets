import { strict as assert } from 'assert';
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
        quote: 0.01, // TODO
      },
      info: pairInfo,
    };
    assert.equal(market.pair, normalizePair(market.id, 'Newdex'));

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
