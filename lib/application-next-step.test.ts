import { getTesterNextStep } from './application-next-step'

describe('getTesterNextStep', () => {
  it('asks for a screenshot after approval', () => {
    const step = getTesterNextStep({ status: 'APPROVED', hasVerificationImage: false })
    expect(step.actionNeeded).toBe(true)
    expect(step.text).toMatch(/screenshot/)
  })

  it('waits after the screenshot is sent', () => {
    expect(getTesterNextStep({ status: 'APPROVED', hasVerificationImage: true }).actionNeeded).toBe(false)
    expect(getTesterNextStep({ status: 'OPTED_IN' }).actionNeeded).toBe(false)
  })

  it('asks for the mission while testing, but not when paused', () => {
    expect(getTesterNextStep({ status: 'TESTING' }).actionNeeded).toBe(true)
    expect(getTesterNextStep({ status: 'TESTING', paused: true }).actionNeeded).toBe(false)
  })

  it('asks for feedback after completion only if missing', () => {
    expect(getTesterNextStep({ status: 'COMPLETED' }).actionNeeded).toBe(true)
    expect(getTesterNextStep({ status: 'COMPLETED', hasFeedback: true }).actionNeeded).toBe(false)
  })

  it('has nothing to do for closed applications', () => {
    for (const status of ['REJECTED', 'INELIGIBLE', 'WITHDRAWN']) {
      expect(getTesterNextStep({ status }).actionNeeded).toBe(false)
    }
  })
})
