import { isLocale, type Locale } from 'src/types';
import { DEFAULT_LOCALE } from 'src/constants';

export class I18nService {
  constructor() {}

  collectionIdToLocale(collectionId: string): Omit<Locale, typeof DEFAULT_LOCALE> | undefined {
    if (!isLocale(collectionId)) return;
    if (collectionId === DEFAULT_LOCALE) return;
    return collectionId;
  }
}

export const i18nService = new I18nService();
