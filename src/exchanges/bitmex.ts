import { strict as assert } from 'assert';
import Axios from 'axios';
import { normalizePair, normalizeSymbol } from 'crypto-pair';
import { Market, MarketType } from '../pojo/market';
import { calcPrecision } from '../utils';

// see https://bitmexapi.com/
interface Instrument {
  symbol: string;
  rootSymbol: string;
  state: 'Open' | 'Settled' | 'Unlisted';
  typ: 'FFCCSX' | 'FFWCSX' | 'OCECCS' | 'OPECCS' | 'MRCXXX' | 'FMXXS';
  listing: string;
  front: string;
  expiry: string;
  settle: string;
  relistInterval: string;
  inverseLeg: string;
  sellLeg: string;
  buyLeg: string;
  optionStrikePcnt: number;
  optionStrikeRound: number;
  optionStrikePrice: number;
  optionMultiplier: number;
  positionCurrency: string;
  underlying: string;
  quoteCurrency: string;
  underlyingSymbol: string;
  reference: 'BMEX' | 'BMI';
  referenceSymbol: string;
  calcInterval: string;
  publishInterval: string;
  publishTime: string;
  maxOrderQty: number;
  maxPrice: number;
  lotSize: number;
  tickSize: number;
  multiplier: number;
  settlCurrency: string;
  underlyingToPositionMultiplier: number;
  underlyingToSettleMultiplier: number;
  quoteToSettleMultiplier: number;
  isQuanto: boolean;
  isInverse: boolean;
  initMargin: number;
  maintMargin: number;
  riskLimit: number;
  riskStep: number;
  limit: number;
  capped: boolean;
  taxed: boolean;
  deleverage: boolean;
  makerFee: number;
  takerFee: number;
  settlementFee: number;
  insuranceFee: number;
  fundingBaseSymbol: string;
  fundingQuoteSymbol: string;
  fundingPremiumSymbol: string;
  fundingTimestamp: string;
  fundingInterval: string;
  fundingRate: number;
  indicativeFundingRate: number;
  rebalanceTimestamp: string;
  rebalanceInterval: string;
  openingTimestamp: string;
  closingTimestamp: string;
  sessionInterval: string;
  prevClosePrice: number;
  limitDownPrice: number;
  limitUpPrice: number;
  bankruptLimitDownPrice: number;
  bankruptLimitUpPrice: number;
  prevTotalVolume: number;
  totalVolume: number;
  volume: number;
  volume24h: number;
  prevTotalTurnover: number;
  totalTurnover: number;
  turnover: number;
  turnover24h: number;
  homeNotional24h: number;
  foreignNotional24h: number;
  prevPrice24h: number;
  vwap: number;
  highPrice: number;
  lowPrice: number;
  lastPrice: number;
  lastPriceProtected: number;
  lastTickDirection: string;
  lastChangePcnt: number;
  bidPrice: number;
  midPrice: number;
  askPrice: number;
  impactBidPrice: number;
  impactMidPrice: number;
  impactAskPrice: number;
  hasLiquidity: boolean;
  openInterest: number;
  openValue: number;
  fairMethod: string;
  fairBasisRate: number;
  fairBasis: number;
  fairPrice: number;
  markMethod: string;
  markPrice: number;
  indicativeTaxRate: number;
  indicativeSettlePrice: number;
  optionUnderlyingPrice: number;
  settledPrice: number;
  timestamp: string;
}

// eslint-disable-next-line import/prefer-default-export
export async function fetchMarkets(marketType?: MarketType): Promise<readonly Market[]> {
  const response = await Axios.get('https://www.bitmex.com/api/v1/instrument/active');
  assert.equal(response.status, 200);
  assert.equal(response.statusText, 'OK');

  const arr: readonly Instrument[] = response.data;

  const result: Market[] = arr
    .filter((x) => x.typ === 'FFCCSX' || x.typ === 'FFWCSX')
    .map((instrument) => {
      const baseId = instrument.rootSymbol;
      const quoteId = instrument.quoteCurrency;
      const base = normalizeSymbol(baseId, 'BitMEX');
      const quote = normalizeSymbol(quoteId, 'BitMEX');

      const market: Market = {
        exchange: 'BitMEX',
        type: instrument.typ === 'FFCCSX' ? 'Futures' : 'Swap',
        id: instrument.symbol,
        pair: `${base}_${quote}`,
        base,
        quote,
        baseId,
        quoteId,
        active: instrument.state === 'Open',
        fees: {
          maker: instrument.makerFee,
          taker: instrument.takerFee,
        },
        precision: {
          price: calcPrecision(instrument.tickSize),
          base: calcPrecision(instrument.lotSize),
        },
        minQuantity: { base: instrument.lotSize },
        info: instrument,
      };
      assert.equal(market.pair, normalizePair(market.id, 'BitMEX'));

      return market;
    })
    .sort((x, y) => x.pair.localeCompare(y.pair));

  return marketType ? result.filter((x) => x.type === marketType) : result;
}
