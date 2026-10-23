import { createReviewQuestion, gameModes, type GameMode } from './games'

export type ReviewItem = { mode: GameMode; verseId: number }
export type Outcome = ReviewItem & { correct: boolean; hinted: boolean }
export type DayActivity = {
  date: string
  sessions: number
  correct: number
  modes: GameMode[]
  claimed: boolean
}
export type HistoryItem = {
  id: string
  date: string
  mode: GameMode | 'daily'
  score: number
  correct: number
}
export const reviewKey = (item: ReviewItem) => `${item.mode}:${item.verseId}`
export function parseReview(value: unknown): ReviewItem[] {
  if (!Array.isArray(value)) return []
  const items = new Map<string, ReviewItem>()
  for (const item of value.slice(-100)) {
    if (!item || typeof item !== 'object' || !Object.hasOwn(gameModes, item.mode)) continue
    if (!Number.isSafeInteger(item.verseId)) continue
    const entry = { mode: item.mode as GameMode, verseId: item.verseId as number }
    if (createReviewQuestion(entry)) items.set(reviewKey(entry), entry)
  }
  return [...items.values()]
}
export function updateReview(items: ReviewItem[], outcomes: Outcome[]) {
  const next = new Map(items.map(item => [reviewKey(item), item]))
  for (const outcome of outcomes) {
    const key = reviewKey(outcome)
    if (outcome.correct && !outcome.hinted) next.delete(key)
    else if (!outcome.correct) {
      next.delete(key)
      next.set(key, { mode: outcome.mode, verseId: outcome.verseId })
    }
  }
  return [...next.values()].slice(-100)
}
export function dailyMissions(activity?: DayActivity) {
  return [
    {
      title: 'Ghé thăm lời Kiều',
      description: 'Hoàn thành một lượt chơi',
      value: Math.min(activity?.sessions ?? 0, 1),
      target: 1,
      href: '/play/daily',
    },
    {
      title: 'Nhớ mười câu thơ',
      description: 'Trả lời đúng 10 câu trong ngày',
      value: Math.min(activity?.correct ?? 0, 10),
      target: 10,
      href: '/play/missing',
    },
    {
      title: 'Đổi một cách chơi',
      description: 'Hoàn thành hai trò luyện tập khác nhau',
      value: Math.min(activity?.modes.length ?? 0, 2),
      target: 2,
      href: '/play#practice-title',
    },
  ]
}
export function recentDays(today: string) {
  const date = new Date(`${today}T12:00:00Z`)
  if (!Number.isFinite(date.getTime())) return []
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(date)
    day.setUTCDate(day.getUTCDate() - 6 + i)
    return day.toISOString().slice(0, 10)
  })
}
