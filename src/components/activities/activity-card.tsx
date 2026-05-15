'use client'

import type { ActivityWithParticipants } from '@/types'
import { SPORT_COLORS, getSportLabel } from '@/lib/utils/sport-config'
import { formatActivityTime } from '@/lib/utils/format-time'
import JoinButton from './join-button'

function initials(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
}

type CardProps = {
  activity: ActivityWithParticipants
  isJoined: boolean
  isJoining: boolean
  isLeaving: boolean
  onJoin: () => void
  onLeave: () => void
}

export function ActivityCardMobile({
  activity,
  isJoined,
  isJoining,
  isLeaving,
  onJoin,
  onLeave,
}: CardProps) {
  const colors = SPORT_COLORS[activity.sport.toLowerCase()] ?? { bg: '#F4F4F5', text: '#52525B' }
  const participantCount = Array.isArray(activity.participants) ? activity.participants.length : 0
  const spotsLeft = activity.max_participants - participantCount

  return (
    <div className="rounded-xl bg-white dark:bg-zinc-900 p-[10px] flex flex-col gap-2 ring-[0.5px] ring-zinc-200 dark:ring-zinc-800">
      <div className="flex items-start justify-between gap-1">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4 flex-none"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {getSportLabel(activity.sport)}
        </span>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-4 shrink-0">
          {formatActivityTime(activity.starts_at)}
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
        <JoinButton
          isJoined={isJoined}
          isJoining={isJoining}
          isLeaving={isLeaving}
          spotsLeft={spotsLeft}
          onJoin={onJoin}
          onLeave={onLeave}
        />
      </div>
    </div>
  )
}

type DesktopCardProps = CardProps & {
  isActive: boolean
  onSelect: () => void
}

export function ActivityCardDesktop({
  activity,
  isActive,
  isJoined,
  isJoining,
  isLeaving,
  onSelect,
  onJoin,
  onLeave,
}: DesktopCardProps) {
  const colors = SPORT_COLORS[activity.sport.toLowerCase()] ?? { bg: '#F4F4F5', text: '#52525B' }
  const participantCount = Array.isArray(activity.participants) ? activity.participants.length : 0
  const spotsLeft = activity.max_participants - participantCount

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
      <div className="flex items-start justify-between gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4 flex-none"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {getSportLabel(activity.sport)}
        </span>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-4 shrink-0">
          {formatActivityTime(activity.starts_at)}
        </span>
      </div>

      <p className="text-[13px] font-medium text-zinc-900 dark:text-white leading-snug">
        {activity.title}
      </p>

      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 min-w-0">
        <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor" className="flex-none" aria-hidden="true">
          <path d="M4 0C2.07 0 .5 1.57.5 3.5.5 6.125 4 10 4 10S7.5 6.125 7.5 3.5C7.5 1.57 5.93 0 4 0Zm0 4.75A1.25 1.25 0 1 1 4 2.25a1.25 1.25 0 0 1 0 2.5Z" />
        </svg>
        <span className="truncate">{activity.location_name}</span>
        {activity.skill_level && (
          <span className="text-zinc-400 dark:text-zinc-500 flex-none">· {activity.skill_level}</span>
        )}
      </p>

      <div className="flex items-center gap-2 mt-auto pt-0.5">
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
        <JoinButton
          isJoined={isJoined}
          isJoining={isJoining}
          isLeaving={isLeaving}
          spotsLeft={spotsLeft}
          onJoin={onJoin}
          onLeave={onLeave}
          stopPropagation
        />
      </div>
    </div>
  )
}
