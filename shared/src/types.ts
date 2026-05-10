import { Exchanges, KlineIntervals, Symbols } from 'shared/src/constants.js';
import { Decimal } from 'shared/src/decimal.js';

export type Symbol = keyof typeof Symbols;

export type Exchange = keyof typeof Exchanges;

export type KlineInterval = keyof typeof KlineIntervals;

export type Kline = {
  openTime: Date;
  closeTime: Date;
  open: Decimal;
  high: Decimal;
  low: Decimal;
  close: Decimal;
  volume: Decimal;
  trades: number;
};

export type KlineDTO = {
  openTime: string;
  closeTime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  trades: number;
  isClosed: boolean;
};
