import { useState, useRef, useEffect } from 'react'

// ─── Pre-built templates ───────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: 'well-pad-optimizer',
    title: 'WellLogic™ — Pad Optimizer',
    description: 'Cinematic pitch for WellLogic gas lift automation',
    scenes: [
      { id:'s1', visual:'desert-sunrise', duration:8, script:'The Permian Basin. Three in the morning. A compressor trips, and gas injection across the entire pad drops to zero. Six wells begin dying. The operator on call is forty-five minutes away.' },
      { id:'s2', visual:'pad-overview', duration:7, script:'By the time a pumper arrives, diagnoses the trip, calls the mechanic, and readjusts every choke by hand — three to four hours have passed. At current oil prices, that is forty thousand dollars in lost production. From a single event.' },
      { id:'s3', visual:'compressor', duration:7, script:'WellLogic detects the compressor trip in under two seconds. It immediately redistributes available gas to your highest-priority wells. The pad never fully shuts down. Production loss is cut by ninety percent.' },
      { id:'s4', visual:'wellhead', duration:6, script:'Every injection choke valve is controlled automatically, continuously. Well prioritization, suction header pressure management, staged compressor sequencing — all handled in real time, twenty-four seven.' },
      { id:'s5', visual:'data-chart', duration:7, script:'The numbers are clear. Operators using WellLogic report four hundred thousand to nine hundred thousand dollars in annual savings per pad. Typical payback period: thirty to ninety days.' },
      { id:'s6', visual:'title-card', duration:6, script:'FieldTune WellLogic. Automated gas lift optimization for operators who cannot afford to wait.' },
    ],
  },
  {
    id: 'compressor-trip',
    title: 'WellLogic™ — Compressor Trip Response',
    description: 'Emergency response speed and production value',
    scenes: [
      { id:'s1', visual:'compressor', duration:7, script:'A compressor trip on a gas lift pad is not just a mechanical failure. It is a production emergency that spreads across every well on the pad within minutes.' },
      { id:'s2', visual:'data-chart', duration:7, script:'Manual response takes two to four hours. In that window, production on a four-well pad drops to zero. At seventy dollars per barrel, that is twelve thousand dollars gone before the pumper even turns the wrench.' },
      { id:'s3', visual:'pad-overview', duration:7, script:'WellLogic responds in seconds. It detects the trip, calculates available gas from remaining compressors, and redistributes injection automatically. Priority wells stay on. The rest are staged back to protect the header.' },
      { id:'s4', visual:'title-card', duration:6, script:'Thirty to sixty seconds versus three to four hours. That difference is the value of WellLogic on your pad.' },
    ],
  },
  {
    id: 'roi-summary',
    title: 'FieldTune™ — ROI Summary',
    description: 'Financial case for FieldTune product investment',
    scenes: [
      { id:'s1', visual:'desert-sunrise', duration:6, script:'Every gas lift pad loses money to the same problems: slow trip response, poor gas allocation, manual choke adjustments, and overnight events no one catches in time.' },
      { id:'s2', visual:'data-chart', duration:8, script:'WellLogic addresses all four. Compressor trip recovery saves one hundred eighty to three hundred fifty thousand dollars annually. Gas constraint protection adds another one hundred twenty to two hundred eighty thousand. Avoided shutdowns and labor savings round out the picture.' },
      { id:'s3', visual:'data-chart', duration:7, script:'Total estimated annual savings: four hundred twenty thousand to nine hundred thousand dollars per pad. Based on a typical four-well, two-compressor Permian Basin configuration.' },
      { id:'s4', visual:'wellhead', duration:6, script:'The system pays for itself in thirty to ninety days. After that, it is pure margin recovery on production that was already yours to keep.' },
      { id:'s5', visual:'title-card', duration:5, script:'FieldTune WellLogic. The math is simple. The decision should be too.' },
    ],
  },
]

const VISUAL_LABELS = { 'desert-sunrise':'Desert Sunrise', 'pad-overview':'Pad Overview', 'compressor':'Compressor Room', 'wellhead':'Wellhead Close-up', 'data-chart':'Data Chart', 'title-card':'Title Card' }
const VISUALS = Object.keys(VISUAL_LABELS)

// ─── Canvas drawing ────────────────────────────────────────────────────────

