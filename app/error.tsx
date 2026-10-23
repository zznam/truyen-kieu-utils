'use client'
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="shell page-content empty-state">
      <h1>Trang thơ tạm thời gián đoạn.</h1>
      <p>Dữ liệu đã lưu trong trình duyệt vẫn được giữ lại.</p>
      <button className="button primary" onClick={reset}>
        Thử lại
      </button>
    </div>
  )
}
