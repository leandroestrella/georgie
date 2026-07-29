import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Past this many explicit slices, the remainder folds into "➕ other". */
const MAX_SLICES = 6

export interface PieCount {
  /** Stable identity for hover/click; also the default label. */
  key: string
  /** Display label — already translated/formatted by the caller. */
  label: string
  count: number
  /** Solid fill for this slice — the caller decides the color (zone hue,
   *  validated categorical palette, etc.), so this component stays a plain
   *  "slices in, chart out" renderer with no color policy of its own. */
  color: string
  /** Where a click on this slice navigates to. Omit for non-clickable slices
   *  (the folded "other" is always non-clickable, whatever else is passed). */
  href?: string
}

interface Slice extends PieCount {
  fraction: number
  d: string
}

function toSlices(counts: PieCount[], maxSlices: number, otherColor: string, otherLabel: string): Slice[] {
  const ranked = [...counts].sort((a, b) => b.count - a.count)
  const top = ranked.slice(0, maxSlices)
  const rest = ranked.slice(maxSlices)
  const total = ranked.reduce((sum, c) => sum + c.count, 0)
  if (total === 0) return []

  const base: PieCount[] = [...top]
  if (rest.length > 0) {
    const restCount = rest.reduce((sum, c) => sum + c.count, 0)
    base.push({ key: 'other', label: `➕ ${otherLabel}`, count: restCount, color: otherColor })
  }

  const cx = 44
  const cy = 44
  const r = 40
  let angle = -Math.PI / 2 // 12 o'clock
  return base.map((c) => {
    const fraction = c.count / total
    const startAngle = angle
    const endAngle = angle + fraction * Math.PI * 2
    angle = endAngle
    return { ...c, fraction, d: arcPath(cx, cy, r, startAngle, endAngle) }
  })
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
 * A generic pie chart (with legend): counts in, an SVG + hover-linked legend
 * out. No color policy — callers pass each slice's color (a zone hue, a
 * validated categorical palette, a fixed two-tone pair, …) so this stays
 * reusable across the Overview page's zone/theme/language/read-rate charts.
 * Past `maxSlices` explicit entries, the remainder folds into "➕ other"
 * (matching linkulino's own fold icon, for a shared cross-app visual
 * language). Identity is never color-alone: every slice is named in the
 * legend and on hover, so color is a reinforcing cue, not the only one.
 */
export function CountPieChart({
  counts,
  ariaLabel,
  otherLabel,
  totalLabel,
  maxSlices = MAX_SLICES,
  otherColor = 'var(--muted-foreground)',
  size = 'size-24',
}: {
  counts: PieCount[]
  ariaLabel: string
  /** Label for the folded slice, e.g. t('overview.other') — already translated. */
  otherLabel: string
  /** When given, the summed slice total is shown under the chart as a bare
   *  number, with this label as its hover tooltip — the whole the slices are
   *  parts of. */
  totalLabel?: string
  maxSlices?: number
  otherColor?: string
  size?: string
}) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState<string | null>(null)
  const slices = toSlices(counts, maxSlices, otherColor, otherLabel)
  if (slices.length === 0) return null

  // Summed from the slices themselves, so it always equals the whole pie —
  // including the folded "other" — rather than a separately-derived number
  // that could drift from what's drawn.
  const total = slices.reduce((sum, s) => sum + s.count, 0)
  const clickable = (s: Slice) => !!s.href
  const go = (s: Slice) => {
    if (s.href) navigate(s.href)
  }

  return (
    // No flex-wrap: the legend must stay beside the chart, never drop below
    // it — a long label wraps to a second line within the legend's own
    // (shrinkable, min-w-0) column instead of the whole legend moving.
    <div className="flex items-start gap-4 pt-1">
      {/* Chart + total share a column so the total centers under the circle
          itself, not the whole row (which would skew left of center once the
          legend — often taller than the chart — sits beside it). */}
      <div className="flex shrink-0 flex-col items-center gap-1">
        <svg viewBox="0 0 88 88" className={`${size} shrink-0`} role="img" aria-label={ariaLabel}>
          {slices.map((s) => (
            <Tooltip key={s.key}>
              <TooltipTrigger asChild>
                <path
                  d={s.d}
                  fill={s.color}
                  stroke="var(--card)"
                  strokeWidth="1"
                  opacity={hovered && hovered !== s.key ? 0.4 : 1}
                  className={`transition-opacity ${clickable(s) ? 'cursor-pointer' : ''}`}
                  onClick={() => go(s)}
                  onMouseEnter={() => setHovered(s.key)}
                  onMouseLeave={() => setHovered(null)}
                />
              </TooltipTrigger>
              <TooltipContent>
                {s.label} · {s.count}
              </TooltipContent>
            </Tooltip>
          ))}
        </svg>
        {totalLabel && (
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-muted-foreground cursor-default text-xs font-medium">{total}</p>
            </TooltipTrigger>
            <TooltipContent>{totalLabel}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {slices.map((s) => (
          <div
            key={s.key}
            className={`flex min-w-0 items-center gap-1.5 rounded-sm px-1 -mx-1 text-xs transition-colors ${clickable(s) ? 'cursor-pointer' : ''} ${hovered === s.key ? 'bg-muted' : ''}`}
            onClick={() => go(s)}
            onMouseEnter={() => setHovered(s.key)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="font-medium">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
