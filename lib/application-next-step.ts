export type TesterNextStepInput = {
  status: string
  hasVerificationImage?: boolean
  paused?: boolean
  hasFeedback?: boolean
}

export type TesterNextStep = {
  text: string
  /** True when the tester must do something now (not just wait). */
  actionNeeded: boolean
}

/** One plain sentence telling a tester what to do next for a job. */
export function getTesterNextStep(input: TesterNextStepInput): TesterNextStep {
  switch (input.status) {
    case 'PENDING':
      return { text: 'Wait for the developer to review your application.', actionNeeded: false }
    case 'APPROVED':
      return input.hasVerificationImage
        ? { text: 'Wait for the developer to check your screenshot.', actionNeeded: false }
        : {
            text: 'Open the app in Google Play, then upload a screenshot that shows the Install button.',
            actionNeeded: true,
          }
    case 'OPTED_IN':
      return { text: 'Wait for the developer to check your screenshot.', actionNeeded: false }
    case 'VERIFIED':
      return { text: 'You are verified. Join the group chat and wait for the developer to start testing.', actionNeeded: false }
    case 'SCHEDULED':
      return { text: 'You are on the ready list. Testing begins when the developer starts it.', actionNeeded: false }
    case 'TESTING':
      return input.paused
        ? { text: 'Testing is paused by an administrator. Nothing to do right now.', actionNeeded: false }
        : { text: "Do today's mission and send your report with a screen recording.", actionNeeded: true }
    case 'COMPLETED':
      return input.hasFeedback
        ? { text: 'Testing is finished. Your payment is being processed.', actionNeeded: false }
        : { text: 'Testing is finished. Leave your feedback for the developer.', actionNeeded: true }
    case 'INELIGIBLE':
    case 'REJECTED':
    case 'WITHDRAWN':
      return { text: 'Nothing to do here. Browse other jobs.', actionNeeded: false }
    default:
      return { text: 'Open the job to see what is happening.', actionNeeded: false }
  }
}
