import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  claimExpeditionCheckpoint,
  emptyExpeditions,
  expeditionStopSnapshot,
  parseExpeditions,
  pinExpedition,
  saveExpeditionRoute,
  stageProgress,
  startExpedition,
  stopExpedition,
  type ExpeditionRoute,
  type ExpeditionTotals,
} from '../lib/expeditions'
import { verses } from '../lib/kieu'

const route: ExpeditionRoute = {
  id: 'read-two-stages',
  templateId: null,
  name: 'Hai chặng đọc',
  stages: [
    { id: 'first', metric: 'read', target: 2 },
    { id: 'second', metric: 'read', target: 2 },
  ],
  deadline: null,
  status: 'draft',
  attempts: [],
}
const baseline: ExpeditionTotals = {
  read: verses.length - 4,
  correct: 0,
  review: 0,
  focus: 0,
  topic: 0,
  creative: 0,
}
const today = '2026-10-30'
const firstAttemptId = '11111111-1111-4111-8111-111111111111'
const secondAttemptId = '22222222-2222-4222-8222-222222222222'

test('an exhausted unique-reading goal can release the active expedition slot', () => {
  let state = saveExpeditionRoute(emptyExpeditions(), route)
  state = saveExpeditionRoute(state, {
    ...route,
    id: 'new-goal',
    stages: [{ id: 'practice', metric: 'correct', target: 3 }],
  })
  state = pinExpedition(state, route.id)
  state = startExpedition(state, route.id, baseline, today, firstAttemptId)
  const allRead = { ...baseline, read: verses.length }
  state = claimExpeditionCheckpoint(state, route.id, allRead, today)
  assert.equal(stageProgress(state.routes[0], allRead)?.value, 0)
  assert.strictEqual(startExpedition(state, 'new-goal', allRead, today, secondAttemptId), state)

  const stopped = stopExpedition(state, route.id, expeditionStopSnapshot(state.routes[0])!)
  assert.equal(stopped.routes[0].status, 'draft')
  assert.deepEqual(stopped.routes[0].attempts, [])
  assert.deepEqual(stopped.routes[0].stages, route.stages)
  assert.equal(stopped.pinnedId, route.id)
  assert.equal(state.routes[0].status, 'active', 'the input must not be mutated')
  assert.deepEqual(parseExpeditions(JSON.parse(JSON.stringify(stopped))), stopped)
  assert.equal(
    startExpedition(stopped, 'new-goal', allRead, today, secondAttemptId).routes[1].status,
    'active'
  )
})

test('stopping a repeated expedition preserves all completed history and is idempotent', () => {
  const initial = { ...baseline, read: 0 }
  let state = saveExpeditionRoute(emptyExpeditions(), route)
  state = startExpedition(state, route.id, initial, today, firstAttemptId)
  state = claimExpeditionCheckpoint(state, route.id, { ...initial, read: 2 }, today)
  state = claimExpeditionCheckpoint(state, route.id, { ...initial, read: 4 }, today)
  const completed = state.routes[0]
  state = startExpedition(state, route.id, { ...initial, read: 4 }, today, secondAttemptId)
  state = claimExpeditionCheckpoint(state, route.id, { ...initial, read: 6 }, today)

  const snapshot = expeditionStopSnapshot(state.routes[0])!
  const stopped = stopExpedition(state, route.id, snapshot)
  assert.deepEqual(stopped.routes[0], completed)
  assert.deepEqual(parseExpeditions(JSON.parse(JSON.stringify(stopped))), stopped)
  assert.strictEqual(stopExpedition(stopped, route.id, snapshot), stopped)
  assert.strictEqual(stopExpedition(state, 'missing', snapshot), state)
})

test('a stop confirmation cannot discard a checkpoint added after it opened', () => {
  const initial = { ...baseline, read: 0 }
  let state = saveExpeditionRoute(emptyExpeditions(), route)
  state = startExpedition(state, route.id, initial, today, firstAttemptId)
  const snapshot = expeditionStopSnapshot(state.routes[0])!
  state = claimExpeditionCheckpoint(state, route.id, { ...initial, read: 2 }, today)

  assert.equal(snapshot.attempt.checkpoints.length, 0)
  assert.strictEqual(stopExpedition(state, route.id, snapshot), state)
  const stopped = stopExpedition(state, route.id, expeditionStopSnapshot(state.routes[0])!)
  assert.equal(stopped.routes[0].status, 'draft')
  assert.deepEqual(parseExpeditions(JSON.parse(JSON.stringify(stopped))), stopped)
})

