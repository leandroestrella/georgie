/**
 * Built-in **fallback** emoji per zone, used only when the sheet's `Marker`
 * column doesn't supply one for that zone (see docs/markers.md). Keyed by the
 * zone name exactly as it appears in the `Zones` tab. Prefer the sheet column;
 * zones with neither a marker nor an entry here simply show nothing.
 */
export const ZONE_EMOJI: Record<string, string> = {
  'Contemporary Art, Curation & Design': '🖍️',
  'Net-Art, Cybernetics & Sonic Fictions': '🤖',
  'Radical Politics, Philosophy & Society': '✊',
  'The Narrative Universes (Fiction & Poetry)': '🌐',
  'Mechanics, Travel & The Physical World': '🔭',
}

/** The emoji for a zone, or undefined if none is mapped. */
export function zoneEmoji(zone: string): string | undefined {
  return ZONE_EMOJI[zone.trim()]
}
