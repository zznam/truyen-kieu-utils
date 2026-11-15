import assert from 'node:assert/strict'
import test from 'node:test'
import { rhymeKey } from '../app/services/lay_kieu'
import { verses, words } from '../lib/kieu'
import {
  createWorkshopState,
  decodeWorkshopShare,
  deleteWorkshopDraft,
  encodeWorkshopShare,
  generateWorkshopStanzas,
  mergeWorkshopState,
  moveWorkshopStanza,
  parseWorkshopState,
  replaceWorkshopStanza,
  saveWorkshopDraft,
  workshopAnchors,
  workshopMatches,
  workshopPair,
  workshopRhyme,
  workshopText,
  type WorkshopDraft,
  type WorkshopState,
} from '../lib/poetry-workshop'

function openingDraft(id = 'draft-a'): WorkshopDraft {
  return {
    id,
    title: 'Mở đầu',
    note: 'Cảm nhận riêng',
    revision: 0,
    stanzas: [workshopPair(1, 2, 'pair-a')!],
  }
}

test('anchor and rhyme suggestions use original syllable counts and accent-insensitive lookup', () => {
  assert.equal(workshopAnchors({ query: '  tram nam ' })[0].id, 1)
  assert.deepEqual(
    workshopAnchors({ query: '1' }).map(line => line.id),
    [1]
  )
  assert.deepEqual(workshopAnchors({ query: '2' }), [])
  assert.deepEqual(
    workshopAnchors({ query: '129' }),
    [],
    'combined source line is not a six-word line'
  )
  const matches = workshopMatches(1, { query: '2' })
  assert.equal(matches.length, 1)
  assert.equal(matches[0].id, 2)
  assert.equal(matches[0].text, verses[1].text)
  assert.deepEqual(workshopMatches(2), [])
  assert.deepEqual(workshopMatches(9999), [])
  for (const line of workshopAnchors()) assert.equal(words(line.text).length, 6)
  for (const line of workshopMatches(1)) assert.equal(words(line.text).length, 8)
})

test('rhyme inspection compares sixth positions and preserves Vietnamese vowel quality', () => {
  assert.deepEqual(workshopRhyme({ sixId: 1, eightId: 2 }), {
    sixWord: 'ta',
    eightWord: 'là',
    key: 'a',
  })
  assert.equal(rhymeKey('lòng'.normalize('NFD')), rhymeKey('trong'))
  assert.notEqual(rhymeKey('tâm'), rhymeKey('tam'))
  assert.notEqual(rhymeKey('cân'), rhymeKey('can'))
  assert.equal(workshopPair(2, 1, 'reverse'), null)
  assert.equal(workshopPair(129, 2, 'combined'), null)
  assert.equal(workshopPair(1, 2, ''), null)
  const mismatch = verses.find(
    line => words(line.text).length === 8 && rhymeKey(words(line.text)[5]) !== 'a'
  )!
  assert.equal(workshopPair(1, mismatch.id, 'mismatch'), null)
})

test('bookmarked source pools expand either couplet line and never fall back to other sources', () => {
  assert.deepEqual(
    workshopAnchors({ savedOnly: true, savedIds: [2] }).map(line => line.id),
    [1]
  )
  assert.deepEqual(
    workshopMatches(1, { savedOnly: true, savedIds: [1] }).map(line => line.id),
    [2]
  )
  assert.deepEqual(workshopAnchors({ savedOnly: true, savedIds: [] }), [])
  assert.deepEqual(workshopAnchors({ savedOnly: true, savedIds: [129] }), [])
  assert.deepEqual(workshopAnchors({ topic: 'unknown' }), [])
  const nature = workshopAnchors({ topic: 'nature' })
  assert.ok(nature.length > 0)
  assert.ok(
    nature.every(line =>
      words(line.text.toLocaleLowerCase('vi')).some(word =>
        ['hoa', 'trăng', 'mây', 'gió', 'xuân'].includes(word)
      )
    )
  )
})

test('seeded composition is reproducible, source-faithful and excludes source reuse by default', () => {
  const first = generateWorkshopStanzas(16, 'mùa thu', {})!
  assert.deepEqual(first, generateWorkshopStanzas(16, 'mùa thu'.normalize('NFD'), {}))
  assert.notDeepEqual(
    first.map(pair => [pair.sixId, pair.eightId]),
    generateWorkshopStanzas(16, 'mùa xuân', {})!.map(pair => [pair.sixId, pair.eightId])
  )
  assert.equal(new Set(first.map(pair => pair.id)).size, 16)
  assert.equal(new Set(first.flatMap(pair => [pair.sixId, pair.eightId])).size, 32)
  for (const pair of first) assert.ok(workshopRhyme(pair))
  for (const count of [0, -1, 17, 1.5, NaN, Infinity])
    assert.equal(generateWorkshopStanzas(count, 'seed', {}), null)
  assert.equal(generateWorkshopStanzas(1, ' ', {}), null)
  assert.equal(generateWorkshopStanzas(1, 'x'.repeat(121), {}), null)
})

