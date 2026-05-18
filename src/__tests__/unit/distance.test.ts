import { describe, it, expect } from 'vitest'
import { calculateDistance } from '@/lib/utils/distance'

describe('calculateDistance', () => {
  it('returns 0 for identical coordinates', () => {
    expect(calculateDistance(33.4484, -112.074, 33.4484, -112.074)).toBeCloseTo(0)
  })

  it('returns ~1 mile for two Phoenix points ~1 mile apart', () => {
    // 0.0145° latitude ≈ 1 mile
    const dist = calculateDistance(33.4484, -112.074, 33.4629, -112.074)
    expect(dist).toBeGreaterThan(0.8)
    expect(dist).toBeLessThan(1.2)
  })

  it('returns a reasonable distance for two Scottsdale points ~5 miles apart', () => {
    // Old Town Scottsdale to North Scottsdale
    const dist = calculateDistance(33.4942, -111.9261, 33.5568, -111.8906)
    expect(dist).toBeGreaterThan(3)
    expect(dist).toBeLessThan(8)
  })

  it('result is symmetric — distance A→B equals B→A', () => {
    const ab = calculateDistance(33.4484, -112.074, 33.4629, -111.956)
    const ba = calculateDistance(33.4629, -111.956, 33.4484, -112.074)
    expect(ab).toBeCloseTo(ba, 5)
  })
})
