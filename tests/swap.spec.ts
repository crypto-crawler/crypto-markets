import fetchMarkets from '../src/index';

beforeAll(async () => {
  jest.setTimeout(20 * 1000);
});

const SWAP_EXCHANGES = ['Binance', 'BitMEX', 'Bitfinex', 'OKEx', 'Huobi'];

describe('market.pair and market.id should be unique in Swap market', () => {
  test.each(SWAP_EXCHANGES)('%p', async (exchange) => {
    const markets = await fetchMarkets(exchange, 'Swap');
    const dedupPair = new Set(markets.map((m) => m.pair));
    const dedupId = new Set(markets.map((m) => m.id));
    expect(markets.length).toEqual(dedupPair.size);
    expect(markets.length).toEqual(dedupId.size);
  });
});
