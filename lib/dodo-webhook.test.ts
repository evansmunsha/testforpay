import crypto from 'crypto'
import { verifyDodoWebhook } from './dodo-webhook'

const rawSecret = crypto.randomBytes(32).toString('base64')
const secret = `whsec_${rawSecret}`
const body = '{"type":"payment.succeeded","data":{"payment_id":"pay_1"}}'
const id = 'msg_1'
const ts = 1700000000

const signature =
  'v1,' +
  crypto.createHmac('sha256', Buffer.from(rawSecret, 'base64')).update(`${id}.${ts}.${body}`).digest('base64')

const base = {
  rawBody: body,
  webhookId: id,
  webhookTimestamp: String(ts),
  webhookSignature: signature,
  secret,
  nowSeconds: ts + 10,
}

describe('verifyDodoWebhook', () => {
  it('accepts a valid signature with a whsec_ secret', () => {
    expect(verifyDodoWebhook(base).ok).toBe(true)
  })

  it('rejects a changed body', () => {
    expect(verifyDodoWebhook({ ...base, rawBody: body + ' ' }).ok).toBe(false)
  })

  it('rejects a wrong secret', () => {
    const other = `whsec_${crypto.randomBytes(32).toString('base64')}`
    expect(verifyDodoWebhook({ ...base, secret: other }).ok).toBe(false)
  })

  it('rejects when the secret is missing', () => {
    expect(verifyDodoWebhook({ ...base, secret: undefined }).ok).toBe(false)
  })
})
