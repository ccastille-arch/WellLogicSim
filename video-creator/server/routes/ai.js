import { Router } from 'express'
import { requireTechOrAdmin } from '../auth.js'

const router = Router()

router.post('/script', requireTechOrAdmin, async (req, res) => {
  const { script, instruction } = req.body

  if (!script || typeof script !== 'string') {
    return res.status(400).json({ error: 'script is required' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  const userMessage = instruction
    ? `${instruction}\n\nScript:\n${script}`
    : script

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system:
          'You are a professional oilfield marketing writer. Improve the pacing and naturalness of this video script while keeping all technical content accurate. Return only the improved script, no commentary.',
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic API error:', err)
      return res.status(502).json({ error: 'AI API error', detail: err })
    }

    const data = await response.json()
    const improved = data.content?.[0]?.text || script
    res.json({ script: improved })
  } catch (err) {
    console.error('AI route error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
