import { RadioGroup } from '@base-ui/react/radio-group'
import { Radio } from '@base-ui/react/radio'
import { cva } from 'class-variance-authority'
import { cn } from '../lib/cn'

export type FinancingMode = 'loan_equity' | 'purchase_equity'

const groupClass = cva('flex flex-col gap-2 text-left')

const legendClass = cva('text-sm font-medium text-[var(--text-h)]')

const optionsClass = cva('flex flex-wrap gap-2')

const itemClass = cva(
  [
    'inline-flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)]',
    'bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text-h)] transition-colors',
    'hover:bg-[var(--code-bg)]',
    'has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:opacity-50',
  ].join(' '),
)

const itemSelectedClass =
  'border-[var(--accent-border)] bg-[var(--accent-bg)] shadow-[var(--shadow)]'

const OPTIONS: {
  value: FinancingMode
  label: string
  hint: string
}[] = [
  {
    value: 'loan_equity',
    label: 'Kreditsumme + Eigenkapital',
    hint: 'Darlehen und EK unabhängig einstellen (Kaufpreis ergibt sich).',
  },
  {
    value: 'purchase_equity',
    label: 'Kaufpreis + Eigenkapital',
    hint: 'Objektpreis und EK – das Darlehen ist die Differenz.',
  },
]

export function FinancingModeField({
  value,
  onValueChange,
}: {
  value: FinancingMode
  onValueChange: (mode: FinancingMode) => void
}) {
  return (
    <fieldset className={cn(groupClass())}>
      <legend className={cn(legendClass())}>Finanzierung</legend>
      <p className="text-xs text-[var(--text)]">
        Wählen Sie, ob Sie direkt die Kreditsumme oder den Immobilien‑Kaufpreis
        vorgeben möchten.
      </p>
      <RadioGroup
        className={cn(optionsClass())}
        value={value}
        onValueChange={(v) => onValueChange(v as FinancingMode)}
      >
        {OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={cn(itemClass(), value === opt.value && itemSelectedClass)}
          >
            <Radio.Root
              value={opt.value}
              className={cn(
                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
                'border-2 border-[var(--border)] bg-[var(--bg)] outline-none',
                'focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
              )}
            >
              <Radio.Indicator
                className={cn(
                  'size-2.5 rounded-full bg-[var(--accent)]',
                  'opacity-0 transition-opacity data-[checked]:opacity-100',
                )}
              />
            </Radio.Root>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium">{opt.label}</span>
              <span className="text-xs font-normal text-[var(--text)]">
                {opt.hint}
              </span>
            </span>
          </label>
        ))}
      </RadioGroup>
    </fieldset>
  )
}
