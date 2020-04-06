import fetchMarkets, { SUPPORTED_EXCHANGES } from '../src/index';

describe('market.pair and market.id should be unique in Spot market', () => {
  test.each(SUPPORTED_EXCHANGES)('%p', async (exchange) => {
    const markets = await fetchMarkets(exchange, 'Spot');
    const dedupPair = new Set(markets.map((m) => m.pair));
    const dedupId = new Set(markets.map((m) => m.id));
    expect(markets.length).toEqual(dedupPair.size);
    expect(markets.length).toEqual(dedupId.size);
  });
});
