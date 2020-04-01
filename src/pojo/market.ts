export const MARKET_TYPES = ['Spot', 'Futures', 'Swap', 'Option'] as const;
export type MarketType = typeof MARKET_TYPES[number];

export interface Market {
  exchange: string; // exchange name
  type: MarketType;
  id: string; // exchange-specific pair of trading currencies if Spot, or raw symbol if Fetures, Swap, Option
  pair: string; // unified pair of trading currencies, e.g., BTC_USDT
  base: string; // unified base currency, e.g., BTC
  quote: string; // unified quote currency, e.g., USDT
  baseId: string; // exchange-specific base currency
  quoteId: string; // exchange-specific quote currency
  active: boolean; // boolean, market status
  fees: {
    maker: number;
    taker: number;
  };
  // number of decimal digits "after the dot"
  precision: {
    price: number;
    base: number;
    quote?: number; // very few exchanges actually have it
  };
  // minimum quantity when placing orders
  minQuantity: {
    base?: number;
    quote?: number;
  };
  //  the original unparsed market info from the exchange
  info: { [key: string]: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
}
