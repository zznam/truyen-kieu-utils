import { notFound } from 'next/navigation'
import { ArcadeSession } from '@/components/arcade-session'
import { isArcadeMode } from '@/lib/arcade'
import '../arcade.css'

export default async function ArcadeModePage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params
  if (!isArcadeMode(mode)) notFound()
  return <ArcadeSession key={mode} mode={mode} />
}
