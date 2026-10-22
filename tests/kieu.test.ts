import assert from 'node:assert/strict'
import test from 'node:test'
import {
  verses,
  getPassage,
  searchVerses,
  normalize,
  words,
  couplets,
  dailyPassage,
  topicPassages,
  topics,
  passageText,
} from '../lib/kieu'
import { generatePairs, rhymeKey, findRhymingVerses } from '../app/services/lay_kieu'
import { parseLibrary } from '../components/library-provider'

test('search handles Vietnamese accents, đ, exact line numbers and blank input', () => {
  assert.equal(normalize('Đường đời'), 'duong doi')
  assert.ok(searchVerses('tram nam').some(verse => verse.id === 1))
  assert.equal(searchVerses('3257')[0].id, 3257)
  assert.equal(searchVerses('  ').length, verses.length)
  assert.deepEqual(searchVerses('this-is-not-a-verse'), [])
})
test('passages use actual syllable counts rather than irregular imported numbering', () => {
  assert.deepEqual(
    getPassage(2).map(verse => verse.id),
    [1, 2]
  )
  assert.deepEqual(
    getPassage(3257).map(verse => verse.id),
    [3256, 3257]
  )
  assert.equal(getPassage(129).length, 1)
  assert.deepEqual(getPassage(-1), [])
  for (const [six, eight] of couplets) {
    assert.equal(words(six.text).length, 6)
    assert.equal(words(eight.text).length, 8)
  }
})
test('daily selection is stable within a local calendar day', () => {
  assert.deepEqual(dailyPassage(new Date(2026, 9, 22, 1)), dailyPassage(new Date(2026, 9, 22, 23)))
  assert.ok(couplets.includes(dailyPassage(new Date(2026, 9, 23))))
})
test('every discovery topic has real, searchable source passages', () => {
  for (const topic of topics) assert.ok(topicPassages(topic.id).length > 6)
  assert.equal(topicPassages('missing').length, couplets.length)
  assert.ok(!topicPassages('nature').some(pair => pair[0].id === 29), 'họa must not match hoa')
})
test('rhyme normalization keeps vowel quality and matches the sixth word of the eight-syllable line', () => {
  assert.equal(rhymeKey('lòng'), rhymeKey('trong'))
  assert.notEqual(rhymeKey('cân'), rhymeKey('can'))
  assert.ok(
    findRhymingVerses('Trăm năm trong cõi người ta,', 8, true).some(verse => verse.number === 2)
  )
  for (let batch = 0; batch < 10; batch++)
    for (const pair of generatePairs(16)) {
      assert.equal(words(pair.verse6).length, 6)
      assert.equal(words(pair.verse8).length, 8)
      assert.equal(rhymeKey(words(pair.verse6)[5]), rhymeKey(words(pair.verse8)[5]))
      assert.ok(verses.some(verse => verse.id === pair.id6 && verse.text === pair.verse6))
      assert.ok(verses.some(verse => verse.id === pair.id8 && verse.text === pair.verse8))
    }
  for (const value of [0, -1, 17, NaN, 1.5]) assert.throws(() => generatePairs(value), RangeError)
})
test('stored data validation rejects invalid IDs, duplicates, unsupported font sizes and malformed values', () => {
  assert.deepEqual(parseLibrary(null), { saved: [], progress: 1, fontSize: 22 })
  assert.deepEqual(
    parseLibrary({ saved: [1, 1, '2', -1, 9999, null], progress: 9999, fontSize: 900 }),
    { saved: [1], progress: 1, fontSize: 22 }
  )
  assert.deepEqual(parseLibrary({ saved: [3256], progress: 3257, fontSize: 30 }), {
    saved: [3256],
    progress: 3257,
    fontSize: 30,
  })
})
test('copied passages carry an explicit source and local edition numbering', () => {
  const text = passageText(getPassage(1))
  assert.match(text, /Nguyễn Du, Truyện Kiều/)
  assert.match(text, /bản văn trong ứng dụng/)
})
