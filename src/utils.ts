import { Market } from './pojo/market';

// eslint-disable-next-line import/prefer-default-export
export function mergeMarkets(
  result: { [key: string]: Market[] },
  markets: { [key: string]: Market[] },
): void {
  Object.keys(markets).forEach((pair) => {
    if (pair in result) {
      result[pair] = result[pair].concat(markets[pair]); // eslint-disable-line no-param-reassign
    } else {
      result[pair] = markets[pair]; // eslint-disable-line no-param-reassign
    }
  });
}
