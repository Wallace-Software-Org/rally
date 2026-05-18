import { describe, it, expect } from 'vitest'
import { SPORT_COLORS, getSportLabel } from '@/lib/utils/sport-config'

describe('SPORT_COLORS', () => {
  const required = ['pickleball', 'running', 'boxing', 'hiking', 'gym', 'paddleboard']

  it.each(required)('contains "%s"', (sport) => {
    expect(SPORT_COLORS).toHaveProperty(sport)
  })
})

describe('getSportLabel', () => {
  it('returns a non-empty string for every key in SPORT_COLORS', () => {
    for (const key of Object.keys(SPORT_COLORS)) {
      const label = getSportLabel(key)
      expect(typeof label).toBe('string')
      expect(label.length).toBeGreaterThan(0)
    }
  })

  it('capitalizes the first letter', () => {
    expect(getSportLabel('pickleball')).toBe('Pickleball')
    expect(getSportLabel('gym')).toBe('Gym')
  })
})
