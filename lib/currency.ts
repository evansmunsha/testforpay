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
