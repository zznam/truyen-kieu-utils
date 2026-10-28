import { normalize } from '@/lib/kieu'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

export function Meter({ label, value, target }: { label: string; value: number; target: number }) {
  return (
    <div className="adventure-meter">
      <div className="adventure-meter-label">
        <span>{label}</span>
        <span>
          {Math.min(value, target)} / {target}
        </span>
      </div>
      <progress aria-label={label} value={Math.min(value, target)} max={Math.max(1, target)} />
    </div>
  )
}

export function Heading({
  title,
  children,
  extra,
}: {
  title: string
  children: ReactNode
  extra?: ReactNode
}) {
  return (
    <div className="adventure-section-heading">
      <div>
        <h2>{title}</h2>
        <p>{children}</p>
      </div>
      {extra}
    </div>
  )
}

export function Empty({
  title,
  children,
  href,
  action,
}: {
  title: string
  children: ReactNode
  href?: string
  action?: string
}) {
  return (
    <div className="adventure-empty">
      <h3>{title}</h3>
      <p>{children}</p>
      {href && (
        <Link className="button" href={href}>
          {action || 'Bắt đầu'} <ArrowRight size={15} />
        </Link>
      )}
    </div>
  )
}

export function matches(value: string, query: string) {
  return normalize(value).includes(normalize(query))
}
