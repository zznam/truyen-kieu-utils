import { z } from 'zod'
import { topics, verses } from './kieu'

export const ADVENTURE_STORAGE_KEY = 'kieu-adventure-v1'
export const TOPIC_IDS = topics.filter(topic => topic.id !== 'all').map(topic => topic.id as string)
export const PROFILE_AVATARS = ['📖', '🌸', '🖋️', '🪷', '🦋', '🌙']
export const PROFILE_ACCENTS = ['indigo', 'rose', 'emerald', 'amber']
export const PROFILE_TITLES = [
  'Bạn đọc',
  'Người tìm chữ',
  'Bạn tri âm',
  'Người giữ lời thơ',
  'Thi nhân',
]
export const SESSION_MODES = [
  'missing',
  'continuation',
  'order',
  'daily',
  'arena',
  ...[
    'word-order',
    'double-blank',
    'previous-verse',
    'true-verse',
    'syllable-count',
    'changed-word',
    'initials',
    'typed-word',
    'pair-match',
    'recall',
  ].map(mode => `arcade-${mode}`),
]
const verseIds = new Set(verses.map(verse => verse.id))
const MAX_EVENTS = 5000
const MAX_DAYS = 366
const MAX_COUNT = 100_000_000

export type ActivityDay = {
  date: string
  read: number
  saved: number
  explored: number
  created: number
  reflected: number
  sessions: number
  correct: number
  total: number
  hints: number
  reviewed: number
  focusMinutes: number
  xp: number
  modes: string[]
  goalTarget?: number
}
export type SessionRecord = {
  id: string
  date: string
  mode: string
  correct: number
  total: number
  hints: number
  xp: number
}
export type AdventureState = {
  version: 1
  xp: number
  coins: number
  earnedCoins: number
  profile: { name: string; avatar: string; title: string; accent: string }
  dailyGoal: number
  readIds: number[]
  savedIds: number[]
  topics: string[]
  mastery: Record<string, { count: number; lastDate: string }>
  activity: ActivityDay[]
  history: SessionRecord[]
  eventIds: string[]
  claimedQuests: string[]
  claimedChapters: string[]
  inventory: string[]
  freezeDays: string[]
  pinnedAchievement: string | null
  stats: {
    sessions: number
    correct: number
    total: number
    hints: number
    perfect: number
    noHint: number
    created: number
    reflected: number
    reviews: number
    focusMinutes: number
  }
  best: Record<string, number>
}
export type AdventureEvent =
  | { type: 'read'; id: string; verseIds: number[] }
  | { type: 'save'; id: string; verseId: number }
  | { type: 'explore'; id: string; topic: string }
  | { type: 'create' | 'reflect'; id: string }
  | {
      type: 'session'
      id: string
      mode: string
      correct: number
      total: number
      hints: number
      verseIds: number[]
      perfect?: boolean
    }
  | { type: 'review'; id: string; verseIds: number[] }
  | { type: 'focus'; id: string; minutes: number; verseIds: number[] }

