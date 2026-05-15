'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type ParticipantProfile = { full_name: string; avatar_url: string | null }

type Participant = { id: string; user_id: string; profiles: ParticipantProfile | null }

type Activity = {
  id: string
  title: string
  sport: string
  location_name: string
  starts_at: string
  max_participants: number
  skill_level: string | null
  lat: number | null
  lng: number | null
  participants: Participant[]
}

type UserProfile = {
  avatar_url: string | null
  full_name: string
  city: string | null
} | null

type DotPosition = { x: number; y: number }

// ─── Constants ────────────────────────────────────────────────────────────────

const SPORT_FILTERS = ['All', 'Pickleball', 'Running', 'Boxing', 'Hiking', 'Gym', 'Paddleboard']

const SPORT_COLORS: Record<string, { bg: string; text: string }> = {
  pickleball:  { bg: '#E1F5EE', text: '#0F6E56' },
  running:     { bg: '#EAF3DE', text: '#3B6D11' },
  boxing:      { bg: '#FAEEDA', text: '#854F0B' },
  hiking:      { bg: '#EAF3DE', text: '#3B6D11' },
  gym:         { bg: '#E6F1FB', text: '#185FA5' },
  paddleboard: { bg: '#E1F5EE', text: '#0F6E56' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso)
  const isToday = d.toDateString() === new Date().toDateString()
  const t = d
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase()
    .replace(' ', '')
  const day = isToday ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })
  return `${day} · ${t}`
}

function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// Normalize lat/lng values to [pad%, (100-pad)%] within the visible set
function useDotPositions(activities: Activity[]): Map<string, DotPosition> {
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

// ─── FilterPills ──────────────────────────────────────────────────────────────

function FilterPills({
  sport,
  onChange,
}: {
  sport: string
  onChange: (s: string) => void
}) {
  return (
    <>
      {SPORT_FILTERS.map(s => {
        const active = sport === s
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`flex-none rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              active
                ? 'border border-[#1D9E75] text-[#1D9E75] bg-[#E1F5EE] dark:bg-[#0F6E56]/20'
                : 'border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
            }`}
          >
            {s}
          </button>
        )
      })}
    </>
  )
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

