import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ReadingWorkspace } from '@/components/reading-room/reading-workspace'
import './reading-room.css'

export const metadata: Metadata = {
  title: 'Phòng đọc Kiều',
  description: 'Đọc chậm, luyện nhớ, đối chiếu câu thơ và giữ một sổ đọc riêng với Truyện Kiều.',
}

export default function ReadingRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="shell page-content" role="status">
          Đang mở phòng đọc…
        </div>
      }
    >
      <ReadingWorkspace />
    </Suspense>
  )
}
