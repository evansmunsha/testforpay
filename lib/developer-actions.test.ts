import { getDeveloperActions } from './developer-actions'

const base = { isDraft: false, pendingApprovals: 0, screenshotsToVerify: 0, readyToStart: false }

describe('getDeveloperActions', () => {
  it('returns nothing when there is nothing to do', () => {
    expect(getDeveloperActions(base)).toEqual([])
  })

  it('only asks for payment on a draft', () => {
    const actions = getDeveloperActions({ ...base, isDraft: true, pendingApprovals: 3 })
    expect(actions.map((a) => a.id)).toEqual(['publish'])
  })

  it('lists approvals, then screenshots, then start date', () => {
    const actions = getDeveloperActions({ ...base, pendingApprovals: 2, screenshotsToVerify: 1, readyToStart: true })
    expect(actions.map((a) => a.id)).toEqual(['approve', 'verify', 'start'])
    expect(actions[0].text).toMatch(/2 testers are/)
    expect(actions[1].text).toMatch(/1 screenshot to check/)
  })

  it('offers to change an already scheduled date', () => {
    const [action] = getDeveloperActions({ ...base, readyToStart: true, scheduledStartDate: '2026-12-01' })
    expect(action.buttonLabel).toBe('Change start date')
    expect(action.text).toMatch(/2026-12-01/)
  })
})
