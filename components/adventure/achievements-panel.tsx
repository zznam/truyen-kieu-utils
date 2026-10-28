'use client'

import { achievements } from '@/lib/gamification'
import { Award, Pin, Search } from 'lucide-react'
import { Empty, Heading, matches, Meter } from './shared'
import type { AdventureAction, AdventureGame, EarnedFilter } from './types'

type Props = {
  game: AdventureGame
  act: AdventureAction
  achievementQuery: string
  setAchievementQuery: (query: string) => void
  achievementFilter: EarnedFilter
  setAchievementFilter: (filter: EarnedFilter) => void
}

export function AchievementsPanel({
  game,
  act,
  achievementQuery,
  setAchievementQuery,
  achievementFilter,
  setAchievementFilter,
}: Props) {
  const { state } = game
  const allAchievements = achievements(state)
  const earnedAchievements = allAchievements.filter(item => item.unlocked).length
  return (
    <>
      <Heading
        title="Mỗi bước đi, một dấu ấn."
        extra={
          <span className="adventure-tag earned">
            {earnedAchievements} / {allAchievements.length} đã mở
          </span>
        }
      >
        Dấu ấn tự mở khi bạn đủ điều kiện. Ghim một dấu ấn yêu thích lên lời chào của mình.
      </Heading>
      <div className="adventure-toolbar">
        <label className="adventure-field grow">
          <span>
            <Search size={13} /> Tìm dấu ấn
          </span>
          <input
            type="search"
            value={achievementQuery}
            onChange={event => setAchievementQuery(event.target.value)}
            placeholder="Ví dụ: đọc, chuỗi, khám phá…"
          />
        </label>
        <label className="adventure-field">
          Trạng thái
          <select
            value={achievementFilter}
            onChange={event => setAchievementFilter(event.target.value as EarnedFilter)}
          >
            <option value="all">Tất cả dấu ấn</option>
            <option value="earned">Đã mở</option>
            <option value="pending">Đang chờ bạn</option>
          </select>
        </label>
      </div>
      <div className="adventure-grid">
        {allAchievements
          .filter(
            item =>
              matches(`${item.title} ${item.description}`, achievementQuery) &&
              (achievementFilter === 'all' || item.unlocked === (achievementFilter === 'earned'))
          )
          .map(item => (
            <div
              key={item.id}
              className={`adventure-card ${item.unlocked ? 'unlocked' : 'locked'}`}
            >
              <div className="adventure-card-top">
                <Award className="adventure-card-symbol" size={30} />
                <span className={`adventure-tag ${item.unlocked ? 'earned' : ''}`}>
                  {item.unlocked ? 'Đã mở' : 'Chưa mở'}
                </span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <Meter label="Tiến độ dấu ấn" value={item.value} target={item.target} />
              <button
                className="button"
                type="button"
                disabled={!item.unlocked}
                aria-pressed={state.pinnedAchievement === item.id}
                onClick={() =>
                  act(
                    () => game.pinAchievement(state.pinnedAchievement === item.id ? null : item.id),
                    state.pinnedAchievement === item.id
                      ? 'Đã bỏ ghim dấu ấn.'
                      : `Đã ghim “${item.title}” lên lời chào.`
                  )
                }
              >
                <Pin size={14} />{' '}
                {state.pinnedAchievement === item.id ? 'Bỏ ghim dấu ấn' : 'Ghim lên lời chào'}
              </button>
            </div>
          ))}
        {!allAchievements.some(
          item =>
            matches(`${item.title} ${item.description}`, achievementQuery) &&
            (achievementFilter === 'all' || item.unlocked === (achievementFilter === 'earned'))
        ) && (
          <Empty title="Chưa có dấu ấn ở đây.">
            Thử bộ lọc khác hoặc tiếp tục đọc và chơi để mở thêm dấu ấn.
          </Empty>
        )}
      </div>
    </>
  )
}
