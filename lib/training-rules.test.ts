import { isAfricanCountry, jobHandlesMoney, pointsForAward, trainingLevel } from './training-rules'

describe('training rules', () => {
  it('allows only African countries', () => {
    expect(isAfricanCountry('ZM')).toBe(true)
    expect(isAfricanCountry(' ma ')).toBe(true)
    expect(isAfricanCountry('US')).toBe(false)
    expect(isAfricanCountry(null)).toBe(false)
  })

  it('awards points for each step, 100 in total', () => {
    expect(pointsForAward('OPTED_IN')).toBe(10)
    expect(pointsForAward('VERIFIED')).toBe(20)
    expect(pointsForAward('COMPLETED')).toBe(70)
  })

  it('computes levels and distance to the next one', () => {
    expect(trainingLevel(0)).toMatchObject({ name: 'Rookie', nextLevel: 'Tester', pointsToNext: 100 })
    expect(trainingLevel(100)).toMatchObject({ name: 'Tester', nextLevel: 'Pro', pointsToNext: 200 })
    expect(trainingLevel(650)).toMatchObject({ name: 'Expert', nextLevel: null, pointsToNext: 0 })
  })

  it('treats bad numbers as zero', () => {
    expect(trainingLevel(-5).points).toBe(0)
    expect(trainingLevel(NaN).points).toBe(0)
  })

  it('never handles money for training jobs', () => {
    expect(jobHandlesMoney({ isTraining: true })).toBe(false)
    expect(jobHandlesMoney({ isTraining: false })).toBe(true)
  })
})
