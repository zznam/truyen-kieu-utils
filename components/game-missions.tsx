'use client'

import Link from 'next/link'
import { ArrowRight, Check, Gift } from 'lucide-react'
import { useState } from 'react'
import { useGameProgress } from './game-provider'
import { dailyMissions } from '@/lib/game-journey'
import { useLocalDay } from '@/hooks/use-local-day'

export function GameMissions() {
  const { progress, ready, claimBonus } = useGameProgress()
  const today = useLocalDay()
  const [message, setMessage] = useState({ day: '', text: '' })
  const activity = progress.activity.find(day => day.date === today)
  const missions = dailyMissions(activity)
  const complete = missions.every(mission => mission.value === mission.target)
  return (
    <section className="play-section" aria-labelledby="missions-title" aria-busy={!ready || !today}>
      <div className="section-heading">
        <div>
          <div className="eyebrow">BA BƯỚC NHỎ MỖI NGÀY</div>
          <h2 id="missions-title">Một lời hẹn hôm nay</h2>
        </div>
        <span className="section-side-note">Làm mới theo ngày trên thiết bị</span>
      </div>
      {!ready || !today ? (
        <p role="status">Đang mở nhiệm vụ…</p>
      ) : (
        <>
          <div className="mission-grid">
            {missions.map(mission => (
              <article
                className={`mission-card ${mission.value === mission.target ? 'complete' : ''}`}
                key={mission.title}
              >
                <div className="game-meta">
                  <span>
                    {mission.value}/{mission.target}
                  </span>
                  {mission.value === mission.target && (
                    <span>
                      <Check size={14} /> Hoàn thành
                    </span>
                  )}
                </div>
                <h3>{mission.title}</h3>
                <p className="play-caption">{mission.description}</p>
                <progress value={mission.value} max={mission.target} aria-label={mission.title} />
                <Link className="text-link" href={mission.href}>
                  Luyện tập <ArrowRight size={15} />
                </Link>
              </article>
            ))}
          </div>
          <div className="mission-reward">
            <div>
              <Gift size={22} />
              <span>
                Hoàn thành cả ba nhiệm vụ để nhận thêm <strong>20 XP</strong>.
              </span>
            </div>
            <button
              className="button secondary"
              disabled={!complete || activity?.claimed}
              onClick={() => {
                const earned = claimBonus()
                setMessage({
                  day: today,
                  text: earned
                    ? 'Đã nhận 20 XP. Hẹn bạn ngày mai!'
                    : 'Phần thưởng hôm nay đã được ghi nhận.',
                })
              }}
            >
              {activity?.claimed ? 'Đã nhận thưởng hôm nay' : 'Nhận 20 XP'}
            </button>
          </div>
          <p role="status" className="play-caption">
            {message.day === today ? message.text : ''}
          </p>
          <p className="play-caption">
            Chỉ lượt chơi hoàn thành được tính. Ôn câu chưa nhớ và chơi lại thử thách ngày không
            tăng tiến độ.
          </p>
        </>
      )}
    </section>
  )
}
