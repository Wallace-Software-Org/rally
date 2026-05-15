'use client'

import { useMemo } from 'react'
import type { ActivityWithParticipants } from '@/types'

type DotPosition = { x: number; y: number }

function useDotPositions(activities: ActivityWithParticipants[]): Map<string, DotPosition> {
  return useMemo(() => {
    const PAD = 15
    const withCoords = activities.filter(a => a.lat != null && a.lng != null)
    if (withCoords.length === 0) return new Map()

    const lats = withCoords.map(a => a.lat!)
    const lngs = withCoords.map(a => a.lng!)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const latRange = maxLat - minLat || 1
    const lngRange = maxLng - minLng || 1
    const scale = 100 - PAD * 2

    const map = new Map<string, DotPosition>()
    for (const a of withCoords) {
      map.set(a.id, {
        x: PAD + ((a.lng! - minLng) / lngRange) * scale,
        // invert lat: higher lat = further up = lower y%
        y: PAD + ((maxLat - a.lat!) / latRange) * scale,
      })
    }
    return map
  }, [activities])
}

type MapPanelProps = {
  activities: ActivityWithParticipants[]
  variant?: 'strip' | 'full'
  selectedId?: string | null
  onDotClick?: (id: string) => void
  children?: React.ReactNode
}

export default function MapPanel({
  activities,
  variant = 'full',
  selectedId,
  onDotClick,
  children,
}: MapPanelProps) {
  const dotPositions = useDotPositions(activities)

  if (variant === 'strip') {
    return (
      <div className="h-20 bg-zinc-50 dark:bg-zinc-900 relative overflow-hidden flex items-end px-3 pb-2">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(113,113,122,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(113,113,122,0.25) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {activities.map(a => {
          const pos = dotPositions.get(a.id)
          if (!pos) return null
          return (
            <span
              key={a.id}
              className="absolute w-2 h-2 rounded-full bg-[#1D9E75]"
              style={{ top: `${pos.y}%`, left: `${pos.x}%` }}
            />
          )
        })}
        <button className="relative z-10 flex items-center gap-1 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 shadow-sm">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M1.5 5H8.5M5 1.5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Expand map
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 relative bg-zinc-50 dark:bg-zinc-900 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(113,113,122,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(113,113,122,0.18) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      {activities.map(a => {
        const pos = dotPositions.get(a.id)
        if (!pos) return null
        const isActive = selectedId === a.id
        return (
          <button
            key={a.id}
            onClick={() => onDotClick?.(a.id)}
            className="absolute -translate-x-1/2 flex flex-col items-center gap-0.5 group"
            style={{ top: `${pos.y}%`, left: `${pos.x}%` }}
          >
            <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-300 bg-white/80 dark:bg-zinc-900/80 px-1.5 py-0.5 rounded backdrop-blur-sm leading-tight max-w-[100px] truncate">
              {a.location_name}
            </span>
            <span
              className={`w-3 h-3 rounded-full transition-all ${
                isActive
                  ? 'bg-white ring-2 ring-[#1D9E75] ring-offset-1'
                  : 'bg-[#1D9E75] group-hover:ring-2 group-hover:ring-[#1D9E75]/40'
              }`}
            />
          </button>
        )
      })}
      {children}
    </div>
  )
}
