import { cva } from 'class-variance-authority'
import { cn } from '../lib/cn'

const panelVariants = cva(
  'rounded-xl border border-[var(--border)] bg-[var(--code-bg)] p-6 text-left shadow-[var(--shadow)]',
  {
    variants: {
      emphasis: {
        default: '',
        highlight:
          'border-[var(--accent-border)] bg-[var(--accent-bg)]',
      },
    },
    defaultVariants: { emphasis: 'default' },
  },
)

const kpiVariants = cva(
  'font-mono text-3xl font-medium tabular-nums tracking-tight text-[var(--text-h)] sm:text-4xl',
)

const labelVariants = cva('text-sm text-[var(--text)]')

export function ResultPanel({
  totalInterestFormatted,
  months,
  feasible,
  className,
}: {
  totalInterestFormatted: string
  months: number
  feasible: boolean
  className?: string
}) {
  const years = Math.floor(months / 12)
  const rest = months % 12

  return (
    <div
      className={cn(
        panelVariants({ emphasis: feasible ? 'highlight' : 'default' }),
        className,
      )}
    >
      <p className={cn(labelVariants())}>Summe der Zinszahlungen</p>
      <p className={cn(kpiVariants())}>{totalInterestFormatted}</p>
      <p className="mt-4 text-sm text-[var(--text)]">
        {feasible ? (
          <>
            Über die gesamte Laufzeit von{' '}
            <strong className="text-[var(--text-h)]">
              {years} Jahre{rest > 0 ? ` und ${rest} Monate` : ''}
            </strong>{' '}
            ({months} Monate) zahlen Sie diese Zinsen zusätzlich zur
            Rückzahlung des Darlehens.
          </>
        ) : (
          <>
            Mit dieser Rate decken Sie die Zinsen nicht vollständig; die
            Restschuld würde nicht getilgt. Erhöhen Sie die monatliche Rate, die
            Tilgung oder die Laufzeit.
          </>
        )}
      </p>
    </div>
  )
}
