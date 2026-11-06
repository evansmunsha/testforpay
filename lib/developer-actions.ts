export type DeveloperActionInput = {
  isDraft: boolean
  pendingApprovals: number
  screenshotsToVerify: number
  readyToStart: boolean
  scheduledStartDate?: string | null
  checkoutPaused?: boolean
  draftReadyToPublish?: boolean
}

export type DeveloperAction = {
  id: 'publish' | 'approve' | 'verify' | 'start'
  text: string
  buttonLabel: string
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/** The things a developer must do now for one job, most urgent first. */
export function getDeveloperActions(input: DeveloperActionInput): DeveloperAction[] {
  const actions: DeveloperAction[] = []

  if (input.isDraft) {
    actions.push(input.checkoutPaused
      ? { id: 'publish', text: 'This job is saved as a draft. Payments are temporarily unavailable, so it cannot go live yet.', buttonLabel: 'See details' }
      : input.draftReadyToPublish
        ? { id: 'publish', text: 'This job is a draft. Publish it when you are ready.', buttonLabel: 'See details' }
        : { id: 'publish', text: 'This job is a draft. Finish payment to publish it.', buttonLabel: 'See payment' })
    return actions
  }
  if (input.pendingApprovals > 0) {
    actions.push({
      id: 'approve',
      text: `${plural(input.pendingApprovals, 'tester is', 'testers are')} waiting for you. Open the job and click Accept tester or Close tester.`,
      buttonLabel: 'Review applications',
    })
  }
  if (input.screenshotsToVerify > 0) {
    actions.push({
      id: 'verify',
      text: `${plural(input.screenshotsToVerify, 'screenshot', 'screenshots')} to check. Look at each one and click Check the screenshot and accept.`,
      buttonLabel: 'Check screenshots',
    })
  }
  if (input.readyToStart) {
    actions.push({
      id: 'start',
      text: input.scheduledStartDate
        ? `Testing starts on ${input.scheduledStartDate}. You can still change the date.`
        : 'Enough testers are ready. Choose the start date to begin testing.',
      buttonLabel: input.scheduledStartDate ? 'Change start date' : 'Choose start date',
    })
  }
  return actions
}
