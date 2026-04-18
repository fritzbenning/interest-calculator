import { cva } from 'class-variance-authority'
import type { YearlyScheduleRow } from '../lib/mortgage'
import { cn } from '../lib/cn'

const sectionVariants = cva('flex flex-col gap-3 text-left')

const titleVariants = cva(
  'text-lg font-medium text-[var(--text-h)]',
)

const wrapVariants = cva(
  'max-h-[min(28rem,70vh)] overflow-auto rounded-xl border border-[var(--border)]',
)

const tableVariants = cva(
  'w-full min-w-[640px] border-collapse text-sm',
)

const thVariants = cva(
  'sticky top-0 z-[1] border-b border-[var(--border)] bg-[var(--code-bg)] px-3 py-2 text-left font-medium text-[var(--text-h)]',
)

const tdVariants = cva(
  'border-b border-[var(--border)] px-3 py-2 tabular-nums text-[var(--text)]',
)

const tdStrongVariants = cva(
  'border-b border-[var(--border)] px-3 py-2 font-medium tabular-nums text-[var(--text-h)]',
)

export function AmortizationSchedule({
  rows,
  formatMoney,
  loan,
  amortizationFeasible,
}: {
  rows: YearlyScheduleRow[]
  formatMoney: (n: number) => string
  loan: number
  amortizationFeasible: boolean
}) {
  const showTable =
    loan > 0 && amortizationFeasible && rows.length > 0

  return (
    <section className={cn(sectionVariants())} aria-labelledby="tilgung-heading">
      <h2 id="tilgung-heading" className={cn(titleVariants())}>
        Tilgungsplan (jährlich)
      </h2>
      {loan <= 0 ? (
        <p className="text-sm text-[var(--text)]">
          Kein Tilgungsplan: Die Kreditsumme beträgt 0 €.
        </p>
      ) : !amortizationFeasible ? (
        <p className="text-sm text-[var(--text)]">
          Kein Tilgungsplan: Die monatliche Rate deckt die Zinsen nicht aus –
          das Darlehen wäre so nicht vollständig tilgbar.
        </p>
      ) : !showTable ? (
        <p className="text-sm text-[var(--text)]">
          Tilgungsplan konnte nicht erstellt werden.
        </p>
      ) : (
        <div className={cn(wrapVariants())}>
          <table className={cn(tableVariants())}>
            <thead>
              <tr>
                <th className={cn(thVariants())}>Jahr</th>
                <th className={cn(thVariants())}>Restschuld Anfang</th>
                <th className={cn(thVariants())}>Zinsen</th>
                <th className={cn(thVariants())}>Tilgung</th>
                <th className={cn(thVariants())}>Annuität (Summe)</th>
                <th className={cn(thVariants())}>Restschuld Ende</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.year}>
                  <td className={cn(tdStrongVariants())}>{r.year}</td>
                  <td className={cn(tdVariants())}>
                    {formatMoney(r.balanceStart)}
                  </td>
                  <td className={cn(tdVariants())}>{formatMoney(r.interest)}</td>
                  <td className={cn(tdVariants())}>
                    {formatMoney(r.principal)}
                  </td>
                  <td className={cn(tdVariants())}>{formatMoney(r.payment)}</td>
                  <td className={cn(tdVariants())}>
                    {formatMoney(r.balanceEnd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

