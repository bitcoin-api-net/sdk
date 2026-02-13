import { ui, defaultLang, showDefaultLang } from './ui';

export function getLangFromUrl(url: URL): keyof typeof ui {
  const [, lang] = url.pathname.split('/');
  if (lang && lang in ui) return lang as keyof typeof ui;
  return defaultLang;
}

export function getLangFromCollectionEntry(entry: { slug: string }) {
  const [lang] = entry.slug.split('/');
  if (!lang) return;
  if (lang && lang === defaultLang) return;
  return lang;
}

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof (typeof ui)[typeof defaultLang]) {
    return ui[lang][key] ?? ui[defaultLang][key] ?? key;
  };
}

export function useTranslatedPath(lang: keyof typeof ui) {
  return function translatePath(path: string, l: string = lang) {
    const pathName = path.startsWith('/') ? path.slice(1) : path;
    const pathWithSlash = pathName ? `/${pathName}` : '/';
    return !showDefaultLang && l === defaultLang ? pathWithSlash : `/${l}${pathWithSlash}`;
  };
}
