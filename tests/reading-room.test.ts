import assert from 'node:assert/strict'
import test from 'node:test'
import { verses } from '../lib/kieu'
import {
  addReadingEntry,
  checkRecall,
  concordance,
  createReadingRoom,
  editReadingEntry,
  excerpt,
  excerptContext,
  memoryText,
  mergeReadingRoom,
  moveReadingEntry,
  parseReadingRoom,
  readingRoomText,
  readingEntryMatches,
  sharedVocabulary,
  type ReadingRoomState,
} from '../lib/reading-room'
import {
  canonicalSavedId,
  changeLibraryFontSize,
  changeLibraryProgress,
  emptyLibrary,
  parseLibrary,
} from '../lib/library'

const first = { start: 1, end: 8 }
const second = { start: 9, end: 16 }

test('excerpts retain imported source order, combined lines and final line', () => {
  assert.deepEqual(excerpt({ start: 128, end: 130 }), verses.slice(127, 130))
  assert.equal(excerpt({ start: 3257, end: 3257 })[0].text, verses.at(-1)!.text)
  assert.equal(excerpt({ start: 1, end: 40 }).length, 40)
  for (const range of [
    { start: 1, end: 41 },
    { start: 8, end: 1 },
    { start: 0, end: 1 },
    { start: 1.1, end: 8 },
    { start: NaN, end: 8 },
    { start: 3257, end: 3258 },
  ])
    assert.deepEqual(excerpt(range), [])
})

test('context clamps at source boundaries without duplicating the excerpt', () => {
  const beginning = excerptContext({ start: 1, end: 2 }, 2)
  assert.deepEqual(beginning.before, [])
  assert.deepEqual(
    beginning.after.map(line => line.id),
    [3, 4]
  )
  const ending = excerptContext({ start: 3256, end: 3257 }, 2)
  assert.deepEqual(
    ending.before.map(line => line.id),
    [3254, 3255]
  )
  assert.deepEqual(ending.after, [])
  assert.deepEqual(excerptContext(first, Infinity), { before: [], after: [] })
})

test('memory cues preserve punctuation and handle decomposed Vietnamese text', () => {
  const text = 'Trăm năm trong cõi người ta,'
  assert.equal(memoryText(text.normalize('NFD'), 'visible'), text)
  assert.equal(memoryText(text, 'endings'), 'Trăm năm trong cõi ____ ____,')
  assert.equal(memoryText(text, 'initials'), 'T… n… t… c… n… t…,')
  assert.equal(memoryText('Tài, tâm.', 'hidden'), '____, ____.')
})

test('recall ignores punctuation/case but preserves Vietnamese tones and vowel quality', () => {
  const source = 'Trăm năm trong cõi người ta,'
  assert.equal(checkRecall(source, 'TRĂM NĂM\ntrong cõi người ta!'.normalize('NFD')).exact, true)
  const unaccented = checkRecall(source, 'Tram nam trong coi nguoi ta')
  assert.equal(unaccented.correct, 2)
  assert.equal(unaccented.exact, false)
  assert.equal(checkRecall('tâm', 'tam').tokens[0].kind, 'changed')
  assert.equal(checkRecall('', '').exact, false)
})

test('recall aligns omissions and insertions without a cascade of false mistakes', () => {
  const missing = checkRecall('Trăm năm trong cõi người ta', 'Trăm trong cõi người ta')
  assert.equal(missing.correct, 5)
  assert.deepEqual(
    missing.tokens.filter(token => token.kind !== 'correct'),
    [{ kind: 'missing', expected: 'năm', actual: '' }]
  )
  const extra = checkRecall('Trăm năm trong cõi người ta', 'Trăm năm ấy trong cõi người ta')
  assert.equal(extra.correct, 6)
  assert.equal(extra.exact, false)
  assert.deepEqual(
    extra.tokens.filter(token => token.kind !== 'correct'),
    [{ kind: 'extra', expected: '', actual: 'ấy' }]
  )
})

test('concordance distinguishes whole accented words from loose phrase search', () => {
  assert.ok(concordance('hoa', 'word').length > 0)
  assert.ok(!concordance('hoa', 'word').some(line => line.id === 30))
  assert.ok(concordance('hoa', 'loose').some(line => line.id === 30))
  assert.equal(concordance('tram nam', 'loose')[0].id, 1)
  assert.deepEqual(concordance('trăm năm', 'word'), [])
  assert.deepEqual(concordance('   ', 'loose'), [])
  assert.deepEqual(
    sharedVocabulary([{ id: 1, text: 'Hoa, hoa họa' }], [{ id: 2, text: 'HOA hòa' }]),
    ['hoa']
  )
})

test('notebook validates every entry and rejects partial or ambiguous imports', () => {
  const state = addReadingEntry(createReadingRoom(), first, 'Mở đầu')
  assert.deepEqual(parseReadingRoom(JSON.parse(JSON.stringify(state))), state)
  for (const value of [
    null,
    [],
    {},
    { version: 2, entries: [] },
    { ...state, entries: [...state.entries, ...state.entries] },
    { ...state, entries: [{ ...state.entries[0], cursor: 9 }] },
    { ...state, entries: [{ ...state.entries[0], status: 'fake' }] },
    { ...state, entries: [{ ...state.entries[0], note: 'x'.repeat(2001) }] },
    { ...state, entries: [{ ...state.entries[0], start: '1' }] },
  ])
    assert.equal(parseReadingRoom(value), null)
  assert.deepEqual(
    parseReadingRoom({
      ...state,
      secret: 'ignored',
      entries: [{ ...state.entries[0], extra: 'ignored' }],
    }),
    state
  )
})

