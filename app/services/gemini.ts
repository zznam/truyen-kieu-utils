const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export async function getVerseInterpretation(verse: string, question: string) {
  try {
    console.log('GEMINI_API_KEY:', GEMINI_API_KEY ? 'Set' : 'Not set')
    console.log('Verse:', verse)
    console.log('Question:', question)

    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set')
      return 'Lỗi: API key chưa được cấu hình.'
    }

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `Bạn là một chuyên gia về Truyện Kiều của Nguyễn Du và nghệ thuật bói Kiều. 
              Hãy giải đoán ý nghĩa của câu Kiều sau đây trong ngữ cảnh câu hỏi của người dùng.

              Câu Kiều: "${verse}"

              Câu hỏi của người dùng: "${question || 'Vận mệnh của tôi sắp tới thế nào?'}"

              Hãy đưa ra lời giải đoán chi tiết, ý nghĩa sâu xa và lời khuyên cho người dùng dựa trên câu Kiều này.
              Trả lời bằng tiếng Việt, ngắn gọn khoảng 3-5 câu, nhưng đầy đủ ý nghĩa.`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    }

    console.log('Request URL:', `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`)
    console.log('Request Body:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    console.log('Response Status:', response.status)
    console.log('Response Headers:', response.headers)

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Gemini API error:', errorData)
      return `Lỗi API: ${errorData.error?.message || 'Không thể kết nối đến Gemini API'}`
    }

    const data = await response.json()
    console.log('Response Data:', JSON.stringify(data, null, 2))

    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Không thể giải đoán câu Kiều này.'
  } catch (error) {
    console.error('Error fetching interpretation:', error)
    return 'Đã xảy ra lỗi khi giải đoán câu Kiều. Vui lòng thử lại sau.'
  }
}

export async function getLayKieuInterpretation(verse: string) {
  try {
    console.log('GEMINI_API_KEY:', GEMINI_API_KEY ? 'Set' : 'Not set')
    console.log('Verse:', verse)

    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set')
      return 'Lỗi: API key chưa được cấu hình.'
    }

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `Bạn là một chuyên gia về Truyện Kiều của Nguyễn Du.
              Hãy đưa ra lời giải đoán chi tiết, ý nghĩa sâu xa cho người dùng dựa trên câu Kiều này.
              Trả lời bằng tiếng Việt, ngắn gọn khoảng 3-5 câu, nhưng đầy đủ ý nghĩa.
              Câu Kiều: "${verse}"
              `,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    }

    console.log('Request URL:', `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`)
    console.log('Request Body:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    console.log('Response Status:', response.status)
    console.log('Response Headers:', response.headers)

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Gemini API error:', errorData)
      return `Lỗi API: ${errorData.error?.message || 'Không thể kết nối đến Gemini API'}`
    }

    const data = await response.json()
    console.log('Response Data:', JSON.stringify(data, null, 2))

    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Không thể giải đoán câu Kiều này.'
  } catch (error) {
    console.error('Error fetching interpretation:', error)
    return 'Đã xảy ra lỗi khi giải đoán câu Kiều. Vui lòng thử lại sau.'
  }
}
