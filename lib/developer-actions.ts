export type DeveloperActionInput = {
  isDraft: boolean
  pendingApprovals: number
  screenshotsToVerify: number
  readyToStart: boolean
  scheduledStartDate?: string | null
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
    actions.push({ id: 'publish', text: 'This job is a draft. Finish payment to publish it.', buttonLabel: 'See payment' })
    return actions
  }
  if (input.pendingApprovals > 0) {
    actions.push({
      id: 'approve',
      text: `${plural(input.pendingApprovals, 'tester is', 'testers are')} waiting for you to approve or reject.`,
      buttonLabel: 'Review applications',
    })
  }
  if (input.screenshotsToVerify > 0) {
    actions.push({
      id: 'verify',
      text: `${plural(input.screenshotsToVerify, 'screenshot', 'screenshots')} to check.`,
      buttonLabel: 'Verify screenshots',
    })
  }
  if (input.readyToStart) {
    actions.push({
      id: 'start',
      text: input.scheduledStartDate
        ? `Testing is scheduled for ${input.scheduledStartDate}. You can still change the date.`
        : 'Enough testers are verified. Pick a start date to begin testing.',
      buttonLabel: input.scheduledStartDate ? 'Change start date' : 'Pick start date',
    })
  }
  return actions
}