export function emptyAdventure(): AdventureState {
  return {
    version: 1,
    xp: 0,
    coins: 0,
    earnedCoins: 0,
    profile: { name: '', avatar: '📖', title: 'Bạn đọc', accent: 'indigo' },
    dailyGoal: 50,
    readIds: [],
    savedIds: [],
    topics: [],
    mastery: {},
    activity: [],
    history: [],
    eventIds: [],
    claimedQuests: [],
    claimedChapters: [],
    inventory: [],
    freezeDays: [],
    pinnedAchievement: null,
    stats: {
      sessions: 0,
      correct: 0,
      total: 0,
      hints: 0,
      perfect: 0,
      noHint: 0,
      created: 0,
      reflected: 0,
      reviews: 0,
      focusMinutes: 0,
    },
    best: {},
  }
}
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  )
}
export function shiftDay(date: string, offset: number) {
  if (!validDate(date)) return ''
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + offset)
  return value.toISOString().slice(0, 10)
}
export function weekKey(date: string) {
  if (!validDate(date)) return ''
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
  return shiftDay(date, -((weekday + 6) % 7))
}
export function emptyActivity(date: string): ActivityDay {
  return {
    date,
    read: 0,
    saved: 0,
    explored: 0,
    created: 0,
    reflected: 0,
    sessions: 0,
    correct: 0,
    total: 0,
    hints: 0,
    reviewed: 0,
    focusMinutes: 0,
    xp: 0,
    modes: [],
  }
}
export function recentActivity(state: AdventureState, today: string, days = 28) {
  return Array.from({ length: Math.min(MAX_DAYS, Math.max(1, Math.floor(days))) }, (_, index) => {
    const date = shiftDay(today, index - Math.min(MAX_DAYS, Math.max(1, Math.floor(days))) + 1)
    return state.activity.find(day => day.date === date) ?? emptyActivity(date)
  })
}
export function currentStreak(state: AdventureState, today = localDay()) {
  const active = new Set(state.activity.filter(day => day.xp > 0).map(day => day.date))
  const covered = new Set([...active, ...state.freezeDays])
  let date = active.has(today) ? today : shiftDay(today, -1)
  let streak = 0
  for (let count = 0; count < MAX_DAYS && covered.has(date); count++) {
    if (active.has(date)) streak++
    date = shiftDay(date, -1)
  }
  return streak
}
export function longestStreak(state: AdventureState) {
  const active = new Set(state.activity.filter(day => day.xp > 0).map(day => day.date))
  const covered = [...new Set([...active, ...state.freezeDays])].sort()
  let previous = ''
  let length = 0
  let longest = 0
  for (const date of covered) {
    if (previous && shiftDay(previous, 1) !== date) length = 0
    if (active.has(date)) length++
    longest = Math.max(longest, length)
    previous = date
  }
  return longest
}
export function levelInfo(xp: number) {
  const safeXp = Math.max(0, Number.isFinite(xp) ? xp : 0)
  const level = Math.floor(Math.sqrt(safeXp / 100)) + 1
  const floor = (level - 1) ** 2 * 100
  const required = (level ** 2 - (level - 1) ** 2) * 100
  const title =
    level >= 10
      ? 'Thi nhân'
      : level >= 7
        ? 'Người giữ lời thơ'
        : level >= 4
          ? 'Bạn tri âm'
          : level >= 2
            ? 'Người tìm chữ'
            : 'Bạn đọc'
  return {
    level,
    title,
    current: safeXp - floor,
    required,
    progress: Math.min(100, ((safeXp - floor) / required) * 100),
  }
}
export const SHOP_ITEMS: {
  id: string
  name: string
  description: string
  type: 'avatar' | 'title' | 'accent' | 'freeze'
  value: string
  cost: number
}[] = [
  {
    id: 'avatar-lotus',
    name: 'Hoa sen',
    description: 'Ảnh đại diện hoa sen cho hồ sơ.',
    type: 'avatar',
    value: '🪷',
    cost: 30,
  },
  {
    id: 'avatar-butterfly',
    name: 'Cánh bướm',
    description: 'Ảnh đại diện cánh bướm.',
    type: 'avatar',
    value: '🦋',
    cost: 45,
  },
  {
    id: 'avatar-moon',
    name: 'Vầng trăng',
    description: 'Ảnh đại diện vầng trăng.',
    type: 'avatar',
    value: '🌙',
    cost: 60,
  },
  {
    id: 'accent-rose',
    name: 'Sắc hồng',
    description: 'Đổi màu thẻ hồ sơ sang hồng.',
    type: 'accent',
    value: 'rose',
    cost: 25,
  },
  {
    id: 'accent-emerald',
    name: 'Sắc ngọc',
    description: 'Đổi màu thẻ hồ sơ sang xanh ngọc.',
    type: 'accent',
    value: 'emerald',
    cost: 25,
  },
  {
    id: 'accent-amber',
    name: 'Sắc vàng',
    description: 'Đổi màu thẻ hồ sơ sang vàng.',
    type: 'accent',
    value: 'amber',
    cost: 25,
  },
  {
    id: 'title-poet',
    name: 'Danh hiệu Thi nhân',
    description: 'Trang bị danh hiệu Thi nhân.',
    type: 'title',
    value: 'Thi nhân',
    cost: 100,
  },
  {
    id: 'freeze',
    name: 'Nối lại nhịp đọc',
    description: 'Bù ngày hôm qua nếu đã nghỉ đúng một ngày. Không tính ngày nghỉ vào chuỗi.',
    type: 'freeze',
    value: '',
    cost: 40,
  },
]

