'use client'

import { chapters } from '@/lib/gamification'
import { BookOpen, Check, Lock } from 'lucide-react'
import Link from 'next/link'
import { chapterActions } from './presentation'
import { Heading, Meter } from './shared'
import type { AdventureAction, AdventureGame } from './types'

type Props = { game: AdventureGame; act: AdventureAction }

export function CampaignPanel({ game, act }: Props) {
  const { state } = game
  return (
    <>
      <Heading title="Đi dọc một câu chuyện.">
        Sáu cột mốc từ đọc và lưu thơ đến luyện trí nhớ. Hoàn thành điều kiện, nhận thưởng để bước
        tiếp.
      </Heading>
      <ol className="adventure-path">
        {chapters(state).map((item, index) => (
          <li className={`adventure-chapter ${item.claimed ? 'claimed' : ''}`} key={item.id}>
            <div className="adventure-chapter-number">
              {item.claimed ? <Check size={24} /> : String(index + 1).padStart(2, '0')}
            </div>
            <div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <Meter label="Tiến độ chặng" value={item.value} target={item.target} />
              <p className="adventure-spacer">
                +{item.xp} XP · +{item.coins} hạt ngọc
              </p>
            </div>
            <div className="adventure-actions">
              <Link href={chapterActions[item.id]?.href || '/full'} className="button">
                <BookOpen size={15} /> {chapterActions[item.id]?.label || 'Đọc thơ'}
              </Link>
              <button
                type="button"
                className="button"
                disabled={item.claimed || !item.unlocked || item.value < item.target}
                onClick={() =>
                  act(() => game.claimChapter(item.id), `Đã hoàn thành chặng “${item.title}”.`)
                }
              >
                {item.claimed ? (
                  'Đã hoàn thành'
                ) : !item.unlocked ? (
                  <>
                    <Lock size={14} /> Hoàn thành chặng trước
                  </>
                ) : item.value >= item.target ? (
                  'Nhận thưởng chặng'
                ) : (
                  'Đang khám phá'
                )}
              </button>
            </div>
          </li>
        ))}
      </ol>
    </>
  )
}
