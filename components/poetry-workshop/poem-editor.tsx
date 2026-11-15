'use client'

import Link from 'next/link'
import { useState } from 'react'
import { verses } from '@/lib/kieu'
import { moveWorkshopStanza, workshopRhyme, type WorkshopStanza } from '@/lib/poetry-workshop'
import { RhymeLine } from './source-picker'

const source = new Map(verses.map(verse => [verse.id, verse]))

export function PoemEditor({
  title,
  stanzas,
  onChange,
  onReplace,
}: {
  title: string
  stanzas: WorkshopStanza[]
  onChange: (stanzas: WorkshopStanza[]) => void
  onReplace: (index: number) => void
}) {
  const [preview, setPreview] = useState(false)
  return (
    <section
      className={`workshop-card workshop-poem ${preview ? 'workshop-preview' : ''}`}
      aria-labelledby="workshop-poem-title"
    >
      <div className="workshop-actions">
        <h2 id="workshop-poem-title">{title || 'Bài ghép của bạn'}</h2>
        <button
          className="button secondary"
          aria-pressed={preview}
          onClick={() => setPreview(value => !value)}
        >
          {preview ? 'Trở lại chỉnh sửa' : 'Xem bản đọc'}
        </button>
      </div>
      {!stanzas.length && (
        <p className="workshop-empty">
          Bài ghép còn trống. Chọn câu nguồn hoặc ghép theo hạt giống để bắt đầu.
        </p>
      )}
      {stanzas.map((stanza, index) => {
        const six = source.get(stanza.sixId)!
        const eight = source.get(stanza.eightId)!
        const rhyme = workshopRhyme(stanza)
        return (
          <article className="workshop-stanza" key={stanza.id} aria-label={`Cặp ${index + 1}`}>
            <div className="eyebrow">
              CẶP {index + 1}
              {stanza.locked ? ' · ĐÃ KHÓA' : ''}
            </div>
            <blockquote>
              <p>
                <RhymeLine text={six.text} position={6} />
              </p>
              <p>
                <RhymeLine text={eight.text} position={6} />
              </p>
            </blockquote>
            <div className="source-links">
              <Link
                href={`/full?line=${stanza.sixId}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Gốc dòng ${stanza.sixId} (mở thẻ mới)`}
              >
                Gốc dòng {stanza.sixId}
              </Link>
              <span>+</span>
              <Link
                href={`/full?line=${stanza.eightId}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Gốc dòng ${stanza.eightId} (mở thẻ mới)`}
              >
                Gốc dòng {stanza.eightId}
              </Link>
            </div>
            {rhyme && (
              <p className="small muted">
                Vần chữ: “{rhyme.sixWord}” ↔ “{rhyme.eightWord}” · âm vần “{rhyme.key}”
              </p>
            )}
            <div className="workshop-actions workshop-edit-actions">
              <button
                className="button secondary"
                aria-label={`${stanza.locked ? 'Mở khóa' : 'Khóa'} cặp ${index + 1}`}
                aria-pressed={stanza.locked}
                onClick={() =>
                  onChange(
                    stanzas.map(item =>
                      item.id === stanza.id ? { ...item, locked: !item.locked } : item
                    )
                  )
                }
              >
                {stanza.locked ? 'Mở khóa' : 'Khóa cặp'}
              </button>
              <button
                className="button secondary"
                aria-label={`Đổi cặp ${index + 1}`}
                disabled={stanza.locked}
                onClick={() => onReplace(index)}
              >
                Đổi cách ghép
              </button>
              <button
                className="button secondary"
                aria-label={`Đưa cặp ${index + 1} lên`}
                disabled={index === 0}
                onClick={() => onChange(moveWorkshopStanza(stanzas, stanza.id, -1))}
              >
                ↑ Lên
              </button>
              <button
                className="button secondary"
                aria-label={`Đưa cặp ${index + 1} xuống`}
                disabled={index === stanzas.length - 1}
                onClick={() => onChange(moveWorkshopStanza(stanzas, stanza.id, 1))}
              >
                ↓ Xuống
              </button>
              <button
                className="text-button"
                aria-label={`Bỏ cặp ${index + 1}`}
                onClick={() => onChange(stanzas.filter(item => item.id !== stanza.id))}
              >
                Bỏ cặp
              </button>
            </div>
          </article>
        )
      })}
      <p className="small muted">
        Lẩy Kiều — ghép lại từ câu thơ Nguyễn Du. Mỗi cặp được đối chiếu vần chữ; luật thanh, vần
        nối giữa các cặp và ý nghĩa chưa được kiểm chứng đầy đủ.
      </p>
    </section>
  )
}
