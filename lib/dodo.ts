// Dodo Payments (Merchant of Record). Used only to collect the developer's payment.
// Docs: https://docs.dodopayments.com/developer-resources/dynamic-pricing-checkout

export class DodoError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = 'DodoError'
    this.status = status
  }
}

export function isDodoConfigured(): boolean {
  return Boolean(process.env.DODO_PAYMENTS_API_KEY && process.env.DODO_PAYMENTS_PRODUCT_ID)
}

function baseUrl(): string {
  return process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode'
    ? 'https://live.dodopayments.com'
    : 'https://test.dodopayments.com'
}

export interface CreateDodoCheckoutInput {
  /** Total to charge, in EUR cents. */
  amountCents: number
  returnUrl: string
  customerEmail: string
  customerName?: string | null
  metadata: Record<string, string>
}

export interface DodoCheckoutSession {
  sessionId: string
  checkoutUrl: string
}

export async function createDodoCheckoutSession(input: CreateDodoCheckoutInput): Promise<DodoCheckoutSession> {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY
  const productId = process.env.DODO_PAYMENTS_PRODUCT_ID
  if (!apiKey || !productId) throw new DodoError('Dodo Payments is not configured', 503)

  const response = await fetch(`${baseUrl()}/checkouts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // One "Pay What You Want" product serves every job; the amount is set here, in cents.
      product_cart: [{ product_id: productId, quantity: 1, amount: input.amountCents }],
      customer: { email: input.customerEmail, name: input.customerName ?? undefined },
      return_url: input.returnUrl,
      metadata: input.metadata,
    }),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.checkout_url) {
    console.error('Dodo checkout error:', response.status, data?.code, data?.message)
    throw new DodoError(data?.message || 'Dodo could not create the checkout', response.status)
  }

  return { sessionId: String(data.session_id ?? ''), checkoutUrl: String(data.checkout_url) }
}
