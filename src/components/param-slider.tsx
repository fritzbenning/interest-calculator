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
        <Slider.Value
          className="font-mono text-sm tabular-nums text-[var(--text-h)]"
          id={`${sliderId}-value`}
        >
          {(_formatted, values) => format(values[0] ?? value)}
        </Slider.Value>
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
