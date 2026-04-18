import { Tabs } from '@base-ui/react/tabs'
import { cva } from 'class-variance-authority'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '../lib/cn'

const rootVariants = cva(
  'border-b border-[var(--border)] bg-[var(--bg)]',
)

const listVariants = cva(
  'relative mx-auto flex w-full max-w-xl gap-0 px-4 md:max-w-2xl lg:max-w-4xl md:px-6',
)

const tabBaseVariants = cva(
  [
    'relative -mb-px flex-1 border-b-2 px-4 py-3 text-center text-sm font-medium outline-none',
    'transition-colors',
    'focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
  ].join(' '),
)

export function AppTabs() {
  const loc = useLocation()
  const nav = useNavigate()
  const value = loc.pathname.startsWith('/vergleich') ? 'compare' : 'calc'

  return (
    <Tabs.Root
      className={cn(rootVariants())}
      value={value}
      onValueChange={(v) => {
        nav(v === 'compare' ? '/vergleich' : '/', { replace: false })
      }}
    >
      <Tabs.List className={cn(listVariants())}>
        <Tabs.Tab
          value="calc"
          className={(s) =>
            cn(
              tabBaseVariants(),
              s.active
                ? 'border-[var(--accent)] text-[var(--text-h)]'
                : 'border-transparent text-[var(--text)] hover:text-[var(--text-h)]',
            )
          }
        >
          Kreditrechner
        </Tabs.Tab>
        <Tabs.Tab
          value="compare"
          className={(s) =>
            cn(
              tabBaseVariants(),
              s.active
                ? 'border-[var(--accent)] text-[var(--text-h)]'
                : 'border-transparent text-[var(--text)] hover:text-[var(--text-h)]',
            )
          }
        >
          Miete vs. Kauf
        </Tabs.Tab>
      </Tabs.List>
    </Tabs.Root>
  )
}