test('insufficient filtered pools fail atomically; explicit reuse enables repeated source lines', () => {
  const options = { savedOnly: true, savedIds: [1] }
  assert.equal(generateWorkshopStanzas(2, 'seed', options), null)
  const repeated = generateWorkshopStanzas(2, 'seed', { ...options, excludeUsed: false })!
  assert.deepEqual(
    repeated.map(pair => [pair.sixId, pair.eightId]),
    [
      [1, 2],
      [1, 2],
    ]
  )
  assert.notEqual(repeated[0].id, repeated[1].id)
  assert.equal(generateWorkshopStanzas(1, 'seed', { savedOnly: true, savedIds: [] }), null)
})

test('regeneration preserves locked positions and rejects truncation and conflicting locked sources', () => {
  const current = generateWorkshopStanzas(4, 'original', {})!
  current[1].locked = true
  current[3].locked = true
  const snapshot = structuredClone(current)
  const result = generateWorkshopStanzas(4, 'replacement', {}, current)!
  assert.deepEqual(result[1], current[1])
  assert.deepEqual(result[3], current[3])
  assert.deepEqual(current, snapshot)
  assert.equal(generateWorkshopStanzas(2, 'replacement', {}, current), null)
  assert.equal(new Set(result.flatMap(pair => [pair.sixId, pair.eightId])).size, 8)
  const allLocked = current.map(pair => ({ ...pair, locked: true }))
  assert.deepEqual(
    generateWorkshopStanzas(4, 'new', { savedOnly: true, savedIds: [] }, allLocked),
    allLocked
  )
  const collision = [
    { ...workshopPair(1, 2, 'a')!, locked: true },
    { ...workshopPair(1, 2, 'b')!, locked: true },
  ]
  assert.equal(generateWorkshopStanzas(2, 'new', {}, collision), null)
  assert.deepEqual(generateWorkshopStanzas(2, 'new', { excludeUsed: false }, collision), collision)
})

test('single-stanza replacement changes only its target and refuses a lock or impossible alternative', () => {
  const current = generateWorkshopStanzas(4, 'original', {})!
  current[0].locked = true
  const result = replaceWorkshopStanza(current, 2, 'replacement', {})!
  assert.deepEqual(result[0], current[0])
  assert.deepEqual(result[1], current[1])
  assert.deepEqual(result[3], current[3])
  assert.equal(result[2].id, current[2].id)
  assert.notDeepEqual([result[2].sixId, result[2].eightId], [current[2].sixId, current[2].eightId])
  assert.equal(new Set(result.flatMap(pair => [pair.sixId, pair.eightId])).size, 8)
  assert.equal(replaceWorkshopStanza(current, 0, 'new', {}), null)
  assert.equal(replaceWorkshopStanza(current, 99, 'new', {}), null)
  assert.equal(
    replaceWorkshopStanza([workshopPair(1, 2, 'only')!], 0, 'new', {
      savedOnly: true,
      savedIds: [1],
    }),
    null
  )
})

test('reordering moves intact source pairs and respects list boundaries', () => {
  const current = generateWorkshopStanzas(3, 'original', {})!
  const moved = moveWorkshopStanza(current, current[2].id, -1)
  assert.deepEqual(moved, [current[0], current[2], current[1]])
  assert.equal(moveWorkshopStanza(current, current[0].id, -1), current)
  assert.equal(moveWorkshopStanza(current, 'missing', 1), current)
})

test('backup validation rejects malformed data, duplicate identities, source alterations and oversize fields', () => {
  const draft = openingDraft()
  const state = { version: 1, drafts: [draft] }
  assert.deepEqual(parseWorkshopState(JSON.parse(JSON.stringify(state))), state)
  for (const bad of [
    null,
    [],
    {},
    { version: 2, drafts: [] },
    { ...state, drafts: [draft, draft] },
    { ...state, drafts: [{ ...draft, title: ' ' }] },
    { ...state, drafts: [{ ...draft, title: 'x'.repeat(81) }] },
    { ...state, drafts: [{ ...draft, note: 'x'.repeat(2001) }] },
    { ...state, drafts: [{ ...draft, revision: -1 }] },
    { ...state, drafts: [{ ...draft, revision: 1.5 }] },
    { ...state, drafts: [{ ...draft, stanzas: [draft.stanzas[0], draft.stanzas[0]] }] },
    { ...state, drafts: [{ ...draft, stanzas: [{ ...draft.stanzas[0], sixId: '1' }] }] },
    { ...state, drafts: [{ ...draft, stanzas: [{ ...draft.stanzas[0], locked: 'true' }] }] },
  ])
    assert.equal(parseWorkshopState(bad), null)
  const enriched = {
    ...draft,
    stanzas: [{ ...draft.stanzas[0], text: 'Untrusted replacement' }],
    script: '<script>',
  }
  assert.deepEqual(parseWorkshopState({ version: 1, drafts: [enriched] }), state)
})

