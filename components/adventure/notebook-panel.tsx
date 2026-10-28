'use client'

import { ArrowRight, BookOpen, Trophy } from 'lucide-react'
import Link from 'next/link'
import { modeNames, verseText } from './presentation'
import { Heading } from './shared'
import type { AdventureGame } from './types'

type Props = { game: AdventureGame; masteryOrder: string; setMasteryOrder: (order: string) => void }

export function NotebookPanel({ game, masteryOrder, setMasteryOrder }: Props) {
  const { state } = game
  const accuracy = state.stats.total
    ? Math.round((state.stats.correct / state.stats.total) * 100)
    : null
  return (
    <>
      <Heading title="Nhớ lại những điều đã học.">
        Thành tích của riêng bạn, qua những lượt chơi đã hoàn thành trên trình duyệt này.
      </Heading>
      <div className="adventure-stats">
        <div>
          <span>Lượt chơi</span>
          <strong>{state.stats.sessions}</strong>
          <span>đã hoàn thành</span>
        </div>
        <div>
          <span>Độ chính xác</span>
          <strong>{accuracy === null ? '—' : `${accuracy}%`}</strong>
          <span>
            {state.stats.correct} / {state.stats.total} câu đúng
          </span>
        </div>
        <div>
          <span>Lượt trọn vẹn</span>
          <strong>{state.stats.perfect}</strong>
          <span>đúng toàn bộ câu hỏi</span>
        </div>
        <div>
          <span>Tự mình nhớ</span>
          <strong>{state.stats.noHint}</strong>
          <span>lượt đúng hết, không gợi ý</span>
        </div>
      </div>
      <div className="adventure-grid two">
        <div className="adventure-card">
          <h3>Kỷ lục theo trò chơi</h3>
          {Object.entries(state.best).length ? (
            Object.entries(state.best).map(([mode, best]) => (
              <div className="adventure-row" key={mode}>
                <div>
                  <strong>{modeNames[mode] || mode}</strong>
                  <small>Kỷ lục cá nhân</small>
                </div>
                <span className="adventure-tag earned">
                  <Trophy size={14} /> {best}%
                </span>
              </div>
            ))
          ) : (
            <p>Hoàn thành một trò chơi để lưu kỷ lục đầu tiên.</p>
          )}
          <Link className="button" href="/play/arcade">
            Chọn một trò chơi <ArrowRight size={15} />
          </Link>
        </div>
        <div className="adventure-card">
          <h3>Câu thơ đã quen</h3>
          <label className="adventure-field">
            Sắp xếp sổ luyện
            <select value={masteryOrder} onChange={event => setMasteryOrder(event.target.value)}>
              <option value="recent">Gần đây nhất</option>
              <option value="strong">Nhớ nhiều nhất</option>
              <option value="practice">Cần luyện thêm</option>
            </select>
          </label>
          {Object.entries(state.mastery).length ? (
            Object.entries(state.mastery)
              .sort((a, b) =>
                masteryOrder === 'recent'
                  ? b[1].lastDate.localeCompare(a[1].lastDate)
                  : masteryOrder === 'strong'
                    ? b[1].count - a[1].count
                    : a[1].count - b[1].count
              )
              .slice(0, 12)
              .map(([id, item]) => (
                <div key={id} className="adventure-row">
                  <div>
                    <strong>Dòng {id}</strong>
                    <p>{verseText.get(id)}</p>
                    <small>
                      {item.count} ngày nhớ đúng · {item.lastDate}
                    </small>
                  </div>
                  <Link href={`/full?line=${id}`} className="text-link">
                    Đọc lại <ArrowRight size={14} />
                  </Link>
                </div>
              ))
          ) : (
            <p>Những câu bạn trả lời đúng sẽ xuất hiện ở đây để dễ tìm đọc lại.</p>
          )}
          <Link className="button" href="/play/mastery">
            Luyện lại những câu đã học <BookOpen size={15} />
          </Link>
          <Link className="text-link" href="/play/review">
            Mở sổ lỗi từ trò chơi cũ <ArrowRight size={14} />
          </Link>
        </div>
      </div>
      <div className="adventure-card adventure-spacer">
        <h3>Những lượt chơi gần đây</h3>
        {state.history.length ? (
          [...state.history]
            .reverse()
            .slice(0, 10)
            .map(item => (
              <div className="adventure-row" key={item.id}>
                <div>
                  <strong>{modeNames[item.mode] || item.mode}</strong>
                  <small>
                    {item.date} · {item.hints ? `${item.hints} gợi ý` : 'Không dùng gợi ý'}
                  </small>
                </div>
                <span>
                  {item.correct}/{item.total} câu · +{item.xp} XP
                </span>
              </div>
            ))
        ) : (
          <p>Chưa có lượt chơi nào. Chọn một trò nhỏ để viết dòng đầu tiên vào sổ.</p>
        )}
      </div>
    </>
  )
}
