import { Symbols } from 'core/src/constants.js';
import { Exchanges } from 'core/src/constants.js';

export type Symbol = keyof typeof Symbols;

export type Exchange = keyof typeof Exchanges;
