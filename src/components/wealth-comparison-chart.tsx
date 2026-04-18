import { cva } from 'class-variance-authority'
import type { RentBuyYearPoint } from '../lib/rent-buy-sim'
import { cn } from '../lib/cn'

const wrapVariants = cva(
  'w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4',
)

const legendVariants = cva(
  'mt-3 flex flex-wrap gap-4 text-xs text-[var(--text)]',
)

type Props = {
  points: RentBuyYearPoint[]
  className?: string
}

export function WealthComparisonChart({ points, className }: Props) {
  if (points.length < 2) return null

  const w = 720
  const h = 260
  const padL = 56
  const padR = 24
  const padT = 20
  const padB = 36
  const innerW = w - padL - padR
  const innerH = h - padT - padB

  const maxYear = points[points.length - 1]?.year ?? 1
  const maxVal = Math.max(
    ...points.flatMap((p) => [p.buyNetWorth, p.rentNetWorth]),
    1,
  )
  const yMax = maxVal * 1.08

  const sx = (year: number) => padL + (year / maxYear) * innerW
  const sy = (v: number) => padT + innerH - (v / yMax) * innerH

  const buyPts = points.map((p) => `${sx(p.year)},${sy(p.buyNetWorth)}`).join(' ')
  const rentPts = points.map((p) => `${sx(p.year)},${sy(p.rentNetWorth)}`).join(' ')

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: padT + innerH * (1 - t),
    label: Math.round(yMax * t),
  }))

  return (
    <figure className={cn(wrapVariants(), className)}>
      <figcaption className="mb-2 text-sm font-medium text-[var(--text-h)]">
        Vermögensentwicklung: Immo-Netto vs. ETF-Depot
      </figcaption>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full max-h-[min(320px,55vh)]"
        role="img"
        aria-label="Immobilien-Nettovermögen versus ETF-Depot; Mietzahlungen sind nicht Bestandteil der ETF-Kurve"
      >
        <title>Vermögensverlauf Kauf vs. Miete</title>
        <desc>
          Kauf: Immobilienwert minus Restschuld. Miet-Szenario: nur
          ETF-Portfolio; gezahlte Miete erscheint nicht als Vermögen.
        </desc>

        {yTicks.map((t) => (
          <g key={t.label}>
            <line
              x1={padL}
              x2={w - padR}
              y1={t.y}
              y2={t.y}
              className="stroke-[var(--border)]"
              strokeWidth={1}
            />
            <text
              x={padL - 8}
              y={t.y + 4}
              textAnchor="end"
              className="fill-[var(--text)] text-[10px]"
            >
              {(t.label / 1000).toFixed(0)}k
            </text>
          </g>
        ))}

        <line
          x1={padL}
          x2={padL}
          y1={padT}
          y2={padT + innerH}
          className="stroke-[var(--border)]"
          strokeWidth={1}
        />
        <line
          x1={padL}
          x2={w - padR}
          y1={padT + innerH}
          y2={padT + innerH}
          className="stroke-[var(--border)]"
          strokeWidth={1}
        />

        <polyline
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={buyPts}
        />
        <polyline
          fill="none"
          stroke="var(--text)"
          strokeOpacity={0.55}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={rentPts}
        />

        <text
          x={padL + innerW / 2}
          y={h - 8}
          textAnchor="middle"
          className="fill-[var(--text)] text-[11px]"
        >
          Jahre
        </text>
      </svg>
      <div className={cn(legendVariants())}>
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block size-2.5 rounded-full bg-[var(--accent)]"
            aria-hidden
          />
          Kauf: Immobilienwert − Restschuld
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block size-2.5 rounded-full bg-[var(--text)] opacity-55"
            aria-hidden
          />
          Miete: nur ETF (EK + Sparrate; Miete nicht im Depot)
        </span>
      </div>
    </figure>
  )
}
