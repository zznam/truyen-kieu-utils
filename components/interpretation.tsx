'use client'
import { useEffect, useRef, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
export function Interpretation({ text, question = '' }: { text: string; question?: string }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  async function analyze() {
    controller.current?.abort()
    controller.current = new AbortController()
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/analyze-lay-kieu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, question }),
        signal: controller.current.signal,
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Chưa thể tải bình giải.')
      setResult(data.data)
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') setError(error.message)
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="interpretation">
      <button className="button secondary" onClick={analyze} disabled={loading}>
        {loading ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
        {loading ? 'Đang bình giải…' : result ? 'Bình giải lại' : 'Gợi mở cùng AI'}
      </button>
      <p className="privacy-note">
        Khi chọn, đoạn thơ{question ? ' và tâm sự của bạn' : ''} được gửi đến Google Gemini. Bình
        giải AI có thể chưa chính xác.
      </p>
      <div aria-live="polite">
        {error && (
          <p className="notice" role="status">
            {error}
          </p>
        )}
        {result && (
          <div className="markdown">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
