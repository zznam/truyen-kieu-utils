import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  arenaModes,
  arenaSettingsKey,
  emptyArena,
  parseArena,
  recordArenaBest,
  type ArenaMode,
  type ArenaSettings,
} from '../lib/arena'
import { verses } from '../lib/kieu'

const settings: ArenaSettings = {
  modes: Object.keys(arenaModes) as ArenaMode[],
  length: 10,
  from: 1,
  to: verses.at(-1)!.id,
  savedOnly: true,
  savedIds: verses.map(verse => verse.id),
  seed: 'full-bookmark-library',
  secondChance: true,
}

test('arena records survive reload when every imported line is bookmarked', () => {
  const key = arenaSettingsKey(settings)
  assert.ok(key.length > 15_000, 'the complete library exceeds the old parser limit')
  const state = recordArenaBest(emptyArena(), key, 8, 10, '2026-10-30T05:00:00Z')
  assert.deepEqual(parseArena(JSON.parse(JSON.stringify(state))), state)
})

test('arena persistence still rejects keys beyond every possible source configuration', () => {
  const largestKey = arenaSettingsKey({ ...settings, from: settings.to })
  const state = recordArenaBest(emptyArena(), `${largestKey}x`, 8, 10, '2026-10-30T05:00:00Z')
  assert.equal(parseArena(state), null)
})
