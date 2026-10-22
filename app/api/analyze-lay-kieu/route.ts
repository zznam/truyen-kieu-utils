import {
  getLayKieuInterpretation,
  getVerseInterpretation,
  InterpretationError,
} from '@/app/services/gemini'
import { NextResponse } from 'next/server'
import { z } from 'zod'
const input = z.object({
  text: z.string().trim().min(1).max(4000),
  question: z.string().trim().max(500).optional(),
})
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Nội dung gửi lên không hợp lệ.' },
      { status: 400 }
    )
  }
  const parsed = input.safeParse(body)
  if (!parsed.success)
    return NextResponse.json(
      {
        success: false,
        error: 'Vui lòng gửi đoạn thơ từ 1 đến 4.000 ký tự và tâm sự tối đa 500 ký tự.',
      },
      { status: 400 }
    )
  try {
    const data = parsed.data.question
      ? await getVerseInterpretation(parsed.data.text, parsed.data.question)
      : await getLayKieuInterpretation(parsed.data.text)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof InterpretationError
            ? error.message
            : 'Chưa thể bình giải. Vui lòng thử lại sau.',
      },
      { status: error instanceof InterpretationError ? error.status : 500 }
    )
  }
}
