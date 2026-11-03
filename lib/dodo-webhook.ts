import { verifyLipilaWebhook, type LipilaVerifyResult } from './lipila-webhook'

interface VerifyInput {
  rawBody: string
  webhookId: string | null
  webhookTimestamp: string | null
  webhookSignature: string | null
  secret: string | undefined
  nowSeconds?: number
}

// Dodo follows the Standard Webhooks spec: the same signing as Lipila, but the
// secret is shown as "whsec_<base64>", so the prefix is removed first.
export function verifyDodoWebhook(input: VerifyInput): LipilaVerifyResult {
  const secret = input.secret?.trim().replace(/^whsec_/, '')
  return verifyLipilaWebhook({ ...input, secret })
}