function withReward(
  state: AdventureState,
  day: ActivityDay,
  xp: number,
  coins: number
): AdventureState {
  return {
    ...state,
    xp: Math.min(MAX_COUNT, state.xp + xp),
    coins: Math.min(MAX_COUNT, state.coins + coins),
    earnedCoins: Math.min(MAX_COUNT, state.earnedCoins + coins),
    activity: [
      ...state.activity.filter(item => item.date !== day.date),
      {
        ...day,
        goalTarget: day.goalTarget ?? state.dailyGoal,
        xp: Math.min(MAX_COUNT, day.xp + xp),
      },
    ]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-MAX_DAYS),
  }
}
function validId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 160
}
function validVerseList(ids: unknown, allowEmpty = false): ids is number[] {
  return (
    Array.isArray(ids) &&
    (allowEmpty || ids.length > 0) &&
    ids.length <= 100 &&
    ids.every(id => typeof id === 'number' && verseIds.has(id))
  )
}
function boundedInteger(value: unknown, max: number) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max
}
function improveMastery(state: AdventureState, ids: number[], date: string) {
  const mastery = { ...state.mastery }
  for (const id of new Set(ids)) {
    const previous = mastery[id]
    // Spaced practice advances a verse at most once per calendar day.
    if (previous?.lastDate !== date)
      mastery[id] = { count: Math.min(3, (previous?.count ?? 0) + 1), lastDate: date }
  }
  return mastery
}
export function applyAdventureEvent(
  state: AdventureState,
  event: AdventureEvent,
  date: string
): AdventureState {
  if (!event || !validDate(date) || !validId(event.id) || state.eventIds.includes(event.id))
    return state
  const day = { ...(state.activity.find(item => item.date === date) ?? emptyActivity(date)) }
  const next = { ...state, stats: { ...state.stats } }
  let xp = 0
  let coins = 0
  switch (event.type) {
    case 'read': {
      if (!validVerseList(event.verseIds)) return state
      const fresh = [...new Set(event.verseIds)].filter(id => !state.readIds.includes(id))
      if (!fresh.length) return state
      next.readIds = [...state.readIds, ...fresh]
      day.read += fresh.length
      xp = fresh.length * 2
      coins = fresh.length
      break
    }
    case 'save':
      if (!verseIds.has(event.verseId) || state.savedIds.includes(event.verseId)) return state
      next.savedIds = [...state.savedIds, event.verseId]
      day.saved++
      xp = 5
      coins = 2
      break
    case 'explore':
      if (!TOPIC_IDS.includes(event.topic) || state.topics.includes(event.topic)) return state
      next.topics = [...state.topics, event.topic]
      day.explored++
      xp = 10
      coins = 4
      break
    case 'create':
      if (day.created >= 3) return state
      next.stats.created++
      day.created++
      xp = 10
      coins = 3
      break
    case 'reflect':
      if (day.reflected >= 3) return state
      next.stats.reflected++
      day.reflected++
      xp = 5
      coins = 2
      break
    case 'session': {
      if (
        !SESSION_MODES.includes(event.mode) ||
        !validVerseList(event.verseIds, true) ||
        !boundedInteger(event.total, 50) ||
        event.total === 0 ||
        !boundedInteger(event.correct, event.total) ||
        !boundedInteger(event.hints, event.total) ||
        day.sessions >= 20
      )
        return state
      const perfect = event.correct === event.total
      xp = 5 + event.correct * 4 + (perfect ? 10 : 0) + (perfect && event.hints === 0 ? 5 : 0)
      coins = 2 + event.correct + (perfect ? 3 : 0)
      day.sessions++
      day.correct += event.correct
      day.total += event.total
      day.hints += event.hints
      day.modes = [...new Set([...day.modes, event.mode])]
      next.stats.sessions++
      next.stats.correct += event.correct
      next.stats.total += event.total
      next.stats.hints += event.hints
      if (perfect) next.stats.perfect++
      if (perfect && event.hints === 0) next.stats.noHint++
      next.mastery = improveMastery(state, event.verseIds, date)
      const score = Math.round((event.correct / event.total) * 100)
      next.best = { ...state.best, [event.mode]: Math.max(state.best[event.mode] ?? 0, score) }
      next.history = [
        ...state.history,
        {
          id: event.id,
          date,
          mode: event.mode,
          correct: event.correct,
          total: event.total,
          hints: event.hints,
          xp,
        },
      ].slice(-200)
      break
    }
    case 'review': {
      if (!validVerseList(event.verseIds)) return state
      const fresh = [...new Set(event.verseIds)].filter(id => state.mastery[id]?.lastDate !== date)
      if (!fresh.length) return state
      const rewarded = Math.min(fresh.length, Math.max(0, 50 - day.reviewed))
      day.reviewed += fresh.length
      next.stats.reviews += fresh.length
      next.mastery = improveMastery(state, fresh, date)
      xp = rewarded * 3
      coins = rewarded
      break
    }
    case 'focus':
      if (
        !validVerseList(event.verseIds) ||
        !boundedInteger(event.minutes, 60) ||
        event.minutes < 1 ||
        day.focusMinutes + event.minutes > 120
      )
        return state
      day.focusMinutes += event.minutes
      next.stats.focusMinutes += event.minutes
      xp = event.minutes * 2
      coins = event.minutes
      break
    default:
      return state
  }
  next.eventIds = [...state.eventIds, event.id].slice(-MAX_EVENTS)
  return withReward(next, day, xp, coins)
}
export type Milestone = {
  id: string
  title: string
  description: string
  value: number
  target: number
  unlocked: boolean
  sourceId?: number
}
export type Quest = {
  id: string
  title: string
  description: string
  value: number
  target: number
  xp: number
  coins: number
  claimed: boolean
  period: 'daily' | 'weekly'
}
export function quests(state: AdventureState, today: string): Quest[] {
  const day = state.activity.find(item => item.date === today) ?? emptyActivity(today)
  const week = state.activity.filter(item => item.date >= weekKey(today) && item.date <= today)
  const sum = (key: 'read' | 'correct' | 'focusMinutes' | 'reflected' | 'created') =>
    week.reduce((total, item) => total + item[key], 0)
  const definitions: {
    key: string
    title: string
    description: string
    value: number
    target: number
    period: 'daily' | 'weekly'
    xp: number
    coins: number
  }[] = [
    {
      key: 'read',
      title: 'Mười hai dòng thơ',
      description: 'Đánh dấu 12 dòng mới đã đọc hôm nay.',
      value: day.read,
      target: 12,
      period: 'daily',
      xp: 15,
      coins: 5,
    },
    {
      key: 'play',
      title: 'Hai lượt luyện trí',
      description: 'Hoàn thành 2 lượt trò chơi hôm nay.',
      value: day.sessions,
      target: 2,
      period: 'daily',
      xp: 20,
      coins: 8,
    },
    {
      key: 'save',
      title: 'Giữ một câu hay',
      description: 'Lưu thêm một câu chưa từng lưu.',
      value: day.saved,
      target: 1,
      period: 'daily',
      xp: 10,
      coins: 3,
    },
    {
      key: 'review',
      title: 'Nhớ lại lời thơ',
      description: 'Ôn đúng 3 dòng chưa được ôn hôm nay.',
      value: day.reviewed,
      target: 3,
      period: 'daily',
      xp: 15,
      coins: 5,
    },
    {
      key: 'focus',
      title: 'Năm phút tĩnh tâm',
      description: 'Hoàn thành 5 phút đọc tập trung.',
      value: day.focusMinutes,
      target: 5,
      period: 'daily',
      xp: 15,
      coins: 5,
    },
    {
      key: 'goal',
      title: 'Nhịp đọc mỗi ngày',
      description: `Tích lũy ${state.dailyGoal} XP hôm nay.`,
      value: day.xp,
      target: state.dailyGoal,
      period: 'daily',
      xp: 10,
      coins: 5,
    },
    {
      key: 'read',
      title: 'Tuần đọc rộng',
      description: 'Đọc 80 dòng mới trong tuần.',
      value: sum('read'),
      target: 80,
      period: 'weekly',
      xp: 60,
      coins: 20,
    },
    {
      key: 'variety',
      title: 'Thử thách đa tài',
      description: 'Thử 5 kiểu trò chơi khác nhau trong tuần.',
      value: new Set(week.flatMap(item => item.modes)).size,
      target: 5,
      period: 'weekly',
      xp: 60,
      coins: 20,
    },
    {
      key: 'correct',
      title: 'Vững lời Kiều',
      description: 'Trả lời đúng 25 câu trong tuần.',
      value: sum('correct'),
      target: 25,
      period: 'weekly',
      xp: 60,
      coins: 20,
    },
    {
      key: 'focus',
      title: 'Khoảng lặng của tuần',
      description: 'Đọc tập trung 20 phút trong tuần.',
      value: sum('focusMinutes'),
      target: 20,
      period: 'weekly',
      xp: 40,
      coins: 15,
    },
    {
      key: 'reflect',
      title: 'Ba lần chiêm nghiệm',
      description: 'Hoàn thành 3 lần suy ngẫm sau Bói Kiều trong tuần.',
      value: sum('reflected'),
      target: 3,
      period: 'weekly',
      xp: 30,
      coins: 10,
    },
    {
      key: 'create',
      title: 'Gieo lời mới',
      description: 'Tạo thành công 3 bài Lẩy Kiều trong tuần.',
      value: sum('created'),
      target: 3,
      period: 'weekly',
      xp: 30,
      coins: 10,
    },
    {
      key: 'habit',
      title: 'Ba ngày trọn nhịp',
      description: 'Đạt mục tiêu XP trong 3 ngày của tuần.',
      value: week.filter(
        item =>
          item.xp >= (item.date === today ? state.dailyGoal : (item.goalTarget ?? state.dailyGoal))
      ).length,
      target: 3,
      period: 'weekly',
      xp: 60,
      coins: 20,
    },
  ]
  return definitions.map(item => {
    const id = `${item.period}:${item.period === 'daily' ? today : weekKey(today)}:${item.key}`
    return {
      ...item,
      id,
      value: Math.min(item.value, item.target),
      claimed: state.claimedQuests.includes(id),
    }
  })
}
export function claimAdventureQuest(state: AdventureState, id: string, today: string) {
  const quest = quests(state, today).find(item => item.id === id)
  if (!quest || quest.claimed || quest.value < quest.target || !validDate(today)) return state
  const next = { ...state, claimedQuests: [...state.claimedQuests, id].slice(-4000) }
  return withReward(
    next,
    state.activity.find(day => day.date === today) ?? emptyActivity(today),
    quest.xp,
    quest.coins
  )
}
export function chapters(state: AdventureState) {
  const mastered = Object.values(state.mastery).filter(item => item.count >= 3).length
  const entries = [
    {
      id: 'opening',
      title: 'Mở trang sách',
      description: 'Đọc 20 dòng mới để khởi hành.',
      value: state.readIds.length,
      target: 20,
    },
    {
      id: 'keepsake',
      title: 'Gom lời tri âm',
      description: 'Lưu 5 câu thơ khác nhau.',
      value: state.savedIds.length,
      target: 5,
    },
    {
      id: 'landscapes',
      title: 'Bốn miền cảm xúc',
      description: 'Khám phá đủ 4 chủ đề.',
      value: state.topics.length,
      target: 4,
    },
    {
      id: 'practice',
      title: 'Thử tài nhớ Kiều',
      description: 'Hoàn thành 5 lượt trò chơi.',
      value: state.stats.sessions,
      target: 5,
    },
    {
      id: 'knowledge',
      title: 'Tỏ lời thi nhân',
      description: 'Tích lũy 50 câu trả lời đúng.',
      value: state.stats.correct,
      target: 50,
    },
    {
      id: 'mastery',
      title: 'Lời thơ ở lại',
      description: 'Ôn thành thạo 10 dòng trong ít nhất 3 ngày khác nhau.',
      value: mastered,
      target: 10,
    },
  ]
  return entries.map((item, index) => ({
    ...item,
    value: Math.min(item.value, item.target),
    unlocked: index === 0 || state.claimedChapters.includes(entries[index - 1].id),
    claimed: state.claimedChapters.includes(item.id),
    xp: 30 + index * 15,
    coins: 10 + index * 5,
  }))
}
export function claimAdventureChapter(state: AdventureState, id: string, today: string) {
  const chapter = chapters(state).find(item => item.id === id)
  if (
    !chapter ||
    chapter.claimed ||
    !chapter.unlocked ||
    chapter.value < chapter.target ||
    !validDate(today)
  )
    return state
  return withReward(
    { ...state, claimedChapters: [...state.claimedChapters, id] },
    state.activity.find(day => day.date === today) ?? emptyActivity(today),
    chapter.xp,
    chapter.coins
  )
}
export function achievements(state: AdventureState): Milestone[] {
  const definitions = [
    {
      id: 'reader',
      title: 'Trang đầu',
      description: 'Đọc một dòng thơ mới.',
      value: state.readIds.length,
      target: 1,
    },
    {
      id: 'collector',
      title: 'Người giữ chữ',
      description: 'Lưu 10 dòng thơ khác nhau.',
      value: state.savedIds.length,
      target: 10,
    },
    {
      id: 'explorer',
      title: 'Bốn mùa cảm xúc',
      description: 'Khám phá đủ bốn chủ đề.',
      value: state.topics.length,
      target: 4,
    },
    {
      id: 'perfect',
      title: 'Trọn vẹn',
      description: 'Hoàn thành một lượt đúng tất cả.',
      value: state.stats.perfect,
      target: 1,
    },
    {
      id: 'unaided',
      title: 'Tự mình nhớ lấy',
      description: 'Một lượt hoàn hảo không dùng gợi ý.',
      value: state.stats.noHint,
      target: 1,
    },
    {
      id: 'versatile',
      title: 'Đa tài',
      description: 'Chơi đủ 8 kiểu trò chơi.',
      value: Object.keys(state.best).length,
      target: 8,
    },
    {
      id: 'habit',
      title: 'Bảy ngày bên Kiều',
      description: 'Duy trì chuỗi 7 ngày hoạt động.',
      value: longestStreak(state),
      target: 7,
    },
    {
      id: 'focus',
      title: 'Tĩnh tâm',
      description: 'Hoàn thành 30 phút đọc tập trung.',
      value: state.stats.focusMinutes,
      target: 30,
    },
    {
      id: 'creator',
      title: 'Gieo vần',
      description: 'Tạo 3 bài Lẩy Kiều thành công.',
      value: state.stats.created,
      target: 3,
    },
    {
      id: 'reflector',
      title: 'Lắng nghe',
      description: 'Chiêm nghiệm 3 lần sau Bói Kiều.',
      value: state.stats.reflected,
      target: 3,
    },
    {
      id: 'reviewer',
      title: 'Gặp lại câu quen',
      description: 'Ôn đúng 20 dòng.',
      value: state.stats.reviews,
      target: 20,
    },
    {
      id: 'master',
      title: 'Khắc ghi',
      description: 'Có 10 dòng thành thạo sau ít nhất 3 ngày ôn.',
      value: Object.values(state.mastery).filter(item => item.count >= 3).length,
      target: 10,
    },
    {
      id: 'quester',
      title: 'Giữ lời hẹn',
      description: 'Nhận thưởng 10 nhiệm vụ.',
      value: state.claimedQuests.length,
      target: 10,
    },
    {
      id: 'traveller',
      title: 'Trọn hành trình',
      description: 'Hoàn thành cả 6 chương.',
      value: state.claimedChapters.length,
      target: 6,
    },
  ]
  return definitions.map(item => ({
    ...item,
    value: Math.min(item.value, item.target),
    unlocked: item.value >= item.target,
  }))
}
export function collections(state: AdventureState): Milestone[] {
  return [
    ...TOPIC_IDS.map((topic, index) => ({
      id: `topic-${topic}`,
      title: ['Lá tình yêu', 'Lá nhân sinh', 'Lá thiên nhiên', 'Lá gia đình'][index],
      description: 'Khám phá chủ đề tương ứng để mở lá thơ.',
      value: state.topics.includes(topic) ? 1 : 0,
      target: 1,
    })),
    ...Array.from({ length: 4 }, (_, index) => {
      const section = verses.slice(
        Math.floor((index * verses.length) / 4),
        Math.floor(((index + 1) * verses.length) / 4)
      )
      const ids = new Set(section.map(verse => verse.id))
      return {
        sourceId: section[0]?.id,
        id: `reading-${index + 1}`,
        title: `Mảnh sách ${index + 1}`,
        description: `Đọc 20 dòng trong phần ${index + 1} của tác phẩm.`,
        value: state.readIds.filter(id => ids.has(id)).length,
        target: 20,
      }
    }),
  ].map(item => ({
    ...item,
    value: Math.min(item.value, item.target),
    unlocked: item.value >= item.target,
  }))
}
export function buyAdventureItem(state: AdventureState, id: string, today: string) {
  const item = SHOP_ITEMS.find(product => product.id === id)
  if (!item || state.coins < item.cost) return state
  if (item.type === 'freeze') {
    const yesterday = shiftDay(today, -1)
    const before = shiftDay(today, -2)
    if (
      !validDate(today) ||
      state.freezeDays.includes(yesterday) ||
      state.activity.some(day => day.date === yesterday && day.xp > 0) ||
      !state.activity.some(day => day.date === before && day.xp > 0)
    )
      return state
    return {
      ...state,
      coins: state.coins - item.cost,
      freezeDays: [...state.freezeDays, yesterday].slice(-MAX_DAYS),
    }
  }
  if (state.inventory.includes(id)) return state
  return { ...state, coins: state.coins - item.cost, inventory: [...state.inventory, id] }
}
export function equipAdventureItem(state: AdventureState, id: string) {
  const item = SHOP_ITEMS.find(product => product.id === id)
  if (!item || item.type === 'freeze' || !state.inventory.includes(id)) return state
  return { ...state, profile: { ...state.profile, [item.type]: item.value } }
}
export function earnedProfileTitles(state: AdventureState) {
  return PROFILE_TITLES.filter(
    (title, index) =>
      index <= PROFILE_TITLES.indexOf(levelInfo(state.xp).title) ||
      SHOP_ITEMS.some(
        item => item.type === 'title' && item.value === title && state.inventory.includes(item.id)
      )
  )
}
export function updateAdventureProfile(
  state: AdventureState,
  change: Partial<AdventureState['profile']>
) {
  const profile = { ...state.profile }
  if (typeof change.name === 'string') profile.name = change.name.trim().slice(0, 40)
  for (const key of ['avatar', 'title', 'accent'] as const) {
    const value = change[key]
    if (typeof value !== 'string') continue
    const free =
      key === 'avatar'
        ? PROFILE_AVATARS.slice(0, 3).includes(value)
        : key === 'accent'
          ? value === 'indigo'
          : earnedProfileTitles(state).includes(value)
    if (
      free ||
      SHOP_ITEMS.some(
        item => item.type === key && item.value === value && state.inventory.includes(item.id)
      )
    )
      profile[key] = value
  }
  return Object.keys(profile).some(
    key => profile[key as keyof typeof profile] !== state.profile[key as keyof typeof profile]
  )
    ? { ...state, profile }
    : state
}
export function pinAdventureAchievement(state: AdventureState, id: string | null) {
  if (id !== null && !achievements(state).some(item => item.id === id && item.unlocked))
    return state
  return { ...state, pinnedAchievement: id }
}
export function setAdventureGoal(state: AdventureState, value: number, today = localDay()) {
  return [20, 50, 100, 200].includes(value) && value !== state.dailyGoal
    ? {
        ...state,
        dailyGoal: value,
        activity: state.activity.map(day =>
          day.date === today ? { ...day, goalTarget: value } : day
        ),
      }
    : state
}

