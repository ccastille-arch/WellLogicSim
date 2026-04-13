import { useRef, useImperativeHandle, forwardRef, useCallback } from 'react'

export const CANVAS_W = 1280
export const CANVAS_H = 720
const LETTERBOX = Math.round(CANVAS_H * 0.10) // 72px top/bottom

// ─── Drawing helpers ──────────────────────────────────────────────────────

function drawDesert(ctx, w, h) {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.65)
  sky.addColorStop(0, '#b8822a')
  sky.addColorStop(1, '#d4a855')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  // Ground
  const ground = ctx.createLinearGradient(0, h * 0.62, 0, h)
  ground.addColorStop(0, '#1a1208')
  ground.addColorStop(1, '#0e0b05')
  ctx.fillStyle = ground
  ctx.fillRect(0, h * 0.62, w, h * 0.38)

  // Horizon haze
  ctx.fillStyle = 'rgba(210,160,60,0.18)'
  ctx.fillRect(0, h * 0.58, w, h * 0.08)

  // Sun
  ctx.save()
  ctx.globalAlpha = 0.85
  const sunGrad = ctx.createRadialGradient(w * 0.15, h * 0.22, 0, w * 0.15, h * 0.22, 60)
  sunGrad.addColorStop(0, '#ffe9a0')
  sunGrad.addColorStop(1, 'rgba(255,200,60,0)')
  ctx.fillStyle = sunGrad
  ctx.beginPath()
  ctx.arc(w * 0.15, h * 0.22, 60, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Pump jack silhouette (far left)
  drawPumpJack(ctx, w * 0.12, h * 0.63, 0.6)

  // Compressor packages
  drawCompressorPackage(ctx, w * 0.38, h * 0.63, 0.5)
  drawCompressorPackage(ctx, w * 0.52, h * 0.63, 0.5)

  // Wellheads
  drawWellheadSilhouette(ctx, w * 0.68, h * 0.63, 0.5)
  drawWellheadSilhouette(ctx, w * 0.78, h * 0.63, 0.5)
  drawWellheadSilhouette(ctx, w * 0.88, h * 0.63, 0.5)

  // Dust haze bottom
  const dustGrad = ctx.createLinearGradient(0, h * 0.72, 0, h)
  dustGrad.addColorStop(0, 'rgba(180,130,40,0.10)')
  dustGrad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = dustGrad
  ctx.fillRect(0, h * 0.72, w, h * 0.28)
}

function drawPumpJack(ctx, x, y, scale = 1) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.fillStyle = '#1a1208'
  ctx.strokeStyle = '#1a1208'
  ctx.lineWidth = 3

  // Base
  ctx.fillRect(-18, -5, 36, 8)
  // Vertical tower
  ctx.fillRect(-5, -90, 10, 90)
  // Counterweight arm (left)
  ctx.save()
  ctx.translate(0, -85)
  ctx.rotate(-0.3)
  ctx.fillRect(-50, -6, 55, 10)
  // Counterweight blob
  ctx.beginPath()
  ctx.arc(-44, 0, 14, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  // Pump arm (right)
  ctx.save()
  ctx.translate(0, -85)
  ctx.rotate(0.3)
  ctx.fillRect(-5, -6, 48, 10)
  // Horse head
  ctx.beginPath()
  ctx.moveTo(40, -20)
  ctx.lineTo(55, -8)
  ctx.lineTo(50, 6)
  ctx.lineTo(35, 4)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  // Rod to ground
  ctx.fillRect(-3, -20, 6, 30)
  ctx.restore()
}

function drawCompressorPackage(ctx, x, y, scale = 1) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)

  // Skid frame
  ctx.fillStyle = '#1a1208'
  ctx.fillRect(-50, -30, 100, 35)

  // Engine block
  ctx.fillStyle = '#111'
  ctx.fillRect(-45, -55, 55, 30)

  // Compressor cylinder
  ctx.fillStyle = '#0d0d0d'
  ctx.beginPath()
  ctx.rect(16, -50, 28, 26)
  ctx.fill()

  // Exhaust stack
  ctx.fillStyle = '#1a1208'
  ctx.fillRect(-10, -80, 8, 30)
  ctx.restore()
}

function drawWellheadSilhouette(ctx, x, y, scale = 1) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.fillStyle = '#1a1208'

  // Casing head
  ctx.fillRect(-10, -50, 20, 52)
  // Flange plates
  ctx.fillRect(-16, -10, 32, 6)
  ctx.fillRect(-16, -30, 32, 6)
  // Valves (horizontal)
  ctx.fillRect(-28, -22, 56, 8)
  ctx.fillRect(-28, -22, 8, 8) // left valve body
  ctx.fillRect(20, -22, 8, 8)  // right valve body
  // Top flange
  ctx.fillRect(-14, -52, 28, 6)
  ctx.restore()
}

