import { useEffect, useRef, useState } from 'react'
import { Slider } from '@base-ui/react/slider'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'

const fieldVariants = cva('flex w-full flex-col gap-2 text-left', {
  variants: {
    tone: {
      default: 'text-[var(--text)]',
      muted: 'text-[var(--text)] opacity-90',
    },
  },
  defaultVariants: { tone: 'default' },
})

const labelRowVariants = cva('flex items-baseline justify-between gap-3', {
  variants: {},
})

const trackVariants = cva(
  'relative h-2 w-full rounded-full bg-[var(--border)] outline-none',
)

const indicatorVariants = cva(
  'absolute h-full rounded-full bg-[var(--accent)]',
)

const thumbVariants = cva(
  [
    'size-4 rounded-full border-2 border-[var(--accent-border)] bg-[var(--bg)]',
    'shadow-[var(--shadow)]',
    'outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
    'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40',
  ].join(' '),
)

function decimalsForStep(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 0
  const s = step.toString()
  if (s.includes('e-')) {
    return parseInt(s.split('e-')[1] ?? '0', 10)
  }
  const dot = s.indexOf('.')
  return dot === -1 ? 0 : s.length - dot - 1
}

function snapToStep(n: number, min: number, max: number, step: number): number {
  const c = Math.min(max, Math.max(min, n))
  if (step <= 0) return c
  const dec = decimalsForStep(step)
  const k = Math.round((c - min) / step + Number.EPSILON)
  let s = min + k * step
  if (dec > 0) s = Number(s.toFixed(dec))
  else s = Math.round(s)
  return Math.min(max, Math.max(min, s))
}

/** Freitext → Zahl (de:1.234,5 · en: 3.65). */
function parseNumericInput(raw: string): number | null {
  const cleaned = raw.trim().replace(/[^\d.,-]/g, '')
  if (cleaned === '' || cleaned === '-') return null

  let normalized: string
  if (cleaned.includes(',')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (/^-?\d+\.\d+$/.test(cleaned)) {
    normalized = cleaned
  } else {
    normalized = cleaned.replace(/\./g, '')
  }

  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

function formatEditString(
  n: number,
  min: number,
  max: number,
  step: number,
): string {
  const s = snapToStep(n, min, max, step)
  const dec = decimalsForStep(step)
  if (dec === 0) return String(s)
  return s.toFixed(dec).replace(/\.?0+$/, '')
}

type EditableValueProps = {
  id: string
  label: string
  min: number
  max: number
  step: number
  value: number
  format: (value: number) => string
  onCommit: (value: number) => void
  disabled?: boolean
}

function EditableSliderValue({
  id,
  label,
  min,
  max,
  step,
  value,
  format,
  onCommit,
  disabled,
}: EditableValueProps) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState(() =>
    formatEditString(value, min, max, step),
  )
  const skipCommit = useRef(false)

  // Gleicher State für Slider und Eingabe: bei Drag während Fokus Entwurf anpassen.
  /* eslint-disable react-hooks/set-state-in-effect -- bewusst: Prop `value` → lokaler Entwurf nur bei Fokus */
  useEffect(() => {
    if (focused) {
      setDraft(formatEditString(value, min, max, step))
    }
  }, [value, min, max, step, focused])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (disabled) {
    return (
      <span
        id={id}
        className="font-mono text-sm tabular-nums text-[var(--text-h)]"
      >
        {format(value)}
      </span>
    )
  }

  const showFormatted = !focused

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      aria-label={`${label}: Wert eingeben`}
      title="Klicken oder Tab: Wert tippen"
      className={cn(
        'min-w-[6ch] max-w-[min(100%,14ch)] shrink-0 rounded-md border-0 bg-transparent py-0.5 pr-1 pl-1 text-right font-mono text-sm tabular-nums text-[var(--text-h)] outline-none',
        showFormatted
          ? 'cursor-text hover:bg-[var(--code-bg)]'
          : 'ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--bg)]',
      )}
      value={showFormatted ? format(value) : draft}
      onFocus={(e) => {
        setFocused(true)
        setDraft(formatEditString(value, min, max, step))
        requestAnimationFrame(() => e.target.select())
      }}
      onChange={(e) => {
        if (focused) setDraft(e.target.value)
      }}
      onBlur={() => {
        setFocused(false)
        if (skipCommit.current) {
          skipCommit.current = false
          return
        }
        const n = parseNumericInput(draft)
        if (n !== null) {
          onCommit(snapToStep(n, min, max, step))
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur()
        }
        if (e.key === 'Escape') {
          skipCommit.current = true
          setDraft(formatEditString(value, min, max, step))
          setFocused(false)
          e.currentTarget.blur()
        }
      }}
    />
  )
}

export type ParamSliderProps = {
  label: string
  min: number
  max: number
  step?: number
  value: number
  onValueChange: (value: number) => void
  format: (value: number) => string
  disabled?: boolean
  id?: string
} & VariantProps<typeof fieldVariants>

export function ParamSlider({
  label,
  min,
  max,
  step = 1,
  value,
  onValueChange,
  format,
  disabled,
  id,
  tone,
}: ParamSliderProps) {
  const sliderId = id ?? label.replace(/\s+/g, '-').toLowerCase()

  return (
    <Slider.Root
      id={sliderId}
      className={cn(fieldVariants({ tone }), 'flex w-full flex-col gap-2')}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onValueChange={(v) => onValueChange(v as number)}
    >
      <div className={labelRowVariants()}>
        <Slider.Label className="text-sm font-medium text-[var(--text-h)]">
          {label}
        </Slider.Label>
        <EditableSliderValue
          id={`${sliderId}-value`}
          label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          format={format}
          onCommit={onValueChange}
          disabled={disabled}
        />
      </div>
      <Slider.Control className="flex touch-none items-center py-1 select-none">
        <Slider.Track className={cn(trackVariants())}>
          <Slider.Indicator className={cn(indicatorVariants())} />
          <Slider.Thumb
            aria-label={label}
            className={cn(thumbVariants())}
          />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  )
}
