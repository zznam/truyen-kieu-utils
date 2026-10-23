import type { Metadata } from 'next'
import './fonts.css'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { LibraryProvider } from '@/components/library-provider'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Toaster } from '@/components/ui/sonner'
import { GamificationProvider } from '@/components/gamification-provider'

export const metadata: Metadata = {
  title: { default: 'Kiều — Một di sản, vạn cảm hứng', template: '%s | Kiều' },
  description:
    'Đọc Truyện Kiều, tìm câu thơ yêu thích, lưu dấu trang và khám phá Bói Kiều, Lẩy Kiều trong một không gian dành cho văn chương Việt.',
}
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <GamificationProvider>
            <LibraryProvider>
              <a href="#main-content" className="skip-link">
                Đến nội dung chính
              </a>
              <Header />
              <main id="main-content" tabIndex={-1}>
                {children}
              </main>
              <Footer />
              <Toaster richColors position="bottom-right" />
            </LibraryProvider>
          </GamificationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