export default function Feed({
  activities,
  profile,
  userId,
}: {
  activities: Activity[]
  profile: UserProfile
  userId: string | null
}) {
  const [sport, setSport] = useState('All')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [joined, setJoined] = useState<Set<string>>(
    () => new Set(
      activities
        .filter(a => a.participants.some(p => p.user_id === userId))
        .map(a => a.id)
    )
  )
  const [joining, setJoining] = useState<Set<string>>(new Set())
  const [leaving, setLeaving] = useState<Set<string>>(new Set())

  const dotPositions = useDotPositions(activities)

  const visible =
    sport === 'All'
      ? activities
      : activities.filter(a => a.sport.toLowerCase() === sport.toLowerCase())

  const selectedActivity = selectedId ? activities.find(a => a.id === selectedId) ?? null : null

  async function handleJoin(activityId: string) {
    if (!userId || joined.has(activityId) || joining.has(activityId)) return
    setJoining(prev => new Set(prev).add(activityId))
    const supabase = createClient()
    const { error } = await supabase
      .from('participants')
      .insert({ activity_id: activityId, user_id: userId, status: 'joined' })
    if (!error) {
      setJoined(prev => new Set(prev).add(activityId))
    }
    setJoining(prev => {
      const next = new Set(prev)
      next.delete(activityId)
      return next
    })
  }

  async function handleLeave(activityId: string) {
    if (!userId || !joined.has(activityId) || leaving.has(activityId)) return
    setLeaving(prev => new Set(prev).add(activityId))
    const supabase = createClient()
    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('activity_id', activityId)
      .eq('user_id', userId)
    if (!error) {
      setJoined(prev => {
        const next = new Set(prev)
        next.delete(activityId)
        return next
      })
    }
    setLeaving(prev => {
      const next = new Set(prev)
      next.delete(activityId)
      return next
    })
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-zinc-950 overflow-hidden">

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <header className="flex-none flex items-center h-14 px-4 gap-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2 flex-none">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1D9E75] block" />
          <span className="text-base font-semibold tracking-tight text-zinc-900 dark:text-white">
            Rally
          </span>
        </div>

        {/* Mobile: city center */}
        <span className="flex-1 text-center text-sm text-zinc-500 dark:text-zinc-400 truncate lg:hidden">
          {profile?.city ?? 'Nearby'}
        </span>

        {/* Desktop: city center + Post activity button */}
        <span className="hidden lg:block flex-1 text-center text-sm text-zinc-500 dark:text-zinc-400 truncate">
          {profile?.city ? `📍 ${profile.city}` : '📍 Nearby'}
        </span>
        <button className="hidden lg:flex items-center gap-2 rounded-xl bg-[#1D9E75] text-white text-sm font-semibold px-4 py-2 hover:bg-[#199068] active:bg-[#147a56] transition-colors flex-none">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 1.5V12.5M1.5 7H12.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Post activity
        </button>

        {/* Avatar — both layouts */}
        <div className="w-9 h-9 rounded-full flex-none overflow-hidden bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              {profile?.full_name ? initials(profile.full_name) : '?'}
            </span>
          )}
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════
          MOBILE LAYOUT  (hidden on lg+)
      ══════════════════════════════════════════════════════════ */}

      {/* ── Filter pills (mobile) ─────────────────────────────── */}
      <div
        className="flex-none flex gap-2 px-4 py-3 overflow-x-auto border-b border-zinc-100 dark:border-zinc-800 lg:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        <FilterPills sport={sport} onChange={setSport} />
      </div>

      {/* ── Scrollable body (mobile) ──────────────────────────── */}
      <div className="flex-1 overflow-y-auto lg:hidden">

        {/* Map strip */}
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

        {/* Card grid */}
        {visible.length === 0 ? (
          <p className="py-20 text-center text-sm text-zinc-400">No open activities</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-[14px]">
            {visible.map(a => (
              <ActivityCardMobile
                key={a.id}
                activity={a}
                isJoined={joined.has(a.id)}
                isJoining={joining.has(a.id)}
                isLeaving={leaving.has(a.id)}
                onJoin={() => handleJoin(a.id)}
                onLeave={() => handleLeave(a.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom bar (mobile) ───────────────────────────────── */}
      <div className="flex-none border-t border-zinc-100 dark:border-zinc-800 p-3 lg:hidden">
        <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1D9E75] text-white text-sm font-semibold py-3.5 hover:bg-[#199068] active:bg-[#147a56] transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 1.5V12.5M1.5 7H12.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Post an activity
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          DESKTOP LAYOUT  (hidden below lg)
      ══════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex flex-1 overflow-hidden">

        {/* Left panel */}
        <div className="flex flex-col w-[380px] flex-none border-r border-zinc-100 dark:border-zinc-800 overflow-hidden">

          {/* Filter pills */}
          <div
            className="flex-none flex gap-2 px-4 py-3 overflow-x-auto border-b border-zinc-100 dark:border-zinc-800"
            style={{ scrollbarWidth: 'none' }}
          >
            <FilterPills sport={sport} onChange={setSport} />
          </div>

          {/* Activity list */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {visible.length === 0 ? (
              <p className="py-20 text-center text-sm text-zinc-400">No open activities</p>
            ) : (
              visible.map(a => (
                <ActivityCardDesktop
                  key={a.id}
                  activity={a}
                  isActive={selectedId === a.id}
                  isJoined={joined.has(a.id)}
                  isJoining={joining.has(a.id)}
                  isLeaving={leaving.has(a.id)}
                  onSelect={() => setSelectedId(prev => prev === a.id ? null : a.id)}
                  onJoin={() => handleJoin(a.id)}
                  onLeave={() => handleLeave(a.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Map panel */}
        <div className="flex-1 relative bg-zinc-50 dark:bg-zinc-900 overflow-hidden">
          {/* Grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(113,113,122,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(113,113,122,0.18) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          {/* Activity dots */}
          {activities.map(a => {
            const pos = dotPositions.get(a.id)
            if (!pos) return null
            const isActive = selectedId === a.id
            return (
              <button
                key={a.id}
                onClick={() => setSelectedId(prev => prev === a.id ? null : a.id)}
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

          {/* Map preview card */}
          {selectedActivity && (
            <MapPreviewCard
              activity={selectedActivity}
              isJoined={joined.has(selectedActivity.id)}
              isJoining={joining.has(selectedActivity.id)}
              isLeaving={leaving.has(selectedActivity.id)}
              onJoin={() => handleJoin(selectedActivity.id)}
              onLeave={() => handleLeave(selectedActivity.id)}
              onDismiss={() => setSelectedId(null)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ActivityCardMobile ───────────────────────────────────────────────────────

function ActivityCardMobile({
  activity,
  isJoined,
  isJoining,
  isLeaving,
  onJoin,
  onLeave,
}: {
  activity: Activity
  isJoined: boolean
  isJoining: boolean
  isLeaving: boolean
  onJoin: () => void
  onLeave: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!confirming) return
    function onOutside(e: MouseEvent) {
      if (!btnRef.current?.contains(e.target as Node)) setConfirming(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [confirming])

  const colors = SPORT_COLORS[activity.sport.toLowerCase()] ?? { bg: '#F4F4F5', text: '#52525B' }
  const participantCount = Array.isArray(activity.participants) ? activity.participants.length : 0
  const spotsLeft = activity.max_participants - participantCount
  const sportLabel = activity.sport.charAt(0).toUpperCase() + activity.sport.slice(1)

  return (
    <div className="rounded-xl bg-white dark:bg-zinc-900 p-[10px] flex flex-col gap-2 ring-[0.5px] ring-zinc-200 dark:ring-zinc-800">
      <div className="flex items-start justify-between gap-1">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4 flex-none"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {sportLabel}
        </span>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-4 shrink-0">
          {formatTime(activity.starts_at)}
        </span>
      </div>
      <p className="text-sm font-medium text-zinc-900 dark:text-white leading-snug">
        {activity.title}
      </p>
      <div className="flex flex-col gap-0.5">
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 min-w-0">
          <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor" className="flex-none" aria-hidden="true">
            <path d="M4 0C2.07 0 .5 1.57.5 3.5.5 6.125 4 10 4 10S7.5 6.125 7.5 3.5C7.5 1.57 5.93 0 4 0Zm0 4.75A1.25 1.25 0 1 1 4 2.25a1.25 1.25 0 0 1 0 2.5Z" />
          </svg>
          <span className="truncate">{activity.location_name}</span>
        </p>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
          {'— mi'}
          {activity.skill_level ? ` · ${activity.skill_level}` : ''}
        </p>
      </div>
      <div className="flex items-center justify-between gap-1 mt-auto pt-0.5">
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
          {spotsLeft <= 0 ? 'Full' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'}`}
        </span>
        {isJoined ? (
          confirming ? (
            <button
              ref={btnRef}
              onClick={() => onLeave()}
              disabled={isLeaving}
              className="w-20 h-7 flex items-center justify-center rounded-full border border-red-500 text-red-500 text-[11px] font-semibold transition-colors disabled:opacity-50"
            >
              {isLeaving ? '…' : 'Leave'}
            </button>
          ) : (
            <button
              ref={btnRef}
              onClick={() => setConfirming(true)}
              className="w-20 h-7 flex items-center justify-center rounded-full border border-transparent bg-[#1D9E75] text-white text-[11px] font-semibold transition-colors"
            >
              Joined ✓
            </button>
          )
        ) : spotsLeft > 0 ? (
          <button
            onClick={onJoin}
            disabled={isJoining}
            className="w-20 h-7 flex items-center justify-center rounded-full border border-transparent bg-[#1D9E75] text-white text-[11px] font-semibold hover:bg-[#199068] active:bg-[#147a56] transition-colors disabled:opacity-50"
          >
            {isJoining ? '…' : 'Join'}
          </button>
        ) : null}
      </div>
    </div>
  )
}

// ─── ActivityCardDesktop ──────────────────────────────────────────────────────

function ActivityCardDesktop({
  activity,
  isActive,
  isJoined,
  isJoining,
  isLeaving,
  onSelect,
  onJoin,
  onLeave,
}: {
  activity: Activity
  isActive: boolean
  isJoined: boolean
  isJoining: boolean
  isLeaving: boolean
  onSelect: () => void
  onJoin: () => void
  onLeave: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!confirming) return
    function onOutside(e: MouseEvent) {
      if (!btnRef.current?.contains(e.target as Node)) setConfirming(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [confirming])

  const colors = SPORT_COLORS[activity.sport.toLowerCase()] ?? { bg: '#F4F4F5', text: '#52525B' }
  const participantCount = Array.isArray(activity.participants) ? activity.participants.length : 0
  const spotsLeft = activity.max_participants - participantCount
  const sportLabel = activity.sport.charAt(0).toUpperCase() + activity.sport.slice(1)

  const avatars = activity.participants
    .filter(p => p.profiles)
    .slice(0, 3)
    .map(p => p.profiles!)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={e => e.key === 'Enter' && onSelect()}
      className={`rounded-xl p-[11px] flex flex-col gap-2 cursor-pointer transition-all ${
        isActive
          ? 'ring-[1.5px] ring-[#1D9E75] bg-[#E1F5EE]/40 dark:bg-[#0F6E56]/10'
          : 'ring-[0.5px] ring-zinc-200 dark:ring-zinc-800 bg-white dark:bg-zinc-900 hover:ring-zinc-300 dark:hover:ring-zinc-700'
      }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4 flex-none"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {sportLabel}
        </span>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-4 shrink-0">
          {formatTime(activity.starts_at)}
        </span>
      </div>

      {/* Title */}
      <p className="text-[13px] font-medium text-zinc-900 dark:text-white leading-snug">
        {activity.title}
      </p>

      {/* Location + skill */}
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 min-w-0">
        <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor" className="flex-none" aria-hidden="true">
          <path d="M4 0C2.07 0 .5 1.57.5 3.5.5 6.125 4 10 4 10S7.5 6.125 7.5 3.5C7.5 1.57 5.93 0 4 0Zm0 4.75A1.25 1.25 0 1 1 4 2.25a1.25 1.25 0 0 1 0 2.5Z" />
        </svg>
        <span className="truncate">{activity.location_name}</span>
        {activity.skill_level && (
          <span className="text-zinc-400 dark:text-zinc-500 flex-none">· {activity.skill_level}</span>
        )}
      </p>

      {/* Bottom row: avatar stack + spots + join */}
      <div className="flex items-center gap-2 mt-auto pt-0.5">
        {/* Avatar stack */}
        {avatars.length > 0 && (
          <div className="flex -space-x-1.5 flex-none">
            {avatars.map((av, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 ring-[1.5px] ring-white dark:ring-zinc-900 overflow-hidden flex items-center justify-center"
              >
                {av.avatar_url ? (
                  <img src={av.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[8px] font-semibold text-zinc-600 dark:text-zinc-300">
                    {av.full_name ? initials(av.full_name) : '?'}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex-1">
          {spotsLeft <= 0 ? 'Full' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'}`}
        </span>
        {isJoined ? (
          confirming ? (
            <button
              ref={btnRef}
              onClick={e => { e.stopPropagation(); onLeave() }}
              disabled={isLeaving}
              className="w-20 h-7 flex items-center justify-center rounded-full border border-red-500 text-red-500 text-[11px] font-semibold transition-colors disabled:opacity-50"
            >
              {isLeaving ? '…' : 'Leave'}
            </button>
          ) : (
            <button
              ref={btnRef}
              onClick={e => { e.stopPropagation(); setConfirming(true) }}
              className="w-20 h-7 flex items-center justify-center rounded-full border border-transparent bg-[#1D9E75] text-white text-[11px] font-semibold transition-colors"
            >
              Joined ✓
            </button>
          )
        ) : spotsLeft > 0 ? (
          <button
            onClick={e => { e.stopPropagation(); onJoin() }}
            disabled={isJoining}
            className="w-20 h-7 flex items-center justify-center rounded-full border border-transparent bg-[#1D9E75] text-white text-[11px] font-semibold hover:bg-[#199068] active:bg-[#147a56] transition-colors disabled:opacity-50"
          >
            {isJoining ? '…' : 'Join'}
          </button>
        ) : null}
      </div>
    </div>
  )
}

// ─── MapPreviewCard ───────────────────────────────────────────────────────────

function MapPreviewCard({
  activity,
  isJoined,
  isJoining,
  isLeaving,
  onJoin,
  onLeave,
  onDismiss,
}: {
  activity: Activity
  isJoined: boolean
  isJoining: boolean
  isLeaving: boolean
  onJoin: () => void
  onLeave: () => void
  onDismiss: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!confirming) return
    function onOutside(e: MouseEvent) {
      if (!btnRef.current?.contains(e.target as Node)) setConfirming(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [confirming])

  const colors = SPORT_COLORS[activity.sport.toLowerCase()] ?? { bg: '#F4F4F5', text: '#52525B' }
  const participantCount = Array.isArray(activity.participants) ? activity.participants.length : 0
  const spotsLeft = activity.max_participants - participantCount
  const sportLabel = activity.sport.charAt(0).toUpperCase() + activity.sport.slice(1)

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[320px] rounded-2xl bg-white dark:bg-zinc-900 shadow-xl ring-[0.5px] ring-zinc-200 dark:ring-zinc-800 p-4 flex flex-col gap-3 z-10">
      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        aria-label="Close"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Sport pill + time */}
      <div className="flex items-center gap-2 pr-8">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {sportLabel}
        </span>
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
          {formatTime(activity.starts_at)}
        </span>
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-zinc-900 dark:text-white leading-snug">
        {activity.title}
      </p>

      {/* Location + skill + spots */}
      <div className="flex flex-col gap-1">
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
          <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor" className="flex-none" aria-hidden="true">
            <path d="M4 0C2.07 0 .5 1.57.5 3.5.5 6.125 4 10 4 10S7.5 6.125 7.5 3.5C7.5 1.57 5.93 0 4 0Zm0 4.75A1.25 1.25 0 1 1 4 2.25a1.25 1.25 0 0 1 0 2.5Z" />
          </svg>
          {activity.location_name}
          {activity.skill_level && ` · ${activity.skill_level}`}
        </p>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
          {spotsLeft <= 0 ? 'Full' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}
        </p>
      </div>

      {/* CTA */}
      {isJoined ? (
        confirming ? (
          <button
            ref={btnRef}
            onClick={() => onLeave()}
            disabled={isLeaving}
            className="w-full rounded-xl border border-red-500 text-red-500 text-sm font-semibold py-3 transition-colors disabled:opacity-50"
          >
            {isLeaving ? 'Leaving…' : 'Leave activity'}
          </button>
        ) : (
          <button
            ref={btnRef}
            onClick={() => setConfirming(true)}
            className="w-full rounded-xl border border-transparent bg-[#E1F5EE] dark:bg-[#0F6E56]/20 text-[#1D9E75] text-sm font-semibold py-3 transition-colors"
          >
            You&apos;re in ✓
          </button>
        )
      ) : spotsLeft > 0 ? (
        <button
          onClick={onJoin}
          disabled={isJoining}
          className="w-full rounded-xl border border-transparent bg-[#1D9E75] text-white text-sm font-semibold py-3 hover:bg-[#199068] active:bg-[#147a56] transition-colors disabled:opacity-50"
        >
          {isJoining ? 'Joining…' : 'Join this activity'}
        </button>
      ) : (
        <div className="flex items-center justify-center rounded-xl py-3 bg-zinc-100 dark:bg-zinc-800">
          <span className="text-sm font-medium text-zinc-400">Activity is full</span>
        </div>
      )}
    </div>
  )
}
