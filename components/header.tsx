'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import { Bookmark, Menu, Moon, Sun, X } from 'lucide-react'
import { useLibrary } from './library-provider'

const links = [
  ['/', 'Khám phá'],
  ['/full', 'Đọc Truyện Kiều'],
  ['/divination', 'Bói Kiều'],
  ['/lay-kieu', 'Lẩy Kiều'],
  ['/play', 'Chơi cùng Kiều'],
]
export function Header() {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const { library } = useLibrary()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const header = useRef<HTMLElement>(null)
  const menuToggle = useRef<HTMLButtonElement>(null)
  useEffect(() => setMounted(true), [])
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    function dismissOutside(event: Event) {
      if (event.target instanceof Node && !header.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    function dismissWithEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpen(false)
      menuToggle.current?.focus()
    }
    const desktop = window.matchMedia('(min-width: 1001px)')
    const dismissOnDesktop = () => {
      if (desktop.matches) setOpen(false)
    }
    document.addEventListener('pointerdown', dismissOutside)
    document.addEventListener('focusin', dismissOutside)
    document.addEventListener('keydown', dismissWithEscape)
    desktop.addEventListener('change', dismissOnDesktop)
    return () => {
      document.removeEventListener('pointerdown', dismissOutside)
      document.removeEventListener('focusin', dismissOutside)
      document.removeEventListener('keydown', dismissWithEscape)
      desktop.removeEventListener('change', dismissOnDesktop)
    }
  }, [open])
  return (
    <header className="site-header" ref={header}>
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label="Kiều — Trang chủ">
          <span className="brand-seal">k.</span>
          <span>
            Kiều<span className="brand-caption">MỘT DI SẢN, VẠN CẢM HỨNG</span>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Điều hướng chính">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={
                pathname === href || (href === '/play' && pathname.startsWith('/play/'))
                  ? 'active'
                  : ''
              }
              aria-current={
                pathname === href || (href === '/play' && pathname.startsWith('/play/'))
                  ? 'page'
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="icon-button"
            aria-label={
              mounted && resolvedTheme === 'dark' ? 'Bật giao diện sáng' : 'Bật giao diện tối'
            }
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            {mounted && resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link className={`saved-link ${pathname === '/saved' ? 'active' : ''}`} href="/saved">
            <Bookmark size={17} />
            <span>Đã lưu</span>
            {library.saved.length > 0 && (
              <span className="count-badge">{library.saved.length}</span>
            )}
          </Link>
          <button
            ref={menuToggle}
            className="icon-button menu-toggle"
            aria-label={open ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" className="mobile-nav shell" aria-label="Điều hướng di động">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => {
                setOpen(false)
                menuToggle.current?.focus()
              }}
              aria-current={
                pathname === href || (href === '/play' && pathname.startsWith('/play/'))
                  ? 'page'
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
