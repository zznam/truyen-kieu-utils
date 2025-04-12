import { truyenKieuVerses } from '../data/truyen-kieu'

interface Verse {
  number: number
  content: string
  rhyme: string
  wordCount: number
  isEven: boolean // true for câu bát (even-numbered verses)
}

let verses: Verse[] = []

// Clean up verse content by removing verse numbers
function cleanVerseContent(content: string): string {
  return content.trim()
}

// Load and process Truyện Kiều data
export function loadVerses() {
  if (verses.length > 0) return verses

  verses = truyenKieuVerses.map(verse => {
    const cleanedContent = cleanVerseContent(verse.text)
    return {
      number: verse.id,
      content: cleanedContent,
      rhyme: extractRhyme(cleanedContent),
      wordCount: countWords(cleanedContent),
      isEven: verse.id % 2 === 0,
    }
  })

  return verses
}

// Count words in a verse
function countWords(verse: string): number {
  return verse.split(' ').filter(word => word.trim().length > 0).length
}

// Extract the rhyme from a verse (last word)
function extractRhyme(verse: string): string {
  const words = verse.split(' ')
  return words[words.length - 1]
}

// Find verses that rhyme with a given verse and have the specified word count
export function findRhymingVerses(
  targetVerse: string,
  targetWordCount: number,
  mustBeEven: boolean = false
): Verse[] {
  const verses = loadVerses()
  const targetRhyme = extractRhyme(targetVerse)

  return verses.filter(
    verse =>
      verse.rhyme === targetRhyme &&
      verse.content !== targetVerse &&
      verse.wordCount === targetWordCount &&
      (!mustBeEven || verse.isEven)
  )
}

// Generate Lẩy Kiều by combining verses
export function generateLayKieu(verse6: string, verse8: string): string {
  return `${verse6}\n${verse8}`
}

// Get a random verse with the specified word count
export function getRandomVerse(wordCount: number, mustBeEven: boolean = false): Verse {
  const verses = loadVerses()
  const filteredVerses = verses.filter(
    verse => verse.wordCount === wordCount && (!mustBeEven || verse.isEven)
  )
  if (filteredVerses.length === 0) {
    throw new Error(
      `No verses found with ${wordCount} words${mustBeEven ? ' and even number' : ''}`
    )
  }
  const randomIndex = Math.floor(Math.random() * filteredVerses.length)
  return filteredVerses[randomIndex]
}

// Get a random verse that rhymes with a given verse and has the specified word count
export function getRandomRhymingVerse(
  targetVerse: string,
  targetWordCount: number,
  mustBeEven: boolean = false
): Verse {
  const rhymingVerses = findRhymingVerses(targetVerse, targetWordCount, mustBeEven)
  if (rhymingVerses.length === 0) {
    return getRandomVerse(targetWordCount, mustBeEven)
  }

  const randomIndex = Math.floor(Math.random() * rhymingVerses.length)
  return rhymingVerses[randomIndex]
}
