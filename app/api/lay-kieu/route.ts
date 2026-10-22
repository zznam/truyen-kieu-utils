import { NextResponse } from 'next/server'
import { generatePairs } from '@/app/services/lay_kieu'
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('count') ?? '1'
  const count = Number(raw)
  if (!/^\d+$/.test(raw) || !Number.isInteger(count) || count < 1 || count > 16)
    return NextResponse.json(
      { success: false, error: 'Số cặp câu phải là số nguyên từ 1 đến 16.' },
      { status: 400 }
    )
  try {
    const results = generatePairs(count)
    return NextResponse.json(
      {
        success: true,
        data: { results, combinedResult: results.map(item => item.result).join('\n\n') },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch {
    return NextResponse.json(
      { success: false, error: 'Chưa thể ghép câu thơ. Vui lòng thử lại.' },
      { status: 500 }
    )
  }
}
