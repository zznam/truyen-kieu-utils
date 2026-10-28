'use client'

import {
  achievements,
  chapters,
  levelInfo,
  longestStreak,
  quests,
  recentActivity,
  shiftDay,
  weekKey,
} from '@/lib/gamification'
import { ArrowRight, BookOpen, CalendarDays, Check, Gift } from 'lucide-react'
import Link from 'next/link'
import { chapterActions } from './presentation'
import { Meter } from './shared'
import type { AdventureAction, AdventureGame } from './types'

type Props = {
  game: AdventureGame
  act: AdventureAction
  selectPanel: (panel: 'quests' | 'campaign') => void
}

export function OverviewPanel({ game, act, selectPanel }: Props) {
  const { state, today } = game
  const level = levelInfo(state.xp)
  const allQuests = quests(state, today)
  const pinned = achievements(state).find(
    item => item.id === state.pinnedAchievement && item.unlocked
  )
  const day = state.activity.find(item => item.date === today)
  const calendar = recentActivity(state, today, 28)
  const weekStart = weekKey(today)
  const thisWeek = state.activity.filter(item => item.date >= weekStart && item.date <= today)
  const previousWeek = state.activity.filter(
    item => item.date >= shiftDay(weekStart, -7) && item.date < weekStart
  )
  const weekXP = thisWeek.reduce((total, item) => total + item.xp, 0)
  const previousXP = previousWeek.reduce((total, item) => total + item.xp, 0)
  const weekCorrect = thisWeek.reduce((total, item) => total + item.correct, 0)
  const weekTotal = thisWeek.reduce((total, item) => total + item.total, 0)
  const nextChapter = chapters(state).find(item => item.unlocked && !item.claimed)

  return (
    <>
      <div className="adventure-hero">
        <div>
          <div className="eyebrow">
            {state.profile.avatar} {state.profile.title}
          </div>
          <h2>
            Chào {state.profile.name || 'bạn đọc'},<br />
            hôm nay mình đọc gì?
          </h2>
          <p>
            {pinned
              ? `Dấu ấn bạn chọn: ${pinned.title}.`
              : 'Không cần vội. Một vài phút cùng thơ cũng là một bước tiến.'}
          </p>
          <div className="adventure-actions adventure-spacer">
            <Link className="button primary" href="/play/arcade">
              Khám phá trò mới <ArrowRight size={16} />
            </Link>
            <Link className="button" href="/full">
              Mở trang thơ <BookOpen size={16} />
            </Link>
          </div>
        </div>
        <div className="adventure-hero-side">
          <Meter
            label={`Tiến tới cấp ${level.level + 1}`}
            value={level.current}
            target={level.required}
          />
          <Meter label="Mục tiêu XP hôm nay" value={day?.xp || 0} target={state.dailyGoal} />
          <label className="adventure-field">
            Nhịp học của bạn
            <select
              value={state.dailyGoal}
              onChange={event =>
                act(
                  () => game.setGoal(Number(event.target.value)),
                  'Đã đổi mục tiêu hằng ngày. Bạn có thể điều chỉnh bất cứ lúc nào.'
                )
              }
            >
              <option value={20}>Thong thả · 20 XP / ngày</option>
              <option value={50}>Đều đặn · 50 XP / ngày</option>
              <option value={100}>Hăng say · 100 XP / ngày</option>
              <option value={200}>Chuyên tâm · 200 XP / ngày</option>
            </select>
          </label>
        </div>
      </div>
      <div className="adventure-grid two">
        <div className="adventure-card">
          <h3>
            <CalendarDays size={20} /> 28 ngày cùng thơ
          </h3>
          <p>Mỗi ô là một ngày trên thiết bị này. Chơi, đọc và khám phá đều để lại dấu chân.</p>
          <div className="adventure-calendar" aria-label="Hoạt động 28 ngày gần đây">
            {calendar.map(item => {
              const active =
                item.xp > 0 ||
                item.sessions > 0 ||
                item.read > 0 ||
                item.saved > 0 ||
                item.explored > 0 ||
                item.created > 0 ||
                item.reflected > 0 ||
                item.reviewed > 0 ||
                item.focusMinutes > 0
              const frozen = state.freezeDays.includes(item.date)
              return (
                <div
                  key={item.date}
                  className={`adventure-day ${active ? 'active' : ''} ${frozen ? 'frozen' : ''} ${item.date === today ? 'today' : ''}`}
                  title={`${item.date}: ${active ? `${item.xp} XP, ${item.read} câu đọc, ${item.sessions} lượt chơi` : frozen ? 'Đã dùng lá giữ nhịp' : 'Chưa có hoạt động'}`}
                  aria-label={`${item.date}: ${active ? `${item.xp} XP` : frozen ? 'Đã dùng lá giữ nhịp' : 'Chưa có hoạt động'}${item.date === today ? ', hôm nay' : ''}`}
                >
                  {Number(item.date.slice(-2))}
                </div>
              )
            })}
          </div>
          <div className="adventure-calendar-key">
            <span>
              <i className="adventure-dot" /> Có hoạt động
            </span>
            <span>
              <i className="adventure-dot empty" /> Chưa có hoạt động
            </span>
            <span>Viền đất nung: hôm nay</span>
          </div>
          <p>
            {state.freezeDays.length
              ? `Đã dùng lá giữ nhịp cho ${state.freezeDays.length} ngày.`
              : 'Lỡ một ngày? Lá giữ nhịp có trong Quà tặng.'}
          </p>
        </div>
        <div className="adventure-card">
          <h3>
            <Gift size={20} /> Việc nhỏ cho hôm nay
          </h3>
          {allQuests
            .filter(item => item.period === 'daily')
            .slice(0, 3)
            .map(item => (
              <div key={item.id}>
                <div className="adventure-card-top">
                  <strong>{item.title}</strong>
                  {item.claimed && <Check size={17} aria-label="Đã nhận" />}
                </div>
                <Meter label={item.description} value={item.value} target={item.target} />
              </div>
            ))}
          <button className="button" type="button" onClick={() => selectPanel('quests')}>
            Xem và nhận phần thưởng <ArrowRight size={15} />
          </button>
        </div>
      </div>
      <div className="adventure-grid two adventure-spacer">
        <div className="adventure-card">
          <h3>Nhìn lại tuần này</h3>
          <p>Từ {weekStart.split('-').reverse().join('/')} đến hôm nay, theo lịch trên thiết bị.</p>
          <div className="adventure-row">
            <span>Điểm trải nghiệm</span>
            <strong>{weekXP} XP</strong>
          </div>
          <div className="adventure-row">
            <span>So với cả tuần trước</span>
            <strong>
              {weekXP >= previousXP ? '+' : ''}
              {weekXP - previousXP} XP
            </strong>
          </div>
          <div className="adventure-row">
            <span>Ngày có hoạt động</span>
            <strong>{thisWeek.filter(item => item.xp > 0).length} ngày</strong>
          </div>
          <div className="adventure-row">
            <span>Độ chính xác</span>
            <strong>
              {weekTotal
                ? `${Math.round((weekCorrect / weekTotal) * 100)}% · ${weekCorrect}/${weekTotal}`
                : 'Chưa có lượt chơi'}
            </strong>
          </div>
          <div className="adventure-row">
            <span>Phút tập trung</span>
            <strong>{thisWeek.reduce((total, item) => total + item.focusMinutes, 0)}</strong>
          </div>
          <p>Chuỗi dài nhất của bạn: {longestStreak(state)} ngày có hoạt động.</p>
        </div>
        <div className="adventure-card">
          <h3>Bước nhỏ tiếp theo</h3>
          {nextChapter ? (
            <>
              <span className="adventure-tag">Chặng đang mở</span>
              <h3>{nextChapter.title}</h3>
              <p>{nextChapter.description}</p>
              <Meter
                label="Mục tiêu tiếp theo"
                value={nextChapter.value}
                target={nextChapter.target}
              />
              <Link className="button" href={chapterActions[nextChapter.id]?.href || '/full'}>
                {chapterActions[nextChapter.id]?.label || 'Đọc thơ'} <ArrowRight size={15} />
              </Link>
              <button className="button" type="button" onClick={() => selectPanel('campaign')}>
                Xem đường thơ và nhận thưởng
              </button>
            </>
          ) : (
            <>
              <p>
                Bạn đã hoàn thành mọi chặng. Hãy trở lại những câu đã học và giữ nhịp đọc theo cách
                của mình.
              </p>
              <Link className="button" href="/play/mastery">
                Ôn những câu đã quen <ArrowRight size={15} />
              </Link>
            </>
          )}
        </div>
      </div>
      <details>
        <summary>Điểm và hạt ngọc đến từ đâu?</summary>
        <p>
          Đọc thơ, lưu câu yêu thích, khám phá chủ đề, hoàn thành trò chơi và nhận thưởng nhiệm vụ
          giúp hành trình tiến lên. Một số hoạt động chỉ nhận thưởng lần đầu để khuyến khích khám
          phá. Hạt ngọc chỉ dùng trong ứng dụng, không phải tiền. Mọi thành tích được lưu trên trình
          duyệt này.
        </p>
      </details>
    </>
  )
}
