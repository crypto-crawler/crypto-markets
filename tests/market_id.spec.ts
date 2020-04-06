import fetchMarkets, { SUPPORTED_EXCHANGES } from '../src/index';

describe('market.id should be unique in each market', () => {
  test.each(SUPPORTED_EXCHANGES)('%p', async (exchange) => {
    const markets = await fetchMarkets(exchange);

    const marketIds = new Set(markets.map((m) => `${m.type}-${m.id}`));

    expect(markets.length).toEqual(marketIds.size);
  });
});
