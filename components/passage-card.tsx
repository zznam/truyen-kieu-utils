'use client'
import Link from 'next/link'
import { Bookmark, Check, Copy, ArrowUpRight, Link2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { passageText, type Verse } from '@/lib/kieu'
import { useLibrary } from './library-provider'

export function PassageActions({ passage }: { passage: Verse[] }) {
  const { library, toggleSaved, ready } = useLibrary()
  const [copied, setCopied] = useState(false)
  if (!passage.length) return null
  const id = passage[0].id
  const saved = library.saved.includes(id)
  async function copy(link = false) {
    try {
      await navigator.clipboard.writeText(
        link ? `${window.location.origin}/full?line=${id}` : passageText(passage)
      )
      setCopied(true)
      toast.success(link ? 'Đã sao chép liên kết đến câu thơ' : 'Đã sao chép câu thơ')
    } catch {
      toast.error('Chưa thể sao chép. Bạn có thể chọn và sao chép văn bản trực tiếp.')
    }
  }
  return (
    <div className="passage-actions">
      <button
        className={`text-button ${saved ? 'is-saved' : ''}`}
        disabled={!ready}
        aria-pressed={saved}
        onClick={() => toggleSaved(id)}
      >
        <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
        {saved ? 'Đã lưu' : 'Lưu câu thơ'}
      </button>
      <button className="icon-button" aria-label="Sao chép câu thơ" onClick={() => copy()}>
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <button className="icon-button" aria-label="Sao chép liên kết" onClick={() => copy(true)}>
        <Link2 size={16} />
      </button>
      <Link
        className="icon-button"
        href={`/full?line=${id}`}
        aria-label={`Đọc ngữ cảnh dòng ${id}`}
      >
        <ArrowUpRight size={18} />
      </Link>
    </div>
  )
}
export function PassageCard({ passage, label }: { passage: Verse[]; label?: string }) {
  return (
    <article className="passage-card">
      <div className="eyebrow">{label || `DÒNG ${passage.map(verse => verse.id).join('–')}`}</div>
      <blockquote>
        {passage.map(verse => (
          <p key={verse.id}>{verse.text}</p>
        ))}
      </blockquote>
      <PassageActions passage={passage} />
    </article>
  )
}
