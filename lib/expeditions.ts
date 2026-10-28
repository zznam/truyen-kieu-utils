import { z } from 'zod'
import { TOPIC_IDS, type AdventureState } from './gamification'
import { verses } from './kieu'

export const EXPEDITIONS_STORAGE_KEY = 'kieu-expeditions-v1'
export const EXPEDITION_LIMIT = 24
export const EXPEDITION_METRICS = [
  'read',
  'correct',
  'review',
  'focus',
  'topic',
  'creative',
] as const
export type ExpeditionMetric = (typeof EXPEDITION_METRICS)[number]
export type ExpeditionTotals = Record<ExpeditionMetric, number>
export type ExpeditionStage = { id: string; metric: ExpeditionMetric; target: number }
export type ExpeditionCheckpoint = { stageId: string; claimedAt: string; evidence: number }
export type ExpeditionAttempt = {
  startedAt: string
  baseline: ExpeditionTotals
  stageBaseline: ExpeditionTotals
  checkpoints: ExpeditionCheckpoint[]
  completedAt: string | null
}
export type ExpeditionRoute = {
  id: string
  templateId: string | null
  name: string
  stages: ExpeditionStage[]
  deadline: string | null
  status: 'draft' | 'active' | 'completed' | 'archived'
  attempts: ExpeditionAttempt[]
}
export type ExpeditionsState = { version: 1; routes: ExpeditionRoute[]; pinnedId: string | null }
export const metricDetails: Record<
  ExpeditionMetric,
  { label: string; unit: string; limit: number; note: string }
> = {
  read: {
    label: 'Đọc dòng mới',
    unit: 'dòng mới',
    limit: verses.length,
    note: 'Chỉ tính dòng chưa từng xác nhận đọc trong Hành trình.',
  },
  correct: {
    label: 'Trả lời đúng',
    unit: 'câu đúng',
    limit: 1000,
    note: 'Tính câu trả lời đúng trong các lượt chơi đã hoàn thành.',
  },
  review: {
    label: 'Ôn nhớ đúng',
    unit: 'dòng ôn',
    limit: 500,
    note: 'Tính dòng nhớ đúng, không dùng gợi ý, trong lượt ôn đã hoàn thành.',
  },
  focus: {
    label: 'Đọc tập trung',
    unit: 'phút',
    limit: 600,
    note: 'Chỉ tính phút từ phiên tập trung đã hoàn thành.',
  },
  topic: {
    label: 'Khám phá chủ đề mới',
    unit: 'chủ đề mới',
    limit: TOPIC_IDS.length,
    note: 'Mỗi chủ đề chỉ được tính lần khám phá đầu tiên trong Hành trình.',
  },
  creative: {
    label: 'Ghép Lẩy Kiều',
    unit: 'lần ghép',
    limit: 50,
    note: 'Tính lần ghép mới được Hành trình ghi nhận; tối đa 3 lần mỗi ngày.',
  },
}

export const expeditionTemplates: {
  id: string
  name: string
  description: string
  stages: ExpeditionStage[]
}[] = [
  {
    id: 'first-footsteps',
    name: 'Bước chân vào vườn thơ',
    description: 'Đọc để gặp, chơi để nhớ, ghép thơ để giữ một lời tri âm.',
    stages: [
      { id: 'read', metric: 'read', target: 12 },
      { id: 'remember', metric: 'correct', target: 3 },
      { id: 'compose', metric: 'creative', target: 1 },
    ],
  },
  {
    id: 'quiet-return',
    name: 'Một cuộc hẹn thong thả',
    description: 'Dành một phút yên, gặp lại câu cũ rồi thử trí nhớ.',
    stages: [
      { id: 'quiet', metric: 'focus', target: 1 },
      { id: 'revisit', metric: 'review', target: 2 },
      { id: 'remember', metric: 'correct', target: 5 },
    ],
  },
  {
    id: 'long-letter',
    name: 'Một trang gửi người tri kỷ',
    description: 'Từ một trang đọc mới đến những câu thơ do bạn lựa chọn.',
    stages: [
      { id: 'page', metric: 'read', target: 40 },
      { id: 'quiet', metric: 'focus', target: 2 },
      { id: 'compose', metric: 'creative', target: 2 },
    ],
  },
]

export function emptyExpeditions(): ExpeditionsState {
  return { version: 1, routes: [], pinnedId: null }
}

function validDay(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  )
}
const daySchema = z.string().refine(validDay)
const idSchema = z.string().regex(/^[a-zA-Z0-9-]{1,80}$/)
const totalsSchema = z
  .object(
    Object.fromEntries(
      EXPEDITION_METRICS.map(metric => [metric, z.number().int().min(0).max(1e8)])
    ) as {
      [K in ExpeditionMetric]: z.ZodNumber
    }
  )
  .strict()
const stageSchema = z
  .object({ id: idSchema, metric: z.enum(EXPEDITION_METRICS), target: z.number().int().min(1) })
  .strict()
  .refine(stage => stage.target <= metricDetails[stage.metric].limit)
