import { useCallback, useMemo, useState } from 'react'
import { cva } from 'class-variance-authority'
import { AmortizationSchedule } from '../components/amortization-schedule'
import { DriveModeField, type DriveMode } from '../components/drive-mode-field'
import {
  FinancingModeField,
  type FinancingMode,
} from '../components/financing-mode-field'
import { ParamSlider } from '../components/param-slider'
import { ResultPanel } from '../components/result-panel'
import { cn } from '../lib/cn'
import {
  amortize,
  monthlyPaymentFromTerm,
  monthlyPaymentFromTilgung,
  tilgungFromMonthlyPayment,
  yearlyAmortizationSchedule,
} from '../lib/mortgage'

const eur0 = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

const eur2 = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function formatTermMonths(months: number) {
  const y = Math.floor(months / 12)
  const m = months % 12
  if (m === 0) return `${y} Jahre`
  return `${y} J. ${m} Mon.`
}

const TILGUNG_MIN = 0.1
const TILGUNG_MAX = 15
const TERM_MIN_MONTHS = 12
const TERM_MAX_MONTHS = 50 * 12

function paymentLimits(L: number, ratePercent: number) {
  const min = Math.ceil((L * ratePercent) / 100 / 12) + 1
  const max = monthlyPaymentFromTilgung(L, ratePercent, TILGUNG_MAX)
  return { min, max: Math.max(min + 1, max) }
}

const shellVariants = cva(
  'mx-auto flex w-full max-w-xl flex-col gap-8 px-4 py-10 text-left md:max-w-2xl lg:max-w-4xl md:px-6',
)

const headingVariants = cva(
  'font-[family-name:var(--heading)] text-2xl font-medium tracking-tight text-[var(--text-h)] md:text-3xl',
)

const subVariants = cva('text-sm text-[var(--text)]')

const summaryVariants = cva(
  'grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 text-sm sm:grid-cols-2',
)

const summaryLabelVariants = cva('text-[var(--text)]')
const summaryValueVariants = cva(
  'font-mono font-medium tabular-nums text-[var(--text-h)]',
)

const INITIAL_LOAN = 350_000
const INITIAL_RATE = 3.65
const INITIAL_TILGUNG = 2

