'use client'

import Link from 'next/link'
import { ArrowRight, CalendarDays, Flame, Flower2, Medal, Sparkles } from 'lucide-react'
import { useLocalDay } from '@/hooks/use-local-day'
import { GameMissions } from '@/components/game-missions'
import { useGameProgress } from '@/components/game-provider'
import { badges, currentStreak } from '@/lib/game-progress'
import { gameModes, type GameMode } from '@/lib/games'

export default function PlayPage() {
  const { progress, ready, storageAvailable } = useGameProgress()
  const today = useLocalDay()
  const completed = progress.dailyDates.includes(today)
  const level = Math.floor(progress.xp / 100) + 1
  return (
    <div className="shell page-content play-page">
      <header className="page-heading">
        <div className="eyebrow">MỖI LẦN CHƠI, MỘT LẦN NHỚ</div>
        <h1>Chơi cùng Kiều.</h1>
        <p>Nhặt lại một chữ, nối tiếp một vần. Để câu thơ ở lại lâu hơn.</p>
      </header>
      <section className="journey-links play-section adventure-entry" aria-label="Khám phá mới">
        <Link className="game-panel text-link" href="/play/adventure">
          <span>
            <strong>Vườn tri âm</strong>
            <span className="play-caption">Nhiệm vụ, hành trình đọc, bộ sưu tập và quà thưởng</span>
          </span>
          <ArrowRight size={20} />
        </Link>
        <Link className="game-panel text-link" href="/play/arcade">
          <span>
            <strong>Mười cách thử tài mới</strong>
            <span className="play-caption">Luyện trí nhớ, ghép chữ và khám phá lục bát</span>
          </span>
          <ArrowRight size={20} />
        </Link>
      </section>
      <section className="play-daily" aria-labelledby="daily-title">
        <div>
          <div className="eyebrow">
            <CalendarDays size={17} /> THỬ THÁCH MỖI NGÀY
          </div>
          <h2 id="daily-title">Năm câu hỏi. Một cuộc hẹn.</h2>
          <p>
            Điền chữ, nối câu và xếp thơ trong một lượt chơi. Bộ câu hỏi mới mỗi ngày, theo ngày
            trên thiết bị của bạn.
          </p>
          <Link className="button primary" href="/play/daily">
            {completed ? 'Chơi lại thử thách' : 'Đón thử thách hôm nay'} <ArrowRight size={17} />
          </Link>
          <span className="play-caption">
            {completed
              ? 'Đã nhận điểm hôm nay · Chơi lại để ôn thơ'
              : '5 câu hỏi · Thưởng thêm 10 XP khi hoàn thành lần đầu trong ngày'}
          </span>
        </div>
        <div className="play-daily-art" aria-hidden="true">
          <Flower2 size={56} strokeWidth={1} />
          <span>
            Học một chút.
            <br />
            <em>Nhớ thêm nhiều.</em>
          </span>
        </div>
      </section>
      <GameMissions today={today} />
      <section className="journey-links play-section" aria-label="Tiếp tục hành trình">
        <Link className="game-panel text-link" href="/play/review">
          <span>
            <strong>Ôn câu chưa nhớ</strong>
            <span className="play-caption">
              {ready
                ? `${progress.review.length} câu trong sổ ôn · Không tính XP`
                : 'Đang mở sổ ôn…'}
            </span>
          </span>
          <ArrowRight size={20} />
        </Link>
        <Link className="game-panel text-link" href="/play/journey">
          <span>
            <strong>Sổ hành trình</strong>
            <span className="play-caption">Bảy ngày cùng thơ và những lượt chơi gần đây</span>
          </span>
          <ArrowRight size={20} />
        </Link>
      </section>
      <section className="play-section" aria-labelledby="practice-title">
        <div className="section-heading">
          <div>
            <div className="eyebrow">THẢNH THƠI LUYỆN TẬP</div>
            <h2 id="practice-title">Bạn muốn thử cách nào?</h2>
          </div>
          <span className="section-side-note">Không bấm giờ. Cứ thong thả.</span>
        </div>
        <div className="feature-grid play-modes">
          {(Object.entries(gameModes) as [GameMode, (typeof gameModes)[GameMode]][]).map(
            ([mode, game], index) => (
              <Link className="feature-card" href={`/play/${mode}`} key={mode}>
                <span className="eyebrow">
                  0{index + 1} · {game.label}
                </span>
                <h3>{game.title}</h3>
                <p>{game.description}</p>
                <span className="play-caption">
                  5 câu ·{' '}
                  {progress.best[mode] !== undefined
                    ? `Kỷ lục ${progress.best[mode]}/50 điểm`
                    : 'Một khởi đầu mới'}
                </span>
                <span className="feature-link">
                  Bắt đầu chơi <ArrowRight size={17} />
                </span>
              </Link>
            )
          )}
        </div>
      </section>
      <section className="play-section" aria-labelledby="journey-title" aria-busy={!ready}>
        <div className="section-heading">
          <div>
            <div className="eyebrow">TỪNG CHÚT MỘT, THÀNH TRI ÂM</div>
            <h2 id="journey-title">Hành trình của bạn</h2>
          </div>
        </div>
        {!ready ? (
          <p role="status">Đang mở sổ thành tích…</p>
        ) : (
          <>
            <div className="play-stats">
              <div>
                <Sparkles size={20} />
                <strong>{progress.xp} XP</strong>
                <span>Điểm tích lũy</span>
              </div>
              <div>
                <Flame size={20} />
                <strong>{today ? currentStreak(progress.dates, today) : 0} ngày</strong>
                <span>Chuỗi ngày hoàn thành</span>
              </div>
              <div>
                <Medal size={20} />
                <strong>{progress.sessions} lượt</strong>
                <span>
                  {progress.sessions
                    ? `${Math.round((progress.correct / (progress.sessions * 5)) * 100)}% câu trả lời đúng`
                    : 'Sẵn sàng cho lượt đầu tiên'}
                </span>
              </div>
            </div>
            <div className="play-level">
              <span>
                Cấp {level} · Thêm {100 - (progress.xp % 100)} XP để lên cấp
              </span>
              <progress value={progress.xp % 100} max={100} aria-label={`Tiến độ cấp ${level}`} />
            </div>
            <div className="play-badges">
              {badges(progress).map(badge => (
                <div className={`play-badge ${badge.unlocked ? 'unlocked' : ''}`} key={badge.title}>
                  <Medal size={25} />
                  <h3>{badge.title}</h3>
                  <p>{badge.description}</p>
                  <span>{badge.unlocked ? 'Đã mở khóa' : 'Chưa mở khóa'}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      <p className="notice play-section">
        {storageAvailable
          ? 'Thành tích chỉ được lưu trong trình duyệt này, không cần tài khoản. Xóa dữ liệu trình duyệt sẽ xóa thành tích.'
          : 'Trình duyệt không cho phép lưu dữ liệu. Thành tích chỉ được giữ trong phiên này.'}{' '}
        Hoàn thành cả 5 câu để ghi nhận lượt chơi. Câu đúng: 10 điểm, dùng gợi ý: 5 điểm. Chơi lại
        thử thách ngày không cộng thêm XP hay lượt chơi.
      </p>
    </div>
  )
}
