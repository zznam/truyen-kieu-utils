import Link from 'next/link'
import { ArrowRight, BookOpen, Heart, ShieldCheck } from 'lucide-react'
export default function About() {
  return (
    <div className="shell page-content about-page">
      <header className="page-heading">
        <div className="eyebrow">VĂN CHƯƠNG GẦN HƠN MỖI NGÀY</div>
        <h1>
          Một di sản.
          <br />
          <em>Vạn cảm hứng.</em>
        </h1>
        <p>Kiều là một không gian nhỏ để gặp lại tác phẩm của Nguyễn Du, theo nhịp sống hôm nay.</p>
      </header>
      <div className="about-grid">
        <article className="article-copy">
          <h2>Từ trang sách đến cuộc sống</h2>
          <p>
            Truyện Kiều, còn mang tên Đoạn trường tân thanh, kể về cuộc đời nhiều biến cố của Thúy
            Kiều. Những vần lục bát về tình yêu, chữ hiếu, tài năng và thân phận đã trở thành một
            phần quen thuộc trong tiếng nói, tâm thức người Việt.
          </p>
          <p>
            Dự án này mời bạn đọc chậm, tìm lại câu thơ mình nhớ, và giữ những đoạn chạm đến cảm xúc
            của riêng mình.
          </p>
          <h2>Bói Kiều & Lẩy Kiều</h2>
          <p>
            Bói Kiều là một cách tìm đến văn chương để gửi gắm tâm sự. Ở đây, bạn nhận một đoạn thơ
            ngẫu nhiên và tự chiêm nghiệm; đó là trải nghiệm văn hóa, không phải dự đoán tương lai.
          </p>
          <p>
            Lẩy Kiều vận dụng câu chữ trong tác phẩm để diễn đạt tâm tình mới. Góc thử nghiệm ghép
            câu trong ứng dụng đối chiếu vần chữ, giúp bạn khám phá những kết hợp để tiếp tục đọc và
            chỉnh lại theo cảm nhận.
          </p>
          <h2>Về bản văn</h2>
          <p>
            Ứng dụng giữ nguyên dữ liệu của dự án gốc, chỉ làm gọn khoảng trắng và dấu câu khi hiển
            thị. Bản dữ liệu có 3.257 mục, trong đó có dòng ghép và khác biệt về đánh số. Số dòng
            trong ứng dụng là mã tra cứu của bản này, không phải hệ thống số câu của mọi ấn bản.
          </p>
          <p>
            Khi dùng cho học tập hoặc trích dẫn học thuật, hãy đối chiếu một ấn bản đã được khảo
            đính. Bình giải AI, nếu được bật, là nội dung tham khảo và có thể chưa chính xác.
          </p>
          <Link href="/full" className="button primary">
            Mở trang Kiều
            <ArrowRight size={17} />
          </Link>
        </article>
        <aside className="about-values">
          <div>
            <BookOpen size={24} />
            <h3>Đọc theo cách của bạn</h3>
            <p>Tìm không dấu, đổi cỡ chữ, bật chế độ tối và trở lại vị trí đã lưu.</p>
          </div>
          <div>
            <Heart size={24} />
            <h3>Giữ những điều yêu thích</h3>
            <p>Lưu câu thơ và tải bộ sưu tập thành văn bản để mang theo bên mình.</p>
          </div>
          <div>
            <ShieldCheck size={24} />
            <h3>Một khoảng riêng tư</h3>
            <p>
              Dấu trang và tiến độ ở trong trình duyệt. Chỉ khi bạn chọn bình giải AI, đoạn thơ và
              tâm sự đi kèm mới được gửi đến Google Gemini.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
