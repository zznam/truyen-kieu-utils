import type React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Bói Kiều - Khám phá vận mệnh qua Truyện Kiều',
  description:
    'Ứng dụng xem bói Kiều trực tuyến dựa trên tác phẩm Truyện Kiều của đại thi hào Nguyễn Du',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative flex min-h-screen flex-col">
            <div className="container mx-auto px-4 py-2">
              <Header />
            </div>
            <main className="flex-1 container mx-auto px-4">{children}</main>
            <div className="container mx-auto px-4 py-2">
              <Footer />
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

import './globals.css'