function drawScene(ctx, visual, caption, tick, w, h) {
  ctx.clearRect(0, 0, w, h)
  const t = tick / 30

  if (visual === 'desert-sunrise') {
    const sky = ctx.createLinearGradient(0,0,0,h*0.65)
    sky.addColorStop(0,'#0a0412'); sky.addColorStop(0.4,'#1a0830'); sky.addColorStop(0.7,'#6b1c0a'); sky.addColorStop(1,'#e05a00')
    ctx.fillStyle=sky; ctx.fillRect(0,0,w,h*0.65)
    const gnd = ctx.createLinearGradient(0,h*0.65,0,h)
    gnd.addColorStop(0,'#1a0e05'); gnd.addColorStop(1,'#0d0804')
    ctx.fillStyle=gnd; ctx.fillRect(0,h*0.65,w,h*0.35)
    const sunX=w*0.5,sunY=h*0.62
    const glow=ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,120)
    glow.addColorStop(0,'rgba(255,120,0,0.6)'); glow.addColorStop(0.5,'rgba(255,60,0,0.2)'); glow.addColorStop(1,'transparent')
    ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(sunX,sunY,120,0,Math.PI*2); ctx.fill()
    drawDerrick(ctx,w*0.2,h*0.65,0.6); drawDerrick(ctx,w*0.78,h*0.65,0.4)
    ctx.fillStyle='rgba(255,255,255,0.6)'
    ;[[0.1,0.1],[0.3,0.05],[0.7,0.08],[0.85,0.15],[0.15,0.25],[0.6,0.18],[0.9,0.3]].forEach(([sx,sy])=>{ctx.beginPath();ctx.arc(sx*w,sy*h,1.2,0,Math.PI*2);ctx.fill()})
  }

  else if (visual === 'pad-overview') {
    const bg=ctx.createLinearGradient(0,0,0,h); bg.addColorStop(0,'#06060f'); bg.addColorStop(1,'#0e0e1a')
    ctx.fillStyle=bg; ctx.fillRect(0,0,w,h)
    ctx.strokeStyle='rgba(100,100,180,0.1)'; ctx.lineWidth=0.5
    for(let gx=0;gx<w;gx+=60){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,h);ctx.stroke()}
    for(let gy=0;gy<h;gy+=60){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(w,gy);ctx.stroke()}
    [[0.2,0.35],[0.38,0.35],[0.62,0.35],[0.8,0.35]].forEach(([wx,wy],i)=>{
      const pulse=0.7+0.3*Math.sin(t*2+i*1.2)
      ctx.strokeStyle=`rgba(232,32,12,${pulse})`; ctx.lineWidth=2
      ctx.beginPath(); ctx.arc(wx*w,wy*h,28,0,Math.PI*2); ctx.stroke()
      ctx.fillStyle='#1a1020'; ctx.beginPath(); ctx.arc(wx*w,wy*h,24,0,Math.PI*2); ctx.fill()
      ctx.fillStyle='#E8200C'; ctx.font='bold 11px Arial'; ctx.textAlign='center'; ctx.fillText(`W${i+1}`,wx*w,wy*h+4)
      ctx.strokeStyle=`rgba(232,32,12,${0.3+0.2*Math.sin(t*3+i)})`; ctx.lineWidth=1; ctx.setLineDash([4,4])
      ctx.beginPath(); ctx.moveTo(wx*w,wy*h+28); ctx.lineTo(w*0.5,h*0.65); ctx.stroke(); ctx.setLineDash([])
    })
    ctx.fillStyle='#141425'; ctx.strokeStyle='#E8200C'; ctx.lineWidth=1.5
    ctx.beginPath(); ctx.roundRect(w*0.38,h*0.62,w*0.24,h*0.1,6); ctx.fill(); ctx.stroke()
    ctx.fillStyle='#aaa'; ctx.font='bold 10px Arial'; ctx.textAlign='center'; ctx.fillText('COMPRESSORS',w*0.5,h*0.685)
  }

  else if (visual === 'compressor') {
    const bg=ctx.createLinearGradient(0,0,w,h); bg.addColorStop(0,'#07080f'); bg.addColorStop(1,'#0f0e1a')
    ctx.fillStyle=bg; ctx.fillRect(0,0,w,h)
    ctx.fillStyle='#1a1a2e'; ctx.strokeStyle='#2a2a4a'; ctx.lineWidth=1.5
    ctx.beginPath(); ctx.roundRect(w*0.15,h*0.3,w*0.7,h*0.4,10); ctx.fill(); ctx.stroke()
    const blink=Math.sin(t*6)>0
    ctx.fillStyle=blink?'#E8200C':'#7a0808'; ctx.beginPath(); ctx.arc(w*0.25,h*0.5,14,0,Math.PI*2); ctx.fill()
    ctx.fillStyle='rgba(232,32,12,0.25)'; ctx.beginPath(); ctx.arc(w*0.25,h*0.5,26,0,Math.PI*2); ctx.fill()
    ctx.fillStyle='#888'; ctx.font='10px Arial'; ctx.textAlign='center'; ctx.fillText('TRIP ALARM',w*0.25,h*0.62)
    ;[[0.5,0.45,'PSI',0],[0.65,0.45,'RPM',0.6],[0.78,0.45,'TEMP',1.2]].forEach(([gx,gy,lbl,phase])=>{
      ctx.strokeStyle='#2a2a44'; ctx.lineWidth=6; ctx.beginPath(); ctx.arc(gx*w,gy*h,22,Math.PI,2*Math.PI); ctx.stroke()
      ctx.strokeStyle='#E8200C'; ctx.lineWidth=5
      ctx.beginPath(); ctx.arc(gx*w,gy*h,22,Math.PI,Math.PI+(0.5+0.4*Math.sin(t+phase))*Math.PI); ctx.stroke()
      ctx.fillStyle='#666'; ctx.font='8px Arial'; ctx.textAlign='center'; ctx.fillText(lbl,gx*w,gy*h+14)
    })
  }

  else if (visual === 'wellhead') {
    const bg=ctx.createLinearGradient(0,0,0,h); bg.addColorStop(0,'#050a07'); bg.addColorStop(1,'#0a1010')
    ctx.fillStyle=bg; ctx.fillRect(0,0,w,h)
    ctx.strokeStyle='#1a2a1a'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,h*0.72); ctx.lineTo(w,h*0.72); ctx.stroke()
    ctx.fillStyle='#1a2a22'; ctx.strokeStyle='#2a4a35'; ctx.lineWidth=1.5
    ctx.beginPath(); ctx.rect(w*0.42,h*0.42,w*0.16,h*0.3); ctx.fill(); ctx.stroke()
    ctx.fillStyle='#0f1f18'; ctx.strokeStyle='#22c55e'; ctx.lineWidth=2
    ctx.beginPath(); ctx.roundRect(w*0.45,h*0.48,w*0.1,h*0.1,4); ctx.fill(); ctx.stroke()
    ctx.fillStyle='#22c55e'; ctx.font='bold 9px Arial'; ctx.textAlign='center'; ctx.fillText('AUTO',w*0.5,h*0.537)
    const flow=0.5+0.5*Math.sin(t*4)
    ctx.strokeStyle=`rgba(34,197,94,${0.4+0.5*flow})`; ctx.lineWidth=2+flow
    ctx.beginPath(); ctx.moveTo(w*0.5,h*0.28); ctx.lineTo(w*0.5,h*0.42); ctx.stroke()
    ctx.fillStyle='#22c55e'; ctx.font='bold 12px Arial'; ctx.textAlign='center'
    ctx.fillText(`${(180+20*Math.sin(t*2)).toFixed(0)} MSCF/D`,w*0.5,h*0.24)
    ctx.fillStyle='#555'; ctx.font='9px Arial'; ctx.fillText('GAS INJECTION',w*0.5,h*0.19)
  }

  else if (visual === 'data-chart') {
    const bg=ctx.createLinearGradient(0,0,0,h); bg.addColorStop(0,'#060610'); bg.addColorStop(1,'#0e0e1e')
    ctx.fillStyle=bg; ctx.fillRect(0,0,w,h)
    const cL=w*0.12,cR=w*0.9,cT=h*0.18,cB=h*0.75
    ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=0.5
    for(let i=0;i<=4;i++){const gy=cT+(cB-cT)*i/4;ctx.beginPath();ctx.moveTo(cL,gy);ctx.lineTo(cR,gy);ctx.stroke()}
    const before=[45,60,35,50],after=[92,95,88,96],barW=(cR-cL)/4
    before.forEach((bv,i)=>{
      const bh=bv/100*(cB-cT),ah=after[i]/100*(cB-cT),reveal=Math.min(1,Math.max(0,t*0.4-i*0.15))
      ctx.fillStyle='rgba(232,32,12,0.5)'; ctx.fillRect(cL+i*barW+barW*0.1,cB-bh,barW*0.3,bh)
      ctx.fillStyle=`rgba(34,197,94,${0.7*reveal})`; ctx.fillRect(cL+i*barW+barW*0.46,cB-ah*reveal,barW*0.3,ah*reveal)
      ctx.fillStyle='#666'; ctx.font='10px Arial'; ctx.textAlign='center'; ctx.fillText(`W${i+1}`,cL+i*barW+barW*0.5,cB+16)
    })
    ctx.fillStyle='rgba(232,32,12,0.8)'; ctx.fillRect(cL,h*0.1,12,10)
    ctx.fillStyle='#888'; ctx.font='9px Arial'; ctx.textAlign='left'; ctx.fillText('Manual',cL+16,h*0.1+9)
    ctx.fillStyle='rgba(34,197,94,0.8)'; ctx.fillRect(cL+80,h*0.1,12,10); ctx.fillText('WellLogic',cL+96,h*0.1+9)
    ctx.save();ctx.translate(cL-28,(cT+cB)/2);ctx.rotate(-Math.PI/2);ctx.fillStyle='#555';ctx.font='9px Arial';ctx.textAlign='center';ctx.fillText('% Uptime',0,0);ctx.restore()
  }

  else { // title-card
    const bg=ctx.createLinearGradient(0,0,w,h); bg.addColorStop(0,'#07060f'); bg.addColorStop(1,'#0d0c1a')
    ctx.fillStyle=bg; ctx.fillRect(0,0,w,h)
    ctx.strokeStyle='rgba(100,80,200,0.05)'; ctx.lineWidth=1
    for(let gx=0;gx<w;gx+=80){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,h);ctx.stroke()}
    for(let gy=0;gy<h;gy+=80){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(w,gy);ctx.stroke()}
    const cx=w/2,cy=h*0.38
    ctx.strokeStyle=`rgba(232,32,12,${0.5+0.3*Math.sin(t*2)})`; ctx.lineWidth=1.5
    ctx.beginPath()
    for(let k=0;k<6;k++){const a=k*Math.PI/3-Math.PI/6;ctx.lineTo(cx+40*Math.cos(a),cy+40*Math.sin(a))}
    ctx.closePath(); ctx.stroke()
    ctx.fillStyle='#E8200C'; ctx.beginPath(); ctx.arc(cx,cy,8,0,Math.PI*2); ctx.fill()
    ctx.fillStyle='#E8200C'; ctx.font='bold italic 26px Arial Black,Arial'; ctx.textAlign='center'; ctx.fillText('FieldTune™',cx,h*0.56)
    ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.font='11px Arial'; ctx.fillText('SERVICE COMPRESSION',cx,h*0.64)
  }

  // Caption overlay
  if (caption) {
    const pad=32,bH=72,bY=h-bH-12
    const cg=ctx.createLinearGradient(0,bY,0,bY+bH)
    cg.addColorStop(0,'rgba(0,0,0,0)');cg.addColorStop(0.3,'rgba(0,0,0,0.85)');cg.addColorStop(1,'rgba(0,0,0,0.92)')
    ctx.fillStyle=cg; ctx.fillRect(0,bY-16,w,bH+28)
    ctx.fillStyle='#E8200C'; ctx.fillRect(pad,bY+4,3,36)
    ctx.fillStyle='rgba(255,255,255,0.94)'; ctx.font='13px Arial'; ctx.textAlign='left'
    const words=caption.split(' '),lines=[],maxW=w-pad*2-16; let line=''
    words.forEach(word=>{const test=line?line+' '+word:word;if(ctx.measureText(test).width>maxW&&line){lines.push(line);line=word}else line=test})
    if(line)lines.push(line)
    lines.slice(0,3).forEach((ln,i)=>ctx.fillText(ln,pad+12,bY+20+i*18))
  }
}

