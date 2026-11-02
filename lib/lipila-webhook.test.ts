import crypto from 'crypto'
import { verifyLipilaWebhook } from './lipila-webhook'

const secret = crypto.randomBytes(32).toString('base64')
const body = '{"referenceId":"abc","status":"Successful"}'
const id = 'evt-1'
const ts = 1700000000

function sign(rawBody: string, s = secret) {
  return (
    'v1,' +
    crypto
      .createHmac('sha256', Buffer.from(s, 'base64'))
      .update(`${id}.${ts}.${rawBody}`)
      .digest('base64')
  )
}

const base = {
  rawBody: body,
  webhookId: id,
  webhookTimestamp: String(ts),
  webhookSignature: sign(body),
  secret,
  nowSeconds: ts + 10,
}

describe('verifyLipilaWebhook', () => {
  it('accepts a valid signature', () => {
    expect(verifyLipilaWebhook(base).ok).toBe(true)
  })

  it('rejects a changed body', () => {
    expect(verifyLipilaWebhook({ ...base, rawBody: body + ' ' }).ok).toBe(false)
  })

  it('rejects a wrong secret', () => {
    const other = crypto.randomBytes(32).toString('base64')
    expect(verifyLipilaWebhook({ ...base, secret: other }).ok).toBe(false)
  })

  it('rejects an old timestamp', () => {
    expect(verifyLipilaWebhook({ ...base, nowSeconds: ts + 301 }).ok).toBe(false)
  })

  it('rejects missing headers or secret', () => {
    expect(verifyLipilaWebhook({ ...base, webhookSignature: null }).ok).toBe(false)
    expect(verifyLipilaWebhook({ ...base, secret: undefined }).ok).toBe(false)
  })

  it('accepts when one of several signatures matches (key rotation)', () => {
    const old = sign(body, crypto.randomBytes(32).toString('base64'))
    expect(verifyLipilaWebhook({ ...base, webhookSignature: `${old} ${sign(body)}` }).ok).toBe(true)
  })
})
