# crypto-markets

Get all trading pairs of a cryptocurrency exchange.

## How to use

```javascript
/* eslint-disable */
const fetchMarkets = require('crypto-markets').default;

(async () => {
  const markets = await fetchMarkets('OKEx');
  console.info(markets);
})();
```

## Give it a try

```bash
npx crypto-markets OKEx
```

## API Manual

There is only one API in this library:

```typescript
/**
 * Fetch trading markets of a crypto exchange.
 * @param exchange The crypto exchange name
 * @param marketType Market type, if not provided, fetch all market types
 * @returns All trading markets
 */
export default function fetchMarkets(
  exchange: SupportedExchange,
  marketType?: MarketType,
): Promise<Market[]>;
```

## Supported Exchanges

- Biki
- Binance
- Bitfinex
- Bitstamp
- Coinbase
- Huobi
- Kraken
- MXC
- Newdex
- OKEx
- WhaleEx
- ZB
