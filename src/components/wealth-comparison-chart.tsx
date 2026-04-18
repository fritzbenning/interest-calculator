import { useState } from 'react'
import { cva } from 'class-variance-authority'
import { formatYearTickLabel, yearAxisTicks } from '../lib/chart-year-ticks'
import type { RentBuyYearPoint } from '../lib/rent-buy-sim'
import { cn } from '../lib/cn'
import { InfoTooltip } from './info-tooltip'

const wrapVariants = cva(
  'w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4',
)

const legendVariants = cva(
  'mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--text)]',
)

function splitSeries(points: RentBuyYearPoint[]) {
  const i = points.findIndex((p) => p.phase === 'projection')
  if (i === -1) {
    return { solid: points, dashed: [] as RentBuyYearPoint[] }
  }
  if (i === 0) {
    return { solid: [] as RentBuyYearPoint[], dashed: points }
  }
  return {
    solid: points.slice(0, i),
    dashed: points.slice(i - 1),
  }
}

function toPoints(
  pts: RentBuyYearPoint[],
  key: 'buyNetWorth' | 'buyEtfNetWorth' | 'rentNetWorth',
  sx: (y: number) => number,
  sy: (v: number) => number,
) {
  return pts.map((p) => `${sx(p.year)},${sy(p[key])}`).join(' ')
}

function toBuyTotalPoints(
  pts: RentBuyYearPoint[],
  sx: (y: number) => number,
  sy: (v: number) => number,
) {
  return pts
    .map((p) => {
      const v = p.buyNetWorth + p.buyEtfNetWorth
      return `${sx(p.year)},${sy(v)}`
    })
    .join(' ')
}

type Props = {
  points: RentBuyYearPoint[]
  className?: string
}

