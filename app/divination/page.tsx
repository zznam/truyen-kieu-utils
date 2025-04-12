'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { getRandomVerse } from '../actions/divination-actions'

interface VerseResult {
  id: number
  verse: string
  interpretation: string
}

export default function Divination() {
  const [question, setQuestion] = useState('')
  const [selectedVerse, setSelectedVerse] = useState<VerseResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleDivination = async () => {
    setIsLoading(true)
    try {
      const result = await getRandomVerse(question)
      setSelectedVerse(result)
    } catch (error) {
      console.error('Error in divination:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setSelectedVerse(null)
    setQuestion('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-white/90 backdrop-blur border-amber-200">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-amber-800">Xem Bói Kiều</CardTitle>
              <CardDescription>
                Hãy đặt câu hỏi trong lòng và nhấn nút để nhận được câu Kiều của bạn
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedVerse ? (
                <div className="space-y-4">
                  <Textarea
                    placeholder="Nhập câu hỏi của bạn (không bắt buộc)..."
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    className="border-amber-200 focus:border-amber-400 h-32"
                  />
                  <div className="text-center">
                    <Button
                      onClick={handleDivination}
                      disabled={isLoading}
                      className="bg-amber-600 hover:bg-amber-700 text-white w-full md:w-auto"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Đang chọn câu Kiều...
                        </>
                      ) : (
                        'Xem bói Kiều'
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {question && (
                    <div>
                      <h3 className="text-sm font-medium text-amber-700 mb-1">Câu hỏi của bạn:</h3>
                      <p className="text-amber-900 italic">{question}</p>
                    </div>
                  )}

                  <div className="border-t border-b border-amber-200 py-6 my-6">
                    <h3 className="text-sm font-medium text-amber-700 mb-2">Câu Kiều của bạn:</h3>
                    <p className="text-xl text-center font-medium text-amber-900 my-4">
                      {selectedVerse.verse}
                    </p>
                    <p className="text-xs text-center text-amber-600">Câu {selectedVerse.id}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-amber-700 mb-2">Ý nghĩa:</h3>
                    <p className="text-amber-900 whitespace-pre-line">
                      {selectedVerse.interpretation}
                    </p>
                  </div>

                  <div className="text-center pt-4">
                    <Button
                      onClick={handleReset}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Xem bói lại
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="text-center text-sm text-amber-700 justify-center">
              Lưu ý: Bói Kiều chỉ mang tính chất tham khảo và giải trí
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
