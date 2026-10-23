'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Feather,
  Sparkles,
  Search,
  Bookmark,
  Flower2,
} from 'lucide-react'
import { Landscape } from '@/components/landscape'
import { PassageCard } from '@/components/passage-card'
import { useLibrary } from '@/components/library-provider'
import { dailyPassage, getPassage } from '@/lib/kieu'

export default function Home() {
  const [query, setQuery] = useState('')
  const [daily, setDaily] = useState(getPassage(1))
  const { library } = useLibrary()
  useEffect(() => setDaily(dailyPassage(new Date())), [])
  return (
    <div className="shell home">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="tiny-line" /> GẶP LẠI MỘT DI SẢN
          </div>
          <h1>
            Trăm năm câu chữ.
            <br />
            <em>
              Vẹn nguyên
              <br className="desktop-break" /> rung động.
            </em>
          </h1>
          <p>
            Một khoảng lặng để đọc Kiều, tìm thấy mình trong những vần thơ và chạm vào vẻ đẹp của
            tiếng Việt.
          </p>
          <div className="hero-buttons">
            <Link href={`/full?line=${library.progress}`} className="button primary">
              <BookOpen size={18} />
              {library.progress > 1 ? 'Tiếp tục đọc Kiều' : 'Mở trang Kiều'}
              <ArrowRight size={17} />
            </Link>
            <Link href="/divination" className="text-link">
              Gieo một duyên thơ <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="hero-credit">
            <span>NGUYỄN DU</span>
            <span className="credit-divider" />
            Truyện Kiều · Đoạn trường tân thanh
          </div>
        </div>
        <div className="hero-art">
          <Landscape />
          <div className="vertical-label">ĐOẠN TRƯỜNG TÂN THANH</div>
          <div className="art-quote">
            <span className="quote-mark">“</span>
            <p>
              Cảo thơm lần giở trước đèn,
              <br />
              Phong tình có lục còn truyền sử xanh.
            </p>
            <span>TRUYỆN KIỀU · NGUYỄN DU</span>
          </div>
          <div className="art-seal">
            NGUYỄN
            <br />
            DU
          </div>
          <span className="art-caption">MỘT DI SẢN, VẠN CẢM HỨNG</span>
        </div>
      </section>
      <form action="/full" className="home-search">
        <Search size={21} />
        <label className="sr-only" htmlFor="home-search">
          Tìm câu thơ
        </label>
        <input
          id="home-search"
          name="q"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Bạn đang nhớ câu Kiều nào?"
        />
        <span className="search-hint">Tìm cả khi không dấu</span>
        <button type="submit" className="icon-button" aria-label="Tìm kiếm">
          <ArrowRight size={20} />
        </button>
      </form>
      <section className="explore-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">MỖI CÁCH ĐỌC, MỘT KHÁM PHÁ</div>
            <h2>Kiều, theo cách của bạn.</h2>
          </div>
          <span className="section-side-note">Văn chương gần hơn mỗi ngày.</span>
        </div>
        <div className="feature-grid">
          <Link href="/full" className="feature-card">
            <span className="feature-icon green">
              <BookOpen size={23} />
            </span>
            <span className="feature-index">01</span>
            <h3>Đọc & chiêm nghiệm</h3>
            <p>Thả mình vào từng vần lục bát. Tìm kiếm, đánh dấu và đọc tiếp từ nơi bạn dừng.</p>
            <span className="feature-link">
              Đọc Truyện Kiều <ArrowUpRight size={19} />
            </span>
          </Link>
          <Link href="/divination" className="feature-card">
            <span className="feature-icon clay">
              <Sparkles size={23} />
            </span>
            <span className="feature-index">02</span>
            <h3>Một chút duyên Kiều</h3>
            <p>Mang theo một tâm sự, đón nhận một câu thơ. Biết đâu bạn sẽ tìm thấy sự đồng cảm.</p>
            <span className="feature-link">
              Khám phá Bói Kiều <ArrowUpRight size={19} />
            </span>
          </Link>
          <Link href="/lay-kieu" className="feature-card">
            <span className="feature-icon ochre">
              <Feather size={23} />
            </span>
            <span className="feature-index">03</span>
            <h3>Câu xưa, cảm hứng mới</h3>
            <p>
              Tìm câu thơ theo cảm xúc hoặc thử ghép lục bát, để lời Kiều kể câu chuyện của bạn.
            </p>
            <span className="feature-link">
              Thử Lẩy Kiều <ArrowUpRight size={19} />
            </span>
          </Link>
        </div>
      </section>
      <Link href="/play" className="home-play-link">
        <span>
          <strong>Chơi cùng Kiều</strong>
          <br />
          Điền chữ, nối câu, xếp thơ — mỗi ngày một thử thách mới.
        </span>
        <span className="text-link">
          Thử tài nhớ Kiều <ArrowRight size={18} />
        </span>
      </Link>
      <section className="daily-section">
        <div className="daily-intro">
          <div className="eyebrow">
            <Flower2 size={17} /> MỖI NGÀY MỘT CÂU KIỀU
          </div>
          <h2>
            Một vần thơ.
            <br /> Một khoảng lặng.
          </h2>
          <p>Đôi khi, chỉ một câu thơ cũng đủ để nhìn ngày hôm nay khác đi một chút.</p>
          <Link href="/saved" className="text-link">
            <Bookmark size={16} />
            Ghé bộ sưu tập của bạn <ArrowRight size={16} />
          </Link>
        </div>
        <PassageCard passage={daily} label="GỬI BẠN HÔM NAY" />
      </section>
      <section className="heritage-note">
        <span className="mini-seal">k.</span>
        <p>Hơn hai thế kỷ, những câu Kiều vẫn tìm được đường đến trái tim người đọc.</p>
        <Link href="/about" className="text-link">
          Về Truyện Kiều <ArrowUpRight size={16} />
        </Link>
      </section>
    </div>
  )
}
