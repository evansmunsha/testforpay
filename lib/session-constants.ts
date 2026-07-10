export const IDLE_SESSION_TIMEOUT_MS = Number(
  process.env.IDLE_SESSION_TIMEOUT_MS || 12 * 60 * 1000
)

export const IDLE_SESSION_WARNING_MS = Number(
  process.env.IDLE_SESSION_WARNING_MS || 60 * 1000
)
