import { getLayKieuInterpretation } from '@/app/services/gemini'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ success: false, error: 'Missing text parameter' }, { status: 400 })
    }

    const interpretation = await getLayKieuInterpretation(text)

    return NextResponse.json({
      success: true,
      data: interpretation,
    })
  } catch (error) {
    console.error('Error analyzing lay kieu:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to analyze lay kieu' },
      { status: 500 }
    )
  }
}
