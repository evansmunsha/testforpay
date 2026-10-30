import {
  getVideoDeleteAfter,
  isAbandonedStagedVideo,
  isAllowedVideoPath,
  isOrphanBlob,
  shouldDeleteVideo,
  validateVideoMeta,
  VIDEO_MAX_BYTES,
} from './video-rules'

describe('abandoned upload cleanup', () => {
  const now = new Date('2026-10-30T04:00:00Z')
  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3600000)

  it('flags an unattached upload only after 48 hours', () => {
    expect(isAbandonedStagedVideo({ taskSubmissionId: null, deletedAt: null, createdAt: hoursAgo(49) }, now)).toBe(true)
    expect(isAbandonedStagedVideo({ taskSubmissionId: null, deletedAt: null, createdAt: hoursAgo(47) }, now)).toBe(false)
  })

  it('never flags an attached or already deleted video', () => {
    expect(isAbandonedStagedVideo({ taskSubmissionId: 's1', deletedAt: null, createdAt: hoursAgo(500) }, now)).toBe(false)
    expect(isAbandonedStagedVideo({ taskSubmissionId: null, deletedAt: hoursAgo(1), createdAt: hoursAgo(500) }, now)).toBe(false)
  })

  it('flags an unknown file only after the grace period', () => {
    const known = new Set<string>()
    expect(isOrphanBlob({ pathname: 'mission-videos/t/k/a.mp4', uploadedAt: hoursAgo(25) }, known, now)).toBe(true)
    expect(isOrphanBlob({ pathname: 'mission-videos/t/k/a.mp4', uploadedAt: hoursAgo(2) }, known, now)).toBe(false)
  })

  it('keeps files that have a database row', () => {
    const known = new Set(['mission-videos/t/k/a.mp4'])
    expect(isOrphanBlob({ pathname: 'mission-videos/t/k/a.mp4', uploadedAt: hoursAgo(500) }, known, now)).toBe(false)
  })

  it('never touches files outside the mission video folder', () => {
    expect(isOrphanBlob({ pathname: 'avatars/me.png', uploadedAt: hoursAgo(500) }, new Set(), now)).toBe(false)
    expect(isOrphanBlob({ pathname: 'mission-videos/../avatars/me.png', uploadedAt: hoursAgo(500) }, new Set(), now)).toBe(false)
  })
})

const ok = { contentType: 'video/mp4', sizeBytes: 1000, durationSeconds: 60 }

describe('video limits', () => {
  it('accepts mp4 and mov within limits', () => {
    expect(validateVideoMeta(ok).ok).toBe(true)
    expect(validateVideoMeta({ ...ok, contentType: 'video/quicktime', durationSeconds: 120 }).ok).toBe(true)
    expect(validateVideoMeta({ ...ok, sizeBytes: VIDEO_MAX_BYTES }).ok).toBe(true)
  })
  it('rejects other types, too big, too long and bad numbers', () => {
    expect(validateVideoMeta({ ...ok, contentType: 'video/webm' }).ok).toBe(false)
    expect(validateVideoMeta({ ...ok, sizeBytes: VIDEO_MAX_BYTES + 1 }).ok).toBe(false)
    expect(validateVideoMeta({ ...ok, durationSeconds: 121 }).ok).toBe(false)
    expect(validateVideoMeta({ ...ok, sizeBytes: 0 }).ok).toBe(false)
    expect(validateVideoMeta({ ...ok, durationSeconds: NaN }).ok).toBe(false)
    expect(validateVideoMeta({ ...ok, sizeBytes: '5' }).ok).toBe(false)
  })
})

describe('video paths', () => {
  it('only allows the tester’s own mission folder', () => {
    expect(isAllowedVideoPath('mission-videos/t1/k1/a.mp4', 't1', 'k1')).toBe(true)
    expect(isAllowedVideoPath('mission-videos/t2/k1/a.mp4', 't1', 'k1')).toBe(false)
    expect(isAllowedVideoPath('mission-videos/t1/k1/../x.mp4', 't1', 'k1')).toBe(false)
  })
})

describe('video deletion', () => {
  const end = new Date('2026-11-01T00:00:00Z')
  const base = { deletedAt: null, jobStatus: 'COMPLETED', applicationStatus: 'COMPLETED', testingEndDate: end, testingPausedAt: null, hasOpenIssue: false }

  it('sets the deletion date 14 days after testing ends', () => {
    expect(getVideoDeleteAfter(end)?.toISOString()).toBe('2026-11-15T00:00:00.000Z')
    expect(getVideoDeleteAfter(null)).toBeNull()
  })
  it('deletes only once 14 days have passed', () => {
    expect(shouldDeleteVideo(base, new Date('2026-11-14T23:59:59Z'))).toBe(false)
    expect(shouldDeleteVideo(base, new Date('2026-11-15T00:00:00Z'))).toBe(true)
  })
  it('keeps videos for active, paused or disputed work', () => {
    const late = new Date('2027-01-01T00:00:00Z')
    expect(shouldDeleteVideo({ ...base, applicationStatus: 'TESTING' }, late)).toBe(false)
    expect(shouldDeleteVideo({ ...base, jobStatus: 'ACTIVE' }, late)).toBe(false)
    expect(shouldDeleteVideo({ ...base, testingPausedAt: new Date() }, late)).toBe(false)
    expect(shouldDeleteVideo({ ...base, hasOpenIssue: true }, late)).toBe(false)
    expect(shouldDeleteVideo({ ...base, testingEndDate: null }, late)).toBe(false)
  })
  it('is safe to run twice', () => {
    expect(shouldDeleteVideo({ ...base, deletedAt: new Date() }, new Date('2027-01-01T00:00:00Z'))).toBe(false)
  })
})
