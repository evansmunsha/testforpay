import {
  canBlockUser,
  canCreatePostKind,
  canDeleteContent,
  canModerate,
  canPin,
  canReadCommunity,
  canReportContent,
  canSeeContent,
  canWrite,
  containsContactDetails,
  filterBlocked,
  isMuted,
  isRateLimited,
  isStatFresh,
  validateCommentBody,
  validateModerationReason,
  validatePostBody,
  validateReportReason,
  validateTitle,
  windowStart,
} from './community-rules'

const tester = { userId: 't1', role: 'TESTER' }
const developer = { userId: 'd1', role: 'DEVELOPER' }
const admin = { userId: 'a1', role: 'ADMIN' }
const now = new Date('2026-10-29T12:00:00Z')
const minutes = (n: number) => n * 60 * 1000

describe('community reading and writing', () => {
  it('lets signed-in, non-suspended people read', () => {
    expect(canReadCommunity(tester)).toBe(true)
    expect(canReadCommunity(null)).toBe(false)
    expect(canReadCommunity({ ...tester, suspended: true })).toBe(false)
  })

  it('blocks muted people from writing until the mute ends', () => {
    expect(canWrite(tester, null, now)).toBe(true)
    expect(canWrite(tester, { mutedUntil: null }, now)).toBe(false)
    expect(canWrite(tester, { mutedUntil: new Date(now.getTime() + minutes(5)) }, now)).toBe(false)
    expect(canWrite(tester, { mutedUntil: new Date(now.getTime() - minutes(5)) }, now)).toBe(true)
    expect(isMuted({ mutedUntil: new Date(now.getTime() - 1) }, now)).toBe(false)
  })

  it('never lets suspended people write, and never mutes admins', () => {
    expect(canWrite({ ...tester, suspended: true }, null, now)).toBe(false)
    expect(canWrite(admin, { mutedUntil: null }, now)).toBe(true)
  })
})

describe('community roles', () => {
  it('lets only admins create announcements, pin and moderate', () => {
    expect(canCreatePostKind(tester, 'POST')).toBe(true)
    expect(canCreatePostKind(developer, 'ANNOUNCEMENT')).toBe(false)
    expect(canCreatePostKind(tester, 'ANNOUNCEMENT')).toBe(false)
    expect(canCreatePostKind(admin, 'ANNOUNCEMENT')).toBe(true)
    expect(canPin(developer)).toBe(false)
    expect(canPin(admin)).toBe(true)
    expect(canModerate(tester)).toBe(false)
    expect(canModerate(admin)).toBe(true)
  })

  it('never lets anyone create a job post by hand, even admins', () => {
    for (const viewer of [tester, developer, admin]) expect(canCreatePostKind(viewer, 'JOB')).toBe(false)
  })

  it('lets authors and admins delete, and nobody else', () => {
    expect(canDeleteContent(tester, 't1')).toBe(true)
    expect(canDeleteContent(tester, 'other')).toBe(false)
    expect(canDeleteContent(developer, 't1')).toBe(false)
    expect(canDeleteContent(admin, 't1')).toBe(true)
  })

  it('shows hidden content only to its author and admins, and deleted content to nobody', () => {
    const hidden = { status: 'HIDDEN' as const, authorId: 't1' }
    expect(canSeeContent(tester, hidden)).toBe(true)
    expect(canSeeContent(developer, hidden)).toBe(false)
    expect(canSeeContent(admin, hidden)).toBe(true)
    expect(canSeeContent(admin, { status: 'DELETED', authorId: 't1' })).toBe(false)
    expect(canSeeContent(developer, { status: 'VISIBLE', authorId: 't1' })).toBe(true)
  })

  it('stops people reporting themselves or hidden content', () => {
    expect(canReportContent(tester, { status: 'VISIBLE', authorId: 't1' })).toBe(false)
    expect(canReportContent(tester, { status: 'VISIBLE', authorId: 'x' })).toBe(true)
    expect(canReportContent(tester, { status: 'HIDDEN', authorId: 'x' })).toBe(false)
  })

  it('stops people blocking themselves or admins', () => {
    expect(canBlockUser(tester, 't1', 'TESTER')).toBe(false)
    expect(canBlockUser(tester, 'a1', 'ADMIN')).toBe(false)
    expect(canBlockUser(tester, 'd1', 'DEVELOPER')).toBe(true)
  })
})

describe('community text rules', () => {
  it('rejects empty, too long and whitespace-only posts', () => {
    expect(validatePostBody('').ok).toBe(false)
    expect(validatePostBody('   ').ok).toBe(false)
    expect(validatePostBody(42).ok).toBe(false)
    expect(validatePostBody('a'.repeat(2001)).ok).toBe(false)
    expect(validatePostBody('a'.repeat(2000)).ok).toBe(true)
    expect(validateCommentBody('a'.repeat(1001)).ok).toBe(false)
  })

  it('trims text it accepts', () => {
    const result = validatePostBody('  hello  ')
    expect(result.ok && result.value).toBe('hello')
  })

  it('rejects emails and phone numbers but allows normal numbers', () => {
    expect(containsContactDetails('write me at bob@example.com')).toBe(true)
    expect(containsContactDetails('call +212 612 345 678')).toBe(true)
    expect(containsContactDetails('06.12.34.56.78')).toBe(true)
    expect(containsContactDetails('Android 14, day 7 of 14, paid 25 euros')).toBe(false)
    expect(containsContactDetails('I got 2000 points')).toBe(false)
    expect(validatePostBody('mail bob@example.com').ok).toBe(false)
    expect(validateCommentBody('whatsapp 0612345678').ok).toBe(false)
  })

  it('treats the title as optional', () => {
    expect(validateTitle(undefined)).toEqual({ ok: true, value: null })
    expect(validateTitle('')).toEqual({ ok: true, value: null })
    expect(validateTitle('a'.repeat(121)).ok).toBe(false)
    expect(validateTitle('Hello').ok).toBe(true)
  })

  it('needs a real reason for reports and moderation', () => {
    expect(validateReportReason('no').ok).toBe(false)
    expect(validateReportReason('This is spam').ok).toBe(true)
    expect(validateModerationReason('short').ok).toBe(false)
    expect(validateModerationReason('Repeated spam links').ok).toBe(true)
  })
})

describe('community limits and caches', () => {
  it('rate limits when the count reaches the maximum', () => {
    expect(isRateLimited(4, { max: 5 })).toBe(false)
    expect(isRateLimited(5, { max: 5 })).toBe(true)
  })

  it('computes the start of the rate-limit window', () => {
    expect(windowStart({ windowMs: minutes(60) }, now).toISOString()).toBe('2026-10-29T11:00:00.000Z')
  })

  it('hides content from blocked authors', () => {
    const items = [{ authorId: 'a' }, { authorId: 'b' }, { authorId: 'c' }]
    expect(filterBlocked(items, new Set(['b']))).toEqual([{ authorId: 'a' }, { authorId: 'c' }])
    expect(filterBlocked(items, new Set())).toBe(items)
  })

  it('treats the cached member count as fresh for 10 minutes', () => {
    expect(isStatFresh(null, now)).toBe(false)
    expect(isStatFresh(new Date(now.getTime() - minutes(9)), now)).toBe(true)
    expect(isStatFresh(new Date(now.getTime() - minutes(11)), now)).toBe(false)
  })
})
