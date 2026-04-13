import { Router } from 'express'
import { requireTechOrAdmin } from '../auth.js'

const router = Router()

// ─── Helpers ───────────────────────────────────────────────────────────────

async function callClaude(system, userMsg, maxTokens = 2048) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY not configured')
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMsg }],
    }),
  })
  if (!r.ok) { const e = await r.text(); throw new Error(`Claude error: ${e}`) }
  const d = await r.json()
  return d.content?.[0]?.text || ''
}

async function callGPT4o(systemMsg, userMsg, jsonMode = false) {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY not configured')
  const body = {
    model: 'gpt-4o',
    messages: [{ role: 'system', content: systemMsg }, { role: 'user', content: userMsg }],
    max_tokens: 2048,
  }
  if (jsonMode) body.response_format = { type: 'json_object' }
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) { const e = await r.text(); throw new Error(`GPT-4o error: ${e}`) }
  const d = await r.json()
  return d.choices?.[0]?.message?.content || ''
}

// ─── POST /api/ai/script — Claude enhances a single scene script ───────────
router.post('/script', requireTechOrAdmin, async (req, res) => {
  const { script, instruction } = req.body
  if (!script) return res.status(400).json({ error: 'script is required' })
  try {
    const improved = await callClaude(
      'You are a professional oilfield marketing writer. Improve the pacing and naturalness of this video narration script while keeping all technical content accurate. Return only the improved script, no commentary.',
      instruction ? `${instruction}\n\nScript:\n${script}` : script
    )
    res.json({ script: improved })
  } catch (err) {
    console.error('Claude script error:', err.message)
    res.status(502).json({ error: err.message })
  }
})

// ─── POST /api/ai/generate — Full parallel pipeline ────────────────────────
// Claude writes the narration scripts for all scenes simultaneously.
// GPT-4o structures the scene plan (visuals, durations, order).
// Both run in parallel and results are merged.
router.post('/generate', requireTechOrAdmin, async (req, res) => {
  const { topic, sceneCount = 5, productName = 'FieldTune™' } = req.body
  if (!topic) return res.status(400).json({ error: 'topic is required' })

  const VISUALS = ['desert-sunrise', 'pad-overview', 'compressor', 'wellhead', 'data-chart', 'title-card']

  // Run Claude and GPT-4o in parallel
  const [claudeResult, gptResult] = await Promise.allSettled([

    // Claude: write all narration scripts at once
    callClaude(
      `You are a professional oilfield marketing scriptwriter for ${productName} by Service Compression.
Write compelling, technically accurate narration scripts for a ${sceneCount}-scene marketing video.
Each scene script should be 2-4 sentences, written to be spoken aloud (natural pacing, no jargon overload).
Return a JSON object with this exact shape:
{"scenes": [{"script": "..."}, {"script": "..."}, ...]}
Return only valid JSON, no markdown, no commentary.`,
      `Topic: ${topic}\nNumber of scenes: ${sceneCount}`
    ),

    // GPT-4o: design the scene structure (visuals, durations, titles)
    callGPT4o(
      `You are a video production director for oilfield marketing. Design a ${sceneCount}-scene video structure.
Available visual types: ${VISUALS.join(', ')}.
Return a JSON object with this exact shape:
{"scenes": [{"visual": "...", "duration": 7, "title": "Scene title"}, ...]}
Choose visuals that match the content. Durations between 5 and 12 seconds.
Return only valid JSON, no markdown, no commentary.`,
      `Topic: ${topic}\nProduct: ${productName}`,
      true // json_mode
    ),
  ])

  // Parse both results
  let claudeScenes = [], gptScenes = []

  if (claudeResult.status === 'fulfilled') {
    try {
      const parsed = JSON.parse(claudeResult.value)
      claudeScenes = parsed.scenes || []
    } catch {
      // Claude sometimes wraps in markdown — strip it
      const match = claudeResult.value.match(/\{[\s\S]*\}/)
      if (match) { try { claudeScenes = JSON.parse(match[0]).scenes || [] } catch {} }
    }
  }

  if (gptResult.status === 'fulfilled') {
    try {
      const parsed = JSON.parse(gptResult.value)
      gptScenes = parsed.scenes || []
    } catch {}
  }

  // Merge: GPT-4o provides structure, Claude provides the words
  const count = Math.max(claudeScenes.length, gptScenes.length, sceneCount)
  const scenes = Array.from({ length: count }, (_, i) => ({
    id: `gen_${i}`,
    visual: gptScenes[i]?.visual || VISUALS[i % VISUALS.length],
    duration: gptScenes[i]?.duration || 7,
    title: gptScenes[i]?.title || `Scene ${i + 1}`,
    script: claudeScenes[i]?.script || '',
  }))

  res.json({
    scenes,
    meta: {
      claudeOk: claudeResult.status === 'fulfilled',
      gptOk: gptResult.status === 'fulfilled',
      claudeError: claudeResult.status === 'rejected' ? claudeResult.reason?.message : null,
      gptError: gptResult.status === 'rejected' ? gptResult.reason?.message : null,
    },
  })
})

// ─── POST /api/ai/optimize — GPT-4o reviews pacing of existing scenes ──────
router.post('/optimize', requireTechOrAdmin, async (req, res) => {
  const { scenes } = req.body
  if (!Array.isArray(scenes) || !scenes.length) return res.status(400).json({ error: 'scenes array required' })

  const VISUALS = ['desert-sunrise', 'pad-overview', 'compressor', 'wellhead', 'data-chart', 'title-card']

  try {
    const summary = scenes.map((sc, i) => `Scene ${i+1} (${sc.visual}, ${sc.duration}s): ${sc.script?.slice(0,80)}…`).join('\n')
    const result = await callGPT4o(
      `You are a video pacing expert for oilfield marketing content. Review the scene durations and visual choices and suggest improvements.
Available visuals: ${VISUALS.join(', ')}.
Return a JSON object:
{"suggestions": [{"scene": 1, "visual": "...", "duration": 7, "reason": "..."}, ...]}
Only include scenes that need changes. Return valid JSON only.`,
      `Current scenes:\n${summary}`,
      true
    )
    const parsed = JSON.parse(result)
    res.json(parsed)
  } catch (err) {
    console.error('GPT-4o optimize error:', err.message)
    res.status(502).json({ error: err.message })
  }
})

export default router
