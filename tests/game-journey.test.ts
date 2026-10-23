import assert from 'node:assert/strict'
import test from 'node:test'
import { createQuestions, createReviewQuestion, type GameMode } from '../lib/games'
import {
  dailyMissions,
  parseReview,
  recentDays,
  updateReview,
  type Outcome,
} from '../lib/game-journey'
import {
  applyResult,
  claimMissionBonus,
  emptyProgress,
  parseGameProgress,
} from '../lib/game-progress'

const date = '2026-10-23'
const result = { id: 'first', date, mode: 'missing' as const, score: 50, correct: 5 }
const questions = createQuestions('missing', 'review-fixture')
const misses: Outcome[] = questions.map(question => ({
  mode: question.mode,
  verseId: question.passage[0].id,
  correct: false,
  hinted: false,
}))

test('review reconstructs answerable source questions for every game type', () => {
  for (const mode of ['missing', 'continuation', 'order'] as GameMode[]) {
    for (const original of createQuestions(mode, 'source-fixture')) {
      const review = createReviewQuestion({ mode, verseId: original.passage[0].id })!
      assert.deepEqual(review.passage, original.passage)
      assert.deepEqual(review.answer, original.answer)
      assert.equal(review.options.length, 4)
      assert.equal(new Set(review.options).size, 4)
    }
  }
  assert.equal(createReviewQuestion({ mode: 'missing', verseId: -1 }), null)
})
test('misses are deduplicated, hinted success stays, and unaided success clears only its question', () => {
  const progress = applyResult(emptyProgress(), {
    ...result,
    score: 0,
    correct: 0,
    outcomes: misses,
  })
  assert.equal(progress.review.length, 5)
  assert.equal(updateReview(progress.review, misses).length, 5)
  const outcomes = misses.map((item, i) => ({ ...item, correct: true, hinted: i === 0 }))
  const remaining = updateReview(progress.review, outcomes)
  assert.deepEqual(remaining, [{ mode: misses[0].mode, verseId: misses[0].verseId }])
  assert.deepEqual(updateReview(remaining, [{ ...misses[0], correct: true }]), [])
  assert.equal(progress.xp, 0)
})
test('mission bonus requires every target and can only be claimed once on its date', () => {
  assert.deepEqual(claimMissionBonus(emptyProgress(), date), emptyProgress())
  const first = applyResult(emptyProgress(), result)
  assert.equal(claimMissionBonus(first, date).xp, 50)
  const second = applyResult(first, { ...result, id: 'second', mode: 'continuation' })
  assert.ok(dailyMissions(second.activity[0]).every(item => item.value === item.target))
  const rewarded = claimMissionBonus(second, date)
  assert.equal(rewarded.xp, 120)
  assert.deepEqual(claimMissionBonus(rewarded, date), rewarded)
  assert.deepEqual(claimMissionBonus(rewarded, '2026-10-24'), rewarded)
  assert.equal(rewarded.sessions, 2)
  assert.equal(rewarded.best.continuation, 50)
  assert.equal(rewarded.history.length, 2)
  assert.deepEqual(claimMissionBonus(parseGameProgress(rewarded), date), rewarded)
})
test('same mode twice and daily replays cannot complete the two-mode mission', () => {
  let progress = applyResult(emptyProgress(), result)
  progress = applyResult(progress, { ...result, id: 'second' })
  assert.equal(dailyMissions(progress.activity[0])[2].value, 1)
  progress = applyResult(progress, { ...result, id: 'daily', mode: 'daily' })
  assert.equal(dailyMissions(progress.activity[0])[2].value, 1)
  assert.deepEqual(
    applyResult(progress, { ...result, id: 'replay', mode: 'daily', outcomes: misses }),
    progress
  )
})
test('old progress survives migration and new fields reject corrupt persisted data', () => {
  const old = {
    xp: 345,
    sessions: 7,
    correct: 29,
    best: { missing: 50 },
    dates: [date],
    perfect: true,
  }
  const migrated = parseGameProgress(old)
  assert.equal(migrated.xp, 345)
  assert.equal(migrated.sessions, 7)
  assert.equal(migrated.perfect, true)
  assert.deepEqual(migrated.review, [])
  assert.deepEqual(migrated.history, [])
  assert.deepEqual(migrated.activity, [])
  const corrupt = parseGameProgress({
    ...old,
    review: [null, {}, { mode: 'missing', verseId: -1 }, misses[0], misses[0]],
    activity: [
      null,
      { date: '2026-02-30' },
      {
        date,
        sessions: 1,
        correct: 999,
        modes: ['missing', 'missing', '__proto__'],
        claimed: 'yes',
      },
    ],
    history: [null, { ...result, mode: 'bogus' }, { ...result, score: 999 }, result],
  })
  assert.equal(corrupt.review.length, 1)
  assert.equal(corrupt.activity[0].correct, 5)
  assert.deepEqual(corrupt.activity[0].modes, ['missing'])
  assert.equal(corrupt.activity[0].claimed, false)
  assert.equal(corrupt.history.length, 1)
  assert.equal(corrupt.history[0].score, 50)
  assert.deepEqual(parseReview('broken'), [])
})
test('history and activity stay bounded and recent days cross leap days and years', () => {
  let progress = emptyProgress()
  for (let i = 0; i < 100; i++) {
    const day = new Date('2026-01-01T12:00:00Z')
    day.setUTCDate(day.getUTCDate() + i)
    progress = applyResult(progress, {
      ...result,
      id: String(i),
      date: day.toISOString().slice(0, 10),
    })
  }
  assert.equal(progress.history.length, 20)
  assert.equal(progress.history[0].id, '80')
  assert.equal(progress.activity.length, 90)
  assert.equal(progress.sessions, 100)
  assert.deepEqual(recentDays('2024-03-02'), [
    '2024-02-25',
    '2024-02-26',
    '2024-02-27',
    '2024-02-28',
    '2024-02-29',
    '2024-03-01',
    '2024-03-02',
  ])
  assert.equal(recentDays('2026-01-01')[0], '2025-12-26')
  assert.deepEqual(recentDays(''), [])
})