function drawPadOverview(ctx, w, h) {
  ctx.fillStyle = '#05050f'
  ctx.fillRect(0, 0, w, h)

  // Grid lines
  ctx.strokeStyle = '#0e0e20'
  ctx.lineWidth = 1
  for (let gx = 0; gx < w; gx += 60) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke()
  }
  for (let gy = 0; gy < h; gy += 60) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke()
  }

  const midY = h * 0.5
  // Well cluster (left)
  const wells = [w * 0.10, w * 0.10, w * 0.10]
  const wellYs = [h * 0.28, h * 0.50, h * 0.72]
  wells.forEach((wx, i) => {
    drawDiagramBox(ctx, wx, wellYs[i], 80, 32, '#16213e', '#3b82f6', `Well ${i + 1}`, '#60a5fa')
  })

  // Suction header (horizontal pipe)
  const sxStart = w * 0.14
  const sxEnd = w * 0.42
  ctx.strokeStyle = '#22d3ee'
  ctx.lineWidth = 4
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(sxStart, midY)
  ctx.lineTo(sxEnd, midY)
  ctx.stroke()
  // Vertical connectors wells → suction
  wells.forEach((wx, i) => {
    ctx.strokeStyle = '#22d3ee'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(wx + 40, wellYs[i])
    ctx.lineTo(sxEnd * 0.7, wellYs[i])
    ctx.lineTo(sxEnd * 0.7, midY)
    ctx.stroke()
  })

  // Compressors (center)
  const compXs = [w * 0.46, w * 0.60]
  compXs.forEach((cx, i) => {
    drawDiagramBox(ctx, cx, midY, 90, 36, '#1a0d00', '#f97316', `COMP ${i + 1}`, '#fb923c')
  })

  // Discharge header
  const dxStart = w * 0.68
  const dxEnd = w * 0.88
  ctx.strokeStyle = '#4ade80'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(dxStart, midY)
  ctx.lineTo(dxEnd, midY)
  ctx.stroke()

  // Discharge box
  drawDiagramBox(ctx, w * 0.88, midY, 90, 36, '#001a08', '#4ade80', 'Discharge', '#86efac')

  // Connecting flow arrows comp → discharge
  compXs.forEach((cx) => {
    drawFlowArrow(ctx, cx + 45, midY, dxStart, midY, '#4ade80')
  })

  // Suction → comps
  compXs.forEach((cx) => {
    drawFlowArrow(ctx, sxEnd, midY, cx - 45, midY, '#22d3ee')
  })

  // Label
  ctx.fillStyle = '#64748b'
  ctx.font = '12px monospace'
  ctx.fillText('WELL PAD FLOW DIAGRAM', w * 0.10, h * 0.15)
}

