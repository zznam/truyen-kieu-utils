import { verses, words } from '../../lib/kieu'

export interface Verse {
  number: number
  content: string
  rhyme: string
  wordCount: number
  isEven: boolean
}
// Keep vowel quality (a/ă/â, o/ô/ơ, u/ư) while removing tone marks.
export function rhymeKey(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300\u0301\u0303\u0309\u0323]/g, '')
    .normalize('NFC')
    .replace(/^[^aeiouyăâêôơư]+/u, '')
}
export function loadVerses(): Verse[] {
  return verses.map(verse => {
    const tokens = words(verse.text)
    return {
      number: verse.id,
      content: verse.text,
      rhyme: rhymeKey(tokens.at(-1) || ''),
      wordCount: tokens.length,
      isEven: tokens.length === 8,
    }
  })
}
const processed = loadVerses()
const rhymeIndex = new Map<string, Verse[]>()
for (const verse of processed) {
  const tokens = words(verse.content)
  const key = `${verse.wordCount}:${rhymeKey(tokens[verse.wordCount === 8 ? 5 : verse.wordCount - 1] || '')}`
  rhymeIndex.set(key, [...(rhymeIndex.get(key) || []), verse])
}
export function findRhymingVerses(
  targetVerse: string,
  targetWordCount: number,
  mustBeEven = false
): Verse[] {
  const target = words(targetVerse)
  const rhyme = rhymeKey(target.at(-1) || '')
  return (rhymeIndex.get(`${targetWordCount}:${rhyme}`) || []).filter(
    verse =>
      verse.content !== targetVerse &&
      verse.wordCount === targetWordCount &&
      (!mustBeEven || verse.isEven)
  )
}
export function generateLayKieu(verse6: string, verse8: string) {
  return `${verse6}\n${verse8}`
}
export function getRandomVerse(wordCount: number, mustBeEven = false): Verse {
  const options = processed.filter(
    verse => verse.wordCount === wordCount && (!mustBeEven || verse.isEven)
  )
  if (!options.length) throw new Error('No matching verse')
  return options[Math.floor(Math.random() * options.length)]
}
export function getRandomRhymingVerse(
  targetVerse: string,
  targetWordCount: number,
  mustBeEven = false
): Verse {
  const options = findRhymingVerses(targetVerse, targetWordCount, mustBeEven)
  if (!options.length) throw new Error('No matching rhyme')
  return options[Math.floor(Math.random() * options.length)]
}
const candidates = processed.filter(
  verse => verse.wordCount === 6 && findRhymingVerses(verse.content, 8, true).length > 0
)
export function generatePairs(count: number) {
  if (!Number.isInteger(count) || count < 1 || count > 16)
    throw new RangeError('Invalid pair count')
  return Array.from({ length: count }, () => {
    const verse6 = candidates[Math.floor(Math.random() * candidates.length)]
    const verse8 = getRandomRhymingVerse(verse6.content, 8, true)
    return {
      verse6: verse6.content,
      verse8: verse8.content,
      id6: verse6.number,
      id8: verse8.number,
      result: generateLayKieu(verse6.content, verse8.content),
    }
  })
}
