import { checkCollectionStatus, createCardCollection, isLipilaPaid } from './lipila'

const customer = {
  firstName: 'Test',
  lastName: 'Dev',
  phoneNumber: '260970000000',
  email: 'dev@example.com',
  address: 'Plot 1',
  city: 'Lusaka',
  country: 'ZM',
  zip: '10101',
}

function mockFetch(ok: boolean, status: number, body: unknown) {
  const fn = jest.fn().mockResolvedValue({ ok, status, json: async () => body })
  global.fetch = fn as unknown as typeof fetch
  return fn
}

describe('lipila client', () => {
  beforeEach(() => {
    process.env.LIPILA_API_KEY = 'test-key'
    process.env.LIPILA_BASE_URL = 'https://api.lipila.dev/'
  })

  it('only treats the exact word Successful as paid', () => {
    expect(isLipilaPaid('Successful')).toBe(true)
    expect(isLipilaPaid('Pending')).toBe(false)
    expect(isLipilaPaid('successful')).toBe(false)
    expect(isLipilaPaid(undefined)).toBe(false)
  })

  it('creates a card collection with the documented shape', async () => {
    const fetchMock = mockFetch(true, 200, {
      status: 'Pending',
      referenceId: 'ref-1',
      cardRedirectionUrl: 'https://checkout.example/pay',
    })
    const result = await createCardCollection({
      referenceId: 'ref-1',
      amount: 25,
      currency: 'USD',
      narration: 'Job payment',
      backUrl: 'https://app.example/back',
      callbackUrl: 'https://app.example/api/webhooks/lipila',
      customer,
    })

    expect(result.cardRedirectionUrl).toBe('https://checkout.example/pay')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.lipila.dev/api/v1/collections/card')
    expect(init.headers['x-api-key']).toBe('test-key')
    expect(init.headers.callbackUrl).toBe('https://app.example/api/webhooks/lipila')
    const body = JSON.parse(init.body)
    expect(body.collectionRequest.referenceId).toBe('ref-1')
    expect(body.customerInfo.country).toBe('ZM')
  })

  it('throws when Lipila returns an error or no link', async () => {
    mockFetch(false, 401, { message: 'no' })
    await expect(
      createCardCollection({
        referenceId: 'r', amount: 1, currency: 'USD', narration: 'n', backUrl: 'b', customer,
      })
    ).rejects.toThrow('HTTP 401')

    mockFetch(true, 200, { status: 'Pending' })
    await expect(
      createCardCollection({
        referenceId: 'r', amount: 1, currency: 'USD', narration: 'n', backUrl: 'b', customer,
      })
    ).rejects.toThrow('card payment link')
  })

  it('checks status by referenceId', async () => {
    const fetchMock = mockFetch(true, 200, { referenceId: 'ref-1', status: 'Successful' })
    const result = await checkCollectionStatus('ref-1')
    expect(isLipilaPaid(result.status)).toBe(true)
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.lipila.dev/api/v1/collections/check-status?referenceId=ref-1'
    )
  })

  it('fails safely when not configured', async () => {
    delete process.env.LIPILA_API_KEY
    await expect(checkCollectionStatus('x')).rejects.toThrow('not configured')
  })
})
