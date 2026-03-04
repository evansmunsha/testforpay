const toNumber = (value: string | undefined) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : NaN
}

export const getUsdToEurRate = () => {
  const serverRate = toNumber(process.env.USD_TO_EUR_RATE)
  const publicRate = toNumber(process.env.NEXT_PUBLIC_USD_TO_EUR_RATE)
  if (Number.isFinite(serverRate) && serverRate > 0) return serverRate
  if (Number.isFinite(publicRate) && publicRate > 0) return publicRate
  return NaN
}

export const usdToEur = (amountUsd: number, rate = getUsdToEurRate()) => {
  if (!Number.isFinite(rate) || rate <= 0) return amountUsd
  return amountUsd * rate
}

export const formatUsd = (amount: number) => `$${amount.toFixed(2)}`
export const formatEur = (amount: number) => `€${amount.toFixed(2)}`

// Money helpers for integer cents (storage) <-> euros (display)
export const toCents = (amountEur: number) => Math.round(amountEur * 100)
export const fromCents = (amountCents: number) => amountCents / 100
export const formatEurFromCents = (amountCents: number) =>
  formatEur(fromCents(amountCents))
export const formatUsdFromCents = (amountCents: number) =>
  formatUsd(fromCents(amountCents))

export const getEurToUsdRate = () => {
  const usdToEur = getUsdToEurRate()
  if (Number.isFinite(usdToEur) && usdToEur > 0) return 1 / usdToEur
  return NaN
}

export const eurToUsd = (amountEur: number, rate = getEurToUsdRate()) => {
  if (!Number.isFinite(rate) || rate <= 0) return amountEur
  return amountEur * rate
}

const zeroDecimalCurrencies = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw',
  'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv',
  'xaf', 'xof', 'xpf',
])

const threeDecimalCurrencies = new Set([
  'bhd', 'jod', 'kwd', 'omr', 'tnd',
])

export const getMinorUnitFactor = (currency: string) => {
  const code = currency.toLowerCase()
  if (zeroDecimalCurrencies.has(code)) return 1
  if (threeDecimalCurrencies.has(code)) return 1000
  return 100
}

export const toMinorUnits = (amount: number, currency: string) =>
  Math.round(amount * getMinorUnitFactor(currency))

export const eurCentsToUsdCents = (amountCents: number) =>
  toMinorUnits(eurToUsd(fromCents(amountCents)), 'usd')

export const formatUsdFromEurCents = (amountCents: number) =>
  formatUsdFromCents(eurCentsToUsdCents(amountCents))
