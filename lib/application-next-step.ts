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
      return { text: 'The developer is reading your application. Wait for a message. You do not need to do anything now.', actionNeeded: false }
    case 'APPROVED':
      return input.hasVerificationImage
        ? { text: 'The developer is checking your screenshot. Wait for a message. You do not need to do anything now.', actionNeeded: false }
        : {
            text: 'Open the app in Google Play. Take a screenshot that shows the Install button. Then tap Send screenshot.',
            actionNeeded: true,
          }
    case 'OPTED_IN':
      return { text: 'The developer is checking your screenshot. Wait for a message. You do not need to do anything now.', actionNeeded: false }
    case 'VERIFIED':
      return { text: 'The developer accepted you. Say hello in the group chat. Then wait for the developer to choose the start date.', actionNeeded: false }
    case 'SCHEDULED':
      return { text: 'You are on the ready list. Testing starts on the date the developer chose. You will get a message.', actionNeeded: false }
    case 'TESTING':
      return input.paused
        ? { text: 'An admin stopped this test for now. You do not need to do anything. You will get a message when it starts again.', actionNeeded: false }
        : { text: "Do today's mission. Then send your report with a screen recording.", actionNeeded: true }
    case 'COMPLETED':
      return input.hasFeedback
        ? { text: 'Testing is finished. Your payment is on its way.', actionNeeded: false }
        : { text: 'Testing is finished. Write your feedback for the developer in the box below.', actionNeeded: true }
    case 'INELIGIBLE':
    case 'REJECTED':
    case 'WITHDRAWN':
      return { text: 'Nothing to do here. Click Browse Jobs to find another job.', actionNeeded: false }
    default:
      return { text: 'Click Open job to see what is happening.', actionNeeded: false }
  }
}
