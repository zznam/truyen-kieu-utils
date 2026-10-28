import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  arenaCalibration,
  arenaExport,
  arenaModes,
  arenaSettingsKey,
  createArenaRun,
  emptyArena,
  parseArena,
  recordArenaBest,
  type ArenaAnswer,
  type ArenaMode,
  type ArenaSettings,
} from '../lib/arena'
import {
  claimExpeditionCheckpoint,
  emptyExpeditions,
  parseExpeditions,
  saveExpeditionRoute,
  stageProgress,
  startExpedition,
  type ExpeditionRoute,
  type ExpeditionTotals,
} from '../lib/expeditions'
import { getPassage, verses } from '../lib/kieu'
import {
  createStudioState,
  parseStudioState,
  studioAddCards,
  studioCreateDeck,
  studioQueue,
  studioRateCard,
  studioRemaining,
  studioSchedule,
  type StudioCard,
} from '../lib/studio'

const now = new Date(2026, 9, 29, 12).getTime()
const dayInMilliseconds = 86_400_000
const card: StudioCard = {
  verseId: 1,
  note: '',
  tags: [],
  favorite: false,
  dueAt: 0,
  intervalDays: 0,
  reviews: 0,
}

const settings: ArenaSettings = {
  modes: Object.keys(arenaModes) as ArenaMode[],
  length: 10,
  from: 1,
  to: verses.at(-1)!.id,
  savedOnly: false,
  savedIds: [],
  seed: 'readability-regression',
  secondChance: true,
}

test('flashcard ratings retain their retry delay, minimum intervals and one-year cap', () => {
  assert.deepEqual(studioSchedule(card, 'again', now), {
    intervalDays: 0,
    dueAt: now + 10 * 60 * 1000,
  })
  for (const [rating, minimum] of [
    ['hard', 1],
    ['good', 3],
    ['easy', 7],
  ] as const) {
    assert.deepEqual(studioSchedule(card, rating, now), {
      intervalDays: minimum,
      dueAt: now + minimum * dayInMilliseconds,
    })
    assert.deepEqual(studioSchedule({ ...card, intervalDays: 365 }, rating, now), {
      intervalDays: 365,
      dueAt: now + 365 * dayInMilliseconds,
    })
  }
  assert.equal(studioSchedule({ ...card, intervalDays: 4 }, 'hard', now).intervalDays, 5)
  assert.equal(studioSchedule({ ...card, intervalDays: 4 }, 'good', now).intervalDays, 8)
  assert.equal(studioSchedule({ ...card, intervalDays: 4 }, 'easy', now).intervalDays, 12)
})

test('a studio deck deduplicates couplets and enforces its cap until the next local day', () => {
  const initial = studioCreateDeck(createStudioState(), 'reading', 'Daily reading')
  let state = studioAddCards(initial, 'reading', [1, 2, 3, 4, 5, 6])
  assert.equal(state.decks[0].cards.length, 3)
  assert.equal(studioRemaining(state, now), 10)
  assert.deepEqual(parseStudioState(JSON.parse(JSON.stringify(state))), state)
  assert.equal(initial.decks[0].cards.length, 0, 'adding cards must not mutate the input')

  for (let index = 0; index < 10; index++) {
    state = studioRateCard(state, 'reading', 1, 'again', now)
  }
  assert.equal(studioRemaining(state, now), 0)
  assert.strictEqual(studioRateCard(state, 'reading', 1, 'easy', now), state)
  assert.deepEqual(studioQueue(state, 'reading', now), [])
  const tomorrow = new Date(2026, 9, 30, 12).getTime()
  assert.equal(studioRemaining(state, tomorrow), 10)
  assert.equal(studioQueue(state, 'reading', tomorrow, { dueOnly: true }).length, 3)
})

