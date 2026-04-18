import { useEffect, useMemo, useState } from 'react'
import { cva } from 'class-variance-authority'
import { ParamSlider } from '../components/param-slider'
import { WealthComparisonChart } from '../components/wealth-comparison-chart'
import { cn } from '../lib/cn'
import {
  amortize,
  monthlyPaymentFromTilgung,
  mortgagePaymentSliderBounds,
  tilgungFromMonthlyPayment,
  MAX_AMORTIZATION_MONTHS,
} from '../lib/mortgage'
import { simulateRentVsBuy } from '../lib/rent-buy-sim'

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

function formatLoanTerm(months: number) {
  const y = Math.floor(months / 12)
  const m = months % 12
  if (months < 12) return `${months} Monate`
  if (m === 0) return `${y} Jahre`
  return `${y} J. ${m} Mon.`
}

const shellVariants = cva(
  'mx-auto flex w-full max-w-xl flex-col gap-8 px-4 py-10 text-left md:max-w-2xl lg:max-w-4xl md:px-6',
)

const headingVariants = cva(
  'font-[family-name:var(--heading)] text-2xl font-medium tracking-tight text-[var(--text-h)] md:text-3xl',
)

const subVariants = cva('text-sm text-[var(--text)]')

const cardGridVariants = cva(
  'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
)

const cardVariants = cva(
  'rounded-xl border border-[var(--border)] bg-[var(--code-bg)] p-4',
)

const cardLabelVariants = cva('text-xs font-medium text-[var(--text)]')
const cardValueVariants = cva(
  'mt-1 font-mono text-xl font-medium tabular-nums text-[var(--text-h)] sm:text-2xl',
)

const diffPositiveVariants = cva('text-[var(--accent)]')
const diffNegativeVariants = cva('opacity-90')

const INITIAL_PURCHASE = 420_000
const INITIAL_EQUITY = 70_000
const INITIAL_LOAN = INITIAL_PURCHASE - INITIAL_EQUITY
const INITIAL_RATE = 3.65
const INITIAL_TILGUNG_HINT = 2
/** Grobe Orientierung Einfamilienhaus: oft ca. 250–450 €/Monat je nach Region/Objekt. */
const DEFAULT_MONTHLY_NEBENKOSTEN = 300

