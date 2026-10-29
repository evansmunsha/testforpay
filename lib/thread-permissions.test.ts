import { describe, expect, it } from '@jest/globals'
import {
  canReadThread,
  canReplyToThread,
  getThreadRecipientIds,
  validateThreadMessage,
  type ThreadAccessContext,
} from './thread-permissions'

const tester = { userId: 't1', role: 'TESTER' as const }
const otherTester = { userId: 't2', role: 'TESTER' as const }
const developer = { userId: 'd1', role: 'DEVELOPER' as const }
const otherDeveloper = { userId: 'd2', role: 'DEVELOPER' as const }
const admin = { userId: 'a1', role: 'ADMIN' as const }

const mission: ThreadAccessContext = { kind: 'MISSION_SUBMISSION', testerId: 't1', developerId: 'd1' }
const report: ThreadAccessContext = { kind: 'ISSUE_REPORT', testerId: 't1', developerId: 'd1' }
const privateMessage: ThreadAccessContext = { kind: 'ADMIN_MESSAGE', testerId: 't1', developerId: null }

describe('canReadThread', () => {
  it('lets the tester, the job developer and admins read mission and report threads', () => {
    for (const thread of [mission, report]) {
      expect(canReadThread(tester, thread)).toBe(true)
      expect(canReadThread(developer, thread)).toBe(true)
      expect(canReadThread(admin, thread)).toBe(true)
    }
  })

  it('blocks other testers and developers who do not own the job', () => {
    for (const thread of [mission, report, privateMessage]) {
      expect(canReadThread(otherTester, thread)).toBe(false)
    }
    expect(canReadThread(otherDeveloper, mission)).toBe(false)
    expect(canReadThread(otherDeveloper, report)).toBe(false)
  })

  it('never shows a private tester-to-admin message to any developer', () => {
    expect(canReadThread(developer, privateMessage)).toBe(false)
    expect(canReadThread({ userId: 'd1', role: 'DEVELOPER' }, { ...privateMessage, developerId: 'd1' })).toBe(false)
    expect(canReadThread(tester, privateMessage)).toBe(true)
    expect(canReadThread(admin, privateMessage)).toBe(true)
  })
})

describe('canReplyToThread', () => {
  it('follows read access', () => {
    expect(canReplyToThread(otherDeveloper, mission)).toBe(false)
    expect(canReplyToThread(developer, mission)).toBe(true)
  })

  it('stops developer replies when the tester muted them, but not admin replies', () => {
    const muted = { ...mission, testerMutesDeveloperReplies: true }
    expect(canReplyToThread(developer, muted)).toBe(false)
    expect(canReplyToThread(admin, muted)).toBe(true)
    expect(canReplyToThread(tester, muted)).toBe(true)
  })
})

describe('getThreadRecipientIds', () => {
  it('notifies the tester and developer, not the author, when an admin replies', () => {
    expect(getThreadRecipientIds(admin, mission, ['a1', 'a2']).sort()).toEqual(['d1', 't1'])
  })

  it('notifies the developer and all admins when the tester posts', () => {
    expect(getThreadRecipientIds(tester, mission, ['a1', 'a2']).sort()).toEqual(['a1', 'a2', 'd1'])
  })

  it('keeps private messages between the tester and admins', () => {
    expect(getThreadRecipientIds(tester, privateMessage, ['a1']).sort()).toEqual(['a1'])
    expect(getThreadRecipientIds(admin, privateMessage, ['a1'])).toEqual(['t1'])
  })
})

describe('validateThreadMessage', () => {
  it('trims and enforces length limits', () => {
    expect(validateThreadMessage('  hello  ')).toEqual({ ok: true, body: 'hello' })
    expect(validateThreadMessage('a').ok).toBe(false)
    expect(validateThreadMessage('a'.repeat(2001)).ok).toBe(false)
    expect(validateThreadMessage(42).ok).toBe(false)
  })
})