test('expeditions count new evidence after each checkpoint and accept only one active route', () => {
  const route: ExpeditionRoute = {
    id: 'close-reading',
    templateId: null,
    name: 'Read in two stages',
    stages: [
      { id: 'first', metric: 'read', target: 2 },
      { id: 'second', metric: 'read', target: 2 },
    ],
    deadline: null,
    status: 'draft',
    attempts: [],
  }
  const baseline: ExpeditionTotals = {
    read: 10,
    correct: 0,
    review: 0,
    focus: 0,
    topic: 0,
    creative: 0,
  }
  let state = saveExpeditionRoute(emptyExpeditions(), route)
  state = saveExpeditionRoute(state, { ...route, id: 'other-route' })
  state = startExpedition(state, route.id, baseline, '2026-10-29')
  assert.strictEqual(startExpedition(state, 'other-route', baseline, '2026-10-29'), state)
  assert.equal(stageProgress(state.routes[0], baseline)?.value, 0)
  assert.strictEqual(claimExpeditionCheckpoint(state, route.id, baseline, '2026-10-29'), state)

  const firstStage = { ...baseline, read: 14 }
  state = claimExpeditionCheckpoint(state, route.id, firstStage, '2026-10-29')
  assert.equal(state.routes[0].attempts[0].checkpoints.length, 1)
  assert.equal(
    stageProgress(state.routes[0], firstStage)?.value,
    0,
    'surplus reading cannot be reused'
  )
  assert.strictEqual(claimExpeditionCheckpoint(state, route.id, firstStage, '2026-10-29'), state)
  state = claimExpeditionCheckpoint(state, route.id, { ...baseline, read: 16 }, '2026-10-30')
  assert.equal(state.routes[0].status, 'completed')
  assert.deepEqual(parseExpeditions(JSON.parse(JSON.stringify(state))), state)
  assert.strictEqual(
    claimExpeditionCheckpoint(state, route.id, { ...baseline, read: 16 }, '2026-10-30'),
    state
  )
})

test('arena playlists are reproducible, cover selected mechanics and retain original sources', () => {
  const run = createArenaRun(settings)
  assert.deepEqual(run, createArenaRun(settings))
  assert.deepEqual(run, createArenaRun({ ...settings, modes: [...settings.modes].reverse() }))
  assert.equal(run.questions.length, settings.length)
  assert.deepEqual(run.unavailable, [])
  assert.equal(
    new Set(run.questions.slice(0, settings.modes.length).map(item => item.mode)).size,
    settings.modes.length
  )
  for (const question of run.questions) {
    assert.equal(question.choices.filter(choice => choice.id === question.answer).length, 1)
    assert.equal(new Set(question.choices.map(choice => choice.text)).size, question.choices.length)
    for (const verse of question.passage) {
      assert.deepEqual(
        verses.find(item => item.id === verse.id),
        verse
      )
    }
  }
  const saved = createArenaRun({ ...settings, modes: ['accents'], savedOnly: true, savedIds: [2] })
  assert.equal(saved.questions.length, 1)
  assert.deepEqual(saved.questions[0].passage, getPassage(2))
})

test('arena exports and confidence calibration distinguish second attempts from scored answers', () => {
  const { questions } = createArenaRun({ ...settings, length: 3 })
  const answers: ArenaAnswer[] = questions.map((question, index) => ({
    questionId: question.id,
    choice: question.answer,
    correct: true,
    firstCorrect: index === 0,
    attempts: index === 0 ? 1 : 2,
    confidence: 75,
  }))
  assert.deepEqual(arenaCalibration(answers), [
    { confidence: 50, total: 0, correct: 0, accuracy: null },
    { confidence: 75, total: 3, correct: 1, accuracy: 33 },
    { confidence: 100, total: 0, correct: 0, accuracy: null },
  ])
  const exported = arenaExport(settings, questions, answers)
  assert.ok(
    exported.startsWith(
      `SỔ LUYỆN KIỀU · ĐẤU TRƯỜNG CHỮ\nHạt giống: ${settings.seed}\nĐúng lần đầu: 1/3\n\n`
    )
  )
  assert.ok(exported.includes('Tự tin: 75% · 2 lần thử · Chưa đúng lần đầu'))
  for (const question of questions) {
    assert.ok(exported.includes(question.prompt))
    for (const verse of question.passage) assert.ok(exported.includes(verse.text))
  }
  assert.equal(exported.match(/Nguyễn Du, Truyện Kiều/g)?.length, 3)
})

test('arena records preserve higher scores and reject impossible persisted results', () => {
  const key = arenaSettingsKey(settings)
  const state = recordArenaBest(emptyArena(), key, 4, 5, '2026-10-29T05:00:00Z')
  assert.strictEqual(recordArenaBest(state, key, 3, 5, '2026-10-29T06:00:00Z'), state)
  assert.deepEqual(parseArena(JSON.parse(JSON.stringify(state))), state)
  assert.equal(
    parseArena({ version: 1, best: { [key]: { correct: 6, total: 5, at: '2026-10-29' } } }),
    null
  )
  assert.equal(parseArena({ version: 1, best: [] }), null)
})
