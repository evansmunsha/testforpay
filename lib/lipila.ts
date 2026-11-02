export interface LipilaCustomer {
  firstName: string
  lastName: string
  phoneNumber: string
  email: string
  address: string
  city: string
  country: string
  zip: string
}

export interface CreateCardCollectionInput {
  referenceId: string
  amount: number
  currency: 'USD' | 'ZMW'
  narration: string
  backUrl: string
  callbackUrl?: string
  customer: LipilaCustomer
}

export interface LipilaCardCollection {
  referenceId: string
  identifier?: string
  status: string
  cardRedirectionUrl: string
}

export interface LipilaCollectionStatus {
  referenceId: string
  status: string
  message?: string
  amount?: number
  currency?: string
  identifier?: string
}

export class LipilaError extends Error {
  constructor(message: string, public httpStatus?: number) {
    super(message)
    this.name = 'LipilaError'
  }
}

function config() {
  const apiKey = process.env.LIPILA_API_KEY
  const baseUrl = process.env.LIPILA_BASE_URL
  if (!apiKey || !baseUrl) throw new LipilaError('Lipila is not configured on the server')
  return { apiKey, baseUrl: baseUrl.replace(/\/+$/, '') }
}

// Only the exact word "Successful" (from the docs) counts as paid.
export function isLipilaPaid(status: string | undefined | null): boolean {
  return status === 'Successful'
}

export async function createCardCollection(
  input: CreateCardCollectionInput
): Promise<LipilaCardCollection> {
  const { apiKey, baseUrl } = config()

  const headers: Record<string, string> = {
    accept: 'application/json',
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
  }
  if (input.callbackUrl) headers.callbackUrl = input.callbackUrl

  const response = await fetch(`${baseUrl}/api/v1/collections/card`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      customerInfo: input.customer,
      collectionRequest: {
        referenceId: input.referenceId,
        amount: input.amount,
        narration: input.narration,
        // TODO: docs do not say what accountNumber should be for cards; the example uses the phone number
        accountNumber: input.customer.phoneNumber,
        currency: input.currency,
        backUrl: input.backUrl,
        referenceData: input.narration,
      },
    }),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok || !data) {
    throw new LipilaError(`Lipila card payment failed (HTTP ${response.status})`, response.status)
  }
  if (!data.cardRedirectionUrl) {
    throw new LipilaError('Lipila did not return a card payment link', response.status)
  }

  return {
    referenceId: data.referenceId ?? input.referenceId,
    identifier: data.identifier,
    status: data.status,
    cardRedirectionUrl: data.cardRedirectionUrl,
  }
}

export async function checkCollectionStatus(referenceId: string): Promise<LipilaCollectionStatus> {
  const { apiKey, baseUrl } = config()

  const params = new URLSearchParams({ referenceId })
  const response = await fetch(`${baseUrl}/api/v1/collections/check-status?${params}`, {
    method: 'GET',
    headers: { accept: 'application/json', 'x-api-key': apiKey },
  })

  const data = await response.json().catch(() => null)
  if (!response.ok || !data) {
    throw new LipilaError(`Lipila status check failed (HTTP ${response.status})`, response.status)
  }

  return {
    referenceId: data.referenceId ?? referenceId,
    status: data.status,
    message: data.message,
    amount: data.amount,
    currency: data.currency,
    identifier: data.identifier,
  }
}
