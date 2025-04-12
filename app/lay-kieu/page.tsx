'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function LayKieuPage() {
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState('1')
  const [data, setData] = useState<{
    results: Array<{
      verse6: string
      verse8: string
      result: string
    }>
    combinedResult: string
  } | null>(null)

  const generateLayKieu = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/lay-kieu?count=${count}`)
      const responseData = await response.json()

      if (responseData.success) {
        setData(responseData.data)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100">
      <div className="container mx-auto px-4 py-12">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-amber-800 mb-4">Lẩy Kiều</h1>
          <p className="text-lg text-amber-700 max-w-2xl mx-auto">
            Khám phá nghệ thuật Lẩy Kiều - ghép câu 6 với câu 8 trong Truyện Kiều để tạo ra những ý
            nghĩa mới
          </p>
        </header>

        <div className="max-w-2xl mx-auto">
          <Card className="bg-white/80 backdrop-blur border-amber-200 mb-8">
            <CardHeader>
              <CardTitle className="text-amber-800">Giới thiệu</CardTitle>
              <CardDescription>Khám phá nghệ thuật Lẩy Kiều</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-amber-900">
                &ldquo;Lẩy Kiều&rdquo; là dùng câu 6 ghép vào câu 8: Lấy bất kỳ câu nào trong 3.254
                câu trong Truyện Kiều miễn là cùng vần để tạo ra một văn bản hàm nghĩa khác.
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-center items-center gap-4 mb-8">
            <Select value={count} onValueChange={setCount}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Số cặp câu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 cặp câu</SelectItem>
                <SelectItem value="2">2 cặp câu</SelectItem>
                <SelectItem value="4">4 cặp câu</SelectItem>
                <SelectItem value="8">8 cặp câu</SelectItem>
                <SelectItem value="16">16 cặp câu</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={generateLayKieu}
              disabled={loading}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {loading ? 'Đang tạo...' : 'Tạo Lẩy Kiều'}
            </Button>
          </div>

          {data && (
            <div className="space-y-8">
              {data.results.length > 1 && (
                <Card className="bg-white/80 backdrop-blur border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-800">Kết quả tổng hợp</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg text-amber-900 whitespace-pre-line">
                      {data.combinedResult}
                    </p>
                  </CardContent>
                </Card>
              )}

              {data.results.map((result, index) => (
                <Card key={index} className="bg-white/80 backdrop-blur border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-800">Cặp câu {index + 1}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="font-semibold text-amber-800">Câu 6:</p>
                        <p className="text-lg text-amber-900">{result.verse6}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-amber-800">Câu 8:</p>
                        <p className="text-lg text-amber-900">{result.verse8}</p>
                      </div>
                      <div className="pt-4">
                        <p className="font-semibold text-amber-800">Kết quả:</p>
                        <p className="text-lg text-amber-900 whitespace-pre-line">
                          {result.result}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