test('an old stop confirmation cannot discard a newer attempt after another tab restarts', () => {
  const initial = { ...baseline, read: 0 }
  let state = saveExpeditionRoute(emptyExpeditions(), route)
  state = startExpedition(state, route.id, initial, today, firstAttemptId)
  const snapshot = expeditionStopSnapshot(state.routes[0])!
  state = claimExpeditionCheckpoint(state, route.id, { ...initial, read: 2 }, today)
  state = claimExpeditionCheckpoint(state, route.id, { ...initial, read: 4 }, today)
  const completed = state.routes[0]
  state = startExpedition(state, route.id, { ...initial, read: 4 }, today, secondAttemptId)
  state = claimExpeditionCheckpoint(state, route.id, { ...initial, read: 6 }, today)

  assert.strictEqual(stopExpedition(state, route.id, snapshot), state)
  const fresh = expeditionStopSnapshot(state.routes[0])!
  const stopped = stopExpedition(state, route.id, fresh)
  assert.deepEqual(stopped.routes[0], completed)
  assert.deepEqual(parseExpeditions(JSON.parse(JSON.stringify(stopped))), stopped)
})

test('stopping and restarting on the same day with unchanged totals creates a distinct attempt', () => {
  const initial = { ...baseline, read: 0 }
  let state = saveExpeditionRoute(emptyExpeditions(), route)
  state = startExpedition(state, route.id, initial, today, firstAttemptId)
  const stale = expeditionStopSnapshot(state.routes[0])!
  state = stopExpedition(state, route.id, stale)
  state = startExpedition(state, route.id, initial, today, secondAttemptId)

  assert.equal(state.routes[0].attempts.length, stale.attemptCount)
  assert.deepEqual(state.routes[0].attempts[0], { ...stale.attempt, id: secondAttemptId })
  assert.strictEqual(stopExpedition(state, route.id, stale), state)
  assert.equal(
    stopExpedition(state, route.id, expeditionStopSnapshot(state.routes[0])!).routes[0].status,
    'draft'
  )
})

test('legacy v1 attempts without IDs remain readable and can be replaced safely', () => {
  const initial = { ...baseline, read: 0 }
  let state = saveExpeditionRoute(emptyExpeditions(), route)
  state = startExpedition(state, route.id, initial, today, firstAttemptId)
  const legacy = JSON.parse(JSON.stringify(state))
  delete legacy.routes[0].attempts[0].id
  const restored = parseExpeditions(legacy)
  assert.ok(restored)
  assert.deepEqual(restored, legacy)
  const oldSnapshot = expeditionStopSnapshot(restored.routes[0])!
  state = stopExpedition(restored, route.id, oldSnapshot)
  state = startExpedition(state, route.id, initial, today, secondAttemptId)
  assert.strictEqual(stopExpedition(state, route.id, oldSnapshot), state)
  assert.deepEqual(parseExpeditions(JSON.parse(JSON.stringify(state))), state)
})

test('new attempt IDs must be valid and distinct from retained attempt history', () => {
  const initial = { ...baseline, read: 0 }
  let state = saveExpeditionRoute(emptyExpeditions(), route)
  assert.strictEqual(startExpedition(state, route.id, initial, today, 'not-a-uuid'), state)
  state = startExpedition(state, route.id, initial, today, firstAttemptId)
  state = claimExpeditionCheckpoint(state, route.id, { ...initial, read: 2 }, today)
  state = claimExpeditionCheckpoint(state, route.id, { ...initial, read: 4 }, today)
  assert.strictEqual(
    startExpedition(state, route.id, { ...initial, read: 4 }, today, firstAttemptId),
    state
  )
  state = startExpedition(state, route.id, { ...initial, read: 4 }, today, secondAttemptId)
  const invalid = JSON.parse(JSON.stringify(state))
  invalid.routes[0].attempts[1].id = 'not-a-uuid'
  assert.equal(parseExpeditions(invalid), null)
  invalid.routes[0].attempts[1].id = firstAttemptId
  assert.equal(parseExpeditions(invalid), null)
})
