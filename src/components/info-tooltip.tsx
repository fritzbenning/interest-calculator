import type { ReactNode } from 'react'
import { Popover } from '@base-ui/react/popover'
import { cn } from '../lib/cn'

const triggerClassName =
  'inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] transition-colors hover:bg-[var(--code-bg)] hover:text-[var(--text-h)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]'

const popupClassName =
  'max-w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-xs leading-relaxed text-[var(--text)] shadow-lg outline-none'

export type InfoTooltipProps = {
  /** Kurzbeschreibung für Screenreader; sollte dem Inhalt entsprechen. */
  'aria-label': string
  children: ReactNode
  className?: string
}

/**
 * Infotipp per Popover (nicht Tooltip): funktioniert mit Maus, Tastatur und Touch
 * (Klick zum Öffnen/Schließen), zusätzlich Hover auf Desktop.
 */
export function InfoTooltip({
  'aria-label': ariaLabel,
  children,
  className,
}: InfoTooltipProps) {
  return (
    <Popover.Root modal={false}>
      <Popover.Trigger
        type="button"
        aria-label={ariaLabel}
        className={cn(triggerClassName, className)}
        openOnHover
        delay={220}
        closeDelay={80}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-4"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
            clipRule="evenodd"
          />
        </svg>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="end"
          sideOffset={8}
          className="z-[300]"
        >
          <Popover.Popup className={popupClassName}>{children}</Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
