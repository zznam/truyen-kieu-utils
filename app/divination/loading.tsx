import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function DivinationLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 py-12">
      <div className="container mx-auto px-4">
        <div className="h-8 w-32 mb-8">
          <Skeleton className="h-full w-full" />
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="bg-white/90 backdrop-blur border-amber-200">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-amber-800">Xem Bói Kiều</CardTitle>
              <CardDescription>
                Hãy đặt câu hỏi trong lòng và nhấn nút để nhận được câu Kiều của bạn
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Skeleton className="h-32 w-full" />
                <div className="flex justify-center">
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