test('notebook transitions are bounded, immutable and keep source text out of storage', () => {
  const empty = createReadingRoom()
  const state = addReadingEntry(empty, first, '  Mở đầu  ')
  assert.deepEqual(empty.entries, [])
  assert.equal(state.entries[0].title, 'Mở đầu')
  assert.equal(addReadingEntry(state, first, 'Duplicate'), state)
  assert.equal(addReadingEntry(state, second, '   '), state)
  assert.equal(editReadingEntry(state, first, { cursor: 9 }), state)
  const changed = editReadingEntry(state, first, { cursor: 8, note: 'Cảm nhận', status: 'done' })
  assert.equal(changed.entries[0].cursor, 8)
  assert.equal(state.entries[0].cursor, 1)
  assert.equal('text' in changed.entries[0], false)
})

test('queue reordering preserves notes, positions and boundaries', () => {
  let state = addReadingEntry(createReadingRoom(), first, 'A')
  state = addReadingEntry(state, second, 'B')
  assert.equal(moveReadingEntry(state, first, -1), state)
  assert.equal(moveReadingEntry(state, second, 1), state)
  assert.deepEqual(
    moveReadingEntry(state, second, -1).entries.map(entry => entry.title),
    ['B', 'A']
  )
  assert.deepEqual(
    state.entries.map(entry => entry.title),
    ['A', 'B']
  )
})

test('notebook search finds interior source lines and accent-insensitive notes', () => {
  const entry = editReadingEntry(addReadingEntry(createReadingRoom(), first, 'Mở đầu'), first, {
    note: 'Một cảm nhận về chữ tài',
  }).entries[0]
  assert.equal(readingEntryMatches(entry, ' 5 '), true)
  assert.equal(readingEntryMatches(entry, '8'), true)
  assert.equal(readingEntryMatches(entry, '9'), false)
  assert.equal(readingEntryMatches(entry, 'cam nhan'), true)
  assert.equal(readingEntryMatches(entry, 'mo dau'), true)
})

test('backup merge retains local notes and cursor on conflict and is idempotent', () => {
  const local = editReadingEntry(addReadingEntry(createReadingRoom(), first, 'Local'), first, {
    note: 'Keep this',
    cursor: 4,
    status: 'reading',
  })
  const incoming = addReadingEntry(
    addReadingEntry(createReadingRoom(), first, 'Old copy'),
    second,
    'New'
  )
  const merged = mergeReadingRoom(local, incoming)!
  assert.deepEqual(merged.entries[0], local.entries[0])
  assert.equal(merged.entries[1].title, 'New')
  assert.deepEqual(mergeReadingRoom(merged, incoming), merged)
})

test('a full notebook rejects additions and overflow imports without partial writes', () => {
  let state: ReadingRoomState = createReadingRoom()
  for (let id = 1; id <= 60; id++)
    state = addReadingEntry(state, { start: id, end: id }, `Dòng ${id}`)
  assert.equal(state.entries.length, 60)
  assert.equal(addReadingEntry(state, { start: 61, end: 61 }, 'Extra'), state)
  assert.equal(
    mergeReadingRoom(state, addReadingEntry(createReadingRoom(), { start: 61, end: 61 }, 'Extra')),
    null
  )
  assert.equal(state.entries.length, 60)
})

test('human-readable exports contain original passages, private notes and edition attribution', () => {
  const state = editReadingEntry(addReadingEntry(createReadingRoom(), first, 'Mở đầu'), first, {
    note: 'Một cảm nhận riêng',
  })
  const text = readingRoomText(state)
  assert.match(text, /Nguyễn Du, Truyện Kiều/)
  assert.match(text, /bản văn trong ứng dụng/)
  assert.match(text, /Trăm năm trong cõi người ta,/)
  assert.match(text, /Cảm nhận cá nhân: Một cảm nhận riêng/)
})

test('library write boundaries validate progress and fonts and canonicalize either couplet line', () => {
  const state = emptyLibrary()
  for (const id of [0, -1, NaN, Infinity, 3258, 1.5])
    assert.equal(changeLibraryProgress(state, id), state)
  for (const size of [-1, 21, 500, NaN]) assert.equal(changeLibraryFontSize(state, size), state)
  assert.equal(changeLibraryProgress(state, 3257).progress, 3257)
  assert.equal(changeLibraryFontSize(state, 30).fontSize, 30)
  assert.equal(canonicalSavedId(2), 1)
  assert.equal(canonicalSavedId(3257), 3256)
  assert.equal(canonicalSavedId(129), 129)
  assert.equal(canonicalSavedId(9999), null)
  const invalid = parseLibrary(null)
  invalid.saved.push(1)
  assert.deepEqual(parseLibrary(null).saved, [])
})
