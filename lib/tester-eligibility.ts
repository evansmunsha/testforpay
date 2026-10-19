export function normalizeCountryCodes(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const normalized = value.map((country) =>
    typeof country === 'string' ? country.trim().toUpperCase() : ''
  )
  if (normalized.some((country) => !/^[A-Z]{2}$/.test(country))) return null
  return [...new Set(normalized)]
}

function androidVersionParts(version: string): number[] | null {
  const match = version.trim().match(/^\d+(?:\.\d+)*/)
  if (!match) return null
  return match[0].split('.').map(Number)
}

export function isAndroidVersionCompatible(
  testerVersion: string | null | undefined,
  minimumVersion: string | null | undefined
): boolean {
  if (!minimumVersion) return Boolean(testerVersion?.trim())
  if (!testerVersion) return false

  const testerParts = androidVersionParts(testerVersion)
  const minimumParts = androidVersionParts(minimumVersion)
  if (!testerParts || !minimumParts) return false

  const length = Math.max(testerParts.length, minimumParts.length)
  for (let index = 0; index < length; index += 1) {
    const testerPart = testerParts[index] ?? 0
    const minimumPart = minimumParts[index] ?? 0
    if (testerPart !== minimumPart) return testerPart > minimumPart
  }
  return true
}

export function passesDeclaredJobScreening(input: {
  testerCountryCode: string | null | undefined
  testerAndroidVersion: string | null | undefined
  supportedCountries: string[]
  minimumAndroidVersion: string | null | undefined
}): boolean {
  const testerCountry = input.testerCountryCode?.trim().toUpperCase()
  const countries = input.supportedCountries.map((country) => country.toUpperCase())
  return Boolean(
    testerCountry &&
      countries.includes(testerCountry) &&
      isAndroidVersionCompatible(input.testerAndroidVersion, input.minimumAndroidVersion)
  )
}
