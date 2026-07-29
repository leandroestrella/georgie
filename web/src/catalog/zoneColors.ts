/**
 * Per-zone accent colors, mirroring the coloured shelves. The sheet has no colour
 * column yet, so we assign a stable hue per zone (by its order in the taxonomy)
 * and derive translucent tints that stay legible in both light and dark themes.
 */
export interface ZoneColors {
  hue: number
  /** translucent fill for badges/chips */
  bg: string
  /** text/icon colour */
  fg: string
  /** border colour */
  border: string
}

const ZONE_HUES = [262, 20, 150, 205, 42, 330, 95, 296]

function colorsForHue(hue: number): ZoneColors {
  return {
    hue,
    bg: `hsl(${hue} 65% 50% / 0.14)`,
    fg: `hsl(${hue} 55% 47%)`,
    border: `hsl(${hue} 55% 50% / 0.35)`,
  }
}

/** Neutral fallback for books whose theme has no resolvable zone. */
export const NEUTRAL_ZONE: ZoneColors = {
  hue: 0,
  bg: 'color-mix(in oklch, var(--muted-foreground) 12%, transparent)',
  fg: 'var(--muted-foreground)',
  border: 'var(--border)',
}

/** Builds a stable `zone name → colors` map from the taxonomy's zone order. */
export function buildZoneColorMap(zoneNames: string[]): Map<string, ZoneColors> {
  const map = new Map<string, ZoneColors>()
  zoneNames.forEach((name, i) => map.set(name, colorsForHue(ZONE_HUES[i % ZONE_HUES.length])))
  return map
}
