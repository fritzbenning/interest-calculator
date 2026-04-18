/**
 * Annuitätendarlehen (deutsche Banken-Praxis):
 * Monatsrate = Kreditsumme × (Sollzins + anfängliche Tilgung) / (12 × 100)
 * Danach Verlauf mit fester Rate und monatlicher Zinsberechnung auf Restschuld.
 */

export function monthlyPaymentFromTilgung(
  principal: number,
  annualRatePercent: number,
  tilgungPercent: number,
): number {
  return (principal * (annualRatePercent + tilgungPercent)) / (12 * 100)
}

export function monthlyPaymentFromTerm(
  principal: number,
  annualRatePercent: number,
  months: number,
): number {
  if (months <= 0 || principal <= 0) return 0
  const i = annualRatePercent / 100 / 12
  if (i < 1e-12) return principal / months
  const factor = Math.pow(1 + i, months)
  return (principal * i * factor) / (factor - 1)
}

/** Anfängliche Tilgung (% p.a. der Ausgangssumme), passend zur ersten Rate im linearen Modell. */
export function tilgungFromMonthlyPayment(
  principal: number,
  annualRatePercent: number,
  monthlyPayment: number,
): number {
  if (principal <= 0) return 0
  return (monthlyPayment * 12 * 100) / principal - annualRatePercent
}

export type AmortizationResult = {
  totalInterest: number
  months: number
  feasible: boolean
}

export const MAX_AMORTIZATION_MONTHS = 50 * 12

export type YearlyScheduleRow = {
  year: number
  interest: number
  principal: number
  payment: number
  balanceStart: number
  balanceEnd: number
}

/** Jährliche Aggregation des Tilgungsplans (letztes Jahr ggf. kürzer). */
export function yearlyAmortizationSchedule(
  principal: number,
  annualRatePercent: number,
  monthlyPayment: number,
): YearlyScheduleRow[] {
  if (principal <= 0) return []

  const monthlyRate = annualRatePercent / 100 / 12
  let balance = principal
  const rows: YearlyScheduleRow[] = []
  let monthInYear = 0
  let yInterest = 0
  let yPrincipal = 0
  let yearIndex = 1
  let balanceStartYear = balance

  for (let m = 0; m < MAX_AMORTIZATION_MONTHS && balance > 0.005; m++) {
    const interest = balance * monthlyRate
    if (monthlyPayment <= interest + 1e-9) {
      return []
    }
    const principalPart = Math.min(monthlyPayment - interest, balance)
    yInterest += interest
    yPrincipal += principalPart
    balance -= principalPart
    monthInYear++

    const yearDone = monthInYear === 12
    const paidOff = balance <= 0.005

    if (yearDone || paidOff) {
      rows.push({
        year: yearIndex,
        interest: yInterest,
        principal: yPrincipal,
        payment: yInterest + yPrincipal,
        balanceStart: balanceStartYear,
        balanceEnd: balance,
      })
      yearIndex++
      monthInYear = 0
      yInterest = 0
      yPrincipal = 0
      balanceStartYear = balance
    }
    if (paidOff) break
  }

  return rows
}

export function amortize(
  principal: number,
  annualRatePercent: number,
  monthlyPayment: number,
): AmortizationResult {
  const monthlyRate = annualRatePercent / 100 / 12
  let balance = principal
  let totalInterest = 0
  let months = 0

  while (balance > 0.005 && months < MAX_AMORTIZATION_MONTHS) {
    const interest = balance * monthlyRate
    if (monthlyPayment <= interest + 1e-9) {
      return {
        totalInterest: 0,
        months: MAX_AMORTIZATION_MONTHS,
        feasible: false,
      }
    }
    const principalPart = Math.min(monthlyPayment - interest, balance)
    totalInterest += interest
    balance -= principalPart
    months++
  }

  const feasible =
    months < MAX_AMORTIZATION_MONTHS && balance <= 0.005
  return { totalInterest, months, feasible }
}