test('optimistic saves and deletes preserve newer drafts and cannot resurrect deleted work', () => {
  const empty = createWorkshopState()
  const draft = openingDraft()
  const saved = saveWorkshopDraft(empty, draft, null)!
  assert.equal(saved.drafts[0].revision, 0)
  assert.deepEqual(empty.drafts, [])
  assert.equal(saveWorkshopDraft(saved, draft, null), null)
  const updated = saveWorkshopDraft(saved, { ...draft, note: 'New note' }, 0)!
  assert.equal(updated.drafts[0].revision, 1)
  assert.equal(saveWorkshopDraft(updated, { ...draft, note: 'Stale note' }, 0), null)
  assert.equal(deleteWorkshopDraft(updated, draft.id, 0), updated)
  const deleted = deleteWorkshopDraft(updated, draft.id, 1)
  assert.deepEqual(deleted.drafts, [])
  assert.equal(saveWorkshopDraft(deleted, updated.drafts[0], 1), null)
  const exhausted = {
    version: 1 as const,
    drafts: [{ ...draft, revision: Number.MAX_SAFE_INTEGER }],
  }
  assert.equal(saveWorkshopDraft(exhausted, draft, Number.MAX_SAFE_INTEGER), null)
})

test('backup merges add only new IDs and reject overflow without partial import', () => {
  const local = saveWorkshopDraft(createWorkshopState(), openingDraft(), null)!
  const incoming = {
    version: 1 as const,
    drafts: [{ ...openingDraft(), note: 'Old backup' }, openingDraft('new')],
  }
  const merged = mergeWorkshopState(local, incoming)!
  assert.equal(merged.drafts[0].note, 'Cảm nhận riêng')
  assert.equal(merged.drafts.length, 2)
  assert.deepEqual(mergeWorkshopState(merged, incoming), merged)
  let full: WorkshopState = createWorkshopState()
  for (let index = 0; index < 20; index++)
    full = saveWorkshopDraft(full, openingDraft(`draft-${index}`), null)!
  assert.equal(saveWorkshopDraft(full, openingDraft('overflow'), null), null)
  assert.equal(mergeWorkshopState(full, incoming), null)
  assert.equal(full.drafts.length, 20)
})

test('shared compositions contain only validated pair IDs and never notes or titles', () => {
  const draft = openingDraft()
  const shared = encodeWorkshopShare(draft.stanzas)
  assert.equal(shared, '1-2')
  assert.deepEqual(decodeWorkshopShare(shared), [
    { id: 'share-0', sixId: 1, eightId: 2, locked: false },
  ])
  assert.equal(encodeWorkshopShare([]), '')
  assert.equal(shared.includes(draft.title), false)
  assert.equal(shared.includes(draft.note), false)
  for (const input of [
    '',
    '1-2,',
    '1-2<script>',
    '2-1',
    '129-2',
    '1-9999',
    'NaN-2',
    '1.5-2',
    '1-2,'.repeat(17).slice(0, -1),
    'x'.repeat(161),
  ])
    assert.equal(decodeWorkshopShare(input), null)
})

test('text and Markdown export retain original words, source numbers and rearrangement attribution', () => {
  const draft = {
    ...openingDraft(),
    title: '<script>*Title*',
    note: 'A [private](https://example.test) note',
  }
  const text = workshopText(draft, 'text')
  assert.match(text, /Trăm năm trong cõi người ta,/)
  assert.match(text, /Nguyễn Du, Truyện Kiều \(dòng 1 \+ 2, bản văn trong ứng dụng\)/)
  assert.match(text, /thứ tự không phải nguyên tác/)
  assert.match(text, /Ghi chú cá nhân:/)
  const markdown = workshopText(draft, 'markdown')
  assert.ok(markdown.startsWith('# \\<script\\>\\*Title\\*'))
  assert.ok(markdown.includes('\\[private\\]'))
  assert.ok(!markdown.includes('<script>'))
})
