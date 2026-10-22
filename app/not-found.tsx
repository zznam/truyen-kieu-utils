import Link from 'next/link'
export default function NotFound() {
  return (
    <div className="shell page-content empty-state">
      <div className="eyebrow">404 · MỘT TRANG CHƯA VIẾT</div>
      <h1>Trang này chưa có trong sách.</h1>
      <p>Cùng trở lại những vần thơ quen thuộc nhé.</p>
      <Link className="button primary" href="/">
        Về trang khám phá
      </Link>
    </div>
  )
}
