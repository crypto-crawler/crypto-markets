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

export function calcPrecision(number: string | number): number {
  const n = -Math.log10(typeof number === 'string' ? parseFloat(number) : (number as number));
  return n === 0 ? 0 : n;
}
