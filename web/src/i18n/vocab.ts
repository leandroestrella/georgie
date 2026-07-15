import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Translations for the controlled vocabularies stored (canonically in English)
 * in the sheet: zone names, theme names, and language names. Owners are people's
 * names and are never translated.
 *
 * Kept as plain lookup maps rather than i18next keys because the canonical values
 * contain characters (".", ":", "&", "(") that clash with i18next key parsing.
 * Any value without a translation falls back to the English original.
 */
export type VocabKind = 'zone' | 'theme' | 'language'

type VocabMap = Partial<Record<VocabKind, Record<string, string>>>

const IT: VocabMap = {
  zone: {
    'Contemporary Art, Curation & Design': 'Arte contemporanea, curatela e design',
    'Net-Art, Cybernetics & Sonic Fictions': 'Net-art, cibernetica e finzioni sonore',
    'Radical Politics, Philosophy & Society': 'Politica radicale, filosofia e società',
    'The Narrative Universes (Fiction & Poetry)': 'Gli universi narrativi (narrativa e poesia)',
    'Mechanics, Travel & The Physical World': 'Meccanica, viaggi e mondo fisico',
  },
  theme: {
    'Art History & Theory': "Storia e teoria dell'arte",
    'Exhibitions & Catalogs': 'Mostre e cataloghi',
    'Architecture & Spatial Design': 'Architettura e design dello spazio',
    'Digital Theory': 'Teoria digitale',
    'Activism & Cyberculture': 'Attivismo e cybercultura',
    'Sonic Philosophy': 'Filosofia sonora',
    'Political Theory & Utopia': 'Teoria politica e utopia',
    'Philosophy & Existence': 'Filosofia ed esistenza',
    'Macro-History & Geopolitics': 'Macro-storia e geopolitica',
    'Dystopia & Alternate Realities': 'Distopia e realtà alternative',
    'Magical Realism & Core Literature': 'Realismo magico e letteratura fondamentale',
    'Contemporary & Short Stories': 'Contemporanea e racconti',
    Poetry: 'Poesia',
    'Science & Physics': 'Scienza e fisica',
    'Travel & Geography': 'Viaggi e geografia',
    'Manuals & Hobbies': 'Manuali e hobby',
  },
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
  },
}

const ES: VocabMap = {
  zone: {
    'Contemporary Art, Curation & Design': 'Arte contemporáneo, curaduría y diseño',
    'Net-Art, Cybernetics & Sonic Fictions': 'Net-art, cibernética y ficciones sónicas',
    'Radical Politics, Philosophy & Society': 'Política radical, filosofía y sociedad',
    'The Narrative Universes (Fiction & Poetry)': 'Los universos narrativos (ficción y poesía)',
    'Mechanics, Travel & The Physical World': 'Mecánica, viajes y mundo físico',
  },
  theme: {
    'Art History & Theory': 'Historia y teoría del arte',
    'Exhibitions & Catalogs': 'Exposiciones y catálogos',
    'Architecture & Spatial Design': 'Arquitectura y diseño espacial',
    'Digital Theory': 'Teoría digital',
    'Activism & Cyberculture': 'Activismo y cibercultura',
    'Sonic Philosophy': 'Filosofía sónica',
    'Political Theory & Utopia': 'Teoría política y utopía',
    'Philosophy & Existence': 'Filosofía y existencia',
    'Macro-History & Geopolitics': 'Macrohistoria y geopolítica',
    'Dystopia & Alternate Realities': 'Distopía y realidades alternativas',
    'Magical Realism & Core Literature': 'Realismo mágico y literatura fundamental',
    'Contemporary & Short Stories': 'Contemporánea y cuentos',
    Poetry: 'Poesía',
    'Science & Physics': 'Ciencia y física',
    'Travel & Geography': 'Viajes y geografía',
    'Manuals & Hobbies': 'Manuales y aficiones',
  },
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
  },
}

const VOCAB: Record<string, VocabMap> = { it: IT, es: ES }

/** Translates a controlled-vocabulary term for a language, falling back to the original. */
export function translateTerm(lang: string, kind: VocabKind, value: string): string {
  return VOCAB[lang]?.[kind]?.[value] ?? value
}

/** Returns a `tv(kind, value)` translator bound to the current UI language. */
export function useVocab() {
  const { i18n } = useTranslation()
  const lang = i18n.resolvedLanguage ?? 'en'
  return useCallback((kind: VocabKind, value: string) => translateTerm(lang, kind, value), [lang])
}
