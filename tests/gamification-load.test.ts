import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyAdventureEvent,
  claimAdventureQuest,
  emptyAdventure,
  exportAdventure,
  importAdventure,
  parseAdventure,
  quests,
  shiftDay,
} from '../lib/gamification'

test('400 days of play retain bounded history, valid backups and claim-once rewards', () => {
  let state = emptyAdventure()
  for (let day = 0; day < 400; day++) {
    const date = shiftDay('2025-09-19', day)
    for (let run = 0; run < 20; run++) {
      state = applyAdventureEvent(
        state,
        {
          type: 'session',
          id: `day-${day}-run-${run}`,
          mode: 'arcade-recall',
          correct: run % 6,
          total: 5,
          hints: 0,
          verseIds: [],
        },
        date
      )
    }
    const capped = state
    assert.equal(
      applyAdventureEvent(
        state,
        {
          type: 'session',
          id: `day-${day}-overflow`,
          mode: 'arcade-recall',
          correct: 5,
          total: 5,
          hints: 0,
          verseIds: [],
        },
        date
      ),
      capped
    )
    for (const quest of quests(state, date).filter(
      item => item.value === item.target && !item.claimed
    )) {
      state = claimAdventureQuest(state, quest.id, date)
      const claimed = state
      for (let duplicate = 0; duplicate < 10; duplicate++)
        assert.equal(claimAdventureQuest(state, quest.id, date), claimed)
    }
    assert.ok(parseAdventure(state), `state remains readable on day ${day}`)
  }
  assert.equal(state.stats.sessions, 8000)
  assert.equal(state.history.length, 200)
  assert.equal(state.activity.length, 366)
  assert.equal(state.eventIds.length, 5000)
  assert.deepEqual(importAdventure(exportAdventure(state)), state)
})
