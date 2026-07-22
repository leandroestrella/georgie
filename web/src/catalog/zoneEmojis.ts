/**
 * An emoji per zone, shown on each book (opposite the owner logo) as a quick
 * visual cue of which shelf-zone it belongs to. Keyed by the zone name exactly
 * as it appears in the `Zones` tab — same pattern as the owner logos.
 *
 * Add an entry when a new zone appears; zones without one simply show nothing.
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
