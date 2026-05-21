import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

// Serve only the Halfmann live data page — no other routes exposed
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Halfmann live view running on port ${PORT}`)
})
