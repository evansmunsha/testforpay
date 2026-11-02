import crypto from 'crypto'

const TOLERANCE_SECONDS = 300

export type LipilaVerifyResult =
  | { ok: true; webhookId: string }
  | { ok: false; reason: string }

interface VerifyInput {
  rawBody: string
  webhookId: string | null
  webhookTimestamp: string | null
  webhookSignature: string | null
  secret: string | undefined
  nowSeconds?: number
}

// Checks Lipila's HMAC-SHA256 signature (docs: Webhook Security page).
// rawBody must be the exact text received, never re-serialized JSON.
export function verifyLipilaWebhook(input: VerifyInput): LipilaVerifyResult {
  const { rawBody, webhookId, webhookTimestamp, webhookSignature, secret } = input

  if (!secret) return { ok: false, reason: 'Webhook secret is not configured' }
  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return { ok: false, reason: 'Missing webhook headers' }
  }

  const timestamp = Number(webhookTimestamp)
  if (!Number.isFinite(timestamp)) return { ok: false, reason: 'Invalid timestamp' }

  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestamp) > TOLERANCE_SECONDS) {
    return { ok: false, reason: 'Timestamp too old or too far in the future' }
  }

  const key = Buffer.from(secret, 'base64')
  const expected = Buffer.from(
    'v1,' +
      crypto
        .createHmac('sha256', key)
        .update(`${webhookId}.${webhookTimestamp}.${rawBody}`)
        .digest('base64')
  )

  // The header can hold several signatures during key rotation
  const valid = webhookSignature
    .split(' ')
    .map((sig) => Buffer.from(sig.trim()))
    .some((sig) => sig.length === expected.length && crypto.timingSafeEqual(sig, expected))

  return valid ? { ok: true, webhookId } : { ok: false, reason: 'Signature mismatch' }
}
