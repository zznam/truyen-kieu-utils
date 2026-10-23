import { notFound } from 'next/navigation'
import { GameSession } from '@/components/game-session'
import { isPlayMode } from '@/lib/games'

export default async function GamePage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params
  if (!isPlayMode(mode)) notFound()
  return <GameSession key={mode} mode={mode} />
}