const routeSchema = z
  .object({
    id: idSchema,
    templateId: z.enum(['first-footsteps', 'quiet-return', 'long-letter']).nullable(),
    name: z.string().trim().min(1).max(80),
    stages: z.array(stageSchema).min(1).max(6),
    deadline: daySchema.nullable(),
    status: z.enum(['draft', 'active', 'completed', 'archived']),
    attempts: z
      .array(
        z
          .object({
            startedAt: daySchema,
            baseline: totalsSchema,
            stageBaseline: totalsSchema,
            checkpoints: z
              .array(
                z
                  .object({
                    stageId: idSchema,
                    claimedAt: daySchema,
                    evidence: z.number().int().min(1).max(1e8),
                  })
                  .strict()
              )
              .max(6),
            completedAt: daySchema.nullable(),
          })
          .strict()
      )
      .max(20),
  })
  .strict()

export function parseExpeditions(value: unknown): ExpeditionsState | null {
  const result = z
    .object({
      version: z.literal(1),
      routes: z.array(routeSchema).max(EXPEDITION_LIMIT),
      pinnedId: idSchema.nullable(),
    })
    .strict()
    .safeParse(value)
  if (!result.success) return null
  const state = result.data
  if (new Set(state.routes.map(route => route.id)).size !== state.routes.length) return null
  if (state.pinnedId && !state.routes.some(route => route.id === state.pinnedId)) return null
  if (state.routes.filter(route => route.status === 'active').length > 1) return null
  for (const route of state.routes) {
    if (new Set(route.stages.map(stage => stage.id)).size !== route.stages.length) return null
    if (route.status === 'draft' && route.attempts.length) return null
    if (route.status !== 'draft' && !route.attempts.length) return null
    for (const [attemptIndex, attempt] of route.attempts.entries()) {
      if (
        EXPEDITION_METRICS.some(metric => attempt.stageBaseline[metric] < attempt.baseline[metric])
      )
        return null
      let previousDate = attempt.startedAt
      for (const [index, checkpoint] of attempt.checkpoints.entries()) {
        const stage = route.stages[index]
        if (
          !stage ||
          checkpoint.stageId !== stage.id ||
          checkpoint.evidence < stage.target ||
          checkpoint.claimedAt < previousDate
        )
          return null
        previousDate = checkpoint.claimedAt
      }
      const finished = attempt.checkpoints.length === route.stages.length
      if (finished !== Boolean(attempt.completedAt)) return null
      if (attempt.completedAt && attempt.completedAt !== previousDate) return null
      if (attemptIndex < route.attempts.length - 1 && !finished) return null
      if (
        attemptIndex === route.attempts.length - 1 &&
        (route.status === 'completed' || route.status === 'archived') !== finished
      )
        return null
    }
  }
  return state
}

/** Lifetime counters and unique IDs survive the rolling activity/history windows. */
export function expeditionTotals(state: AdventureState): ExpeditionTotals {
  return {
    read: state.readIds.length,
    correct: state.stats.correct,
    review: state.stats.reviews,
    focus: state.stats.focusMinutes,
    topic: state.topics.length,
    creative: state.stats.created,
  }
}

export function currentAttempt(route: ExpeditionRoute) {
  return route.attempts.at(-1) ?? null
}

export function stageProgress(route: ExpeditionRoute, totals: ExpeditionTotals) {
  const attempt = currentAttempt(route)
  const stage = route.stages[attempt?.checkpoints.length ?? 0]
  if (!stage || !attempt || route.status !== 'active') return null
  const value = Math.max(0, totals[stage.metric] - attempt.stageBaseline[stage.metric])
  return { stage, value, reached: value >= stage.target }
}

export function routeAvailability(route: ExpeditionRoute, totals: ExpeditionTotals) {
  for (const metric of ['read', 'topic'] as const) {
    const needed = route.stages
      .filter(stage => stage.metric === metric)
      .reduce((sum, stage) => sum + stage.target, 0)
    const remaining = metricDetails[metric].limit - totals[metric]
    if (needed > remaining)
      return `Cần ${needed} ${metricDetails[metric].unit}; còn ${Math.max(0, remaining)} chưa khám phá. Hãy chọn lộ trình khác hoặc sửa mục tiêu riêng.`
  }
  return null
}

export function saveExpeditionRoute(
  state: ExpeditionsState,
  draft: ExpeditionRoute
): ExpeditionsState {
  const parsed = routeSchema.safeParse(draft)
  if (!parsed.success || draft.status !== 'draft' || draft.attempts.length) return state
  const existing = state.routes.find(route => route.id === draft.id)
  if (
    existing &&
    (existing.status !== 'draft' || existing.templateId !== null || draft.templateId !== null)
  )
    return state
  if (!existing && state.routes.length >= EXPEDITION_LIMIT) return state
  const next = {
    ...state,
    routes: existing
      ? state.routes.map(route => (route.id === draft.id ? parsed.data : route))
      : [...state.routes, parsed.data],
  }
  return parseExpeditions(next) ? next : state
}

