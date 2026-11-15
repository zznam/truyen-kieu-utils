import type { Metadata } from 'next'
import { Suspense } from 'react'
import { WorkshopWorkspace } from '@/components/poetry-workshop/workshop-workspace'
import './workshop.css'

export const metadata: Metadata = {
  title: 'Xưởng Lẩy Kiều',
  description: 'Chọn câu nguồn, khám phá vần chữ và giữ những bản ghép Lẩy Kiều của riêng bạn.',
}

export default function PoetryWorkshopPage() {
  return (
    <Suspense
      fallback={
        <div className="shell page-content" role="status">
          Đang mở xưởng Lẩy Kiều…
        </div>
      }
    >
      <WorkshopWorkspace />
    </Suspense>
  )
}
