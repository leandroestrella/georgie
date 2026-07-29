/**
 * Built-in **fallback** emoji per zone, used only when the sheet's `Marker`
 * column doesn't supply one for that zone (see docs/markers.md). Keyed by the
 * zone name exactly as it appears in the `Zones` tab. Prefer the sheet column;
 * zones with neither a marker nor an entry here simply show nothing.
 */
export const ZONE_EMOJI: Record<string, string> = {
  'The Reading Room (Living Fiction)': '🌐',
  'The Old Library (Canon & Antiquity)': '🏛️',
  'The Archive (Witness & Record)': '📰',
  'The Studio (Making & Images)': '📐',
  'The Commons (Power & Collective Life)': '✊',
  'The Self (Inner Life & Memory)': '🕯️',
  'The Machine (Systems & Signals)': '⚙️',
  'The Workshop (Skills & Instruments)': '🧵',
}

/** The emoji for a zone, or undefined if none is mapped. */
export function zoneEmoji(zone: string): string | undefined {
  return ZONE_EMOJI[zone.trim()]
}
