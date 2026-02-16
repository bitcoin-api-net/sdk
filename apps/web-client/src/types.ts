import { Locales } from './constants';

export type Locale = keyof typeof Locales;

export function isLocale(value: string): value is Locale {
  return Object.keys(Locales).includes(value);
}