const countSchema = z.number().int().min(0).max(MAX_COUNT)
const dateSchema = z.string().refine(validDate)
const idSchema = z.string().min(1).max(160)
const verseSchema = z
  .number()
  .int()
  .refine(id => verseIds.has(id))
const modeSchema = z.string().refine(mode => SESSION_MODES.includes(mode))
const unique = <T>(values: T[]) => new Set(values).size === values.length
const activitySchema = z
  .object({
    date: dateSchema,
    read: countSchema,
    saved: countSchema,
    explored: countSchema,
    created: countSchema,
    reflected: countSchema,
    sessions: countSchema,
    correct: countSchema,
    total: countSchema,
    hints: countSchema,
    reviewed: countSchema,
    focusMinutes: countSchema,
    xp: countSchema,
    modes: z.array(modeSchema).max(SESSION_MODES.length).refine(unique),
    goalTarget: z
      .number()
      .refine(value => [20, 50, 100, 200].includes(value))
      .optional(),
  })
  .refine(day => day.correct <= day.total && day.hints <= day.total)
const adventureSchema = z
  .object({
    version: z.literal(1),
    xp: countSchema,
    coins: countSchema,
    earnedCoins: countSchema,
    profile: z.object({
      name: z.string().max(40),
      avatar: z.string().refine(value => PROFILE_AVATARS.includes(value)),
      title: z.string().refine(value => PROFILE_TITLES.includes(value)),
      accent: z.string().refine(value => PROFILE_ACCENTS.includes(value)),
    }),
    dailyGoal: z.number().refine(value => [20, 50, 100, 200].includes(value)),
    readIds: z.array(verseSchema).max(verses.length).refine(unique),
    savedIds: z.array(verseSchema).max(verses.length).refine(unique),
    topics: z
      .array(z.string().refine(topic => TOPIC_IDS.includes(topic)))
      .max(TOPIC_IDS.length)
      .refine(unique),
    mastery: z.record(
      z.string().refine(key => String(Number(key)) === key && verseIds.has(Number(key))),
      z.object({
        count: z
          .number()
          .int()
          .min(1)
          .max(5)
          .transform(value => Math.min(3, value)),
        lastDate: dateSchema,
      })
    ),
    activity: z
      .array(activitySchema)
      .max(MAX_DAYS)
      .refine(days => unique(days.map(day => day.date))),
    history: z
      .array(
        z
          .object({
            id: idSchema,
            date: dateSchema,
            mode: modeSchema,
            correct: countSchema,
            total: z.number().int().min(1).max(50),
            hints: countSchema,
            xp: countSchema,
          })
          .refine(session => session.correct <= session.total && session.hints <= session.total)
      )
      .max(200),
    eventIds: z.array(idSchema).max(MAX_EVENTS).refine(unique),
    claimedQuests: z
      .array(
        z
          .string()
          .max(100)
          .regex(/^(daily|weekly):\d{4}-\d{2}-\d{2}:[a-z]+$/)
          .refine(id => {
            const [period, date, key] = id.split(':')
            const keys =
              period === 'daily'
                ? ['read', 'play', 'save', 'review', 'focus', 'goal']
                : ['read', 'variety', 'correct', 'focus', 'reflect', 'create', 'habit']
            return (
              validDate(date) &&
              keys.includes(key) &&
              (period === 'daily' || weekKey(date) === date)
            )
          })
      )
      .max(4000)
      .refine(unique),
    claimedChapters: z
      .array(z.enum(['opening', 'keepsake', 'landscapes', 'practice', 'knowledge', 'mastery']))
      .max(6)
      .refine(unique),
    inventory: z
      .array(
        z.string().refine(id => SHOP_ITEMS.some(item => item.id === id && item.type !== 'freeze'))
      )
      .max(SHOP_ITEMS.length)
      .refine(unique),
    freezeDays: z.array(dateSchema).max(MAX_DAYS).refine(unique),
    pinnedAchievement: z.string().max(80).nullable(),
    stats: z.object({
      sessions: countSchema,
      correct: countSchema,
      total: countSchema,
      hints: countSchema,
      perfect: countSchema,
      noHint: countSchema,
      created: countSchema,
      reflected: countSchema,
      reviews: countSchema,
      focusMinutes: countSchema,
    }),
    best: z.record(modeSchema, z.number().int().min(0).max(100)),
  })
  .refine(
    state =>
      state.coins <= state.earnedCoins &&
      state.stats.correct <= state.stats.total &&
      state.stats.hints <= state.stats.total &&
      state.stats.perfect <= state.stats.sessions &&
      state.stats.noHint <= state.stats.perfect
  )

