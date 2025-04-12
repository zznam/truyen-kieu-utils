import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-12 md:flex-row">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <p className="text-center text-sm leading-loose md:text-left">
            © {new Date().getFullYear()} Truyện Kiều Utils. Open source under MIT License. Built
            with ❤️ by{' '}
            <Link
              href="https://github.com/zznam"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              zznam
            </Link>{' '}
            using Next.js, v0.dev, and Claude AI.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="https://github.com/zznam/truyen-kieu-utils"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            GitHub
          </Link>
        </div>
      </div>
    </footer>
  )
}
