import type { Locale } from './types';

export enum Locales {
  en = 'en',
  ru = 'ru',
}

export const DEFAULT_LOCALE = Locales.en;

export const LOCALES_LABELS: Record<Locale, string> = {
  [Locales.en]: 'English',
  [Locales.ru]: 'Русский',
};
