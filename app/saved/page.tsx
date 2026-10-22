'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Bookmark, ArrowRight, Download, Search } from 'lucide-react'
import { useLibrary } from '@/components/library-provider'
import { PassageCard } from '@/components/passage-card'
import { getPassage, normalize, passageText } from '@/lib/kieu'
export default function Saved() {
  const { library, ready } = useLibrary()
  const [query, setQuery] = useState('')
  const passages = library.saved
    .map(getPassage)
    .filter(pair => pair.some(verse => normalize(verse.text).includes(normalize(query))))
  function download() {
    const data = library.saved.map(id => passageText(getPassage(id))).join('\n\n')
    const url = URL.createObjectURL(
      new Blob([`BỘ SƯU TẬP KIỀU\n\n${data}`], { type: 'text/plain;charset=utf-8' })
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'nhung-cau-kieu-da-luu.txt'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <div className="shell page-content saved-page">
      <header className="page-heading">
        <div className="eyebrow">MỘT GÓC CỦA RIÊNG BẠN</div>
        <h1>Những câu thơ ở lại.</h1>
        <p>Lưu một câu hay, giữ một cảm xúc. Bộ sưu tập được lưu trên trình duyệt này.</p>
      </header>
      {!ready ? (
        <p role="status">Đang mở bộ sưu tập…</p>
      ) : library.saved.length ? (
        <>
          <div className="collection-toolbar">
            <div className="search-field">
              <Search size={18} />
              <input
                aria-label="Tìm trong câu thơ đã lưu"
                placeholder="Tìm trong bộ sưu tập…"
                value={query}
                onChange={event => setQuery(event.target.value)}
              />
            </div>
            <button className="button secondary" onClick={download}>
              <Download size={17} />
              Tải bộ sưu tập ({library.saved.length})
            </button>
          </div>
          <div className="collection-grid">
            {passages.map(pair => (
              <PassageCard key={pair[0].id} passage={pair} />
            ))}
          </div>
          {!passages.length && (
            <div className="empty-state">
              <Search size={28} />
              <h2>Chưa có câu thơ phù hợp</h2>
              <button className="text-button" onClick={() => setQuery('')}>
                Xóa tìm kiếm
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state saved-empty">
          <span className="feature-icon green">
            <Bookmark size={28} />
          </span>
          <h2>Câu thơ đầu tiên đang đợi bạn.</h2>
          <p>
            Chọn biểu tượng dấu trang bên cạnh đoạn thơ yêu thích.
            <br />
            Bạn sẽ tìm lại tất cả ở đây.
          </p>
          <Link href="/full" className="button primary">
            Khám phá Truyện Kiều
            <ArrowRight size={17} />
          </Link>
        </div>
      )}
    </div>
  )
}
