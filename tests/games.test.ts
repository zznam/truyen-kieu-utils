import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createQuestions,
  isCorrect,
  answerPoints,
  localDateKey,
  gameModes,
  type PlayMode,
} from '../lib/games'
import {
  applyResult,
  badges,
  currentStreak,
  emptyProgress,
  parseGameProgress,
  type GameResult,
} from '../lib/game-progress'
import { verses, words } from '../lib/kieu'

test('all games have five answerable questions grounded in the imported edition', () => {
  for (const mode of [...Object.keys(gameModes), 'daily'] as PlayMode[]) {
    for (let seed = 0; seed < 20; seed++) {
      const questions = createQuestions(mode, String(seed))
      assert.equal(questions.length, 5)
      assert.equal(new Set(questions.map(q => q.passage[0].id)).size, 5)
      for (const question of questions) {
        assert.equal(question.options.length, 4)
        assert.equal(new Set(question.options).size, 4)
        assert.ok(isCorrect(question, question.answer))
        assert.ok(!isCorrect(question, []))
        assert.ok(question.answer.every(answer => question.options.includes(answer)))
        question.passage.forEach(verse =>
          assert.deepEqual(
            verse,
            verses.find(item => item.id === verse.id)
          )
        )
        if (question.mode === 'order') {
          assert.deepEqual(
            question.answer,
            question.passage.map(verse => verse.text)
          )
          assert.notDeepEqual(question.options, question.answer)
          question.passage
            .slice(1)
            .forEach((verse, i) => assert.equal(verse.id, question.passage[i].id + 1))
        } else if (question.mode === 'missing') {
          assert.equal(
            question.prompt.replace('_____', question.answer[0]),
            question.passage[0].text
          )
        } else {
          assert.equal(question.answer[0], question.passage[1].text)
          assert.equal(words(question.answer[0]).length, 8)
        }
      }
    }
  }
})
test('daily challenge is stable for a local day and mixes all modes', () => {
  const early = localDateKey(new Date(2026, 9, 23, 0, 1))
  const late = localDateKey(new Date(2026, 9, 23, 23, 59))
  assert.equal(early, '2026-10-23')
  assert.deepEqual(createQuestions('daily', early), createQuestions('daily', late))
  assert.notDeepEqual(createQuestions('daily', early), createQuestions('daily', '2026-10-24'))
  assert.equal(new Set(createQuestions('daily', early).map(q => q.mode)).size, 3)
})
const result: GameResult = { id: 'one', mode: 'missing', date: '2026-10-23', correct: 4, score: 35 }
test('hints reduce rewards, completion is idempotent, best scores never fall', () => {
  assert.equal(answerPoints(true, false), 10)
  assert.equal(answerPoints(true, true), 5)
  assert.equal(answerPoints(false, true), 0)
  const first = applyResult(emptyProgress(), result)
  assert.equal(first.xp, 35)
  assert.equal(first.sessions, 1)
  assert.equal(first.correct, 4)
  assert.deepEqual(applyResult(first, result), first)
  const next = applyResult(first, { ...result, id: 'two', score: 20 })
  assert.equal(next.best.missing, 35)
  assert.equal(next.xp, 55)
})
test('daily replay cannot farm rewards even with a different session ID', () => {
  const first = applyResult(emptyProgress(), { ...result, mode: 'daily' })
  assert.equal(first.xp, 45)
  assert.deepEqual(
    applyResult(first, { ...result, mode: 'daily', id: 'another', score: 40 }),
    first
  )
  const tomorrow = applyResult(first, {
    ...result,
    mode: 'daily',
    id: 'tomorrow',
    date: '2026-10-24',
  })
  assert.equal(tomorrow.xp, 90)
  assert.equal(tomorrow.sessions, 2)
})
test('streak handles grace day, gaps, leap day and year boundaries', () => {
  assert.equal(currentStreak([], '2026-10-23'), 0)
  assert.equal(currentStreak(['2026-10-21', '2026-10-22'], '2026-10-23'), 2)
  assert.equal(currentStreak(['2026-10-21'], '2026-10-23'), 0)
  assert.equal(currentStreak(['2024-02-28', '2024-02-29', '2024-03-01'], '2024-03-01'), 3)
  assert.equal(currentStreak(['2025-12-31', '2026-01-01'], '2026-01-01'), 2)
})
test('corrupt local data is sanitized and impossible results do not grant progress', () => {
  assert.deepEqual(parseGameProgress(null), emptyProgress())
  const progress = parseGameProgress({
    xp: -1,
    sessions: '4',
    correct: Infinity,
    best: { missing: 999, order: -1, invalid: 50 },
    dates: ['2026-02-30', '2026-10-23', '2026-10-23', null],
    dailyDates: {},
    recentIds: [null, 5, 'valid', 'valid'],
    perfect: 'true',
  })
  assert.equal(progress.xp, 0)
  assert.equal(progress.sessions, 0)
  assert.deepEqual(progress.dates, ['2026-10-23'])
  assert.deepEqual(progress.recentIds, ['valid'])
  assert.equal(progress.perfect, false)
  assert.deepEqual(progress.best, { missing: 50, order: 0 })
  for (const invalid of [
    { score: 51 },
    { score: -1 },
    { correct: 6 },
    { correct: 0 },
    { date: '2026-02-30' },
  ])
    assert.deepEqual(applyResult(emptyProgress(), { ...result, ...invalid }), emptyProgress())
})
test('badges unlock only for their stated milestones', () => {
  assert.ok(badges(emptyProgress()).every(badge => !badge.unlocked))
  let progress = emptyProgress()
  for (const mode of Object.keys(gameModes) as PlayMode[])
    progress = applyResult(progress, { ...result, id: mode, mode, correct: 5, score: 50 })
  for (let day = 23; day <= 25; day++)
    progress = applyResult(progress, {
      ...result,
      id: `daily-${day}`,
      mode: 'daily',
      date: `2026-10-${day}`,
    })
  assert.ok(badges(progress).every(badge => badge.unlocked))
})
