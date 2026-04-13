import { Router } from 'express'
import { requireTechOrAdmin } from '../auth.js'

const router = Router()

// This endpoint validates a render job request and returns job metadata.
// Actual rendering happens in the browser via MediaRecorder + Canvas.
// A future server-side FFmpeg pipeline could replace the client approach.
router.post('/', requireTechOrAdmin, async (req, res) => {
  const { scenes } = req.body

  if (!Array.isArray(scenes) || scenes.length === 0) {
    return res.status(400).json({ error: 'scenes array is required' })
  }

  const jobId = `render_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  res.json({
    jobId,
    sceneCount: scenes.length,
    message: 'Render job accepted. Client-side rendering will proceed.',
    estimatedSeconds: scenes.length * 5,
  })
})

export default router
