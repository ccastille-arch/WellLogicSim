import { Router } from 'express'
import { requireTechOrAdmin } from '../auth.js'

const router = Router()

router.post('/', requireTechOrAdmin, async (req, res) => {
  const { text, voice = 'fable', speed = 0.9 } = req.body

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })
  }

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1-hd',
        input: text.slice(0, 4096),
        voice,
        speed,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('OpenAI TTS error:', err)
      return res.status(502).json({ error: 'TTS API error', detail: err })
    }

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')

    const arrayBuffer = await response.arrayBuffer()
    res.send(Buffer.from(arrayBuffer))
  } catch (err) {
    console.error('TTS route error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
