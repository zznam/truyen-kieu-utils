import assert from 'node:assert/strict'
import test from 'node:test'
import { parseLibrary } from '../components/library-provider'
import { getPassage, verses } from '../lib/kieu'

test('saved data repairs duplicate couplet references while preserving standalone lines and preferences', () => {
  const saved = [2, 1, 129, 3257, 3256, 0, 9999, '2', null]
  const parsed = parseLibrary({ saved, progress: 3257, fontSize: 30 })

  assert.deepEqual(parsed, { saved: [1, 129, 3256], progress: 3257, fontSize: 30 })
  assert.deepEqual(saved, [2, 1, 129, 3257, 3256, 0, 9999, '2', null])
  assert.deepEqual(parseLibrary(parsed), parsed)
})

test('every valid line resolves to a unique, removable saved passage after validation', () => {
  const parsed = parseLibrary({ saved: verses.map(verse => verse.id) })
  const passageStarts = parsed.saved.map(id => getPassage(id)[0].id)

  assert.equal(new Set(passageStarts).size, parsed.saved.length)
  assert.deepEqual(passageStarts, parsed.saved)
  for (const verse of verses) {
    assert.ok(parsed.saved.includes(getPassage(verse.id)[0].id))
  }
})