function drawDerrick(ctx,x,y,scale){
  ctx.strokeStyle='rgba(20,10,5,0.9)';ctx.lineWidth=2*scale
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-20*scale,y-60*scale);ctx.lineTo(x+20*scale,y-60*scale);ctx.closePath();ctx.stroke()
  ctx.beginPath();ctx.moveTo(x,y-60*scale);ctx.lineTo(x,y-90*scale);ctx.stroke()
}

function SceneCanvas({ scene, tick, showCaption }) {
  const ref = useRef(null)
  useEffect(()=>{
    const cv=ref.current; if(!cv) return
    drawScene(cv.getContext('2d'),scene.visual,showCaption?scene.script:null,tick,cv.width,cv.height)
  },[scene,tick,showCaption])
  return <canvas ref={ref} width={800} height={450} className="w-full rounded-lg" style={{aspectRatio:'16/9',background:'#050508'}} />
}

// ─── Main ──────────────────────────────────────────────────────────────────

export default function VideoCreator({ user, onLogout }) {
  const [project,setProject] = useState(()=>structuredClone(TEMPLATES[0]))
  const [activeScene,setActiveScene] = useState(0)
  const [tab,setTab] = useState('editor')
  const [tick,setTick] = useState(0)
  const [animating,setAnimating] = useState(false)
  const [aiLoading,setAiLoading] = useState(false)
  const [ttsLoading,setTtsLoading] = useState(false)
  const [rendering,setRendering] = useState(false)
  const [renderProgress,setRenderProgress] = useState(0)
  const [toast,setToast] = useState(null)
  const [showGenerate,setShowGenerate] = useState(false)
  const [genTopic,setGenTopic] = useState('')
  const [genSceneCount,setGenSceneCount] = useState(5)
  const [genProduct,setGenProduct] = useState('FieldTune™')
  const [genLoading,setGenLoading] = useState(false)
  const [optimizeLoading,setOptimizeLoading] = useState(false)
  const rafRef = useRef(null)
  const audioRef = useRef(null)
  const token = localStorage.getItem('vc_token')
  const authHeaders = {'Content-Type':'application/json',Authorization:`Bearer ${token}`}

  const showToast=(msg,type='ok')=>{setToast({msg,type});setTimeout(()=>setToast(null),3500)}

  useEffect(()=>{
    if(!animating) return
    const start=performance.now(); let last=-1
    const loop=(now)=>{
      const frame=Math.floor((now-start)/(1000/30))
      if(frame!==last){setTick(frame);last=frame}
      rafRef.current=requestAnimationFrame(loop)
    }
    rafRef.current=requestAnimationFrame(loop)
    return()=>cancelAnimationFrame(rafRef.current)
  },[animating])

  const scene=project.scenes[activeScene]

  const updateScene=(field,value)=>
    setProject(p=>{const scenes=[...p.scenes];scenes[activeScene]={...scenes[activeScene],[field]:value};return{...p,scenes}})

  const handleAiEnhance=async()=>{
    setAiLoading(true)
    try{
      const res=await fetch('/api/ai/script',{method:'POST',headers:authHeaders,
        body:JSON.stringify({script:scene.script,instruction:'Improve pacing for a 30-second spoken narration. Keep technical oilfield content accurate.'})})
      const data=await res.json()
      if(res.ok){updateScene('script',data.script);showToast('Script enhanced')}
      else showToast(data.error||'AI failed','err')
    }catch{showToast('Network error','err')}
    finally{setAiLoading(false)}
  }

  // Claude + GPT-4o in parallel — generate full video from topic
  const handleGenerate=async()=>{
    if(!genTopic.trim()){showToast('Enter a topic first','err');return}
    setGenLoading(true)
    showToast('Claude writing scripts + GPT-4o planning scenes in parallel…')
    try{
      const res=await fetch('/api/ai/generate',{method:'POST',headers:authHeaders,
        body:JSON.stringify({topic:genTopic,sceneCount:genSceneCount,productName:genProduct})})
      const data=await res.json()
      if(!res.ok){showToast(data.error||'Generation failed','err');return}
      const newScenes=data.scenes.map((sc,i)=>({...sc,id:`gen_${Date.now()}_${i}`}))
      setProject(p=>({...p,title:genTopic.slice(0,40),scenes:newScenes}))
      setActiveScene(0)
      setShowGenerate(false)
      const claudeStatus=data.meta?.claudeOk?'Claude ✓':'Claude ✗'
      const gptStatus=data.meta?.gptOk?'GPT-4o ✓':'GPT-4o ✗'
      showToast(`Generated ${newScenes.length} scenes — ${claudeStatus} · ${gptStatus}`)
    }catch{showToast('Network error','err')}
    finally{setGenLoading(false)}
  }

  // GPT-4o reviews pacing and suggests improvements
  const handleOptimize=async()=>{
    setOptimizeLoading(true)
    showToast('GPT-4o analyzing scene pacing…')
    try{
      const res=await fetch('/api/ai/optimize',{method:'POST',headers:authHeaders,
        body:JSON.stringify({scenes:project.scenes})})
      const data=await res.json()
      if(!res.ok){showToast(data.error||'Optimize failed','err');return}
      const suggestions=data.suggestions||[]
      if(!suggestions.length){showToast('GPT-4o: pacing looks good — no changes suggested');return}
      setProject(p=>{
        const scenes=[...p.scenes]
        suggestions.forEach(s=>{
          const idx=(s.scene||1)-1
          if(scenes[idx]){
            if(s.visual)scenes[idx]={...scenes[idx],visual:s.visual}
            if(s.duration)scenes[idx]={...scenes[idx],duration:s.duration}
          }
        })
        return{...p,scenes}
      })
      showToast(`GPT-4o applied ${suggestions.length} pacing improvement${suggestions.length!==1?'s':''}`)
    }catch{showToast('Network error','err')}
    finally{setOptimizeLoading(false)}
  }

  const handleTtsPreview=async()=>{
    if(audioRef.current){audioRef.current.pause();audioRef.current=null}
    setTtsLoading(true)
    try{
      const res=await fetch('/api/tts',{method:'POST',headers:authHeaders,body:JSON.stringify({text:scene.script,voice:'fable',speed:0.9})})
      if(!res.ok){showToast('TTS failed','err');return}
      const url=URL.createObjectURL(await res.blob())
      const audio=new Audio(url);audioRef.current=audio;audio.play()
      showToast('Playing narration…')
    }catch{showToast('TTS error','err')}
    finally{setTtsLoading(false)}
  }

  const handleRender=async()=>{
    setRendering(true);setRenderProgress(0);showToast('Starting render…')
    try{
      const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720
      const ctx=canvas.getContext('2d')
      const stream=canvas.captureStream(30),chunks=[]
      const mimeType=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm'
      const mr=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:4_000_000})
      mr.ondataavailable=e=>{if(e.data.size>0)chunks.push(e.data)}
      await new Promise((resolve,reject)=>{
        mr.start(100)
        let sceneIdx=0
        function nextScene(){
          if(sceneIdx>=project.scenes.length){mr.stop();return}
          const sc=project.scenes[sceneIdx],fps=30,totalFrames=sc.duration*fps;let f=0
          const iv=setInterval(()=>{
            if(f>=totalFrames){clearInterval(iv);sceneIdx++;setRenderProgress(Math.round((sceneIdx/project.scenes.length)*100));nextScene();return}
            drawScene(ctx,sc.visual,sc.script,f,canvas.width,canvas.height);f++
          },1000/fps)
        }
        mr.onstop=()=>{
          const blob=new Blob(chunks,{type:'video/webm'}),url=URL.createObjectURL(blob)
          const a=document.createElement('a');a.href=url;a.download=`${project.title.replace(/\s+/g,'-').toLowerCase()}.webm`;a.click()
          URL.revokeObjectURL(url);resolve()
        }
        mr.onerror=reject;nextScene()
      })
      showToast('Video downloaded!')
    }catch(err){console.error(err);showToast('Render failed — use Chrome or Edge','err')}
    finally{setRendering(false);setRenderProgress(0)}
  }

  const totalDuration=project.scenes.reduce((s,sc)=>s+sc.duration,0)

  return(
    <div className="min-h-screen flex flex-col" style={{background:'#080810'}}>
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-5 py-3 border-b" style={{background:'#0c0c18',borderColor:'#1a1a2a'}}>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold italic" style={{fontFamily:"'Arial Black',Arial",color:'#E8200C'}}>FieldTune™</span>
          <div className="w-px h-5 bg-[#2a2a3a]"/>
          <span className="text-sm text-slate-300 font-semibold">Marketing Creator</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-[#E8200C] border border-[#E8200C]/40" style={{background:'#1a0505'}}>BETA</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500">{user.name||user.username}</span>
          <button onClick={onLogout} className="text-[11px] px-3 py-1.5 rounded border text-slate-400 hover:text-white transition" style={{borderColor:'#2a2a3a'}}>Sign out</button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 flex flex-col border-r overflow-y-auto" style={{background:'#0a0a16',borderColor:'#1a1a2a'}}>
          <div className="px-3 pt-4">
            <button onClick={()=>setShowGenerate(true)}
              className="w-full mb-3 py-2.5 rounded-xl text-[11px] font-bold text-white flex items-center justify-center gap-2"
              style={{background:'linear-gradient(135deg,#1a0535,#0a0a1e)',border:'1px solid #6d28d9'}}>
              <span style={{color:'#a78bfa'}}>✦</span>
              <span>Generate with AI</span>
            </button>
            <p className="text-[10px] text-slate-600 font-bold tracking-widest uppercase mb-2">Templates</p>
            {TEMPLATES.map(tmpl=>(
              <button key={tmpl.id} onClick={()=>{setProject(structuredClone(tmpl));setActiveScene(0);setTab('editor')}}
                className={`w-full text-left px-3 py-2.5 rounded-lg mb-1.5 text-[11px] font-semibold border transition-all ${project.id===tmpl.id?'border-[#E8200C]/40 text-white':'border-transparent text-slate-400 hover:text-white hover:bg-[#111120]'}`}
                style={project.id===tmpl.id?{background:'#12050a'}:{}}>
                {tmpl.title}
                <div className="text-[9px] font-normal text-slate-600 mt-0.5">{tmpl.description}</div>
              </button>
            ))}
          </div>
          <div className="px-3 pt-3 pb-3 border-t mt-2" style={{borderColor:'#1a1a2a'}}>
            <p className="text-[10px] text-slate-600 font-bold tracking-widest uppercase mb-2">Scenes</p>
            {project.scenes.map((sc,i)=>(
              <button key={sc.id} onClick={()=>setActiveScene(i)}
                className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-[11px] transition-all ${i===activeScene?'bg-[#E8200C] text-white font-bold':'text-slate-400 hover:text-white hover:bg-[#111120] border border-[#1a1a2a]'}`}>
                <span className="opacity-50">#{i+1}</span> {VISUAL_LABELS[sc.visual]}
                <span className="ml-1 text-[9px] opacity-60">{sc.duration}s</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col min-w-0 overflow-auto p-4 gap-3">
          <div className="flex gap-2 shrink-0 items-center">
            {[['editor','Script Editor'],['preview','Preview'],['export','Export']].map(([id,label])=>(
              <button key={id} onClick={()=>setTab(id)}
                className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${tab===id?'bg-[#E8200C] text-white':'text-slate-400 hover:text-white border'}`}
                style={tab!==id?{borderColor:'#2a2a3a',background:'#0e0e1a'}:{}}>
                {label}
              </button>
            ))}
            <div className="flex-1"/>
            <button onClick={handleOptimize} disabled={optimizeLoading}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50 border"
              style={{borderColor:'#2a2a40',background:'#0c0c1e',color:'#818cf8'}}>
              {optimizeLoading?'Analyzing…':'⚡ GPT-4o Optimize Pacing'}
            </button>
          </div>

          {tab==='editor'&&(
            <div className="grid grid-cols-2 gap-4 flex-1">
              <div className="flex flex-col gap-3">
                <div className="relative rounded-xl overflow-hidden border" style={{borderColor:'#1a1a2a'}}>
                  <SceneCanvas scene={scene} tick={tick} showCaption={true}/>
                  <button onClick={()=>setAnimating(a=>!a)} className="absolute bottom-3 right-3 px-3 py-1 rounded-lg text-[10px] font-bold text-white"
                    style={{background:animating?'#1a1a2a':'#E8200C'}}>
                    {animating?'⏸ Pause':'▶ Animate'}
                  </button>
                </div>
                <div className="rounded-xl border p-3 space-y-2" style={{background:'#0e0e1a',borderColor:'#1a1a2a'}}>
                  <label className="block text-[10px] text-slate-500 font-bold tracking-widest uppercase">Visual Style</label>
                  <div className="flex flex-wrap gap-1.5">
                    {VISUALS.map(v=>(
                      <button key={v} onClick={()=>updateScene('visual',v)}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${scene.visual===v?'bg-[#E8200C] text-white':'text-slate-400 hover:text-white border'}`}
                        style={scene.visual!==v?{borderColor:'#2a2a3a',background:'#0a0a14'}:{}}>
                        {VISUAL_LABELS[v]}
                      </button>
                    ))}
                  </div>
                  <label className="block text-[10px] text-slate-500 font-bold tracking-widest uppercase">Duration: {scene.duration}s</label>
                  <input type="range" min={3} max={20} value={scene.duration} onChange={e=>updateScene('duration',+e.target.value)} className="w-full accent-red-600"/>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="rounded-xl border p-4 flex-1 flex flex-col" style={{background:'#0e0e1a',borderColor:'#1a1a2a'}}>
                  <label className="block text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-2">Scene {activeScene+1} Narration</label>
                  <textarea value={scene.script} onChange={e=>updateScene('script',e.target.value)} rows={8} placeholder="Enter narration for this scene…"
                    className="flex-1 w-full resize-none rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-red-600 leading-relaxed"
                    style={{background:'#07070f',border:'1px solid #1e1e30'}}/>
                  <div className="flex gap-2 mt-3">
                    <button onClick={handleAiEnhance} disabled={aiLoading}
                      className="flex-1 py-2 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50 border hover:border-purple-500 hover:text-purple-300"
                      style={{background:'#0c0c1e',borderColor:'#2a2a40',color:'#9090b0'}}>
                      {aiLoading?'Enhancing…':'✦ AI Enhance'}
                    </button>
                    <button onClick={handleTtsPreview} disabled={ttsLoading}
                      className="flex-1 py-2 rounded-lg text-[11px] font-bold text-white transition-all disabled:opacity-50"
                      style={{background:ttsLoading?'#1a1a2a':'#E8200C'}}>
                      {ttsLoading?'Loading…':'▶ Preview Voice'}
                    </button>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-600">
                    {scene.script.split(' ').filter(Boolean).length} words · ~{Math.round(scene.script.split(' ').filter(Boolean).length/2.5)}s spoken
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>setActiveScene(i=>Math.max(0,i-1))} disabled={activeScene===0}
                    className="px-4 py-2 rounded-lg text-[11px] font-bold text-slate-400 border hover:text-white transition disabled:opacity-30"
                    style={{borderColor:'#2a2a3a',background:'#0e0e1a'}}>← Prev</button>
                  <button onClick={()=>setActiveScene(i=>Math.min(project.scenes.length-1,i+1))} disabled={activeScene===project.scenes.length-1}
                    className="px-4 py-2 rounded-lg text-[11px] font-bold text-slate-400 border hover:text-white transition disabled:opacity-30"
                    style={{borderColor:'#2a2a3a',background:'#0e0e1a'}}>Next →</button>
                  <div className="flex-1"/>
                  <button onClick={()=>setTab('export')} className="px-5 py-2 rounded-lg text-[11px] font-bold text-white" style={{background:'#E8200C'}}>Export →</button>
                </div>
              </div>
            </div>
          )}

          {tab==='preview'&&(
            <div className="flex flex-col items-center gap-4">
              <div className="w-full max-w-3xl rounded-xl overflow-hidden border" style={{borderColor:'#1a1a2a'}}>
                <SceneCanvas scene={scene} tick={tick} showCaption={true}/>
              </div>
              <div className="flex gap-3">
                <button onClick={()=>setAnimating(a=>!a)} className="px-5 py-2 rounded-lg text-[11px] font-bold text-white" style={{background:animating?'#1a1a2a':'#E8200C'}}>
                  {animating?'⏸ Pause':'▶ Animate'}
                </button>
                <button onClick={handleTtsPreview} disabled={ttsLoading}
                  className="px-5 py-2 rounded-lg text-[11px] font-bold border text-slate-300 hover:text-white transition disabled:opacity-50"
                  style={{borderColor:'#2a2a3a',background:'#0e0e1a'}}>
                  {ttsLoading?'Loading…':'🔊 Play Narration'}
                </button>
              </div>
              <div className="flex gap-1.5 flex-wrap justify-center">
                {project.scenes.map((sc,i)=>(
                  <button key={sc.id} onClick={()=>setActiveScene(i)}
                    className={`px-3 py-1.5 rounded text-[10px] font-bold transition ${i===activeScene?'bg-[#E8200C] text-white':'text-slate-500 hover:text-white border'}`}
                    style={i!==activeScene?{borderColor:'#2a2a3a',background:'#0a0a14'}:{}}>
                    {i+1} · {VISUAL_LABELS[sc.visual]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab==='export'&&(
            <div className="max-w-xl mx-auto w-full flex flex-col gap-4">
              <div className="rounded-2xl border p-6" style={{background:'#0e0e1a',borderColor:'#1a1a2a'}}>
                <h2 className="text-base font-bold text-white mb-1">{project.title}</h2>
                <p className="text-[11px] text-slate-500 mb-4">{project.scenes.length} scenes · {totalDuration}s total</p>
                <div className="space-y-1.5 mb-5">
                  {project.scenes.map((sc,i)=>(
                    <div key={sc.id} className="flex items-center gap-3 text-[11px]">
                      <span className="text-slate-600 w-5">#{i+1}</span>
                      <span className="text-slate-400 w-32 shrink-0">{VISUAL_LABELS[sc.visual]}</span>
                      <span className="text-slate-600 w-8 shrink-0">{sc.duration}s</span>
                      <span className="text-slate-600 flex-1 truncate">{sc.script.slice(0,55)}…</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border p-3 mb-4 text-[10px] text-slate-500 space-y-1" style={{borderColor:'#1a1a2a',background:'#080810'}}>
                  <div className="font-bold text-slate-400 mb-1">Export Details</div>
                  <div>Format: WebM (VP9) · Resolution: 1280×720 · 30 fps</div>
                  <div className="text-amber-500/70">Video exports silent — add voice-over in CapCut, DaVinci Resolve, or Premiere</div>
                </div>
                {rendering?(
                  <div className="space-y-2">
                    <div className="w-full rounded-full h-2 overflow-hidden" style={{background:'#1a1a2a'}}>
                      <div className="h-full rounded-full transition-all duration-200" style={{width:`${renderProgress}%`,background:'#E8200C'}}/>
                    </div>
                    <div className="text-[11px] text-center text-slate-400">Rendering… {renderProgress}%</div>
                  </div>
                ):(
                  <button onClick={handleRender} className="w-full py-3 rounded-xl text-[12px] font-bold text-white" style={{background:'#E8200C'}}>
                    ↓ Render & Download Video
                  </button>
                )}
              </div>
              <div className="rounded-xl border p-4 text-[10px] text-slate-500" style={{borderColor:'#1a1a2a',background:'#0a0a14'}}>
                <div className="font-bold text-slate-400 mb-1.5">Posting to social media</div>
                <ol className="space-y-1 list-decimal list-inside">
                  <li>Download the .webm file above</li>
                  <li>Import into CapCut or DaVinci Resolve</li>
                  <li>Add your TTS voice-over track</li>
                  <li>Export as MP4 H.264 for LinkedIn, Instagram, or YouTube</li>
                </ol>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Generate with AI Modal */}
      {showGenerate&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.8)'}}>
          <div className="w-full max-w-md rounded-2xl border p-6" style={{background:'#0e0e1a',borderColor:'#2a2a40'}}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'linear-gradient(135deg,#1a0535,#0a0a1e)',border:'1px solid #6d28d9'}}>
                <span style={{color:'#a78bfa',fontSize:14}}>✦</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Generate with AI</h2>
                <p className="text-[10px] text-slate-500">Claude writes the scripts · GPT-4o plans the scenes — simultaneously</p>
              </div>
            </div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Topic / Product</label>
                <textarea value={genTopic} onChange={e=>setGenTopic(e.target.value)} rows={3}
                  placeholder="e.g. FieldTune WellLogic automated gas lift optimization for Permian Basin operators"
                  className="w-full resize-none rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-purple-600"
                  style={{background:'#07070f',border:'1px solid #2a2a40'}}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Scenes: {genSceneCount}</label>
                  <input type="range" min={3} max={8} value={genSceneCount} onChange={e=>setGenSceneCount(+e.target.value)} className="w-full accent-purple-600"/>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Product Name</label>
                  <input value={genProduct} onChange={e=>setGenProduct(e.target.value)}
                    className="w-full rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-purple-600"
                    style={{background:'#07070f',border:'1px solid #2a2a40'}}/>
                </div>
              </div>
              <div className="rounded-lg p-3 text-[10px] space-y-1" style={{background:'#080812',border:'1px solid #1a1a30'}}>
                <div className="flex items-center gap-2"><span style={{color:'#a78bfa'}}>✦ Claude Sonnet</span><span className="text-slate-600">writes narration for all {genSceneCount} scenes</span></div>
                <div className="flex items-center gap-2"><span style={{color:'#60a5fa'}}>⚡ GPT-4o</span><span className="text-slate-600">selects visuals, durations, and scene order</span></div>
                <div className="flex items-center gap-2"><span style={{color:'#f97316'}}>🔊 OpenAI TTS</span><span className="text-slate-600">available to preview any scene after generation</span></div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setShowGenerate(false)} className="flex-1 py-2.5 rounded-xl text-[11px] font-bold text-slate-400 border transition hover:text-white" style={{borderColor:'#2a2a3a',background:'#0a0a14'}}>Cancel</button>
              <button onClick={handleGenerate} disabled={genLoading||!genTopic.trim()}
                className="flex-1 py-2.5 rounded-xl text-[11px] font-bold text-white transition disabled:opacity-50"
                style={{background:'linear-gradient(135deg,#4c1d95,#1e1b4b)'}}>
                {genLoading?'Generating…':'✦ Generate Video'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast&&(
        <div className={`fixed bottom-5 right-5 px-4 py-2.5 rounded-xl text-[12px] font-bold shadow-xl z-50 ${toast.type==='err'?'bg-red-950 text-red-300 border border-red-800':'bg-[#111120] text-green-300 border border-green-900'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