function drawDiagramBox(ctx, cx, cy, bw, bh, bg, borderColor, label, labelColor) {
  ctx.save()
  ctx.strokeStyle = borderColor
  ctx.lineWidth = 1.5
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 4)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = labelColor
  ctx.font = `bold 11px monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, cx, cy)
  ctx.restore()
}

function drawFlowArrow(ctx, x1, y1, x2, y2, color) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  // arrowhead
  const angle = Math.atan2(y2 - y1, x2 - x1)
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - 10 * Math.cos(angle - 0.4), y2 - 10 * Math.sin(angle - 0.4))
  ctx.lineTo(x2 - 10 * Math.cos(angle + 0.4), y2 - 10 * Math.sin(angle + 0.4))
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawCompressorCloseup(ctx, w, h) {
  ctx.fillStyle = '#050508'
  ctx.fillRect(0, 0, w, h)

  const cx = w * 0.5, cy = h * 0.5
  const pkg_w = 600, pkg_h = 200

  // Skid
  ctx.fillStyle = '#0f0f1a'
  ctx.strokeStyle = '#f97316'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(cx - pkg_w / 2, cy - pkg_h / 2, pkg_w, pkg_h, 8)
  ctx.fill()
  ctx.stroke()

  // Engine block
  ctx.fillStyle = '#0a0a14'
  ctx.strokeStyle = '#374151'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.rect(cx - 280, cy - 75, 200, 140)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#374151'
  ctx.font = 'bold 13px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('ENGINE', cx - 180, cy)

  // Compressor cylinder
  ctx.fillStyle = '#0a0a14'
  ctx.strokeStyle = '#f97316'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.rect(cx - 50, cy - 70, 200, 130)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#f97316'
  ctx.font = 'bold 13px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('COMPRESSOR', cx + 50, cy - 10)
  ctx.fillStyle = '#fb923c'
  ctx.font = '11px monospace'
  ctx.fillText('2-stage recip', cx + 50, cy + 10)

  // Gauge circles
  const gauges = [
    { x: cx + 220, y: cy - 30, label: 'SUCT', val: '145 psi', color: '#22d3ee' },
    { x: cx + 220, y: cy + 30, label: 'DISCH', val: '850 psi', color: '#4ade80' },
  ]
  gauges.forEach(({ x, y, label, val, color }) => {
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.fillStyle = '#050508'
    ctx.beginPath()
    ctx.arc(x, y, 22, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = color
    ctx.font = 'bold 8px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, x, y - 7)
    ctx.font = '9px monospace'
    ctx.fillText(val, x, y + 6)
    ctx.restore()
  })

  // Exhaust stack
  ctx.fillStyle = '#1a1a2e'
  ctx.strokeStyle = '#374151'
  ctx.lineWidth = 1
  ctx.fillRect(cx - 250, cy - pkg_h / 2 - 50, 18, 55)
  ctx.strokeRect(cx - 250, cy - pkg_h / 2 - 50, 18, 55)

  // Piping connectors
  ctx.strokeStyle = '#f97316'
  ctx.lineWidth = 3
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.moveTo(cx - 280, cy - 20)
  ctx.lineTo(cx - 320, cy - 20)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx + 150, cy - 20)
  ctx.lineTo(cx + 340, cy - 20)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = '#374151'
  ctx.font = '11px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('SUCTION', cx - 340, cy - 15)
  ctx.fillStyle = '#4ade80'
  ctx.fillText('DISCHARGE →', cx + 370, cy - 15)
}

function drawWellheadCloseup(ctx, w, h) {
  ctx.fillStyle = '#030306'
  ctx.fillRect(0, 0, w, h)

  const cx = w * 0.5, by = h * 0.82

  // Ground plate
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(cx - 80, by, 160, 12)

  // Casing spool
  drawWellComponent(ctx, cx, by - 60, 70, 60, '#0f0f1a', '#374151', 'CASING\nSPOOL', '#94a3b8')
  // Tubing head
  drawWellComponent(ctx, cx, by - 140, 60, 55, '#0f0f1a', '#22d3ee', 'TUBING\nHEAD', '#67e8f9')
  // Tubing hanger
  drawWellComponent(ctx, cx, by - 200, 52, 40, '#050508', '#22d3ee', 'HANGER', '#67e8f9')
  // Christmas tree body
  drawWellComponent(ctx, cx, by - 290, 45, 70, '#0a0a14', '#4ade80', 'X-TREE', '#86efac')

  // Side valves
  const valveY = by - 260
  drawValve(ctx, cx - 90, valveY, '#f97316', 'WING\nVALVE')
  drawValve(ctx, cx + 90, valveY, '#f97316', 'KILL\nVALVE')
  // Connectors
  ctx.strokeStyle = '#f97316'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(cx - 45 / 2, valveY)
  ctx.lineTo(cx - 68, valveY)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx + 45 / 2, valveY)
  ctx.lineTo(cx + 68, valveY)
  ctx.stroke()

  // Master valve
  drawValve(ctx, cx, by - 165, '#e11d48', 'MASTER\nVALVE')

  // Top flow
  ctx.strokeStyle = '#4ade80'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(cx, by - 325)
  ctx.lineTo(cx, by - 360)
  ctx.stroke()
  ctx.fillStyle = '#4ade80'
  ctx.font = '11px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('FLOW LINE', cx, by - 375)

  // Pressure label
  ctx.fillStyle = '#22d3ee'
  ctx.font = 'bold 12px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('TBHP: 1,240 psi', cx, h * 0.12)
}

function drawWellComponent(ctx, cx, cy, bw, bh, bg, border, label, textColor) {
  ctx.save()
  ctx.fillStyle = bg
  ctx.strokeStyle = border
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.rect(cx - bw / 2, cy - bh / 2, bw, bh)
  ctx.fill()
  ctx.stroke()
  // Flange lines
  ctx.strokeStyle = border
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.rect(cx - bw / 2 - 8, cy - 4, bw + 16, 8)
  ctx.stroke()
  // Label
  ctx.fillStyle = textColor
  ctx.font = 'bold 9px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const lines = label.split('\n')
  lines.forEach((line, i) => {
    ctx.fillText(line, cx, cy + (i - (lines.length - 1) / 2) * 12)
  })
  ctx.restore()
}

function drawValve(ctx, cx, cy, color, label) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = '#050508'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.rect(cx - 20, cy - 16, 40, 32)
  ctx.fill()
  ctx.stroke()
  // X indicator
  ctx.beginPath()
  ctx.moveTo(cx - 14, cy - 10)
  ctx.lineTo(cx + 14, cy + 10)
  ctx.moveTo(cx + 14, cy - 10)
  ctx.lineTo(cx - 14, cy + 10)
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = color
  ctx.font = 'bold 8px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const lines = label.split('\n')
  lines.forEach((line, i) => ctx.fillText(line, cx, cy + 20 + i * 10))
  ctx.restore()
}

function drawDataChart(ctx, w, h, progress = 1) {
  ctx.fillStyle = '#05050f'
  ctx.fillRect(0, 0, w, h)

  // Grid
  ctx.strokeStyle = '#0e0e20'
  ctx.lineWidth = 1
  const gridLeft = 80, gridRight = w - 60
  const gridTop = 60, gridBottom = h - 80
  const gridW = gridRight - gridLeft
  const gridH = gridBottom - gridTop

  for (let i = 0; i <= 8; i++) {
    const gy = gridTop + (gridH / 8) * i
    ctx.beginPath(); ctx.moveTo(gridLeft, gy); ctx.lineTo(gridRight, gy); ctx.stroke()
    ctx.fillStyle = '#1e293b'
    ctx.font = '11px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`${Math.round(800 - i * 100)}`, gridLeft - 8, gy + 4)
  }
  for (let i = 0; i <= 12; i++) {
    const gx = gridLeft + (gridW / 12) * i
    ctx.beginPath(); ctx.moveTo(gx, gridTop); ctx.lineTo(gx, gridBottom); ctx.stroke()
    ctx.fillStyle = '#1e293b'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`${i + 1}`, gx, gridBottom + 16)
  }

  // Axis labels
  ctx.fillStyle = '#475569'
  ctx.font = '12px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('Month', w / 2, gridBottom + 40)
  ctx.save()
  ctx.translate(20, h / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('Gas Rate (Mcf/d)', 0, 0)
  ctx.restore()

  // Data — smooth upward curve with noise
  const pts = []
  for (let i = 0; i <= 12; i++) {
    const base = 100 + i * 52 + Math.sin(i * 0.8) * 30
    const noise = Math.sin(i * 2.3 + 1.2) * 15
    pts.push({ x: gridLeft + (gridW / 12) * i, y: gridBottom - ((base + noise) / 800) * gridH })
  }

  const visiblePts = pts.slice(0, Math.max(2, Math.ceil(progress * pts.length)))

  // Area fill
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(visiblePts[0].x, gridBottom)
  visiblePts.forEach((p) => ctx.lineTo(p.x, p.y))
  ctx.lineTo(visiblePts[visiblePts.length - 1].x, gridBottom)
  ctx.closePath()
  const areaGrad = ctx.createLinearGradient(0, gridTop, 0, gridBottom)
  areaGrad.addColorStop(0, 'rgba(74,222,128,0.25)')
  areaGrad.addColorStop(1, 'rgba(74,222,128,0.02)')
  ctx.fillStyle = areaGrad
  ctx.fill()
  ctx.restore()

  // Line
  ctx.save()
  ctx.strokeStyle = '#4ade80'
  ctx.lineWidth = 3
  ctx.lineJoin = 'round'
  ctx.shadowColor = '#4ade80'
  ctx.shadowBlur = 8
  ctx.beginPath()
  visiblePts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  ctx.stroke()
  ctx.restore()

  // Latest dot
  const last = visiblePts[visiblePts.length - 1]
  ctx.save()
  ctx.fillStyle = '#4ade80'
  ctx.shadowColor = '#4ade80'
  ctx.shadowBlur = 12
  ctx.beginPath()
  ctx.arc(last.x, last.y, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Chart title
  ctx.fillStyle = '#94a3b8'
  ctx.font = 'bold 14px monospace'
  ctx.textAlign = 'left'
  ctx.fillText('PRODUCTION PERFORMANCE — Optimized', gridLeft, gridTop - 20)
}

function drawTextOnly(ctx, w, h, title, subtitle) {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)

  // Subtle vignette
  const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.85)
  vig.addColorStop(0, 'transparent')
  vig.addColorStop(1, 'rgba(0,0,0,0.7)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, w, h)

  // Accent line
  ctx.strokeStyle = '#E8200C'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(w * 0.1, h * 0.42)
  ctx.lineTo(w * 0.9, h * 0.42)
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 54px sans-serif'
  wrapText(ctx, title, w / 2, h * 0.36, w * 0.8, 60)

  if (subtitle) {
    ctx.fillStyle = '#94a3b8'
    ctx.font = '24px sans-serif'
    wrapText(ctx, subtitle, w / 2, h * 0.58, w * 0.75, 32)
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ')
  let line = ''
  let curY = y
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' '
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, curY)
      line = words[n] + ' '
      curY += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, x, curY)
}

// ─── Overlay (watermark + letterbox + captions) ───────────────────────────

function drawOverlay(ctx, w, h, scene, chartProgress) {
  // Letterbox bars
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, LETTERBOX)
  ctx.fillRect(0, h - LETTERBOX, w, LETTERBOX)

  // Watermark top-right
  ctx.save()
  ctx.fillStyle = '#E8200C'
  ctx.font = 'bold 14px monospace'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.globalAlpha = 0.85
  ctx.fillText('FieldTune™', w - 20, 14)
  ctx.restore()

  // Scene title bottom-left
  if (scene?.title && scene.visual !== 'text-only') {
    ctx.save()
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.font = 'bold 13px monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText(scene.title.toUpperCase(), 24, h - LETTERBOX - 48)
    ctx.restore()
  }

  // Caption subtitle
  if (scene?.narration) {
    const caption = scene.narration.slice(0, 120) + (scene.narration.length > 120 ? '…' : '')
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.font = '18px sans-serif'
    const metrics = ctx.measureText(caption)
    const capW = Math.min(metrics.width + 40, w * 0.85)
    const capX = w / 2 - capW / 2
    const capY = h - LETTERBOX - 14
    ctx.fillStyle = 'rgba(0,0,0,0.65)'
    ctx.beginPath()
    ctx.roundRect(capX, capY - 30, capW, 34, 4)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillText(caption, w / 2, capY)
    ctx.restore()
  }
}

// ─── Main component ───────────────────────────────────────────────────────

const VideoCanvas = forwardRef(function VideoCanvas({ scene, chartProgress = 1 }, ref) {
  const canvasRef = useRef(null)

  const renderFrame = useCallback(
    (sceneOverride) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const s = sceneOverride ?? scene

      // Draw visual
      switch (s?.visual) {
        case 'desert':
          drawDesert(ctx, CANVAS_W, CANVAS_H)
          break
        case 'pad-overview':
          drawPadOverview(ctx, CANVAS_W, CANVAS_H)
          break
        case 'compressor':
          drawCompressorCloseup(ctx, CANVAS_W, CANVAS_H)
          break
        case 'wellhead':
          drawWellheadCloseup(ctx, CANVAS_W, CANVAS_H)
          break
        case 'data-chart':
          drawDataChart(ctx, CANVAS_W, CANVAS_H, chartProgress)
          break
        case 'text-only':
        default:
          drawTextOnly(ctx, CANVAS_W, CANVAS_H, s?.title || '', s?.narration || '')
          break
      }

      drawOverlay(ctx, CANVAS_W, CANVAS_H, s, chartProgress)
    },
    [scene, chartProgress]
  )

  // Expose renderFrame so VideoCreator can call it during export
  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    renderFrame,
    drawScene: (s, progress) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      switch (s?.visual) {
        case 'desert': drawDesert(ctx, CANVAS_W, CANVAS_H); break
        case 'pad-overview': drawPadOverview(ctx, CANVAS_W, CANVAS_H); break
        case 'compressor': drawCompressorCloseup(ctx, CANVAS_W, CANVAS_H); break
        case 'wellhead': drawWellheadCloseup(ctx, CANVAS_W, CANVAS_H); break
        case 'data-chart': drawDataChart(ctx, CANVAS_W, CANVAS_H, progress ?? 1); break
        case 'text-only': default:
          drawTextOnly(ctx, CANVAS_W, CANVAS_H, s?.title || '', s?.narration || ''); break
      }
      drawOverlay(ctx, CANVAS_W, CANVAS_H, s, progress ?? 1)
    },
  }))

  // Render whenever scene changes
  const frameRef = useRef(null)
  const prevScene = useRef(null)
  if (prevScene.current !== scene || chartProgress !== undefined) {
    prevScene.current = scene
    // Schedule a render on next microtask so canvasRef is ready
    if (typeof window !== 'undefined') {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      frameRef.current = requestAnimationFrame(() => renderFrame())
    }
  }

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="w-full rounded-xl"
      style={{ maxHeight: '360px', objectFit: 'contain', background: '#000' }}
    />
  )
})

export default VideoCanvas
