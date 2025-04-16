'use client'

import { useState } from 'react'
import { truyenKieuVerses } from '../data/truyen-kieu'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { getVerseExplanation } from '../services/gemini'
import ReactMarkdown from 'react-markdown'

interface Verse {
  id: number
  text: string
}

export default function FullPage() {
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null)
  const [explanation, setExplanation] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleVerseClick = async (verse: Verse) => {
    setSelectedVerse(verse)
    setIsDialogOpen(true)
    setIsLoading(true)

    try {
      const explanation = await getVerseExplanation(verse.text)
      setExplanation(explanation)
    } catch (error) {
      console.error('Error getting explanation:', error)
      setExplanation('Đã có lỗi xảy ra khi lấy giải thích. Vui lòng thử lại sau.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100">
      <div className="container mx-auto px-4 py-12">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-amber-800 mb-4">Truyện Kiều - Toàn Văn</h1>
          <p className="text-lg text-amber-700 max-w-2xl mx-auto">
            Toàn bộ tác phẩm Truyện Kiều của đại thi hào Nguyễn Du
          </p>
        </header>

        <div className="max-w-4xl mx-auto bg-white/80 backdrop-blur rounded-lg p-8 shadow-lg">
          <div className="prose prose-amber max-w-none">
            {truyenKieuVerses.map((verse: Verse) => (
              <div
                key={verse.id}
                className="flex gap-4 hover:bg-amber-50 cursor-pointer p-2 rounded transition-colors group"
                onClick={() => handleVerseClick(verse)}
              >
                <span className="text-amber-500 w-8 text-right opacity-50 group-hover:opacity-100">
                  {verse.id}
                </span>
                <span className="flex-1">{verse.text}</span>
              </div>
            ))}
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-amber-800">
                Giải thích câu {selectedVerse?.id}
              </DialogTitle>
            </DialogHeader>

            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-lg font-semibold mb-4 text-amber-900 border-b pb-2">
                  {selectedVerse?.text}
                </p>
                <div className="prose prose-amber prose-headings:text-amber-800 prose-headings:font-semibold prose-headings:mt-6 prose-headings:mb-4 prose-p:text-gray-700 prose-em:text-amber-700 prose-strong:text-amber-900 max-w-none">
                  <ReactMarkdown>{explanation}</ReactMarkdown>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
