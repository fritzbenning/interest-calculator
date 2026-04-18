/** Positionen auf der X-Achse (Jahre seit Start), stets ≤ maxYear. */
export function yearAxisTicks(maxYear: number): number[] {
  const max = Math.max(maxYear, 1e-9)

  if (max <= 10) {
    const n = Math.floor(max)
    const out = Array.from({ length: n + 1 }, (_, i) => i)
    if (max - n > 1e-6) {
      out.push(max)
    }
    return out
  }

  const step = max <= 24 ? 5 : max <= 48 ? 10 : 15
  const ticks: number[] = [0]
  for (let y = step; y < max - 1e-9; y += step) {
    ticks.push(y)
  }
  if (Math.abs(ticks[ticks.length - 1] - max) > 1e-6) {
    ticks.push(max)
  }
  return ticks
}

export function formatYearTickLabel(year: number): string {
  if (Math.abs(year - Math.round(year)) < 0.05) {
    return String(Math.round(year))
  }
  return year.toFixed(1).replace('.', ',')
}
