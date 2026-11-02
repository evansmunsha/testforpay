import { formatBadgeCount } from './nav-badges-format'

describe('formatBadgeCount', () => {
  it('hides zero and invalid counts', () => {
    expect(formatBadgeCount(0)).toBeNull()
    expect(formatBadgeCount(-3)).toBeNull()
    expect(formatBadgeCount(Number.NaN)).toBeNull()
  })

  it('shows normal counts', () => {
    expect(formatBadgeCount(1)).toBe('1')
    expect(formatBadgeCount(99)).toBe('99')
  })

  it('caps at 99+', () => {
    expect(formatBadgeCount(100)).toBe('99+')
    expect(formatBadgeCount(5000)).toBe('99+')
  })
})