export function RentVsBuyPage() {
  const [purchasePrice, setPurchasePrice] = useState(INITIAL_PURCHASE)
  const [equity, setEquity] = useState(INITIAL_EQUITY)
  const [ratePct, setRatePct] = useState(INITIAL_RATE)
  const [monthlyMortgagePayment, setMonthlyMortgagePayment] = useState(() =>
    monthlyPaymentFromTilgung(
      INITIAL_LOAN,
      INITIAL_RATE,
      INITIAL_TILGUNG_HINT,
    ),
  )
  const [monthlyNebenkosten, setMonthlyNebenkosten] = useState(
    DEFAULT_MONTHLY_NEBENKOSTEN,
  )
  const [maintenancePct, setMaintenancePct] = useState(1)
  const [appreciationPct, setAppreciationPct] = useState(0.5)
  const [coldRent, setColdRent] = useState(1_100)
  const [etfReturnPct, setEtfReturnPct] = useState(6)

  const loan = Math.max(0, purchasePrice - equity)

  const paymentBounds = useMemo(
    () => mortgagePaymentSliderBounds(loan, ratePct),
    [loan, ratePct],
  )

  useEffect(() => {
    setMonthlyMortgagePayment((p) =>
      clamp(p, paymentBounds.min, paymentBounds.max),
    )
  }, [paymentBounds.min, paymentBounds.max])

  const payment = useMemo(
    () =>
      loan > 0
        ? clamp(
            monthlyMortgagePayment,
            paymentBounds.min,
            paymentBounds.max,
          )
        : 0,
    [
      loan,
      monthlyMortgagePayment,
      paymentBounds.min,
      paymentBounds.max,
    ],
  )

  const tilgungEquivalentPct =
    loan > 0 ? tilgungFromMonthlyPayment(loan, ratePct, payment) : 0

  /**
   * Nach Annuität + typische Haus-Nebenkosten: was gegenüber Kaltmiete für den ETF übrig bleibt.
   */
  const etfSparrate = useMemo(
    () => Math.max(0, payment + monthlyNebenkosten - coldRent),
    [payment, monthlyNebenkosten, coldRent],
  )

  const amortResult = useMemo(
    () => amortize(loan, ratePct, payment),
    [loan, ratePct, payment],
  )

  const horizonMonths = useMemo(() => {
    if (loan <= 0) return 12
    return Math.max(12, amortResult.months)
  }, [loan, amortResult.months])

  const sim = useMemo(
    () =>
      simulateRentVsBuy({
        purchasePrice,
        equity,
        loanPrincipal: loan,
        annualMortgageRatePct: ratePct,
        monthlyMortgagePayment: payment,
        maintenancePctOfValueAnnual: maintenancePct,
        propertyAppreciationPctAnnual: appreciationPct,
        horizonMonths,
        coldRentMonthly: coldRent,
        etfMonthlyContribution: etfSparrate,
        etfExpectedReturnPctAnnual: etfReturnPct,
        monthlyOwnerAncillaryCosts: monthlyNebenkosten,
      }),
    [
      purchasePrice,
      equity,
      loan,
      ratePct,
      payment,
      maintenancePct,
      appreciationPct,
      horizonMonths,
      coldRent,
      etfSparrate,
      etfReturnPct,
      monthlyNebenkosten,
    ],
  )

  const diff = sim.finalBuyNetWorth - sim.finalRentNetWorth
  const diffLabel =
    diff > 0
      ? 'Kauf-Szenario liegt vorn'
      : diff < 0
        ? 'Miete+ETF liegt vorn'
        : 'Gleichstand'

  return (
    <main className={cn(shellVariants())}>
      <header className="flex flex-col gap-2">
        <h1 className={cn(headingVariants())}>Miete vs. Kauf</h1>
        <p className={cn(subVariants())}>
          Langfristiger Vermögensvergleich: Beim <strong>Kauf</strong> steckt
          Ihr Eigenkapital in der Immobilie; das angezeigte Vermögen ist{' '}
          <strong className="text-[var(--text-h)]">
            Immobilienwert minus Restschuld
          </strong>
          . Beim <strong>Mieten</strong> ist das dargestellte Vermögen{' '}
          <strong className="text-[var(--text-h)]">
            ausschließlich das ETF-Portfolio
          </strong>{' '}
          (Eigenkapital zu Beginn plus automatischer Sparrate aus Annuität plus
          Haus-Nebenkosten minus Kaltmiete und Zinseszins).{' '}
          <strong className="text-[var(--text-h)]">Die Miete</strong> ist eine
          laufende Ausgabe und taucht dort nicht als Vermögenswert auf – sie ist
          „weg“, vergleichbar dem Zins- und Tilgungsanteil der Rate beim Kauf.
        </p>
      </header>

      <section className="flex flex-col gap-6" aria-labelledby="immobilie-h">
        <h2 id="immobilie-h" className="text-base font-medium text-[var(--text-h)]">
          Immobilie & Kredit
        </h2>
        <ParamSlider
          label="Kaufpreis"
          min={50_000}
          max={6_000_000}
          step={5_000}
          value={purchasePrice}
          onValueChange={(v) => {
            const p = clamp(v, 50_000, 6_000_000)
            setPurchasePrice(p)
            setEquity((e) => Math.min(e, p))
          }}
          format={(x) => eur0.format(x)}
        />
        <ParamSlider
          label="Eigenkapital (Startinvest ETF bei Miete)"
          min={0}
          max={Math.min(3_000_000, purchasePrice)}
          step={5_000}
          value={Math.min(equity, purchasePrice)}
          onValueChange={(e) =>
            setEquity(clamp(e, 0, purchasePrice))
          }
          format={(x) => eur0.format(x)}
        />
        <ParamSlider
          label="Sollzins (nominal p.a.)"
          min={0.01}
          max={15}
          step={0.05}
          value={ratePct}
          onValueChange={setRatePct}
          format={(x) => `${x.toFixed(2).replace('.', ',')} %`}
        />
        <ParamSlider
          label="Monatliche Kreditrate (Annuität)"
          min={paymentBounds.min}
          max={paymentBounds.max}
          step={5}
          value={loan > 0 ? payment : 0}
          disabled={loan <= 0}
          onValueChange={(v) => setMonthlyMortgagePayment(v)}
          format={(x) => eur2.format(x)}
        />
        <p className="text-xs text-[var(--text)]">
          Darlehen {eur0.format(loan)}. Die Rate steuern Sie direkt in Euro.
          Entspricht anfänglich ca.{' '}
          <strong className="text-[var(--text-h)]">
            {tilgungEquivalentPct.toFixed(2).replace('.', ',')} % Tilgung p.a.
          </strong>{' '}
          (Bank-Linearformel). Nebenkosten am Objekt siehe Abschnitt „Kosten“.
        </p>
      </section>

      <section className="flex flex-col gap-6" aria-labelledby="kosten-h">
        <h2 id="kosten-h" className="text-base font-medium text-[var(--text-h)]">
          Kosten & Annahmen
        </h2>
        <ParamSlider
          label="Nebenkosten Eigentum (monatlich, pauschal)"
          min={0}
          max={2_000}
          step={25}
          value={monthlyNebenkosten}
          onValueChange={setMonthlyNebenkosten}
          format={(x) => eur0.format(x)}
        />
        <p className="-mt-2 text-xs text-[var(--text)]">
          Z. B. Grundsteuer, Gebäudeversicherung, Müll, ggf. Verwaltung –{' '}
          <strong className="text-[var(--text-h)]">ohne</strong> die
          prozentuale Instandhaltung. Voreinstellung{' '}
          {eur0.format(DEFAULT_MONTHLY_NEBENKOSTEN)} entspricht einer üblichen
          Größenordnung für viele Häuser (oft grob 250–450 €, stark abhängig von
          Region und Objekt).
        </p>
        <ParamSlider
          label="Instandhaltung (Prognose, p.a. vom Immobilienwert)"
          min={0}
          max={4}
          step={0.1}
          value={maintenancePct}
          onValueChange={setMaintenancePct}
          format={(x) => `${x.toFixed(2).replace('.', ',')} %`}
        />
        <ParamSlider
          label="Immobilien-Wertsteigerung (p.a., Prognose)"
          min={0}
          max={8}
          step={0.1}
          value={appreciationPct}
          onValueChange={setAppreciationPct}
          format={(x) => `${x.toFixed(2).replace('.', ',')} %`}
        />
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)]">
          <p className="font-medium text-[var(--text-h)]">
            Vergleichszeitraum = Kreditlaufzeit
          </p>
          <p className="mt-1">
            <strong className="text-[var(--text-h)] tabular-nums">
              {formatLoanTerm(horizonMonths)}
            </strong>{' '}
            ({horizonMonths} Monate), bis die Darlehenssumme bei der gewählten
            Rate getilgt wäre.
          </p>
          {loan > 0 && !amortResult.feasible ? (
            <p className="mt-2 text-xs text-[var(--text-h)]">
              Hinweis: Mit dieser Annuität ist das Darlehen in der Simulation
              nicht vollständig tilgbar; es wird mit{' '}
              {MAX_AMORTIZATION_MONTHS / 12} Jahren Obergrenze gerechnet.
            </p>
          ) : null}
          {loan <= 0 ? (
            <p className="mt-2 text-xs">
              Ohne Darlehen ist der Zeitraum auf 12 Monate gesetzt (nur
              Orientierung).
            </p>
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-6" aria-labelledby="miete-h">
        <h2 id="miete-h" className="text-base font-medium text-[var(--text-h)]">
          Miete & ETF
        </h2>
        <ParamSlider
          label="Kaltmiete (monatlich)"
          min={0}
          max={8_000}
          step={50}
          value={coldRent}
          onValueChange={setColdRent}
          format={(x) => eur0.format(x)}
        />
        <div className="rounded-lg border border-[var(--border)] bg-[var(--code-bg)] px-4 py-3 text-left">
          <p className="text-sm font-medium text-[var(--text-h)]">
            ETF-Sparrate (automatisch)
          </p>
          <p className="mt-1 font-mono text-lg tabular-nums text-[var(--text-h)]">
            {eur2.format(etfSparrate)}
            <span className="ml-2 text-sm font-sans font-normal text-[var(--text)]">
              / Monat
            </span>
          </p>
          <p className="mt-2 text-xs text-[var(--text)]">
            {eur2.format(payment)} Annuität + {eur0.format(monthlyNebenkosten)}{' '}
            Nebenkosten − {eur0.format(coldRent)} Kaltmiete
            {payment + monthlyNebenkosten < coldRent && (
              <>
                {' '}
                → keine Sparrate (Kaltmiete übersteigt Annuität + Nebenkosten;
                es wird 0 € investiert).
              </>
            )}
          </p>
        </div>
        <ParamSlider
          label="Erwartete ETF-Rendite (nominal p.a., thesaurierend)"
          min={0}
          max={12}
          step={0.25}
          value={etfReturnPct}
          onValueChange={setEtfReturnPct}
          format={(x) => `${x.toFixed(2).replace('.', ',')} %`}
        />
        <p className="text-xs text-[var(--text)]">
          ETF-Startbetrag = Eigenkapital ({eur0.format(equity)}). Die Kurve
          „Miete“ im Diagramm ist nur dieses Depot – nicht die Summe der
          Mietzahlungen. Keine Steuern, Gebühren (TER) oder
          Transaktionskosten; Rendite ggf. konservativer wählen.
        </p>
      </section>

      <div className={cn(cardGridVariants())}>
        <div className={cn(cardVariants())}>
          <p className={cn(cardLabelVariants())}>
            Nettovermögen Kauf (nach {formatLoanTerm(horizonMonths)})
          </p>
          <p className={cn(cardValueVariants())}>
            {eur0.format(sim.finalBuyNetWorth)}
          </p>
        </div>
        <div className={cn(cardVariants())}>
          <p className={cn(cardLabelVariants())}>
            ETF-Portfolio bei Miete (nach {formatLoanTerm(horizonMonths)},
            ohne Mietzahlungen)
          </p>
          <p className={cn(cardValueVariants())}>
            {eur0.format(sim.finalRentNetWorth)}
          </p>
        </div>
        <div className={cn(cardVariants(), 'sm:col-span-2 lg:col-span-1')}>
          <p className={cn(cardLabelVariants())}>Differenz (Kauf − Miete/ETF)</p>
          <p
            className={cn(
              cardValueVariants(),
              diff > 0 ? diffPositiveVariants() : diff < 0 ? diffNegativeVariants() : '',
            )}
          >
            {eur0.format(diff)} · {diffLabel}
          </p>
        </div>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <p className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-[var(--text)]">
          <strong className="text-[var(--text-h)]">
            Im Schnitt monatlich (Kauf):
          </strong>{' '}
          Rate + Instandhaltung + Nebenkosten ca.{' '}
          {eur0.format(Math.round(sim.avgMonthlyBuyLoad))}
        </p>
        <p className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-[var(--text)]">
          <strong className="text-[var(--text-h)]">
            Im Schnitt monatlich (Miete):
          </strong>{' '}
          Miete + Sparrate ca.{' '}
          {eur0.format(Math.round(sim.avgMonthlyRentLoad))}
        </p>
      </div>

      <WealthComparisonChart points={sim.yearlyPoints} />

      <p className={cn(subVariants())}>
        <strong className="text-[var(--text-h)]">Hinweise:</strong> Keine
        Grunderwerbsteuer, Notar, Makler, Modernisierung oder Mieterhöhungen.
        Immobilie ist illiquider als ETF. Historische Renditen sind keine
        Garantie. Modellrechnung zur Orientierung, keine Anlageberatung.
      </p>
    </main>
  )
}
