'use client'

import { quests } from '@/lib/gamification'
import { Check, Target } from 'lucide-react'
import { Heading, Meter } from './shared'
import type { AdventureAction, AdventureGame, QuestPeriod } from './types'

type Props = {
  game: AdventureGame
  act: AdventureAction
  questPeriod: QuestPeriod
  setQuestPeriod: (period: QuestPeriod) => void
}

export function QuestsPanel({ game, act, questPeriod, setQuestPeriod }: Props) {
  const allQuests = quests(game.state, game.today)
  return (
    <>
      <Heading title="Những việc nhỏ, niềm vui dài.">
        Nhận phần thưởng khi đủ tiến độ. Nhiệm vụ hằng ngày và hằng tuần theo lịch trên thiết bị.
      </Heading>
      <div className="adventure-toolbar" aria-label="Lọc nhiệm vụ">
        {(
          [
            { id: 'all', label: 'Tất cả' },
            { id: 'daily', label: 'Hôm nay' },
            { id: 'weekly', label: 'Tuần này' },
          ] as const
        ).map(item => (
          <button
            type="button"
            className="adventure-button"
            key={item.id}
            aria-pressed={questPeriod === item.id}
            onClick={() => setQuestPeriod(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="adventure-grid">
        {allQuests
          .filter(item => questPeriod === 'all' || item.period === questPeriod)
          .map(item => (
            <div className={`adventure-card ${item.claimed ? 'unlocked' : ''}`} key={item.id}>
              <div className="adventure-card-top">
                <span className="adventure-tag">
                  {item.period === 'daily' ? 'Hôm nay' : 'Tuần này'}
                </span>
                {item.claimed ? <Check size={21} /> : <Target size={21} />}
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <Meter label="Tiến độ nhiệm vụ" value={item.value} target={item.target} />
              <span className="adventure-muted">
                +{item.xp} XP · +{item.coins} hạt ngọc
              </span>
              <button
                type="button"
                className="button"
                disabled={item.claimed || item.value < item.target}
                onClick={() =>
                  act(() => game.claimQuest(item.id), `Đã nhận thưởng “${item.title}”.`)
                }
              >
                {item.claimed
                  ? 'Đã nhận thưởng'
                  : item.value >= item.target
                    ? 'Nhận phần thưởng'
                    : 'Đang thực hiện'}
              </button>
            </div>
          ))}
      </div>
    </>
  )
}
