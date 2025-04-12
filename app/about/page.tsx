import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-white/90 backdrop-blur border-amber-200 mb-8">
            <CardHeader>
              <CardTitle className="text-2xl text-amber-800">Về Bói Kiều</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-amber-900">
              <p>
                Bói Kiều là một phương pháp bói toán dân gian của người Việt, sử dụng các câu thơ
                trong tác phẩm Truyện Kiều của đại thi hào Nguyễn Du để giải đoán vận mệnh và đưa ra
                lời khuyên cho người xem bói.
              </p>

              <p>
                Truyện Kiều, hay còn gọi là Đoạn Trường Tân Thanh, là một kiệt tác văn học Việt Nam
                được sáng tác vào đầu thế kỷ 19. Tác phẩm gồm 3254 câu thơ lục bát, kể về cuộc đời
                đầy biến cố của nàng Thúy Kiều.
              </p>

              <p>
                Phương pháp bói Kiều đã tồn tại trong văn hóa Việt Nam từ lâu đời, phản ánh tầm ảnh
                hưởng sâu rộng của Truyện Kiều đối với đời sống tinh thần của người Việt. Người xem
                bói thường đặt một câu hỏi trong lòng, sau đó mở ngẫu nhiên một trang trong Truyện
                Kiều và đọc câu thơ hiện ra để giải đoán.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur border-amber-200 mb-8">
            <CardHeader>
              <CardTitle className="text-2xl text-amber-800">Ý nghĩa văn hóa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-amber-900">
              <p>
                Bói Kiều không chỉ đơn thuần là một hình thức bói toán mà còn là cách người Việt tìm
                đến văn chương để giải tỏa tâm tư, tìm kiếm lời khuyên và sự an ủi trong cuộc sống.
              </p>

              <p>
                Truyện Kiều chứa đựng nhiều triết lý nhân sinh sâu sắc về số phận, tình yêu, đạo đức
                và các giá trị truyền thống. Vì vậy, các câu thơ trong Truyện Kiều thường có thể áp
                dụng vào nhiều hoàn cảnh khác nhau của cuộc sống.
              </p>

              <p>
                Ngày nay, Bói Kiều vẫn được nhiều người Việt Nam thực hành, đặc biệt là vào dịp đầu
                năm mới hoặc khi họ đối mặt với những quyết định quan trọng trong cuộc sống.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur border-amber-200">
            <CardHeader>
              <CardTitle className="text-2xl text-amber-800">Cách thức xem bói</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-amber-900">
              <p>Truyền thống xem bói Kiều thường được thực hiện như sau:</p>

              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  Người xem bói tập trung suy nghĩ về vấn đề đang gặp phải hoặc câu hỏi muốn được
                  giải đáp.
                </li>
                <li>
                  Sau đó, họ mở ngẫu nhiên một trang trong cuốn Truyện Kiều và đọc câu thơ hiện ra.
                </li>
                <li>
                  Ý nghĩa của câu thơ được giải thích trong ngữ cảnh của câu hỏi để đưa ra lời
                  khuyên hoặc dự đoán.
                </li>
              </ol>

              <p>
                Trong phiên bản trực tuyến này, hệ thống sẽ chọn ngẫu nhiên một câu thơ từ Truyện
                Kiều và cung cấp lời giải đoán tương ứng.
              </p>

              <p className="italic">
                Lưu ý: Bói Kiều chỉ mang tính chất tham khảo và giải trí, không nên xem đây là cơ sở
                duy nhất để đưa ra các quyết định quan trọng trong cuộc sống.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
