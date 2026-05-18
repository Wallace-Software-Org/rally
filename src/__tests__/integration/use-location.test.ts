import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useLocation } from '@/hooks/use-location'

type SuccessCallback = (pos: { coords: { latitude: number; longitude: number } }) => void
type ErrorCallback = (err: { message: string }) => void

const mockGeolocation = {
  getCurrentPosition: vi.fn<(success: SuccessCallback, error: ErrorCallback) => void>(),
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: mockGeolocation,
  })
})

describe('useLocation', () => {
  it('starts in loading state before geolocation responds', () => {
    mockGeolocation.getCurrentPosition.mockImplementation(() => {
      // never calls the callback — stays loading indefinitely
    })
    const { result } = renderHook(() => useLocation())
    expect(result.current.loading).toBe(true)
    expect(result.current.lat).toBeNull()
    expect(result.current.lng).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('resolves with lat/lng when geolocation succeeds', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 33.4484, longitude: -112.074 } })
    })
    const { result } = renderHook(() => useLocation())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.lat).toBe(33.4484)
    expect(result.current.lng).toBe(-112.074)
    expect(result.current.error).toBeNull()
  })

  it('sets error string when geolocation fails', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((_success, error) => {
      error({ message: 'User denied geolocation' })
    })
    const { result } = renderHook(() => useLocation())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('User denied geolocation')
    expect(result.current.lat).toBeNull()
    expect(result.current.lng).toBeNull()
  })
})
