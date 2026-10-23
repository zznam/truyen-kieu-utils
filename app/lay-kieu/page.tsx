'use client'
import { useState } from 'react'
import { Feather, Shuffle, ArrowRight, Copy, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { topics, topicPassages } from '@/lib/kieu'
import { PassageCard } from '@/components/passage-card'
import { Interpretation } from '@/components/interpretation'
import { useGamification } from '@/components/gamification-provider'

type Result = { verse6: string; verse8: string; id6: number; id8: number; result: string }
export default function LayKieu() {
  const { track } = useGamification()
  const [topic, setTopic] = useState('all')
  const [offset, setOffset] = useState(0)
  const [count, setCount] = useState('2')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const passages = topicPassages(topic)
  const visible = Array.from(
    { length: Math.min(6, passages.length) },
    (_, index) => passages[(offset + index) % passages.length]
  )
  async function generate() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/lay-kieu?count=${count}`)
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Chưa thể ghép câu thơ.')
      setResults(data.data.results)
      track({ type: 'create', id: crypto.randomUUID() })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Chưa thể ghép câu thơ.')
    } finally {
      setLoading(false)
    }
  }
  const combined = results.map(item => item.result).join('\n\n')
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${combined}\n— Lẩy Kiều, ghép từ câu thơ Nguyễn Du`)
      toast.success('Đã sao chép bài Lẩy Kiều')
    } catch {
      toast.error('Chưa thể sao chép. Bạn có thể chọn văn bản trực tiếp.')
    }
  }
  return (
    <div className="shell page-content">
      <header className="page-heading">
        <div className="eyebrow">CÂU XƯA, CẢM HỨNG MỚI</div>
        <h1>Để Kiều nói hộ lòng bạn.</h1>
        <p>Tìm một câu thơ hợp tâm tình. Hoặc thử ghép những vần lục bát theo cách riêng.</p>
      </header>
      <div className="section-heading">
        <h2>Bạn tìm cảm hứng gì?</h2>
        <button
          className="text-button"
          onClick={() => setOffset(Math.floor(Math.random() * passages.length))}
        >
          <Shuffle size={16} />
          Đổi gợi ý
        </button>
      </div>
      <div className="topic-tabs" role="group" aria-label="Chủ đề câu thơ">
        {topics.map(item => (
          <button
            key={item.id}
            aria-pressed={topic === item.id}
            className={topic === item.id ? 'active' : ''}
            onClick={() => {
              setTopic(item.id)
              setOffset(0)
              if (item.id !== 'all')
                track({ type: 'explore', id: `topic:${item.id}`, topic: item.id })
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="collection-grid">
        {visible.map(pair => (
          <PassageCard key={pair[0].id} passage={pair} />
        ))}
      </div>
      <section className="compose-section">
        <div>
          <div className="eyebrow">
            <Feather size={17} /> GÓC THỬ NGHIỆM
          </div>
          <h2>Thử một cách ghép mới.</h2>
          <p>
            Ghép câu sáu với câu tám từ những vị trí khác nhau. Vần cuối câu lục được đối chiếu với
            tiếng thứ sáu câu bát.
          </p>
          <p className="muted small">
            Đây là gợi ý ghép theo vần chữ, chưa kiểm tra đầy đủ luật thanh và ý nghĩa. Hãy đọc lại
            để tìm sự kết hợp bạn yêu thích.
          </p>
          <div className="compose-controls">
            <label htmlFor="pair-count" className="sr-only">
              Số cặp câu
            </label>
            <select id="pair-count" value={count} onChange={event => setCount(event.target.value)}>
              {[1, 2, 4, 8, 16].map(value => (
                <option key={value} value={value}>
                  {value} cặp câu
                </option>
              ))}
            </select>
            <button className="button primary" disabled={loading} onClick={generate}>
              {loading ? <Loader2 size={17} className="animate-spin" /> : <Shuffle size={17} />}
              {loading ? 'Đang ghép…' : 'Ghép Lẩy Kiều'}
            </button>
          </div>
          {error && (
            <p className="notice" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="compose-result" aria-live="polite">
          {results.length ? (
            <>
              <div className="section-heading">
                <span className="eyebrow">BẢN GHÉP CỦA BẠN</span>
                <button className="icon-button" aria-label="Sao chép bài Lẩy Kiều" onClick={copy}>
                  <Copy size={17} />
                </button>
              </div>
              {results.map((item, index) => (
                <div className="composed-pair" key={`${item.id6}-${item.id8}-${index}`}>
                  <blockquote>
                    <p>{item.verse6}</p>
                    <p>{item.verse8}</p>
                  </blockquote>
                  <div className="source-links">
                    <Link href={`/full?line=${item.id6}`}>Gốc dòng {item.id6}</Link>
                    <span>+</span>
                    <Link href={`/full?line=${item.id8}`}>Gốc dòng {item.id8}</Link>
                  </div>
                </div>
              ))}
              <Interpretation key={combined} text={combined} />
            </>
          ) : (
            <div className="empty-state">
              <Feather size={30} />
              <h3>Một vần thơ đang chờ bạn</h3>
              <p>Chọn số cặp câu rồi bắt đầu ghép.</p>
              <ArrowRight size={20} />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
