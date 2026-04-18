/**
 * Vergleich Kauf vs. Miete+ETF über die Kreditlaufzeit und optional
 * weitere Jahre danach (Prognose: Immo-Wertsteigerung vs. ETF-Zinseszins).
 */

export type RentBuyYearPhase = 'with_loan' | 'projection'

export type RentBuyYearPoint = {
  year: number
  /** Immobilienwert − Restschuld. */
  buyNetWorth: number
  /**
   * Kauf-ETF nach Tilgung: Rest des Monatsbudgets nach Instandhaltung und
   * Nebenkosten (gleiche ETF-Rendite wie Miet-Szenario).
   */
  buyEtfNetWorth: number
  rentNetWorth: number
  phase: RentBuyYearPhase
}

export type RentBuySimResult = {
  yearlyPoints: RentBuyYearPoint[]
  finalBuyNetWorth: number
  finalRentNetWorth: number
  loanPayoffMonths: number
  totalSimMonths: number
}

function monthlyRateFromAnnualPct(annualPct: number): number {
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1
}

export function simulateRentVsBuy(params: {
  purchasePrice: number
  equity: number
  loanPrincipal: number
  annualMortgageRatePct: number
  monthlyMortgagePayment: number
  /** Monatliches Gesamtbudget (Kauf: Rate+Inst+NK; Miete: Miete+Inst+ETF). */
  monthlyBudget: number
  /** p.a. vom Kaufpreis; monatlicher Betrag = Kaufpreis × % / 12 (konstant). */
  maintenancePctOfValueAnnual: number
  propertyAppreciationPctAnnual: number
  /** Monate bis Restschuld ~0 (aus Amortisation). */
  loanPayoffMonths: number
  /** Zusätzliche Monate nach Kreditende (Prognose). */
  extraMonthsAfterLoan: number
  coldRentMonthly: number
  etfExpectedReturnPctAnnual: number
  monthlyOwnerAncillaryCosts: number
}): RentBuySimResult {
  const {
    purchasePrice,
    equity: startingEquity,
    loanPrincipal,
    annualMortgageRatePct,
    monthlyMortgagePayment,
    monthlyBudget,
    maintenancePctOfValueAnnual,
    propertyAppreciationPctAnnual,
    loanPayoffMonths: loanPayoffMonthsParam,
    extraMonthsAfterLoan,
    coldRentMonthly,
    etfExpectedReturnPctAnnual,
    monthlyOwnerAncillaryCosts,
  } = params

  const loanPayoffMonths = Math.max(0, Math.round(loanPayoffMonthsParam))
  const extra = Math.max(0, Math.round(extraMonthsAfterLoan))
  const totalMonths = Math.max(12, loanPayoffMonths + extra)

  const mortgageMonthlyRate = annualMortgageRatePct / 100 / 12
  const propGrowth = monthlyRateFromAnnualPct(propertyAppreciationPctAnnual)
  const etfGrowth = monthlyRateFromAnnualPct(etfExpectedReturnPctAnnual)

  const maintenanceMonthly =
    (purchasePrice * maintenancePctOfValueAnnual) / 100 / 12

  let propertyValue = purchasePrice
  let loanBalance = loanPrincipal

  let etfBalance = startingEquity
  let buyEtfBalance = 0

  const startPhase: RentBuyYearPhase =
    loanPrincipal > 0.01 && loanPayoffMonths > 0 ? 'with_loan' : 'projection'

  const yearlyPoints: RentBuyYearPoint[] = [
    {
      year: 0,
      buyNetWorth: Math.max(0, propertyValue - loanBalance),
      buyEtfNetWorth: 0,
      rentNetWorth: etfBalance,
      phase: startPhase,
    },
  ]

  for (let m = 0; m < totalMonths; m++) {
    const hadLoan = loanBalance > 0.01

    propertyValue *= 1 + propGrowth

    const maintenance = maintenanceMonthly

    if (hadLoan) {
      const interest = loanBalance * mortgageMonthlyRate
      const pay = monthlyMortgagePayment
      if (pay > interest + 1e-9) {
        const principalPart = Math.min(pay - interest, loanBalance)
        loanBalance -= principalPart
      }
    }

    const neben = Math.max(0, monthlyOwnerAncillaryCosts)
    const B = Math.max(0, monthlyBudget)

    /** Mieter zahlen keine Objekt-Instandhaltung (Vermieter). */
    const etfRent = Math.max(0, B - coldRentMonthly)
    etfBalance = etfBalance * (1 + etfGrowth) + etfRent

    let buyToEtf = 0
    if (hadLoan && loanPrincipal > 0.01) {
      buyToEtf = monthlyMortgagePayment
    } else if (loanPrincipal > 0.01) {
      buyToEtf = Math.max(0, B - maintenance - neben)
      buyEtfBalance = buyEtfBalance * (1 + etfGrowth) + buyToEtf
    }

    if ((m + 1) % 12 === 0) {
      const y = (m + 1) / 12
      const phase: RentBuyYearPhase =
        loanPrincipal > 0.01 && m + 1 <= loanPayoffMonths
          ? 'with_loan'
          : 'projection'
      yearlyPoints.push({
        year: y,
        buyNetWorth: propertyValue - loanBalance,
        buyEtfNetWorth: buyEtfBalance,
        rentNetWorth: etfBalance,
        phase,
      })
    }
  }

  if (totalMonths % 12 !== 0) {
    const phase: RentBuyYearPhase =
      loanPrincipal > 0.01 && totalMonths <= loanPayoffMonths
        ? 'with_loan'
        : 'projection'
    yearlyPoints.push({
      year: totalMonths / 12,
      buyNetWorth: propertyValue - loanBalance,
      buyEtfNetWorth: buyEtfBalance,
      rentNetWorth: etfBalance,
      phase,
    })
  }

  const lastPt = yearlyPoints[yearlyPoints.length - 1]
  const lastBuy =
    (lastPt?.buyNetWorth ?? 0) + (lastPt?.buyEtfNetWorth ?? 0)
  const lastRent = lastPt?.rentNetWorth ?? 0

  return {
    yearlyPoints,
    finalBuyNetWorth: lastBuy,
    finalRentNetWorth: lastRent,
    loanPayoffMonths,
    totalSimMonths: totalMonths,
  }
}