export function WealthComparisonChart({ points, className }: Props) {
  const [buyWealthMode, setBuyWealthMode] = useState<'split' | 'combined'>(
    'combined',
  )

  if (points.length < 2) return null

  const w = 720
  const h = 260
  const padL = 56
  const padR = 24
  const padT = 20
  const padB = 44
  const innerW = w - padL - padR
  const innerH = h - padT - padB

  const maxYear = points[points.length - 1]?.year ?? 1
  const maxVal = Math.max(
    ...points.flatMap((p) =>
      buyWealthMode === 'combined'
        ? [p.buyNetWorth + p.buyEtfNetWorth, p.rentNetWorth]
        : [p.buyNetWorth, p.buyEtfNetWorth, p.rentNetWorth],
    ),
    1,
  )
  const yMax = maxVal * 1.08

  const sx = (year: number) => padL + (year / maxYear) * innerW
  const sy = (v: number) => padT + innerH - (v / yMax) * innerH

  const buySplit = splitSeries(points)
  const buyEtfSplit = splitSeries(points)
  const rentSplit = splitSeries(points)

  const buySolid = toPoints(buySplit.solid, 'buyNetWorth', sx, sy)
  const buyDashed = toPoints(buySplit.dashed, 'buyNetWorth', sx, sy)
  const buyEtfSolid = toPoints(buyEtfSplit.solid, 'buyEtfNetWorth', sx, sy)
  const buyEtfDashed = toPoints(buyEtfSplit.dashed, 'buyEtfNetWorth', sx, sy)
  const buyTotalSolid = toBuyTotalPoints(buySplit.solid, sx, sy)
  const buyTotalDashed = toBuyTotalPoints(buySplit.dashed, sx, sy)
  const rentSolid = toPoints(rentSplit.solid, 'rentNetWorth', sx, sy)
  const rentDashed = toPoints(rentSplit.dashed, 'rentNetWorth', sx, sy)

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: padT + innerH * (1 - t),
    label: Math.round(yMax * t),
  }))

  const axisY = padT + innerH
  const xTickYears = yearAxisTicks(maxYear)

  const dashPattern = '7 5'

  return (
    <figure className={cn(wrapVariants(), className)}>
      <figcaption className="mb-2 flex items-start justify-between gap-3 text-sm font-medium text-[var(--text-h)]">
        <span className="min-w-0 flex-1">
          {buyWealthMode === 'split'
            ? 'Vermögensentwicklung: Immo-Netto, Kauf-ETF und Miet-ETF'
            : 'Vermögensentwicklung: Kauf gesamt vs. Miet-ETF'}
        </span>
        <InfoTooltip
          aria-label="Diagramm: Nach Tilgung fließt der Budget-Rest nach Instandhaltung und Nebenkosten ins Kauf-ETF mit gleicher Rendite wie beim Miet-ETF. Durchgezogene Linien: Kreditphase. Gestrichelte Linien: Prognose mit Wertsteigerung; Instandhaltung nur beim Kauf; Miet-ETF aus Budget minus Kaltmiete."
          className="mt-0.5"
        >
          <div className="space-y-2">
            <p>
              Nach Tilgung fließt im Kauf-Szenario der Budget-Rest nach
              Instandhaltung und Nebenkosten ins Kauf-ETF (gleiche ETF-Rendite
              wie bei Miete).
            </p>
            <p>
              <span className="font-medium text-[var(--text-h)]">Linien:</span>{' '}
              Kreditphase durchgezogen ·{' '}
              <span className="whitespace-nowrap font-medium text-[var(--text-h)] tabular-nums">
                - - -
              </span>{' '}
              Prognose (Wertsteigerung; Instandhaltung nur beim Kauf; Miet-ETF
              aus Budget minus Kaltmiete).
            </p>
          </div>
        </InfoTooltip>
      </figcaption>
      <div
        className="mb-3 flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Darstellung Vermögen Kauf-Szenario"
      >
        <span className="text-xs text-[var(--text)]">Kauf anzeigen:</span>
        <div className="inline-flex rounded-lg border border-[var(--border)] p-0.5">
          <button
            type="button"
            onClick={() => setBuyWealthMode('combined')}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              buyWealthMode === 'combined'
                ? 'bg-[var(--accent-bg)] text-[var(--text-h)]'
                : 'text-[var(--text)] hover:bg-[var(--code-bg)]',
            )}
          >
            Kumuliert
          </button>
          <button
            type="button"
            onClick={() => setBuyWealthMode('split')}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              buyWealthMode === 'split'
                ? 'bg-[var(--accent-bg)] text-[var(--text-h)]'
                : 'text-[var(--text)] hover:bg-[var(--code-bg)]',
            )}
          >
            Aufgeschlüsselt
          </button>
        </div>
        <span className="text-xs text-[var(--text)]">
          {buyWealthMode === 'split'
            ? 'Immo und Kauf-ETF getrennt.'
            : 'Eine Linie: Immo-Netto + Kauf-ETF.'}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full max-h-[min(320px,55vh)]"
        role="img"
        aria-label={
          buyWealthMode === 'split'
            ? 'Vermögensverlauf: Kauf aufgeschlüsselt und Miet-ETF'
            : 'Vermögensverlauf: Kauf gesamt und Miet-ETF'
        }
      >
        <title>Vermögensverlauf Kauf vs. Miete</title>
        <desc>
          {buyWealthMode === 'split'
            ? 'Kauf: Immobilienwert minus Restschuld und separates Kauf-ETF. Miete: ETF-Portfolio.'
            : 'Kauf: Summe aus Immo-Netto und Kauf-ETF. Miete: ETF-Portfolio.'}{' '}
          Gestrichelte Linien: Prognosephase nach Kreditende.
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
          y1={axisY}
          y2={axisY}
          className="stroke-[var(--border)]"
          strokeWidth={1}
        />

        {xTickYears.map((yr) => {
          const x = sx(yr)
          return (
            <g key={`xtick-${yr}`}>
              <line
                x1={x}
                x2={x}
                y1={axisY}
                y2={axisY + 4}
                className="stroke-[var(--border)]"
                strokeWidth={1}
              />
              <text
                x={x}
                y={axisY + 16}
                textAnchor="middle"
                className="fill-[var(--text)] text-[10px] tabular-nums"
              >
                {formatYearTickLabel(yr)}
              </text>
            </g>
          )
        })}

        {buyWealthMode === 'split' ? (
          <>
            {buySplit.solid.length >= 2 && buySolid ? (
              <polyline
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={buySolid}
              />
            ) : null}
            {buySplit.dashed.length >= 2 && buyDashed ? (
              <polyline
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={dashPattern}
                opacity={0.92}
                points={buyDashed}
              />
            ) : null}

            {buyEtfSplit.solid.length >= 2 && buyEtfSolid ? (
              <polyline
                fill="none"
                stroke="var(--wealth-buy-etf)"
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={buyEtfSolid}
              />
            ) : null}
            {buyEtfSplit.dashed.length >= 2 && buyEtfDashed ? (
              <polyline
                fill="none"
                stroke="var(--wealth-buy-etf)"
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={dashPattern}
                opacity={0.92}
                points={buyEtfDashed}
              />
            ) : null}
          </>
        ) : (
          <>
            {buySplit.solid.length >= 2 && buyTotalSolid ? (
              <polyline
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={buyTotalSolid}
              />
            ) : null}
            {buySplit.dashed.length >= 2 && buyTotalDashed ? (
              <polyline
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={dashPattern}
                opacity={0.92}
                points={buyTotalDashed}
              />
            ) : null}
          </>
        )}

        {rentSplit.solid.length >= 2 && rentSolid ? (
          <polyline
            fill="none"
            stroke="var(--text)"
            strokeOpacity={0.55}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={rentSolid}
          />
        ) : null}
        {rentSplit.dashed.length >= 2 && rentDashed ? (
          <polyline
            fill="none"
            stroke="var(--text)"
            strokeOpacity={0.5}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={dashPattern}
            points={rentDashed}
          />
        ) : null}

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
        {buyWealthMode === 'split' ? (
          <>
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block h-0.5 w-6 rounded-full bg-[var(--accent)]"
                aria-hidden
              />
              Kauf: Immobilienwert − Restschuld
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block h-0.5 w-6 border-b-2 border-dashed border-[var(--accent)] opacity-90"
                aria-hidden
              />
              Immo (Prognose)
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block h-0.5 w-6 rounded-full bg-[var(--wealth-buy-etf)]"
                aria-hidden
              />
              Kauf: ETF (nach Inst. + NK)
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block h-0.5 w-6 border-b-2 border-dashed border-[var(--wealth-buy-etf)] opacity-90"
                aria-hidden
              />
              Kauf-ETF (Prognose)
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block h-0.5 w-6 rounded-full bg-[var(--accent)]"
                aria-hidden
              />
              Kauf gesamt: Immo + ETF
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block h-0.5 w-6 border-b-2 border-dashed border-[var(--accent)] opacity-90"
                aria-hidden
              />
              Kauf gesamt (Prognose)
            </span>
          </>
        )}
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-0.5 w-6 rounded-full bg-[var(--text)] opacity-55"
            aria-hidden
          />
          Miete: ETF
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-0.5 w-6 border-b-2 border-dashed border-[var(--text)] opacity-50"
            aria-hidden
          />
          Miet-ETF (Prognose)
        </span>
      </div>
    </figure>
  )
}