export function startExpedition(
  state: ExpeditionsState,
  id: string,
  totals: ExpeditionTotals,
  today: string
): ExpeditionsState {
  const route = state.routes.find(item => item.id === id)
  if (
    !route ||
    !validDay(today) ||
    !totalsSchema.safeParse(totals).success ||
    state.routes.some(item => item.status === 'active') ||
    !['draft', 'completed', 'archived'].includes(route.status) ||
    route.attempts.length >= 20 ||
    routeAvailability(route, totals)
  )
    return state
  const attempt: ExpeditionAttempt = {
    startedAt: today,
    baseline: { ...totals },
    stageBaseline: { ...totals },
    checkpoints: [],
    completedAt: null,
  }
  return {
    ...state,
    routes: state.routes.map(item =>
      item.id === id ? { ...item, status: 'active', attempts: [...item.attempts, attempt] } : item
    ),
  }
}

export function claimExpeditionCheckpoint(
  state: ExpeditionsState,
  id: string,
  totals: ExpeditionTotals,
  today: string
): ExpeditionsState {
  const route = state.routes.find(item => item.id === id)
  if (!route || !validDay(today) || !totalsSchema.safeParse(totals).success) return state
  const attempt = currentAttempt(route)
  const progress = stageProgress(route, totals)
  if (
    !attempt ||
    !progress?.reached ||
    today < (attempt.checkpoints.at(-1)?.claimedAt ?? attempt.startedAt)
  )
    return state
  const checkpoints = [
    ...attempt.checkpoints,
    { stageId: progress.stage.id, claimedAt: today, evidence: progress.value },
  ]
  const completed = checkpoints.length === route.stages.length
  const nextAttempt: ExpeditionAttempt = {
    ...attempt,
    stageBaseline: Object.fromEntries(
      EXPEDITION_METRICS.map(metric => [
        metric,
        Math.max(attempt.stageBaseline[metric], totals[metric]),
      ])
    ) as ExpeditionTotals,
    checkpoints,
    completedAt: completed ? today : null,
  }
  return {
    ...state,
    routes: state.routes.map(item =>
      item.id === id
        ? {
            ...item,
            status: completed ? 'completed' : 'active',
            attempts: [...item.attempts.slice(0, -1), nextAttempt],
          }
        : item
    ),
  }
}

export function pinExpedition(state: ExpeditionsState, id: string | null): ExpeditionsState {
  return state.pinnedId === id || (id !== null && !state.routes.some(route => route.id === id))
    ? state
    : { ...state, pinnedId: id }
}

export function setExpeditionDeadline(
  state: ExpeditionsState,
  id: string,
  deadline: string | null
): ExpeditionsState {
  if (deadline !== null && !validDay(deadline)) return state
  if (
    !state.routes.some(
      route => route.id === id && route.status === 'draft' && route.deadline !== deadline
    )
  )
    return state
  return {
    ...state,
    routes: state.routes.map(route => (route.id === id ? { ...route, deadline } : route)),
  }
}

export function archiveExpedition(state: ExpeditionsState, id: string): ExpeditionsState {
  if (!state.routes.some(route => route.id === id && route.status === 'completed')) return state
  return {
    ...state,
    routes: state.routes.map(route => (route.id === id ? { ...route, status: 'archived' } : route)),
  }
}

export function deleteExpedition(state: ExpeditionsState, id: string): ExpeditionsState {
  if (
    !state.routes.some(
      route => route.id === id && route.templateId === null && route.status === 'draft'
    )
  )
    return state
  return {
    ...state,
    routes: state.routes.filter(route => route.id !== id),
    pinnedId: state.pinnedId === id ? null : state.pinnedId,
  }
}

export function expeditionDeadline(deadline: string | null, today: string) {
  if (!deadline || !validDay(deadline) || !validDay(today)) return null
  const days = Math.round(
    (Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000
  )
  return {
    days,
    text:
      days > 0
        ? `Còn ${days} ngày đến hẹn`
        : days === 0
          ? 'Hẹn hoàn thành hôm nay'
          : `Đã qua hẹn ${Math.abs(days)} ngày · vẫn có thể tiếp tục`,
  }
}

export function expeditionRecommendation(metric: ExpeditionMetric, state: AdventureState) {
  const unread = verses.find(verse => !state.readIds.includes(verse.id))?.id ?? 1
  const recommendations: Record<ExpeditionMetric, { href: string; label: string }> = {
    read: { href: `/full?line=${unread}`, label: 'Mở trang thơ chưa đọc' },
    correct: { href: '/play/arcade', label: 'Chơi một lượt để luyện nhớ' },
    review: { href: '/play/mastery', label: 'Đến góc ôn theo nhịp nhớ' },
    focus: { href: `/full?line=${unread}`, label: 'Mở thơ và bắt đầu tập trung' },
    topic: { href: '/lay-kieu', label: 'Chọn một chủ đề chưa khám phá' },
    creative: { href: '/lay-kieu', label: 'Ghép một lời Lẩy Kiều' },
  }
  return recommendations[metric]
}
