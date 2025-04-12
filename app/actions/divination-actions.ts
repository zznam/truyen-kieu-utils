'use server'

import { truyenKieuVerses } from '../data/truyen-kieu'
import { getVerseInterpretation } from '../services/gemini'

export async function getRandomVerse(question: string) {
  // Get a random verse from the collection
  const randomIndex = Math.floor(Math.random() * truyenKieuVerses.length)
  const selectedVerse = truyenKieuVerses[randomIndex]

  // Get interpretation from Gemini
  const interpretation = await getVerseInterpretation(selectedVerse.text, question)

  return {
    id: selectedVerse.id,
    verse: selectedVerse.text,
    interpretation,
  }
}
