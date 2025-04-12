import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100">
      <div className="container mx-auto px-4 py-12">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-amber-800 mb-4">Bói Kiều</h1>
          <p className="text-lg text-amber-700 max-w-2xl mx-auto">
            Khám phá truyền thống bói Kiều - phương pháp giải đoán vận mệnh dựa trên tác phẩm Truyện
            Kiều của đại thi hào Nguyễn Du
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <Card className="bg-white/80 backdrop-blur border-amber-200">
            <CardHeader>
              <CardTitle className="text-amber-800">Giới thiệu về Bói Kiều</CardTitle>
              <CardDescription>Tìm hiểu về nguồn gốc và ý nghĩa</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-amber-900">
                Bói Kiều là một phương pháp bói toán dân gian của người Việt, sử dụng các câu thơ
                trong tác phẩm Truyện Kiều của Nguyễn Du để giải đoán vận mệnh, tâm trạng và đưa ra
                lời khuyên cho người xem bói.
              </p>
              <p className="mt-4 text-amber-900">
                Phương pháp này đã tồn tại hàng trăm năm trong văn hóa Việt Nam, phản ánh sự ảnh
                hưởng sâu sắc của Truyện Kiều đối với đời sống tinh thần của người Việt.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/about">
                <Button
                  variant="outline"
                  className="border-amber-600 text-amber-800 hover:bg-amber-100"
                >
                  Tìm hiểu thêm
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="bg-white/80 backdrop-blur border-amber-200">
            <CardHeader>
              <CardTitle className="text-amber-800">Xem Bói Kiều</CardTitle>
              <CardDescription>Khám phá vận mệnh của bạn qua Truyện Kiều</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-amber-900">
                Hãy đặt một câu hỏi trong lòng, tập trung suy nghĩ và nhấn nút bên dưới để nhận được
                một câu Kiều ngẫu nhiên. Ý nghĩa của câu thơ sẽ giúp bạn soi rọi vấn đề đang gặp
                phải.
              </p>
              <p className="mt-4 text-amber-900">
                Mỗi câu thơ trong Truyện Kiều đều chứa đựng những thông điệp sâu sắc về cuộc sống,
                tình yêu, số phận và đạo lý nhân sinh.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/divination">
                <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                  Bắt đầu xem bói
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-16 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-semibold text-amber-800 mb-6">Cách thức xem bói Kiều</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/80 backdrop-blur p-6 rounded-lg border border-amber-200">
              <div className="text-amber-600 font-bold text-xl mb-2">1</div>
              <h3 className="text-amber-800 font-medium mb-2">Đặt câu hỏi</h3>
              <p className="text-amber-900">
                Tập trung suy nghĩ về vấn đề bạn đang gặp phải hoặc điều bạn muốn biết
              </p>
            </div>
            <div className="bg-white/80 backdrop-blur p-6 rounded-lg border border-amber-200">
              <div className="text-amber-600 font-bold text-xl mb-2">2</div>
              <h3 className="text-amber-800 font-medium mb-2">Chọn câu Kiều</h3>
              <p className="text-amber-900">
                Nhấn nút để hệ thống chọn ngẫu nhiên một câu thơ từ Truyện Kiều
              </p>
            </div>
            <div className="bg-white/80 backdrop-blur p-6 rounded-lg border border-amber-200">
              <div className="text-amber-600 font-bold text-xl mb-2">3</div>
              <h3 className="text-amber-800 font-medium mb-2">Giải đoán ý nghĩa</h3>
              <p className="text-amber-900">
                Đọc và suy ngẫm về ý nghĩa của câu thơ trong ngữ cảnh câu hỏi của bạn
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 max-w-3xl mx-auto">
          <Card className="bg-white/80 backdrop-blur border-amber-200">
            <CardHeader>
              <CardTitle className="text-amber-800">Lẩy Kiều</CardTitle>
              <CardDescription>Khám phá nghệ thuật trích dẫn Truyện Kiều</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-amber-900">
                Lẩy Kiều là một nghệ thuật trích dẫn và vận dụng các câu thơ trong Truyện Kiều vào
                cuộc sống hàng ngày. Đây là một nét đẹp văn hóa thể hiện sự am hiểu và yêu mến tác
                phẩm của Nguyễn Du.
              </p>
              <p className="mt-4 text-amber-900">
                Khám phá cách người xưa và người nay sử dụng những câu Kiều để diễn tả tâm trạng,
                bày tỏ tình cảm, hoặc đưa ra những lời khuyên sâu sắc.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/lay-kieu">
                <Button
                  variant="outline"
                  className="border-amber-600 text-amber-800 hover:bg-amber-100"
                >
                  Khám phá Lẩy Kiều
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
