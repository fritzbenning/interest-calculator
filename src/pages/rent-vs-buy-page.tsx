import { useMemo, useState } from 'react'
import { cva } from 'class-variance-authority'
import { InfoTooltip } from '../components/info-tooltip'
import { ParamSlider } from '../components/param-slider'
import {
  CardTitleWithInfo,
  SectionHeading,
} from '../components/section-heading'
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
const INITIAL_MAINTENANCE_PCT = 1
/** Grobe Orientierung Einfamilienhaus: oft ca. 250–450 €/Monat je nach Region/Objekt. */
const DEFAULT_MONTHLY_NEBENKOSTEN = 300

function initialMonthlyBudgetEur(): number {
  const pay = monthlyPaymentFromTilgung(
    INITIAL_LOAN,
    INITIAL_RATE,
    INITIAL_TILGUNG_HINT,
  )
  const m0 = (INITIAL_PURCHASE * INITIAL_MAINTENANCE_PCT) / 100 / 12
  return pay + m0 + DEFAULT_MONTHLY_NEBENKOSTEN
}

export function RentVsBuyPage() {
  const [purchasePrice, setPurchasePrice] = useState(INITIAL_PURCHASE)
  const [equity, setEquity] = useState(INITIAL_EQUITY)
  const [ratePct, setRatePct] = useState(INITIAL_RATE)
  const [monthlyBudget, setMonthlyBudget] = useState(() =>
    Math.round(initialMonthlyBudgetEur() / 25) * 25,
  )
  const [monthlyNebenkosten, setMonthlyNebenkosten] = useState(
    DEFAULT_MONTHLY_NEBENKOSTEN,
  )
  const [maintenancePct, setMaintenancePct] = useState(INITIAL_MAINTENANCE_PCT)
  const [appreciationPct, setAppreciationPct] = useState(0.5)
  const [coldRent, setColdRent] = useState(1_100)
  const [etfReturnPct, setEtfReturnPct] = useState(6)
  const [projectionYearsAfterLoan, setProjectionYearsAfterLoan] = useState(15)

  const loan = Math.max(0, purchasePrice - equity)

  const paymentBounds = useMemo(
    () => mortgagePaymentSliderBounds(loan, ratePct),
    [loan, ratePct],
  )

  const maintenanceMonthAtPurchase = useMemo(
    () => (purchasePrice * maintenancePct) / 100 / 12,
    [purchasePrice, maintenancePct],
  )

  const rawAnnuitaetFromBudget = useMemo(
    () => monthlyBudget - maintenanceMonthAtPurchase - monthlyNebenkosten,
    [monthlyBudget, maintenanceMonthAtPurchase, monthlyNebenkosten],
  )

  const payment = useMemo(
    () =>
      loan > 0
        ? clamp(rawAnnuitaetFromBudget, paymentBounds.min, paymentBounds.max)
        : 0,
    [loan, rawAnnuitaetFromBudget, paymentBounds.min, paymentBounds.max],
  )

  const paymentClampedLow =
    loan > 0 && rawAnnuitaetFromBudget < paymentBounds.min - 0.5
  const paymentClampedHigh =
    loan > 0 && rawAnnuitaetFromBudget > paymentBounds.max + 0.5

  const tilgungEquivalentPct =
    loan > 0 ? tilgungFromMonthlyPayment(loan, ratePct, payment) : 0

  /** ETF beim Mieten: Restbudget nach Kaltmiete (kein Instandhaltungsabzug). */
  const etfSparrateStart = useMemo(
    () => Math.max(0, monthlyBudget - coldRent),
    [monthlyBudget, coldRent],
  )

  /** Kauf-ETF nach Tilgung, Orientierung mit Instandhaltung wie bei Kaufpreis / 12. */
  const buyEtfNachTilgungIllustrativ = useMemo(
    () =>
      Math.max(
        0,
        monthlyBudget - maintenanceMonthAtPurchase - monthlyNebenkosten,
      ),
    [monthlyBudget, maintenanceMonthAtPurchase, monthlyNebenkosten],
  )

  const amortResult = useMemo(
    () => amortize(loan, ratePct, payment),
    [loan, ratePct, payment],
  )

  const horizonMonths = useMemo(() => {
    if (loan <= 0) return 12
    return Math.max(12, amortResult.months)
  }, [loan, amortResult.months])

  const projectionMonthsAfterLoan = projectionYearsAfterLoan * 12

  const sim = useMemo(
    () =>
      simulateRentVsBuy({
        purchasePrice,
        equity,
        loanPrincipal: loan,
        annualMortgageRatePct: ratePct,
        monthlyMortgagePayment: payment,
        monthlyBudget,
        maintenancePctOfValueAnnual: maintenancePct,
        propertyAppreciationPctAnnual: appreciationPct,
        loanPayoffMonths: horizonMonths,
        extraMonthsAfterLoan: projectionMonthsAfterLoan,
        coldRentMonthly: coldRent,
        etfExpectedReturnPctAnnual: etfReturnPct,
        monthlyOwnerAncillaryCosts: monthlyNebenkosten,
      }),
    [
      purchasePrice,
      equity,
      loan,
      ratePct,
      payment,
      monthlyBudget,
      maintenancePct,
      appreciationPct,
      horizonMonths,
      projectionMonthsAfterLoan,
      coldRent,
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
        <div className="flex items-start justify-between gap-3">
          <h1 className={cn(headingVariants(), 'min-w-0 flex-1')}>
            Miete vs. Kauf
          </h1>
          <InfoTooltip
            aria-label="Modell: gemeinsames Monatsbudget, Kauf-Vermögen als Immo-Netto plus Kauf-ETF, Miet-Vermögen als ETF-Depot."
            className="mt-1 shrink-0"
          >
            <p>
              Langfristiger Vermögensvergleich mit einem gemeinsamen{' '}
              <strong className="text-[var(--text-h)]">Monatsbudget</strong>:
              Beim <strong>Kauf</strong> teilt es sich in Annuität, Instandhaltung
              (fix aus Kaufpreis) und Nebenkosten; beim{' '}
              <strong>Mieten</strong> in Kaltmiete und ETF –{' '}
              <strong className="text-[var(--text-h)]">
                Instandhaltung am Gebäude
              </strong>{' '}
              trägt hier der Vermieter, sie fließt nicht in die Miet-Rechnung
              ein.
            </p>
            <p>
              Das angezeigte Kauf-Vermögen ist{' '}
              <strong className="text-[var(--text-h)]">
                Immobilienwert minus Restschuld
              </strong>{' '}
              plus ggf. Kauf-ETF nach Tilgung. Beim Mieten ist das Diagramm{' '}
              <strong className="text-[var(--text-h)]">
                nur das ETF-Portfolio
              </strong>{' '}
              (Startkapital plus monatlichem Rest nach Kaltmiete, mit
              Zinseszins).
            </p>
          </InfoTooltip>
        </div>
        <p className={cn(subVariants())}>
          Gleiches Monatsbudget für beide Szenarien – unten Diagramm, Karten und
          Fazit. <strong className="text-[var(--text-h)]">Modell-Details</strong>{' '}
          über das Infosymbol neben der Überschrift.
        </p>
      </header>

      <section className="flex flex-col gap-6" aria-labelledby="budget-h">
        <SectionHeading
          id="budget-h"
          infoLabel="Aufteilung des Monatsbudgets: Kauf vs. Miete"
          info={
            <>
              <p>
                <strong className="text-[var(--text-h)]">Kauf:</strong> Budget
                ={' '}
                <span className="font-mono tabular-nums text-[var(--text-h)]">
                  Annuität + Instandhaltung (Start) + Nebenkosten
                </span>{' '}
                ({eur2.format(payment)} +{' '}
                {eur0.format(Math.round(maintenanceMonthAtPurchase))} +{' '}
                {eur0.format(monthlyNebenkosten)}).
              </p>
              <p>
                <strong className="text-[var(--text-h)]">Miete:</strong> Budget
                ={' '}
                <span className="font-mono tabular-nums text-[var(--text-h)]">
                  Kaltmiete + ETF
                </span>{' '}
                ({eur0.format(coldRent)} + {eur2.format(etfSparrateStart)}). Der
                Rest des Budgets nach Kaltmiete geht in den ETF (kein
                Instandhaltungsabzug beim Mieter).
              </p>
            </>
          }
        >
          Monatsbudget
        </SectionHeading>
        <ParamSlider
          label="Gesamtbudget pro Monat (Kauf und Miet-Szenario)"
          min={400}
          max={15_000}
          step={25}
          value={monthlyBudget}
          onValueChange={setMonthlyBudget}
          format={(x) => eur0.format(x)}
        />
      </section>

      <section className="flex flex-col gap-6" aria-labelledby="immobilie-h">
        <SectionHeading
          id="immobilie-h"
          infoLabel="Darlehen und Rate: wo die Zahlen herkommen"
          info={
            <p>
              Die <strong className="text-[var(--text-h)]">Darlehenssumme</strong>{' '}
              ist Kaufpreis minus Eigenkapital (
              {eur0.format(loan)}). Die monatliche Rate ergibt sich im Abschnitt{' '}
              <strong className="text-[var(--text-h)]">Kosten & Annahmen</strong>{' '}
              aus Monatsbudget abzüglich Instandhaltung und Nebenkosten.
            </p>
          }
        >
          Immobilie & Kredit
        </SectionHeading>
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
      </section>

      <section className="flex flex-col gap-6" aria-labelledby="kosten-h">
        <SectionHeading
          id="kosten-h"
          infoLabel="Nebenkosten Eigentum und Instandhaltung: was die Slider bedeuten"
          info={
            <>
              <p>
                <strong className="text-[var(--text-h)]">
                  Nebenkosten (pauschal):
                </strong>{' '}
                Z. B. Grundsteuer, Gebäudeversicherung, Müll, ggf. Verwaltung –{' '}
                <strong className="text-[var(--text-h)]">ohne</strong> die
                prozentuale Instandhaltung. Voreinstellung{' '}
                {eur0.format(DEFAULT_MONTHLY_NEBENKOSTEN)} entspricht einer
                üblichen Größenordnung für viele Häuser (oft grob 250–450 €,
                stark abhängig von Region und Objekt).
              </p>
              <p>
                <strong className="text-[var(--text-h)]">Instandhaltung:</strong>{' '}
                Umrechnung Kaufpreis × Prozent / 12 = monatlicher Betrag (ändert
                sich nicht mit der simulierten Wertsteigerung).
              </p>
            </>
          }
        >
          Kosten & Annahmen
        </SectionHeading>
        <ParamSlider
          label="Nebenkosten Eigentum (monatlich, pauschal)"
          min={0}
          max={2_000}
          step={25}
          value={monthlyNebenkosten}
          onValueChange={setMonthlyNebenkosten}
          format={(x) => eur0.format(x)}
        />
               <ParamSlider
          label="Instandhaltung (p.a. vom Kaufpreis, konstant €/Monat)"
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
        <div className="rounded-lg border border-[var(--border)] bg-[var(--code-bg)] px-4 py-3 text-left">
          <CardTitleWithInfo
            infoLabel="So entsteht die rechnerische Annuität aus dem Budget"
            info={
              <p>
                Vom{' '}
                <strong className="text-[var(--text-h)]">Gesamtbudget</strong>{' '}
                werden zuerst die hier eingestellten{' '}
                <strong className="text-[var(--text-h)]">
                  laufenden Kosten
                </strong>{' '}
                abgezogen; der Rest ist die{' '}
                <strong className="text-[var(--text-h)]">
                  rechnerische Annuität
                </strong>{' '}
                (vor Mindest-/Höchstgrenze der Bank-Logik).
              </p>
            }
          >
            <p className="text-sm font-medium text-[var(--text-h)]">
              Resultierende Annuität (aus Monatsbudget)
            </p>
          </CardTitleWithInfo>
          <ul className="mt-3 list-none space-y-1 text-xs text-[var(--text)]">
            <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
              <span>Monatsbudget</span>
              <span className="font-mono tabular-nums text-[var(--text-h)]">
                {eur0.format(monthlyBudget)}
              </span>
            </li>
            <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
              <span>
                − Instandhaltung ({maintenancePct.toFixed(2).replace('.', ',')}%
                p.a. vom Kaufpreis / 12)
              </span>
              <span className="font-mono tabular-nums text-[var(--text-h)]">
                − {eur0.format(Math.round(maintenanceMonthAtPurchase))}
              </span>
            </li>
            <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
              <span>− Nebenkosten Eigentum (pauschal)</span>
              <span className="font-mono tabular-nums text-[var(--text-h)]">
                − {eur0.format(monthlyNebenkosten)}
              </span>
            </li>
            <li className="mt-2 flex flex-wrap justify-between gap-x-4 border-t border-[var(--border)] pt-2 font-medium text-[var(--text-h)]">
              <span>= Rechnerische Annuität</span>
              <span className="font-mono tabular-nums">
                {loan > 0 ? eur2.format(rawAnnuitaetFromBudget) : eur2.format(0)}
              </span>
            </li>
          </ul>
          {loan > 0 ? (
            <>
              <p className="mt-3 font-mono text-lg tabular-nums text-[var(--text-h)]">
                Angesetzte Rate:{' '}
                <span className="font-sans font-bold">
                  {eur2.format(payment)} / Monat
                </span>
              </p>
              <p className="mt-2 text-xs text-[var(--text)]">
                Darlehen {eur0.format(loan)}, begrenzt zwischen{' '}
                {eur0.format(paymentBounds.min)} und{' '}
                {eur0.format(Math.round(paymentBounds.max))} / Monat. Entspricht
                ca.{' '}
                <strong className="text-[var(--text-h)]">
                  {tilgungEquivalentPct.toFixed(2).replace('.', ',')} % Tilgung
                  p.a.
                </strong>{' '}
                (Bank-Linearformel).
                {paymentClampedLow ? (
                  <>
                    {' '}
                    <strong className="text-[var(--text-h)]">Hinweis:</strong>{' '}
                    Rechnerische Rate unter dem Minimum – es wird die minimale
                    Rate angesetzt (effektiv höhere Belastung als Budget).
                  </>
                ) : null}
                {paymentClampedHigh ? (
                  <>
                    {' '}
                    <strong className="text-[var(--text-h)]">Hinweis:</strong>{' '}
                    Rechnerische Rate über der üblichen Obergrenze – die Rate
                    wird begrenzt.
                  </>
                ) : null}
              </p>
            </>
          ) : (
            <p className="mt-3 text-xs text-[var(--text)]">
              Ohne Darlehen entfällt die Annuität; die Kostenzeilen zeigen, wie
              sich das Budget beim Kauf aufteilen würde.
            </p>
          )}
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)]">
          <CardTitleWithInfo
            infoLabel="Kreditlaufzeit, Diagramm und Sonderfälle"
            info={
              <>
                <p>
                  Bis die Darlehenssumme bei der gewählten Rate getilgt wäre.
                  Die Jahre <strong className="text-[var(--text-h)]">nach</strong>{' '}
                  Kreditende stellen Sie im Abschnitt „Zukunftsprognose“ ein; im
                  Diagramm sind sie{' '}
                  <strong className="text-[var(--text-h)]">gestrichelt</strong>.
                </p>
                {loan > 0 && !amortResult.feasible ? (
                  <p className="text-[var(--text-h)]">
                    <strong>Hinweis:</strong> Mit dieser Annuität ist das
                    Darlehen in der Simulation nicht vollständig tilgbar; es
                    wird mit {MAX_AMORTIZATION_MONTHS / 12} Jahren Obergrenze
                    gerechnet.
                  </p>
                ) : null}
                {loan <= 0 ? (
                  <p>
                    Ohne Darlehen ist der Zeitraum auf 12 Monate gesetzt (nur
                    Orientierung).
                  </p>
                ) : null}
              </>
            }
          >
            <p className="font-medium text-[var(--text-h)]">
              Kreditlaufzeit
            </p>
          </CardTitleWithInfo>
          <p className="mt-2 text-base text-[var(--text-h)]">
            <strong className="tabular-nums">
              {formatLoanTerm(horizonMonths)}
            </strong>
            <span className="font-normal text-[var(--text)]">
              {' '}
              ({horizonMonths} Monate)
            </span>
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-6" aria-labelledby="miete-h">
        <SectionHeading
          id="miete-h"
          infoLabel="Miet-Szenario: ETF-Depot und Annahmen"
          info={
            <p>
              ETF-Startbetrag = Eigenkapital ({eur0.format(equity)}). Die Kurve
              „Miete“ im Diagramm ist{' '}
              <strong className="text-[var(--text-h)]">nur dieses Depot</strong>{' '}
              – nicht die Summe der Mietzahlungen. Keine Steuern, Gebühren
              (TER) oder Transaktionskosten; Rendite ggf. konservativer wählen.
            </p>
          }
        >
          Miete & ETF
        </SectionHeading>
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
          <CardTitleWithInfo
            infoLabel="Berechnung der ETF-Sparrate beim Mieten"
            info={
              <p>
                <span className="font-mono text-[var(--text-h)] tabular-nums">
                  max(0, Budget − Kaltmiete)
                </span>{' '}
                = max(0, {eur0.format(monthlyBudget)} −{' '}
                {eur0.format(coldRent)}). Instandhaltung am Gebäude ist Sache
                des Vermieters und wird beim Mieter nicht vom Budget abgezogen.
                {monthlyBudget < coldRent ? (
                  <>
                    {' '}
                    Aktuell 0 € ETF (Kaltmiete übersteigt das Budget).
                  </>
                ) : null}
              </p>
            }
          >
            <p className="text-sm font-medium text-[var(--text-h)]">
              ETF-Sparrate (automatisch)
            </p>
          </CardTitleWithInfo>
          <p className="mt-1 font-mono text-lg tabular-nums text-[var(--text-h)]">
            {eur2.format(etfSparrateStart)}
            <span className="ml-2 text-sm font-sans font-normal text-[var(--text)]">
              / Monat
            </span>
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
      </section>

      <section
        className="flex flex-col gap-6"
        aria-labelledby="prognose-h"
      >
        <SectionHeading
          id="prognose-h"
          infoLabel="Was nach Kreditende in der Simulation passiert"
          info={
            <>
              <p>
                Nach vollständiger Tilgung entfällt die Annuität;{' '}
                <strong className="text-[var(--text-h)]">Instandhaltung</strong>,{' '}
                <strong className="text-[var(--text-h)]">Nebenkosten</strong> und{' '}
                <strong className="text-[var(--text-h)]">Wertsteigerung</strong>{' '}
                laufen weiter. Im Kauf-Szenario fließt der{' '}
                <strong className="text-[var(--text-h)]">
                  Rest des Monatsbudgets
                </strong>{' '}
                nach Instandhaltung und Nebenkosten ins Kauf-ETF (gleiche
                Rendite wie beim Miet-Depot). Beim Miet-Szenario bleibt{' '}
                <strong className="text-[var(--text-h)]">Kaltmiete + ETF</strong>{' '}
                aus demselben Budget; Instandhaltung trägt der Vermieter.
              </p>
              <p>
                <strong className="text-[var(--text-h)]">Auswertung:</strong>{' '}
                Gesamthorizont{' '}
                <span className="tabular-nums">
                  {formatLoanTerm(sim.totalSimMonths)}
                </span>{' '}
                ({sim.totalSimMonths} Monate). Im Diagramm sind die Jahre nach
                Kreditende{' '}
                <strong className="text-[var(--text-h)]">gestrichelt</strong>.
              </p>
            </>
          }
        >
          Zukunftsprognose (nach Kreditende)
        </SectionHeading>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--code-bg)] px-4 py-3 text-left text-sm text-[var(--text)]">
          <CardTitleWithInfo
            infoLabel="ETF nach Tilgung: gleiches Budget, andere Abzüge"
            info={
              <p>
                Gleiches{' '}
                <strong className="text-[var(--text-h)]">Monatsbudget</strong>{' '}
                wie oben. Nach Tilgung entfällt die Annuität; der{' '}
                <strong className="text-[var(--text-h)]">Rest</strong> fließt ins
                Kauf- bzw. Miet-ETF nach den folgenden Abzügen – je Szenario in
                der jeweiligen Box.
              </p>
            }
          >
            <p className="text-sm font-medium text-[var(--text-h)]">
              ETF nach Kreditende
            </p>
          </CardTitleWithInfo>

          {loan > 0.01 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-left">
                <CardTitleWithInfo
                  className="mb-0"
                  infoLabel="Kauf-ETF nach Tilgung: Formel und Instandhaltung"
                  info={
                    <p>
                      Monatliche Einzahlung ins Kauf-ETF:{' '}
                      <span className="font-mono text-[var(--text-h)] tabular-nums">
                        max(0, Budget − Instandhaltung − Nebenkosten)
                      </span>
                      . Instandhaltung:{' '}
                      {maintenancePct.toFixed(2).replace('.', ',')}% p.a. vom{' '}
                      <strong className="text-[var(--text-h)]">Kaufpreis</strong>,
                      monatlich konstant in Euro.
                    </p>
                  }
                >
                  <p className="text-xs font-medium text-[var(--text-h)]">
                    Kauf-Szenario (nach Tilgung)
                  </p>
                </CardTitleWithInfo>
                <ul className="mt-3 list-none space-y-1 text-xs text-[var(--text)]">
                  <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                    <span>Monatsbudget</span>
                    <span className="font-mono tabular-nums text-[var(--text-h)]">
                      {eur0.format(monthlyBudget)}
                    </span>
                  </li>
                  <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                    <span>
                      − Instandhaltung (
                      {maintenancePct.toFixed(2).replace('.', ',')}% p.a. vom
                      Kaufpreis / 12)
                    </span>
                    <span className="font-mono tabular-nums text-[var(--text-h)]">
                      − {eur0.format(Math.round(maintenanceMonthAtPurchase))}
                    </span>
                  </li>
                  <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                    <span>− Nebenkosten Eigentum (pauschal)</span>
                    <span className="font-mono tabular-nums text-[var(--text-h)]">
                      − {eur0.format(monthlyNebenkosten)}
                    </span>
                  </li>
                  <li className="mt-2 flex flex-wrap justify-between gap-x-4 border-t border-[var(--border)] pt-2 font-medium text-[var(--text-h)]">
                    <span>= Kauf-ETF (Einzahlung / Monat)</span>
                    <span className="font-mono tabular-nums">
                      {eur2.format(buyEtfNachTilgungIllustrativ)}
                    </span>
                  </li>
                </ul>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-left">
                <CardTitleWithInfo
                  className="mb-0"
                  infoLabel="Miet-Szenario: Instandhaltung und ETF-Formel"
                  info={
                    <p>
                      Objekt-Instandhaltung trägt der{' '}
                      <strong className="text-[var(--text-h)]">Vermieter</strong>,
                      nicht der Mieter. ETF-Einzahlung:{' '}
                      <span className="font-mono text-[var(--text-h)] tabular-nums">
                        max(0, Budget − Kaltmiete)
                      </span>
                      .
                    </p>
                  }
                >
                  <p className="text-xs font-medium text-[var(--text-h)]">
                    Miet-Szenario (bleibt unverändert)
                  </p>
                </CardTitleWithInfo>
                <ul className="mt-3 list-none space-y-1 text-xs text-[var(--text)]">
                  <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                    <span>Monatsbudget</span>
                    <span className="font-mono tabular-nums text-[var(--text-h)]">
                      {eur0.format(monthlyBudget)}
                    </span>
                  </li>
                  <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                    <span>− Kaltmiete</span>
                    <span className="font-mono tabular-nums text-[var(--text-h)]">
                      − {eur0.format(coldRent)}
                    </span>
                  </li>
                  <li className="mt-2 flex flex-wrap justify-between gap-x-4 border-t border-[var(--border)] pt-2 font-medium text-[var(--text-h)]">
                    <span>= Miet-ETF (Einzahlung / Monat)</span>
                    <span className="font-mono tabular-nums">
                      {eur2.format(etfSparrateStart)}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="mt-4 max-w-md rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-left">
              <CardTitleWithInfo
                className="mb-0"
                infoLabel="Ohne Darlehen: nur Miet-ETF"
                info={
                  <p>
                    Ohne Darlehen entfällt das Kauf-ETF. ETF-Einzahlung:{' '}
                    <span className="font-mono text-[var(--text-h)] tabular-nums">
                      max(0, Budget − Kaltmiete)
                    </span>
                    .
                  </p>
                }
              >
                <p className="text-xs font-medium text-[var(--text-h)]">
                  Miet-Szenario
                </p>
              </CardTitleWithInfo>
              <ul className="mt-3 list-none space-y-1 text-xs text-[var(--text)]">
                <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                  <span>Monatsbudget</span>
                  <span className="font-mono tabular-nums text-[var(--text-h)]">
                    {eur0.format(monthlyBudget)}
                  </span>
                </li>
                <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                  <span>− Kaltmiete</span>
                  <span className="font-mono tabular-nums text-[var(--text-h)]">
                    − {eur0.format(coldRent)}
                  </span>
                </li>
                <li className="mt-2 flex flex-wrap justify-between gap-x-4 border-t border-[var(--border)] pt-2 font-medium text-[var(--text-h)]">
                  <span>= Miet-ETF (Einzahlung / Monat)</span>
                  <span className="font-mono tabular-nums">
                    {eur2.format(etfSparrateStart)}
                  </span>
                </li>
              </ul>
            </div>
          )}
        </div>
        <ParamSlider
          label="Prognose-Zeitraum nach Tilgung"
          min={0}
          max={40}
          step={1}
          value={projectionYearsAfterLoan}
          onValueChange={setProjectionYearsAfterLoan}
          format={(y) => (y === 0 ? 'Keine' : `${y} Jahre`)}
        />
      </section>

      <WealthComparisonChart points={sim.yearlyPoints} />

      <p className={cn(
          subVariants(),
          'flex flex-wrap items-baseline gap-x-2 gap-y-1',
        )}
      >
        <strong className="text-[var(--text-h)]">Hinweise</strong>
        <InfoTooltip
          aria-label="Grenzen des Modells und rechtlicher Hinweis"
          className="align-middle"
        >
          <p>
            Keine Grunderwerbsteuer, Notar, Makler, Modernisierung oder
            Mieterhöhungen. Immobilie ist illiquider als ETF. Historische
            Renditen sind keine Garantie. Modellrechnung zur Orientierung, keine
            Anlageberatung.
          </p>
        </InfoTooltip>
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className={cn(cardVariants(), 'min-w-0')}>
          <CardTitleWithInfo
            className="mb-0"
            infoLabel="Kauf: was in der Endsumme steckt"
            info={
              <p>
                Summe aus{' '}
                <strong className="text-[var(--text-h)]">
                  Immobilienwert minus Restschuld
                </strong>{' '}
                und dem{' '}
                <strong className="text-[var(--text-h)]">Kauf-ETF</strong> zum
                Ende des Horizonts ({formatLoanTerm(sim.totalSimMonths)}).
              </p>
            }
          >
            <p className={cn(cardLabelVariants())}>
              Nettovermögen Kauf: Immo + Kauf-ETF (Ende Horizont,{' '}
              {formatLoanTerm(sim.totalSimMonths)})
            </p>
          </CardTitleWithInfo>
          <p className={cn(cardValueVariants())}>
            {eur0.format(sim.finalBuyNetWorth)}
          </p>
        </div>
        <div className={cn(cardVariants(), 'min-w-0')}>
          <CardTitleWithInfo
            className="mb-0"
            infoLabel="Miete: was die Endsumme bedeutet"
            info={
              <p>
                Nur das{' '}
                <strong className="text-[var(--text-h)]">ETF-Depot</strong> zum
                Stichtag –{' '}
                <strong className="text-[var(--text-h)]">ohne</strong> die
                kumulierten Mietzahlungen. Horizont:{' '}
                {formatLoanTerm(sim.totalSimMonths)}.
              </p>
            }
          >
            <p className={cn(cardLabelVariants())}>
              ETF-Portfolio bei Miete (Ende Horizont,{' '}
              {formatLoanTerm(sim.totalSimMonths)}; ohne Mietzahlungen)
            </p>
          </CardTitleWithInfo>
          <p className={cn(cardValueVariants())}>
            {eur0.format(sim.finalRentNetWorth)}
          </p>
        </div>
      </div>

      <section
        className="rounded-xl border border-[var(--border)] bg-[var(--code-bg)] p-5"
        aria-labelledby="fazit-h"
      >
        <CardTitleWithInfo
          className="mb-0"
          infoLabel="Bedeutung der Differenz Kauf minus Miete"
          info={
            <p>
              Differenz der <strong className="text-[var(--text-h)]">End-Nettovermögen</strong>{' '}
              nach dem gewählten Horizont ({formatLoanTerm(sim.totalSimMonths)}):{' '}
              <strong className="text-[var(--text-h)]">positiv</strong>, wenn das
              Kauf-Szenario (Immo + Kauf-ETF) höher liegt;{' '}
              <strong className="text-[var(--text-h)]">negativ</strong>, wenn das
              Miet-ETF vorn liegt.
            </p>
          }
        >
          <p id="fazit-h" className={cn(cardLabelVariants())}>
            Differenz (Kauf − Miete/ETF)
          </p>
        </CardTitleWithInfo>
        <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
          <span
            className={cn(
              'font-mono text-xl font-medium tabular-nums sm:text-2xl',
              diff > 0
                ? diffPositiveVariants()
                : diff < 0
                  ? diffNegativeVariants()
                  : 'text-[var(--text-h)]',
            )}
          >
            {eur0.format(diff)}
          </span>
          <span
            className={cn(
              'inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium text-[var(--text-h)]',
              diff > 0 &&
                'border-[var(--accent-border)] bg-[var(--accent-bg)]',
              diff < 0 &&
                'border-[color-mix(in_srgb,var(--wealth-buy-etf)_45%,var(--border))] bg-[color-mix(in_srgb,var(--wealth-buy-etf)_14%,var(--code-bg))]',
              diff === 0 && 'border-[var(--border)] bg-[var(--bg)]',
            )}
          >
            {diffLabel}
          </span>
        </div>
      </section>
    </main>
  )
}
