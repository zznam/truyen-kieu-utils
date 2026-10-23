'use client'
import { useState } from 'react'
import { ArrowRight, RotateCcw, Sparkles, Flower2 } from 'lucide-react'
import { couplets, type Verse } from '@/lib/kieu'
import { PassageCard } from '@/components/passage-card'
import { Interpretation } from '@/components/interpretation'
export default function Divination() {
  const [question, setQuestion] = useState('')
  const [selected, setSelected] = useState<Verse[] | null>(null)
  const [history, setHistory] = useState<Verse[][]>([])
  function draw() {
    const options = couplets.filter(pair => pair[0].id !== selected?.[0].id)
    const pair = options[Math.floor(Math.random() * options.length)]
    if (selected) setHistory(current => [selected, ...current].slice(0, 5))
    setSelected(pair)
  }
  return (
    <div className="shell page-content">
      <header className="page-heading centered">
        <div className="eyebrow">MỘT NÉT VĂN HÓA, MỘT CHÚT DUYÊN</div>
        <h1>Bạn có một tâm sự?</h1>
        <p>Gửi vào câu chữ. Để một vần Kiều cùng bạn nghĩ suy.</p>
      </header>
      <div className="ritual-layout">
        <div className="ritual-panel">
          <span className="feature-icon clay">
            <Flower2 size={28} />
          </span>
          <h2>Gieo một duyên thơ</h2>
          <p>
            Hít thở thật chậm, nghĩ về điều đang ở trong lòng. Một đoạn Kiều ngẫu nhiên sẽ là điểm
            bắt đầu cho cảm nhận của riêng bạn.
          </p>
          <label htmlFor="question">
            Điều bạn đang nghĩ đến <span className="muted">(không bắt buộc)</span>
          </label>
          <textarea
            id="question"
            maxLength={500}
            placeholder="Một điều mong mỏi, một nỗi băn khoăn…"
            value={question}
            onChange={event => setQuestion(event.target.value)}
            rows={4}
          />
          <div className="input-caption">
            <span>Chỉ ở trong trình duyệt, trừ khi bạn chọn bình giải AI.</span>
            <span>{question.length}/500</span>
          </div>
          <button className="button primary wide" onClick={draw}>
            {selected ? <RotateCcw size={17} /> : <Sparkles size={17} />}
            {selected ? 'Gieo một duyên mới' : 'Đón nhận câu Kiều'}
            <ArrowRight size={17} />
          </button>
          <p className="ritual-note">
            Một trải nghiệm văn hóa để chiêm nghiệm và giải trí. Câu thơ không dự đoán tương lai.
          </p>
        </div>
        <div className="ritual-result" aria-live="polite">
          {selected ? (
            <>
              <PassageCard passage={selected} label="CÂU KIỀU GỬI BẠN" />
              <div className="reflection">
                <span className="eyebrow">MỘT GỢI Ý ĐỂ NGẪM</span>
                <h3>Điều gì trong câu thơ chạm đến bạn?</h3>
                <p>
                  Hãy thử đọc lại thật chậm. Một hình ảnh, một từ, hay một cảm xúc có thể gợi cho
                  bạn một góc nhìn mới.
                </p>
                <Interpretation
                  key={`${selected[0].id}-${question}`}
                  text={selected.map(verse => verse.text).join('\n')}
                  question={question}
                />
              </div>
            </>
          ) : (
            <div className="waiting-poem">
              <span>“</span>
              <blockquote>
                Thiện căn ở tại lòng ta,
                <br />
                Chữ tâm kia mới bằng ba chữ tài.
              </blockquote>
              <p>NGUYỄN DU · TRUYỆN KIỀU</p>
              <div className="waiting-decoration">✳</div>
            </div>
          )}
        </div>
      </div>
      {history.length > 0 && (
        <section className="history-section">
          <div className="section-heading">
            <h2>Những duyên thơ vừa gặp</h2>
            <span className="muted small">Trong phiên này · tối đa 5 đoạn</span>
          </div>
          <div className="collection-grid">
            {history.map((pair, index) => (
              <PassageCard key={`${pair[0].id}-${index}`} passage={pair} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
