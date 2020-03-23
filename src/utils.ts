import { Market } from './pojo/market';

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

export function calcPrecision(numberStr: string): number {
  const n = -Math.log10(parseFloat(numberStr));
  return n === 0 ? 0 : n;
}
