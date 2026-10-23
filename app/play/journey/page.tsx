'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, BookOpen, Check, History } from 'lucide-react'
import { useGameProgress } from '@/components/game-provider'
import { useLocalDay } from '@/hooks/use-local-day'
import { recentDays } from '@/lib/game-journey'
import { gameModes } from '@/lib/games'

function displayDate(date: string) {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`
}
export default function JourneyPage() {
  const { progress, ready, storageAvailable } = useGameProgress()
  const today = useLocalDay()
  const days = recentDays(today)
  return (
    <div className="shell page-content play-page">
      <Link href="/play" className="text-link">
        <ArrowLeft size={16} /> Chơi cùng Kiều
      </Link>
      <header className="page-heading journey-heading">
        <div className="eyebrow">MỖI NGÀY MỘT CHÚT GẦN HƠN</div>
        <h1>Dấu chân cùng Kiều.</h1>
        <p>Một tuần đọc lại, những câu đang nhớ, những lần đã thử.</p>
      </header>
      {!ready || !today ? (
        <p role="status">Đang mở sổ hành trình…</p>
      ) : (
        <>
          <section className="game-panel" aria-labelledby="week-title">
            <div className="section-heading">
              <div>
                <div className="eyebrow">BẢY NGÀY GẦN NHẤT</div>
                <h2 id="week-title">
                  {days.filter(date => progress.dates.includes(date)).length}/7 ngày cùng thơ
                </h2>
              </div>
            </div>
            <ol className="activity-week">
              {days.map(date => {
                const active = progress.dates.includes(date)
                const activity = progress.activity.find(day => day.date === date)
                return (
                  <li
                    key={date}
                    className={active ? 'active' : ''}
                    aria-current={date === today ? 'date' : undefined}
                  >
                    <span>
                      {date === today
                        ? 'Hôm nay'
                        : new Intl.DateTimeFormat('vi', {
                            weekday: 'short',
                            timeZone: 'UTC',
                          }).format(new Date(`${date}T12:00:00Z`))}
                    </span>
                    <strong>{displayDate(date)}</strong>
                    {active ? (
                      <Check size={20} aria-hidden="true" />
                    ) : (
                      <span aria-hidden="true">—</span>
                    )}
                    <span>
                      {activity ? `${activity.sessions} lượt` : active ? 'Đã chơi' : 'Chưa chơi'}
                    </span>
                  </li>
                )
              })}
            </ol>
            <p className="play-caption">
              Mỗi ngày hoàn thành một lượt là một dấu nhớ. Nghỉ một hôm, bạn vẫn có thể bắt đầu lại.
            </p>
          </section>
          <section
            className="journey-review game-panel play-section"
            aria-labelledby="notebook-title"
          >
            <BookOpen size={30} />
            <div>
              <h2 id="notebook-title">
                {progress.review.length
                  ? `${progress.review.length} câu chờ bạn nhớ lại`
                  : 'Sổ ôn đang trống'}
              </h2>
              <p className="play-caption">
                Câu trả lời sai hoặc bỏ qua trong lượt chơi hoàn thành sẽ nằm ở đây. Mỗi lượt ôn tối
                đa 5 câu; trả lời đúng không dùng gợi ý để đưa câu ra khỏi sổ.
              </p>
            </div>
            <Link
              className="button primary"
              href={progress.review.length ? '/play/review' : '/play/missing'}
            >
              {progress.review.length ? 'Mở sổ ôn' : 'Thử một lượt chơi'} <ArrowRight size={16} />
            </Link>
          </section>
          <section className="play-section" aria-labelledby="history-title">
            <div className="section-heading">
              <div>
                <div className="eyebrow">NHỮNG LẦN GẶP LẠI</div>
                <h2 id="history-title">Lượt chơi gần đây</h2>
              </div>
              <History size={24} />
            </div>
            <p className="play-caption">
              Lưu 20 lượt gần nhất kể từ khi có sổ hành trình. Các thành tích trước đó vẫn được giữ.
            </p>
            {progress.history.length ? (
              <ol className="journey-history">
                {[...progress.history].reverse().map(item => (
                  <li key={item.id}>
                    <div>
                      <strong>
                        {item.mode === 'daily' ? 'Thử thách mỗi ngày' : gameModes[item.mode].title}
                      </strong>
                      <span className="play-caption">
                        <time dateTime={item.date}>
                          {displayDate(item.date)}/{item.date.slice(0, 4)}
                        </time>{' '}
                        · Đúng {item.correct}/5 câu
                      </span>
                    </div>
                    <strong className="history-score">
                      {item.score}
                      <span>/50 điểm</span>
                    </strong>
                    <Link
                      className="text-link"
                      href={`/play/${item.mode}`}
                      aria-label={`Chơi lại ${item.mode === 'daily' ? 'thử thách ngày' : gameModes[item.mode].title}`}
                    >
                      Chơi lại <ArrowRight size={16} />
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="game-panel history-empty">
                <p>Chưa có lượt chơi nào trong sổ.</p>
                <Link href="/play/daily" className="text-link">
                  Viết dấu nhớ đầu tiên <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </section>
          <p className="notice play-section">
            {storageAvailable
              ? 'Sổ hành trình và câu cần ôn chỉ được lưu trong trình duyệt này. Xóa dữ liệu trình duyệt sẽ xóa sổ.'
              : 'Không thể lưu trong trình duyệt. Sổ hành trình chỉ được giữ trong phiên này.'}{' '}
            Lượt ôn không cộng XP hay chuỗi ngày.
          </p>
        </>
      )}
    </div>
  )
}
