import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useVocab } from '@/i18n/vocab'
import type { ZoneColors } from './zoneColors'

/**
 * Past this many explicit slices, the remainder folds into "Other" — same
 * ladder as the dataviz skill's series guidance, applied to a themes-by-count
 * pie rather than a fresh categorical palette.
 */
const MAX_SLICES = 6

interface Slice {
  name: string
  count: number
  color: string
  fraction: number
}

function toSlices(counts: [string, number][]): Omit<Slice, 'color'>[] {
  const ranked = [...counts].sort((a, b) => b[1] - a[1])
  const top = ranked.slice(0, MAX_SLICES)
  const rest = ranked.slice(MAX_SLICES)
  const total = ranked.reduce((sum, [, n]) => sum + n, 0)
  if (total === 0) return []

  const slices: Omit<Slice, 'color'>[] = top.map(([name, count]) => ({
    name,
    count,
    fraction: count / total,
  }))
  if (rest.length > 0) {
    const restCount = rest.reduce((sum, [, n]) => sum + n, 0)
    slices.push({ name: 'other', count: restCount, fraction: restCount / total })
  }
  return slices
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  // A full circle can't be drawn as a single arc; nudge it just under 360°.
  const clampedEnd = endAngle - startAngle >= Math.PI * 2 ? startAngle + Math.PI * 2 - 0.0001 : endAngle
  const start = polarToCartesian(cx, cy, r, clampedEnd)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = clampedEnd - startAngle > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`
}

/**
 * A pie chart (with legend) of book counts by theme. Renders nothing when
 * there's no data. Colored by each theme's parent zone (via `zoneColor`),
 * the same hue already used for the theme chip dot in `FilterBar`/`BookTable`
 * — reusing the app's existing per-zone palette rather than a fresh
 * categorical one keeps this chart visually consistent with the rest of the
 * app. Identity is never color-alone: every slice is also named in the
 * legend (and on hover), so the color is a reinforcing cue, not the only one.
 * Slices (except the folded "Other") link to `/?theme=<name>`.
 */
export function ThemePieChart({
  counts,
  zoneOf,
  zoneColor,
}: {
  /** `[themeName, bookCount]` pairs. */
  counts: [string, number][]
  /** Theme name → parent zone name. */
  zoneOf: (theme: string) => string
  zoneColor: (zoneName: string) => ZoneColors
}) {
  const navigate = useNavigate()
  const tv = useVocab()
  const [hovered, setHovered] = useState<string | null>(null)
  const slices = toSlices(counts).map((slice) => ({
    ...slice,
    color: slice.name === 'other' ? 'var(--muted-foreground)' : zoneColor(zoneOf(slice.name)).fg,
  }))
  if (slices.length === 0) return null

  const r = 40
  const cx = 44
  const cy = 44
  let angle = -Math.PI / 2 // 12 o'clock
  const arcs = slices.map((slice) => {
    const startAngle = angle
    const endAngle = angle + slice.fraction * Math.PI * 2
    angle = endAngle
    return { ...slice, d: arcPath(cx, cy, r, startAngle, endAngle) }
  })

  const clickable = (name: string) => name !== 'other'
  const goToTheme = (name: string) => {
    if (!clickable(name)) return
    navigate(`/?theme=${encodeURIComponent(name)}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-4 pt-1">
      <svg viewBox="0 0 88 88" className="size-24 shrink-0" role="img" aria-label="books by theme">
        {arcs.map((arc) => (
          <Tooltip key={arc.name}>
            <TooltipTrigger asChild>
              <path
                d={arc.d}
                fill={arc.color}
                stroke="var(--card)"
                strokeWidth="1"
                opacity={hovered && hovered !== arc.name ? 0.4 : 1}
                className={`transition-opacity ${clickable(arc.name) ? 'cursor-pointer' : ''}`}
                onClick={() => goToTheme(arc.name)}
                onMouseEnter={() => setHovered(arc.name)}
                onMouseLeave={() => setHovered(null)}
              />
            </TooltipTrigger>
            <TooltipContent>
              {arc.name === 'other' ? arc.name : tv('theme', arc.name)} · {arc.count}
            </TooltipContent>
          </Tooltip>
        ))}
      </svg>
      <div className="flex flex-col gap-1">
        {arcs.map((arc) => (
          <div
            key={arc.name}
            className={`flex items-center gap-1.5 rounded-sm px-1 -mx-1 text-xs transition-colors ${clickable(arc.name) ? 'cursor-pointer' : ''} ${hovered === arc.name ? 'bg-muted' : ''}`}
            onClick={() => goToTheme(arc.name)}
            onMouseEnter={() => setHovered(arc.name)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ backgroundColor: arc.color }} aria-hidden />
            <span className="text-muted-foreground">{arc.name === 'other' ? arc.name : tv('theme', arc.name)}</span>
            <span className="font-medium">{arc.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
