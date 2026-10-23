import type { Metadata } from 'next'
import { GameProvider } from '@/components/game-provider'
import './play.css'

export const metadata: Metadata = {
  title: 'Chơi cùng Kiều',
  description:
    'Nhớ chữ, nối câu, xếp lời thơ. Khám phá Truyện Kiều qua những thử thách nhỏ mỗi ngày.',
}
export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return <GameProvider>{children}</GameProvider>
}
