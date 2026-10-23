import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
export function Footer() {
  return (
    <footer className="site-footer shell">
      <div>
        <Link href="/" className="footer-brand">
          Kiều.
        </Link>
        <span>Để những vần thơ còn mãi.</span>
      </div>
      <nav aria-label="Thông tin">
        <Link href="/about">Về dự án</Link>
        <a href="https://github.com/zznam/truyen-kieu-utils" target="_blank" rel="noreferrer">
          Mã nguồn mở <ArrowUpRight size={14} />
        </a>
        <span>© {new Date().getFullYear()} Kiều</span>
      </nav>
    </footer>
  )
}
