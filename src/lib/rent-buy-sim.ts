/**
 * Vergleich Kauf vs. Miete+ETF über einen festen Horizont (Monats-Simulation).
 * Kauf: Immobilienwert (Wertsteigerung), Restschuld, Instandhaltung,
 * feste monatliche Nebenkosten (z. B. Versicherung, Grundsteuer, Müll).
 * Miete: ETF mit Zinseszins + monatlicher Sparrate; Eigenkapital startet voll im ETF.
 */

export type RentBuyYearPoint = {
  year: number
  buyNetWorth: number
  rentNetWorth: number
}

export type RentBuySimResult = {
  yearlyPoints: RentBuyYearPoint[]
  cumulativeBuyCashOut: number
  cumulativeRentPaid: number
  finalBuyNetWorth: number
  finalRentNetWorth: number
  avgMonthlyBuyLoad: number
  avgMonthlyRentLoad: number
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
  maintenancePctOfValueAnnual: number
  propertyAppreciationPctAnnual: number
  /** Anzahl Monate; sinnvoll = volle Kreditlaufzeit bis Restschuld 0. */
  horizonMonths: number
  coldRentMonthly: number
  etfMonthlyContribution: number
  etfExpectedReturnPctAnnual: number
  /** Feste Nebenkosten Eigentum / Monat (ohne Instandhaltungs-%). */
  monthlyOwnerAncillaryCosts: number
}): RentBuySimResult {
  const {
    purchasePrice,
    equity: startingEquity,
    loanPrincipal,
    annualMortgageRatePct,
    monthlyMortgagePayment,
    maintenancePctOfValueAnnual,
    propertyAppreciationPctAnnual,
    horizonMonths: horizonMonthsParam,
    coldRentMonthly,
    etfMonthlyContribution,
    etfExpectedReturnPctAnnual,
    monthlyOwnerAncillaryCosts,
  } = params

  const months = Math.max(12, Math.round(horizonMonthsParam))
  const mortgageMonthlyRate = annualMortgageRatePct / 100 / 12
  const propGrowth = monthlyRateFromAnnualPct(propertyAppreciationPctAnnual)
  const etfGrowth = monthlyRateFromAnnualPct(etfExpectedReturnPctAnnual)

  let propertyValue = purchasePrice
  let loanBalance = loanPrincipal
  let cumulativeBuyCashOut = 0
  let cumulativeRentPaid = 0

  let etfBalance = startingEquity

  const yearlyPoints: RentBuyYearPoint[] = [
    {
      year: 0,
      buyNetWorth: Math.max(0, propertyValue - loanBalance),
      rentNetWorth: etfBalance,
    },
  ]

  for (let m = 0; m < months; m++) {
    propertyValue *= 1 + propGrowth

    const maintenance =
      propertyValue * (maintenancePctOfValueAnnual / 100) / 12

    if (loanBalance > 0.01) {
      const interest = loanBalance * mortgageMonthlyRate
      const pay = monthlyMortgagePayment
      if (pay > interest + 1e-9) {
        const principalPart = Math.min(pay - interest, loanBalance)
        loanBalance -= principalPart
      }
    }

    cumulativeBuyCashOut +=
      monthlyMortgagePayment +
      maintenance +
      Math.max(0, monthlyOwnerAncillaryCosts)
    cumulativeRentPaid += coldRentMonthly

    etfBalance = etfBalance * (1 + etfGrowth) + etfMonthlyContribution

    if ((m + 1) % 12 === 0) {
      const y = (m + 1) / 12
      yearlyPoints.push({
        year: y,
        buyNetWorth: propertyValue - loanBalance,
        rentNetWorth: etfBalance,
      })
    }
  }

  const lastBuy = yearlyPoints[yearlyPoints.length - 1]?.buyNetWorth ?? 0
  const lastRent = yearlyPoints[yearlyPoints.length - 1]?.rentNetWorth ?? 0

  return {
    yearlyPoints,
    cumulativeBuyCashOut,
    cumulativeRentPaid,
    finalBuyNetWorth: lastBuy,
    finalRentNetWorth: lastRent,
    avgMonthlyBuyLoad: cumulativeBuyCashOut / months,
    avgMonthlyRentLoad: (cumulativeRentPaid + etfMonthlyContribution * months) / months,
  }
}
