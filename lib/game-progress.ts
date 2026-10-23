import {
  dailyMissions,
  parseReview,
  updateReview,
  type DayActivity,
  type HistoryItem,
  type Outcome,
  type ReviewItem,
} from './game-journey'
import {
  gameModes,
  type GameMode,
  isPlayMode,
  localDateKey,
  ROUND_COUNT,
  type PlayMode,
} from './games'

export const GAME_STORAGE_KEY = 'kieu-games-v1'
export type GameResult = {
  id: string
  mode: PlayMode
  date: string
  score: number
  correct: number
  outcomes?: Outcome[]
}
export type GameProgress = {
  xp: number
  sessions: number
  correct: number
  best: Partial<Record<PlayMode, number>>
  dates: string[]
  dailyDates: string[]
  recentIds: string[]
  perfect: boolean
  review: ReviewItem[]
  activity: DayActivity[]
  history: HistoryItem[]
}
export const emptyProgress = (): GameProgress => ({
  xp: 0,
  sessions: 0,
  correct: 0,
  best: {},
  dates: [],
  dailyDates: [],
  recentIds: [],
  perfect: false,
  review: [],
  activity: [],
  history: [],
})
const count = (value: unknown): number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0
function validDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  )
}
const dateList = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.filter(validDate))].sort() : []
export function parseGameProgress(value: unknown): GameProgress {
  if (!value || typeof value !== 'object') return emptyProgress()
  const data = value as Partial<GameProgress>
  const best: GameProgress['best'] = {}
  if (data.best && typeof data.best === 'object') {
    for (const [mode, score] of Object.entries(data.best)) {
      if (isPlayMode(mode)) best[mode] = Math.min(ROUND_COUNT * 10, count(score))
    }
  }
  const sessions = count(data.sessions)
  return {
    xp: count(data.xp),
    sessions,
    correct: Math.min(count(data.correct), sessions * ROUND_COUNT),
    best,
    dates: dateList(data.dates),
    dailyDates: dateList(data.dailyDates),
    recentIds: Array.isArray(data.recentIds)
      ? [...new Set(data.recentIds.filter(id => typeof id === 'string' && id.length <= 100))].slice(
          -100
        )
      : [],
    perfect: data.perfect === true,
    review: parseReview(data.review),
    activity: parseActivity(data.activity),
    history: parseHistory(data.history),
  }
}
export function applyResult(progress: GameProgress, result: GameResult): GameProgress {
  if (
    !isPlayMode(result.mode) ||
    !validDate(result.date) ||
    !result.id ||
    result.id.length > 100 ||
    !Number.isInteger(result.score) ||
    result.score < 0 ||
    result.score > ROUND_COUNT * 10 ||
    !Number.isInteger(result.correct) ||
    result.correct < 0 ||
    result.correct > ROUND_COUNT ||
    result.score > result.correct * 10
  )
    return progress
  if (
    progress.recentIds.includes(result.id) ||
    (result.mode === 'daily' && progress.dailyDates.includes(result.date))
  )
    return progress
  const activity = progress.activity.find(day => day.date === result.date)
  const day: DayActivity = {
    date: result.date,
    sessions: (activity?.sessions ?? 0) + 1,
    correct: (activity?.correct ?? 0) + result.correct,
    modes: [
      ...new Set([...(activity?.modes ?? []), ...(result.mode === 'daily' ? [] : [result.mode])]),
    ],
    claimed: activity?.claimed ?? false,
  }
  return {
    ...progress,
    review: updateReview(progress.review, result.outcomes ?? []),
    activity: [...progress.activity.filter(item => item.date !== result.date), day]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-90),
    history: [
      ...progress.history,
      {
        id: result.id,
        date: result.date,
        mode: result.mode,
        score: result.score,
        correct: result.correct,
      },
    ].slice(-20),
    xp: progress.xp + result.score + (result.mode === 'daily' ? 10 : 0),
    sessions: progress.sessions + 1,
    correct: progress.correct + result.correct,
    best: {
      ...progress.best,
      [result.mode]: Math.max(progress.best[result.mode] ?? 0, result.score),
    },
    dates: [...new Set([...progress.dates, result.date])].sort(),
    dailyDates:
      result.mode === 'daily' ? [...progress.dailyDates, result.date].sort() : progress.dailyDates,
    recentIds: [...progress.recentIds, result.id].slice(-100),
    perfect: progress.perfect || result.score === ROUND_COUNT * 10,
  }
}
export function currentStreak(dates: string[], today = localDateKey()) {
  const days = new Set(dates)
  const cursor = new Date(`${today}T12:00:00Z`)
  if (!days.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1)
  let streak = 0
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}
export function badges(progress: GameProgress) {
  return [
    {
      title: 'Bước đầu tri âm',
      description: 'Hoàn thành lượt chơi đầu tiên',
      unlocked: progress.sessions > 0,
    },
    {
      title: 'Trọn vẹn lời thơ',
      description: 'Đạt 50 điểm, không dùng gợi ý',
      unlocked: progress.perfect,
    },
    {
      title: 'Ba cách yêu Kiều',
      description: 'Chơi đủ ba trò luyện tập',
      unlocked: ['missing', 'continuation', 'order'].every(mode =>
        Object.hasOwn(progress.best, mode)
      ),
    },
    {
      title: 'Hẹn với câu thơ',
      description: 'Hoàn thành 3 thử thách ngày',
      unlocked: progress.dailyDates.length >= 3,
    },
  ]
}

function parseActivity(value: unknown): DayActivity[] {
  if (!Array.isArray(value)) return []
  const entries = new Map<string, DayActivity>()
  for (const day of value.slice(-90)) {
    if (!day || typeof day !== 'object' || !validDate(day.date)) continue
    const sessions = count(day.sessions)
    entries.set(day.date, {
      date: day.date,
      sessions,
      correct: Math.min(count(day.correct), sessions * ROUND_COUNT),
      modes: Array.isArray(day.modes)
        ? [
            ...new Set<GameMode>(
              day.modes.filter(
                (mode: unknown) => typeof mode === 'string' && Object.hasOwn(gameModes, mode)
              )
            ),
          ]
        : [],
      claimed: day.claimed === true,
    })
  }
  return [...entries.values()].sort((a, b) => a.date.localeCompare(b.date))
}
function parseHistory(value: unknown): HistoryItem[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.slice(-20).flatMap(item => {
    if (
      !item ||
      typeof item !== 'object' ||
      !validDate(item.date) ||
      typeof item.mode !== 'string' ||
      !isPlayMode(item.mode) ||
      typeof item.id !== 'string' ||
      !item.id ||
      seen.has(item.id) ||
      item.id.length > 100
    )
      return []
    seen.add(item.id)
    const correct = Math.min(count(item.correct), ROUND_COUNT)
    return [
      {
        id: item.id,
        date: item.date,
        mode: item.mode,
        correct,
        score: Math.min(count(item.score), correct * 10),
      },
    ]
  })
}
export function claimMissionBonus(progress: GameProgress, today: string): GameProgress {
  const activity = progress.activity.find(day => day.date === today)
  if (
    !activity ||
    activity.claimed ||
    !dailyMissions(activity).every(mission => mission.value === mission.target)
  )
    return progress
  return {
    ...progress,
    xp: progress.xp + 20,
    activity: progress.activity.map(day => (day.date === today ? { ...day, claimed: true } : day)),
  }
}
