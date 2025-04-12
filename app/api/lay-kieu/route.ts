import { NextResponse } from 'next/server'
import { getRandomVerse, getRandomRhymingVerse, generateLayKieu } from '@/app/services/lay_kieu'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const count = parseInt(searchParams.get('count') || '1')

    if (count < 1 || count > 16) {
      return NextResponse.json(
        { success: false, error: 'Count must be between 1 and 16' },
        { status: 400 }
      )
    }

    const results = []
    let combinedResult = ''

    for (let i = 0; i < count; i++) {
      // Get a random verse with 6 words (câu lục)
      const verse6 = getRandomVerse(6)

      // Find a rhyming verse with 8 words that must be a câu bát (even-numbered verse)
      const verse8 = getRandomRhymingVerse(verse6.content, 8, true)

      // Generate Lẩy Kiều
      const result = generateLayKieu(verse6.content, verse8.content)

      results.push({
        verse6: verse6.content,
        verse8: verse8.content,
        result,
      })

      // Combine results with proper spacing
      if (i > 0) {
        combinedResult += '\n\n'
      }
      combinedResult += result
    }

    return NextResponse.json({
      success: true,
      data: {
        results,
        combinedResult,
      },
    })
  } catch (error) {
    console.error('Error generating Lẩy Kiều:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate Lẩy Kiều' },
      { status: 500 }
    )
  }
}
