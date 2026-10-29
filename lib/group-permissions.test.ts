import { canAccessGroup, canJoinGroup, isVerifiedForGroup } from './group-permissions'

const ctx = (over: Partial<Parameters<typeof canAccessGroup>[1]> = {}) => ({
  developerId: 'dev1',
  viewerApplication: null,
  viewerHasJoined: false,
  ...over,
})
const tester = { userId: 't1', role: 'TESTER' }

describe('job group chat permissions', () => {
  it('only counts verified or later statuses', () => {
    for (const s of ['VERIFIED', 'SCHEDULED', 'TESTING', 'COMPLETED']) expect(isVerifiedForGroup(s)).toBe(true)
    for (const s of ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN', null, undefined]) {
      expect(isVerifiedForGroup(s as string | null | undefined)).toBe(false)
    }
  })

  it('lets the job developer and admins in without joining', () => {
    expect(canAccessGroup({ userId: 'dev1', role: 'DEVELOPER' }, ctx())).toBe(true)
    expect(canAccessGroup({ userId: 'a', role: 'ADMIN' }, ctx())).toBe(true)
  })

  it('blocks other developers', () => {
    expect(canAccessGroup({ userId: 'dev2', role: 'DEVELOPER' }, ctx())).toBe(false)
  })

  it('lets a verified tester join but not read until they join', () => {
    const c = ctx({ viewerApplication: { status: 'VERIFIED' } })
    expect(canJoinGroup(tester, c)).toBe(true)
    expect(canAccessGroup(tester, c)).toBe(false)
    expect(canAccessGroup(tester, { ...c, viewerHasJoined: true })).toBe(true)
  })

  it('rejects unverified testers even if a member row exists', () => {
    const c = ctx({ viewerApplication: { status: 'APPROVED' }, viewerHasJoined: true })
    expect(canJoinGroup(tester, c)).toBe(false)
    expect(canAccessGroup(tester, c)).toBe(false)
  })

  it('rejects withdrawn testers and testers with no application', () => {
    expect(canAccessGroup(tester, ctx({ viewerApplication: { status: 'WITHDRAWN' }, viewerHasJoined: true }))).toBe(false)
    expect(canAccessGroup(tester, ctx({ viewerHasJoined: true }))).toBe(false)
  })
})