export function parseAdventure(value: unknown): AdventureState | null {
  const parsed = adventureSchema.safeParse(value)
  if (!parsed.success) return null
  const state = parsed.data
  // A backup must not equip a cosmetic its profile has not earned or bought.
  const normalized = updateAdventureProfile(
    { ...state, profile: emptyAdventure().profile },
    state.profile
  )
  if (JSON.stringify(normalized.profile) !== JSON.stringify(state.profile)) return null
  const orderedChapters = chapters(state).map(chapter => chapter.id)
  if (state.claimedChapters.some((id, index) => id !== orderedChapters[index])) return null
  if (
    state.pinnedAchievement !== null &&
    !achievements(state).some(item => item.id === state.pinnedAchievement && item.unlocked)
  )
    return null
  return state
}
export function exportAdventure(state: AdventureState) {
  return JSON.stringify(
    { app: 'kieu-adventure', version: 1, exportedAt: new Date().toISOString(), state },
    null,
    2
  )
}
export function importAdventure(raw: string): AdventureState | null {
  if (typeof raw !== 'string' || raw.length > 2_000_000) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (
      !value ||
      typeof value !== 'object' ||
      !('app' in value) ||
      value.app !== 'kieu-adventure' ||
      !('version' in value) ||
      value.version !== 1 ||
      !('state' in value)
    )
      return null
    return parseAdventure(value.state)
  } catch {
    return null
  }
}
