import { Symbols, Exchanges } from 'shared/src/constants.js';

export type Symbol = keyof typeof Symbols;

export type Exchange = keyof typeof Exchanges;
