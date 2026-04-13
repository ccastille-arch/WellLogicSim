import { useState } from 'react'

const VISUAL_TYPES = [
  { value: 'desert', label: 'Desert / Field View' },
  { value: 'pad-overview', label: 'Pad Overview Diagram' },
  { value: 'compressor', label: 'Compressor Close-up' },
  { value: 'wellhead', label: 'Wellhead / Xmas Tree' },
  { value: 'data-chart', label: 'Data Chart' },
  { value: 'text-only', label: 'Text Only' },
]

export default function ScriptEditor({ scenes, setScenes, token }) {
  const [rawScript, setRawScript] = useState('')
  const [enhancing, setEnhancing] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [tab, setTab] = useState('scenes') // 'scenes' | 'raw'

  const parseRawScript = () => {
    const blocks = rawScript.trim().split(/\n{2,}/)
    const parsed = blocks
      .filter((b) => b.trim())
      .map((block, i) => {
        const lines = block.split('\n').filter((l) => l.trim())
        const title = lines[0]?.replace(/^#+\s*/, '') || `Scene ${i + 1}`
        const narration = lines.slice(1).join(' ').trim() || lines[0]
        return {
          id: Date.now() + i,
          title,
          narration,
          visual: 'text-only',
        }
      })
    if (parsed.length > 0) {
      setScenes(parsed)
      setTab('scenes')
    }
  }

  const enhanceWithAI = async () => {
    const scriptText = scenes.map((s) => `## ${s.title}\n${s.narration}`).join('\n\n')
    if (!scriptText.trim()) return
    setEnhancing(true)
    try {
      const res = await fetch('/api/ai/script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ script: scriptText, instruction }),
      })
      if (!res.ok) throw new Error('AI request failed')
      const data = await res.json()
      // Re-parse improved script back into scenes
      const blocks = data.script.trim().split(/\n{2,}/)
      const updated = blocks
        .filter((b) => b.trim())
        .map((block, i) => {
          const lines = block.split('\n').filter((l) => l.trim())
          const title = lines[0]?.replace(/^#+\s*/, '') || `Scene ${i + 1}`
          const narration = lines.slice(1).join(' ').trim() || lines[0]
          return {
            id: scenes[i]?.id ?? Date.now() + i,
            title,
            narration,
            visual: scenes[i]?.visual ?? 'text-only',
          }
        })
      setScenes(updated)
    } catch (err) {
      alert('AI enhancement failed: ' + err.message)
    } finally {
      setEnhancing(false)
    }
  }

  const updateScene = (id, field, value) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
  }

  const addScene = () => {
    setScenes((prev) => [
      ...prev,
      { id: Date.now(), title: 'New Scene', narration: '', visual: 'text-only' },
    ])
  }

  const removeScene = (id) => {
    setScenes((prev) => prev.filter((s) => s.id !== id))
  }

  const moveScene = (id, dir) => {
    setScenes((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      const next = [...prev]
      const swapIdx = idx + dir
      if (swapIdx < 0 || swapIdx >= next.length) return prev
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: '#080810' }}>
        {['scenes', 'raw'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-md text-sm font-medium transition"
            style={
              tab === t
                ? { background: '#E8200C', color: 'white' }
                : { color: '#94a3b8' }
            }
          >
            {t === 'scenes' ? 'Scene Editor' : 'Raw Script'}
          </button>
        ))}
      </div>

      {tab === 'raw' && (
        <div className="flex flex-col gap-3">
          <textarea
            value={rawScript}
            onChange={(e) => setRawScript(e.target.value)}
            rows={12}
            placeholder={`Paste your script here. Separate scenes with double newlines.\n\n## Scene Title\nNarration text here.\n\n## Next Scene\nMore narration...`}
            className="w-full rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-red-600 resize-y font-mono"
            style={{ background: '#080810', border: '1px solid #1e1e30' }}
          />
          <button
            onClick={parseRawScript}
            className="self-start px-4 py-2 rounded-lg text-sm font-medium text-white transition hover:opacity-90"
            style={{ background: '#E8200C' }}
          >
            Parse into Scenes →
          </button>
        </div>
      )}

      {tab === 'scenes' && (
        <>
          {/* AI Enhancement */}
          <div
            className="flex flex-col sm:flex-row gap-2 p-3 rounded-xl"
            style={{ background: '#080810', border: '1px solid #1e1e30' }}
          >
            <input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="AI instruction (optional) — e.g. 'make it more energetic'"
              className="flex-1 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-red-600"
              style={{ background: '#11111e', border: '1px solid #1e1e30' }}
            />
            <button
              onClick={enhanceWithAI}
              disabled={enhancing || scenes.length === 0}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-50 whitespace-nowrap flex items-center gap-2"
              style={{ background: '#1e1e30' }}
            >
              {enhancing ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Enhancing…
                </>
              ) : (
                <>✨ Enhance with AI</>
              )}
            </button>
          </div>

          {/* Scene list */}
          <div className="flex flex-col gap-3">
            {scenes.map((scene, idx) => (
              <div
                key={scene.id}
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{ background: '#11111e', border: '1px solid #1e1e30' }}
              >
                {/* Scene header */}
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: '#E8200C22', color: '#E8200C' }}
                  >
                    {idx + 1}
                  </span>
                  <input
                    value={scene.title}
                    onChange={(e) => updateScene(scene.id, 'title', e.target.value)}
                    placeholder="Scene title"
                    className="flex-1 rounded-lg px-3 py-1.5 text-sm font-medium text-white outline-none focus:ring-1 focus:ring-red-600"
                    style={{ background: '#080810', border: '1px solid #1e1e30' }}
                  />
                  <select
                    value={scene.visual}
                    onChange={(e) => updateScene(scene.id, 'visual', e.target.value)}
                    className="rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:ring-1 focus:ring-red-600"
                    style={{ background: '#080810', border: '1px solid #1e1e30' }}
                  >
                    {VISUAL_TYPES.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                  {/* Move buttons */}
                  <button
                    onClick={() => moveScene(scene.id, -1)}
                    disabled={idx === 0}
                    className="p-1 rounded text-slate-500 hover:text-white disabled:opacity-20 transition"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveScene(scene.id, 1)}
                    disabled={idx === scenes.length - 1}
                    className="p-1 rounded text-slate-500 hover:text-white disabled:opacity-20 transition"
                    title="Move down"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => removeScene(scene.id)}
                    className="p-1 rounded text-slate-600 hover:text-red-400 transition"
                    title="Remove scene"
                  >
                    ✕
                  </button>
                </div>

                {/* Narration */}
                <textarea
                  value={scene.narration}
                  onChange={(e) => updateScene(scene.id, 'narration', e.target.value)}
                  rows={3}
                  placeholder="Narration text for this scene…"
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:ring-1 focus:ring-red-600 resize-y"
                  style={{ background: '#080810', border: '1px solid #1e1e30' }}
                />
              </div>
            ))}

            <button
              onClick={addScene}
              className="py-2.5 rounded-xl text-sm text-slate-400 hover:text-white border border-dashed transition"
              style={{ borderColor: '#1e1e30' }}
            >
              + Add Scene
            </button>
          </div>
        </>
      )}
    </div>
  )
}