export function MortgageCalculatorPage() {
  const [loan, setLoan] = useState(INITIAL_LOAN)
  const [equity, setEquity] = useState(70_000)
  const [ratePct, setRatePct] = useState(INITIAL_RATE)
  const [tilgungPct, setTilgungPct] = useState(INITIAL_TILGUNG)
  const [termMonths, setTermMonths] = useState(() => {
    const M = monthlyPaymentFromTilgung(
      INITIAL_LOAN,
      INITIAL_RATE,
      INITIAL_TILGUNG,
    )
    return amortize(INITIAL_LOAN, INITIAL_RATE, M).months
  })
  const [payment, setPayment] = useState(() =>
    monthlyPaymentFromTilgung(INITIAL_LOAN, INITIAL_RATE, INITIAL_TILGUNG),
  )
  const [drive, setDrive] = useState<DriveMode>('tilgung')
  const [financeMode, setFinanceMode] = useState<FinancingMode>('loan_equity')

  const paymentBounds = useMemo(
    () => paymentLimits(loan, ratePct),
    [loan, ratePct],
  )

  const purchasePrice = loan + equity

  const applyTilgung = useCallback(
    (t: number, L: number = loan) => {
      const T = clamp(t, TILGUNG_MIN, TILGUNG_MAX)
      setTilgungPct(T)
      const M = monthlyPaymentFromTilgung(L, ratePct, T)
      setPayment(M)
      const { months, feasible } = amortize(L, ratePct, M)
      if (feasible) setTermMonths(months)
    },
    [loan, ratePct],
  )

  const applyTerm = useCallback(
    (months: number, L: number = loan) => {
      const mo = clamp(Math.round(months), TERM_MIN_MONTHS, TERM_MAX_MONTHS)
      setTermMonths(mo)
      const M = monthlyPaymentFromTerm(L, ratePct, mo)
      setPayment(M)
      const t = tilgungFromMonthlyPayment(L, ratePct, M)
      setTilgungPct(clamp(t, TILGUNG_MIN, TILGUNG_MAX))
    },
    [loan, ratePct],
  )

  const applyPayment = useCallback(
    (M: number, L: number = loan) => {
      const { min, max } = paymentLimits(L, ratePct)
      const C = clamp(M, min, max)
      setPayment(C)
      const t = tilgungFromMonthlyPayment(L, ratePct, C)
      setTilgungPct(clamp(t, TILGUNG_MIN, TILGUNG_MAX))
      const { months, feasible } = amortize(L, ratePct, C)
      if (feasible) setTermMonths(months)
    },
    [loan, ratePct],
  )

  const syncAfterLoanOrRate = useCallback(
    (nextLoan: number, nextRate: number) => {
      if (drive === 'tilgung') {
        const T = clamp(tilgungPct, TILGUNG_MIN, TILGUNG_MAX)
        const M = monthlyPaymentFromTilgung(nextLoan, nextRate, T)
        setPayment(M)
        const { months, feasible } = amortize(nextLoan, nextRate, M)
        if (feasible) setTermMonths(months)
      } else if (drive === 'term') {
        const mo = clamp(
          Math.round(termMonths),
          TERM_MIN_MONTHS,
          TERM_MAX_MONTHS,
        )
        const M = monthlyPaymentFromTerm(nextLoan, nextRate, mo)
        setPayment(M)
        const t = tilgungFromMonthlyPayment(nextLoan, nextRate, M)
        setTilgungPct(clamp(t, TILGUNG_MIN, TILGUNG_MAX))
      } else {
        const { min, max } = paymentLimits(nextLoan, nextRate)
        const C = clamp(payment, min, max)
        setPayment(C)
        const t = tilgungFromMonthlyPayment(nextLoan, nextRate, C)
        setTilgungPct(clamp(t, TILGUNG_MIN, TILGUNG_MAX))
        const { months, feasible } = amortize(nextLoan, nextRate, C)
        if (feasible) setTermMonths(months)
      }
    },
    [drive, tilgungPct, termMonths, payment],
  )

  const { totalInterest, months, feasible } = useMemo(
    () => amortize(loan, ratePct, payment),
    [loan, ratePct, payment],
  )

  const scheduleRows = useMemo(
    () =>
      feasible && loan > 0
        ? yearlyAmortizationSchedule(loan, ratePct, payment)
        : [],
    [feasible, loan, ratePct, payment],
  )

  return (
    <main className={cn(shellVariants())}>
      <header className="flex flex-col gap-2">
        <h1 className={cn(headingVariants())}>Immobilienkredit‑Rechner</h1>
        <p className={cn(subVariants())}>
          Annuitätendarlehen nach üblicher Bankenlogik (feste Monatsrate aus
          Sollzins und anfänglicher Tilgung). Unten sehen Sie die{' '}
          <strong className="text-[var(--text-h)]">
            Summe aller Zinszahlungen
          </strong>{' '}
          bis zur vollständigen Rückzahlung.
        </p>
      </header>

      <div className={cn(summaryVariants())}>
        <div>
          <p className={cn(summaryLabelVariants())}>Kaufpreis (Darlehen + EK)</p>
          <p className={cn(summaryValueVariants())}>
            {eur0.format(purchasePrice)}
          </p>
        </div>
        <div>
          <p className={cn(summaryLabelVariants())}>Beleihungsauslauf</p>
          <p className={cn(summaryValueVariants())}>
            {purchasePrice > 0
              ? `${((loan / purchasePrice) * 100).toFixed(1).replace('.', ',')} %`
              : '—'}
          </p>
        </div>
      </div>

      <FinancingModeField
        value={financeMode}
        onValueChange={setFinanceMode}
      />

      <DriveModeField
        value={drive}
        onValueChange={(mode) => {
          setDrive(mode)
          if (mode === 'tilgung') applyTilgung(tilgungPct, loan)
          else if (mode === 'term') applyTerm(termMonths, loan)
          else applyPayment(payment, loan)
        }}
      />

      <div className="flex flex-col gap-6">
        {financeMode === 'loan_equity' ? (
          <>
            <ParamSlider
              label="Kreditsumme"
              min={10_000}
              max={5_000_000}
              step={5_000}
              value={clamp(loan, 10_000, 5_000_000)}
              onValueChange={(v) => {
                const nv = clamp(v, 10_000, 5_000_000)
                setLoan(nv)
                syncAfterLoanOrRate(nv, ratePct)
              }}
              format={(x) => eur0.format(x)}
            />
            <ParamSlider
              label="Eigenkapital"
              min={0}
              max={3_000_000}
              step={5_000}
              value={equity}
              onValueChange={setEquity}
              format={(x) => eur0.format(x)}
            />
          </>
        ) : (
          <>
            <ParamSlider
              label="Kaufpreis der Immobilie"
              min={25_000}
              max={6_000_000}
              step={5_000}
              value={clamp(purchasePrice, 25_000, 6_000_000)}
              onValueChange={(P) => {
                const p = clamp(P, 25_000, 6_000_000)
                const eq = Math.min(equity, p)
                setEquity(eq)
                const newLoan = p - eq
                const bounded = clamp(newLoan, 0, 5_000_000)
                setLoan(bounded)
                syncAfterLoanOrRate(bounded, ratePct)
              }}
              format={(x) => eur0.format(x)}
            />
            <ParamSlider
              label="Eigenkapital"
              min={0}
              max={Math.min(3_000_000, Math.max(purchasePrice, 25_000))}
              step={5_000}
              value={Math.min(equity, purchasePrice)}
              onValueChange={(e) => {
                const p = purchasePrice
                const eq = clamp(e, 0, p)
                const newLoan = p - eq
                const bounded = clamp(newLoan, 0, 5_000_000)
                setEquity(eq)
                setLoan(bounded)
                syncAfterLoanOrRate(bounded, ratePct)
              }}
              format={(x) => eur0.format(x)}
            />
            <p className="-mt-2 text-xs text-[var(--text)]">
              Ableitung: Kreditsumme = Kaufpreis − Eigenkapital (min. 0 €).
            </p>
          </>
        )}

        <ParamSlider
          label="Sollzins (nominal p.a.)"
          min={0.01}
          max={15}
          step={0.05}
          value={ratePct}
          onValueChange={(v) => {
            setRatePct(v)
            syncAfterLoanOrRate(loan, v)
          }}
          format={(x) => `${x.toFixed(2).replace('.', ',')} %`}
        />

        <ParamSlider
          label="Anfängliche Tilgung (p.a. vom Darlehen)"
          min={TILGUNG_MIN}
          max={TILGUNG_MAX}
          step={0.1}
          value={clamp(tilgungPct, TILGUNG_MIN, TILGUNG_MAX)}
          disabled={drive !== 'tilgung'}
          tone={drive === 'tilgung' ? 'default' : 'muted'}
          onValueChange={(v) => {
            setDrive('tilgung')
            applyTilgung(v, loan)
          }}
          format={(x) => `${x.toFixed(2).replace('.', ',')} %`}
        />

        <ParamSlider
          label="Laufzeit"
          min={TERM_MIN_MONTHS}
          max={TERM_MAX_MONTHS}
          step={1}
          value={clamp(termMonths, TERM_MIN_MONTHS, TERM_MAX_MONTHS)}
          disabled={drive !== 'term'}
          tone={drive === 'term' ? 'default' : 'muted'}
          onValueChange={(v) => {
            setDrive('term')
            applyTerm(v, loan)
          }}
          format={formatTermMonths}
        />

        <ParamSlider
          label="Monatliche Rate (Annuität)"
          min={paymentBounds.min}
          max={paymentBounds.max}
          step={5}
          value={clamp(payment, paymentBounds.min, paymentBounds.max)}
          disabled={drive !== 'payment'}
          tone={drive === 'payment' ? 'default' : 'muted'}
          onValueChange={(v) => {
            setDrive('payment')
            applyPayment(v, loan)
          }}
          format={(x) => eur2.format(x)}
        />
      </div>

      <ResultPanel
        totalInterestFormatted={feasible ? eur0.format(totalInterest) : '—'}
        months={feasible ? months : termMonths}
        feasible={feasible}
      />

      <AmortizationSchedule
        rows={scheduleRows}
        formatMoney={(n) => eur0.format(n)}
        loan={loan}
        amortizationFeasible={feasible}
      />

      <p className={cn(subVariants())}>
        Vereinfachtes Modell ohne Sondertilgungen, Zinsbindungswechsel oder
        Gebühren. Die Gesamtzinsen entsprechen der Summe der monatlichen
        Zinsanteile bis Restschuld null.
      </p>
    </main>
  )
}
