import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useCatalog } from '@/catalog/CatalogProvider'

/**
 * Translations for the controlled vocabularies stored (canonically in English)
 * in the sheet: zone names, theme names, and language names. Owners are people's
 * names and are never translated.
 *
 * Zone and theme names/descriptions are entirely sheet-driven now (`Title (xx)`/
 * `Themes (xx)` columns on the `Zones` tab, resolved via `useCatalog()`'s
 * `zoneName`/`themeName`) — see docs/translations.md. Language names have no such
 * column on the `Lists` tab, so they stay in the lookup map below, kept as a plain
 * map rather than i18next keys because the canonical values contain characters
 * (".", ":", "&", "(") that clash with i18next key parsing. Any value without a
 * translation falls back to the English original.
 */
export type VocabKind = 'zone' | 'theme' | 'language'

type VocabMap = Partial<Record<'language', Record<string, string>>>

const IT: VocabMap = {
  language: {
    English: 'Inglese',
    Spanish: 'Spagnolo',
    French: 'Francese',
    Italian: 'Italiano',
    Polish: 'Polacco',
    Portuguese: 'Portoghese',
    Swedish: 'Svedese',
    Czech: 'Ceco',
    German: 'Tedesco',
    Galician: 'Galiziano',
    Dutch: 'Olandese',
    Russian: 'Russo',
    Norwegian: 'Norvegese',
    Korean: 'Coreano',
    'Ancient Greek': 'Greco antico',
    Aramaic: 'Aramaico',
    'Classical Latin': 'Latino classico',
    'Classical Chinese': 'Cinese classico',
    Kannada: 'Kannada',
    Arabic: 'Arabo',
  },
}

const ES: VocabMap = {
  language: {
    English: 'Inglés',
    Spanish: 'Español',
    French: 'Francés',
    Italian: 'Italiano',
    Polish: 'Polaco',
    Portuguese: 'Portugués',
    Swedish: 'Sueco',
    Czech: 'Checo',
    German: 'Alemán',
    Galician: 'Gallego',
    Dutch: 'Neerlandés',
    Russian: 'Ruso',
    Norwegian: 'Noruego',
    Korean: 'Coreano',
    'Ancient Greek': 'Griego antiguo',
    Aramaic: 'Arameo',
    'Classical Latin': 'Latín clásico',
    'Classical Chinese': 'Chino clásico',
    Kannada: 'Canarés',
    Arabic: 'Árabe',
  },
}

const VOCAB: Record<string, VocabMap> = { it: IT, es: ES }

/** Translates a language name, falling back to the English original. */
function translateLanguage(lang: string, value: string): string {
  return VOCAB[lang]?.language?.[value] ?? value
}

/**
 * Returns a `tv(kind, value)` translator bound to the current UI language. Zone
 * and theme names are resolved from the loaded taxonomy (sheet-driven); language
 * names come from the static map above. Must be called within a
 * {@link CatalogProvider} (true everywhere the app renders zone/theme content).
 */
export function useVocab() {
  const { i18n } = useTranslation()
  const lang = i18n.resolvedLanguage ?? 'en'
  const { zoneName, themeName } = useCatalog()
  return useCallback(
    (kind: VocabKind, value: string) => {
      if (kind === 'zone') return zoneName(value, lang)
      if (kind === 'theme') return themeName(value, lang)
      return translateLanguage(lang, value)
    },
    [lang, zoneName, themeName],
  )
}
