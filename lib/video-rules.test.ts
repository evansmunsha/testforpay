import {
  getVideoDeleteAfter,
  isAllowedVideoPath,
  shouldDeleteVideo,
  validateVideoMeta,
  VIDEO_MAX_BYTES,
} from './video-rules'

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
