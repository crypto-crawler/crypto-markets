export const SUPPORTED_EXCHANGES = [
  'Biki',
  'Binance',
  'Bitfinex',
  'Bitstamp',
  'Coinbase',
  'Coincheck',
  'Huobi',
  'Kraken',
  'MXC',
  'Newdex',
  'OKEx',
  'Poloniex',
  'Upbit',
  'WhaleEx',
  'Zaif',
  'ZB',
  'bitFlyer',
] as const;

export type SupportedExchange = typeof SUPPORTED_EXCHANGES[number];
