/**
 * Flag emoji for a book's *edition* language, keyed by the English language name
 * as stored in the sheet. Used as a leading marker in the Language filter menu.
 *
 * Only languages that plausibly appear as an edition language need an entry;
 * anything unmapped (e.g. Galician, which has no country-flag emoji) simply shows
 * no flag rather than a misleading one.
 */
const LANGUAGE_FLAG: Record<string, string> = {
  English: '🇬🇧',
  Spanish: '🇪🇸',
  French: '🇫🇷',
  Italian: '🇮🇹',
  German: '🇩🇪',
  Portuguese: '🇵🇹',
  Dutch: '🇳🇱',
  Polish: '🇵🇱',
  Czech: '🇨🇿',
  Russian: '🇷🇺',
  Swedish: '🇸🇪',
  Norwegian: '🇳🇴',
  Danish: '🇩🇰',
  Finnish: '🇫🇮',
  Greek: '🇬🇷',
  Korean: '🇰🇷',
  Japanese: '🇯🇵',
  Chinese: '🇨🇳',
  Catalan: '🇪🇸',
  Hungarian: '🇭🇺',
  Romanian: '🇷🇴',
  Turkish: '🇹🇷',
  Arabic: '🇸🇦',
  Hebrew: '🇮🇱',
}

/** The flag emoji for a language, or `undefined` when there's no clean flag. */
export function languageFlag(language: string): string | undefined {
  return LANGUAGE_FLAG[language.trim()]
}
