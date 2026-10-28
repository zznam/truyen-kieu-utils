import type { useGamification } from '@/components/gamification-provider'

export type AdventureGame = ReturnType<typeof useGamification>
export type AdventureAction = (action: () => unknown, message: string) => void
export type EarnedFilter = 'all' | 'earned' | 'pending'
export type QuestPeriod = 'all' | 'daily' | 'weekly'
