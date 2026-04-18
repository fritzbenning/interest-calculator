import type { ReactNode } from 'react'
import { InfoTooltip } from './info-tooltip'
import { cn } from '../lib/cn'

const h2Class =
  'text-base font-medium text-[var(--text-h)]'

type SectionHeadingProps = {
  id: string
  className?: string
  children: ReactNode
  infoLabel: string
  info: ReactNode
}

/** Abschnittsüberschrift mit Infosymbol (Popover). */
export function SectionHeading({
  id,
  className,
  children,
  infoLabel,
  info,
}: SectionHeadingProps) {
  return (
    <div className={cn('flex items-start gap-2', className)}>
      <h2 id={id} className={cn(h2Class, 'min-w-0 flex-1')}>
        {children}
      </h2>
      <InfoTooltip aria-label={infoLabel} className="mt-0.5 shrink-0">
        <div className="space-y-2">{info}</div>
      </InfoTooltip>
    </div>
  )
}

type CardTitleWithInfoProps = {
  children: ReactNode
  infoLabel: string
  info: ReactNode
  className?: string
}

/** Karten-/Box-Titelzeile mit Infosymbol. */
export function CardTitleWithInfo({
  children,
  infoLabel,
  info,
  className,
}: CardTitleWithInfoProps) {
  return (
    <div className={cn('flex items-start justify-between gap-2', className)}>
      <div className="min-w-0 flex-1">{children}</div>
      <InfoTooltip aria-label={infoLabel} className="mt-0.5 shrink-0">
        <div className="space-y-2">{info}</div>
      </InfoTooltip>
    </div>
  )
}
