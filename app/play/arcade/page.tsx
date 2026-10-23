'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useGamification } from '@/components/gamification-provider'
import { arcadeModes, type ArcadeMode } from '@/lib/arcade'
import './arcade.css'

export default function ArcadePage() {
  const { state, ready } = useGamification()
  const [category, setCategory] = useState('Tất cả')
  const categories = ['Tất cả', ...new Set(Object.values(arcadeModes).map(mode => mode.category))]
  const modes = (
    Object.entries(arcadeModes) as [ArcadeMode, (typeof arcadeModes)[ArcadeMode]][]
  ).filter(([, mode]) => category === 'Tất cả' || mode.category === category)
  return (
    <div className="shell page-content arcade-page">
      <Link className="back-link" href="/play">
        <ArrowLeft size={16} /> Chơi cùng Kiều
      </Link>
      <header className="page-heading">
        <div className="eyebrow">MƯỜI CÁCH ĐỂ CÂU THƠ Ở LẠI</div>
        <h1>Xưởng chơi cùng Kiều.</h1>
        <p>Quan sát, kết nối, tự tay viết lại. Chọn một cách chơi vừa sức hôm nay.</p>
      </header>
      <div className="arcade-gallery-intro">
        <p>Mỗi lượt 5 câu · Không bấm giờ · Có gợi ý · Ghi nhận khi hoàn thành</p>
        <Link className="text-link" href="/play/adventure">
          Sổ thành tích <ArrowRight size={16} />
        </Link>
      </div>
      <div className="arcade-filters" role="group" aria-label="Lọc theo cách học">
        {categories.map(item => (
          <button
            className="arcade-filter"
            key={item}
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <p className="play-caption" role="status">
        {modes.length} cách chơi{category !== 'Tất cả' ? ` · ${category}` : ''}
      </p>
      <div className="arcade-grid">
        {modes.map(([mode, game]) => (
          <Link className="feature-card arcade-mode-card" key={mode} href={`/play/arcade/${mode}`}>
            <span className="eyebrow">{game.category}</span>
            <h2>{game.title}</h2>
            <p>{game.description}</p>
            <span className="play-caption">
              {ready && state.best[`arcade-${mode}`] !== undefined
                ? `Kỷ lục: ${state.best[`arcade-${mode}`]}% câu đúng`
                : 'Bắt đầu một kỹ năng mới'}
            </span>
            <span className="feature-link">
              Vào chơi <ArrowRight size={16} />
            </span>
          </Link>
        ))}
      </div>
      <p className="notice">
        Câu hỏi dùng nguyên văn của bản nhập trong ứng dụng. Một số trò cố ý đổi hoặc che chữ để bạn
        nhận ra; nguyên văn và liên kết nguồn luôn hiện sau mỗi câu. Số tiếng được đếm theo các từ
        cách nhau trong những cặp 6/8 đã kiểm tra.
      </p>
    </div>
  )
}
