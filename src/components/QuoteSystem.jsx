import { useState } from 'react'
import { useAuth } from './auth/AuthProvider'

const STAGES = ['New', 'Contacted', 'Site Survey', 'Engineering', 'Quoted', 'Negotiation', 'Won', 'Lost']
const STAGE_COLORS = { New: '#4fc3f7', Contacted: '#f97316', 'Site Survey': '#eab308', Engineering: '#a855f7', Quoted: '#22c55e', Negotiation: '#f97316', Won: '#22c55e', Lost: '#E8200C' }

export default function QuoteSystem({ onBack }) {
  const { quotes, addQuote, updateQuote, deleteQuote, isAdmin, canViewQuotes, user } = useAuth()
  const [view, setView] = useState('pipeline') // pipeline | new | detail
  const [selectedQuote, setSelectedQuote] = useState(null)

  if (!canViewQuotes && !isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#080810]">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-lg text-white font-bold mb-2" style={{ fontFamily: "'Arial Black'" }}>Access Required</h2>
          <p className="text-[12px] text-[#888] mb-4">You don't have permission to view the quote system. Contact your admin.</p>
          <button onClick={onBack} className="px-4 py-2 text-[11px] font-bold text-[#888] border border-[#333] rounded hover:text-white">← Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#080810] overflow-hidden">
      <div className="px-6 py-4 bg-[#0c0c16] border-b border-[#1a1a2a] shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>💰 Quote & Sales Pipeline</h1>
            <p className="text-[11px] text-[#888]">{quotes.length} project{quotes.length !== 1 ? 's' : ''} in pipeline</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setView('new')} className="px-4 py-2 text-[11px] font-bold bg-[#E8200C] text-white rounded hover:bg-[#c01a0a]">+ New Quote</button>
            <button onClick={onBack} className="px-4 py-2 text-[11px] font-bold text-[#888] border border-[#333] rounded hover:text-white">← Back</button>
          </div>
        </div>
      </div>

      {/* Pipeline tabs */}
      <div className="flex gap-1 px-4 py-2 bg-[#0a0a14] border-b border-[#1a1a2a] shrink-0 overflow-x-auto">
        <button onClick={() => setView('pipeline')} className={`px-3 py-1 rounded text-[10px] font-bold ${view === 'pipeline' ? 'bg-[#E8200C] text-white' : 'text-[#888] hover:text-white'}`}>Pipeline</button>
        <button onClick={() => setView('list')} className={`px-3 py-1 rounded text-[10px] font-bold ${view === 'list' ? 'bg-[#E8200C] text-white' : 'text-[#888] hover:text-white'}`}>List View</button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {view === 'new' && <NewQuoteForm onSave={(q) => { addQuote(q); setView('pipeline') }} onCancel={() => setView('pipeline')} />}
        {view === 'detail' && selectedQuote && (
          <QuoteDetail quote={selectedQuote} onUpdate={updateQuote} onDelete={(id) => { deleteQuote(id); setView('pipeline') }}
            onBack={() => setView('pipeline')} isAdmin={isAdmin} />
        )}
        {view === 'pipeline' && <PipelineView quotes={quotes} onSelect={(q) => { setSelectedQuote(q); setView('detail') }} />}
        {view === 'list' && <ListView quotes={quotes} onSelect={(q) => { setSelectedQuote(q); setView('detail') }} />}
      </div>
    </div>
  )
}

function PipelineView({ quotes, onSelect }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
      {STAGES.map(stage => {
        const stageQuotes = quotes.filter(q => q.status === stage)
        return (
          <div key={stage} className="w-[220px] shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS[stage] }} />
              <span className="text-[11px] text-white font-bold">{stage}</span>
              <span className="text-[9px] text-[#555] ml-auto">{stageQuotes.length}</span>
            </div>
            <div className="space-y-2">
              {stageQuotes.map(q => (
                <button key={q.id} onClick={() => onSelect(q)}
                  className="w-full bg-[#111120] rounded-lg border border-[#2a2a3a] p-3 text-left hover:border-[#E8200C]/50 transition-colors">
                  <div className="text-[11px] text-white font-bold truncate">{q.customerName}</div>
                  <div className="text-[9px] text-[#888] truncate">{q.padName || 'No pad specified'}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[9px] text-[#555]">{q.wellCount || '?'} wells, {q.compressorCount || '?'} comps</span>
                    <span className="text-[9px] text-[#888]">{new Date(q.createdAt).toLocaleDateString()}</span>
                  </div>
                  {q.estimatedValue && <div className="text-[10px] text-[#22c55e] font-bold mt-1">${q.estimatedValue.toLocaleString()}</div>}
                </button>
              ))}
              {stageQuotes.length === 0 && <div className="text-[10px] text-[#333] text-center py-6">No quotes</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ListView({ quotes, onSelect }) {
  return (
    <div className="max-w-[1000px]">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-[#2a2a3a] text-[#888]">
            <th className="text-left py-2 px-2">Customer</th>
            <th className="text-left py-2 px-2">Pad</th>
            <th className="text-left py-2 px-2">Wells</th>
            <th className="text-left py-2 px-2">Status</th>
            <th className="text-left py-2 px-2">Value</th>
            <th className="text-left py-2 px-2">Created</th>
            <th className="text-left py-2 px-2">By</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map(q => (
            <tr key={q.id} onClick={() => onSelect(q)} className="border-b border-[#1a1a2a] hover:bg-[#111120] cursor-pointer">
              <td className="py-2 px-2 text-white font-bold">{q.customerName}</td>
              <td className="py-2 px-2 text-[#888]">{q.padName || '—'}</td>
              <td className="py-2 px-2 text-[#888]">{q.wellCount || '—'}</td>
              <td className="py-2 px-2"><span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: (STAGE_COLORS[q.status] || '#888') + '20', color: STAGE_COLORS[q.status] }}>{q.status}</span></td>
              <td className="py-2 px-2 text-[#22c55e] font-bold">{q.estimatedValue ? `$${q.estimatedValue.toLocaleString()}` : '—'}</td>
              <td className="py-2 px-2 text-[#555]">{new Date(q.createdAt).toLocaleDateString()}</td>
              <td className="py-2 px-2 text-[#555]">{q.createdBy}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {quotes.length === 0 && <div className="text-center py-10 text-[#555]">No quotes yet. Click "+ New Quote" to create one.</div>}
    </div>
  )
}

function NewQuoteForm({ onSave, onCancel }) {
  const [form, setForm] = useState({
    customerName: '', padName: '', basin: 'Permian — Delaware', contactName: '', contactPhone: '', contactEmail: '',
    wellCount: 4, compressorCount: 2, estimatedValue: '', notes: '', salesRep: '',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="max-w-[600px]">
      <h2 className="text-sm text-white font-bold mb-4" style={{ fontFamily: "'Arial Black'" }}>New Quote / Project</h2>
      <div className="space-y-3">
        <FormSection title="Customer Information">
          <Row><Input label="Customer / Operator" value={form.customerName} onChange={v => set('customerName', v)} /></Row>
          <Row>
            <Input label="Contact Name" value={form.contactName} onChange={v => set('contactName', v)} />
            <Input label="Phone" value={form.contactPhone} onChange={v => set('contactPhone', v)} />
          </Row>
          <Row><Input label="Email" value={form.contactEmail} onChange={v => set('contactEmail', v)} /></Row>
        </FormSection>
        <FormSection title="Pad Details">
          <Row>
            <Input label="Pad / Lease Name" value={form.padName} onChange={v => set('padName', v)} />
            <Select label="Basin" value={form.basin} onChange={v => set('basin', v)} options={['Permian — Delaware', 'Permian — Midland', 'Eagle Ford', 'DJ Basin', 'Bakken', 'Other']} />
          </Row>
          <Row>
            <Input label="Well Count" value={form.wellCount} onChange={v => set('wellCount', Number(v))} type="number" />
            <Input label="Compressor Count" value={form.compressorCount} onChange={v => set('compressorCount', Number(v))} type="number" />
          </Row>
        </FormSection>
        <FormSection title="Sales">
          <Row>
            <Input label="Estimated Value ($)" value={form.estimatedValue} onChange={v => set('estimatedValue', Number(v))} type="number" />
            <Input label="Sales Rep" value={form.salesRep} onChange={v => set('salesRep', v)} />
          </Row>
          <Row><Textarea label="Notes" value={form.notes} onChange={v => set('notes', v)} /></Row>
        </FormSection>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={onCancel} className="px-4 py-2 text-[11px] font-bold text-[#888] border border-[#333] rounded hover:text-white">Cancel</button>
        <button onClick={() => { if (form.customerName) onSave(form) }} disabled={!form.customerName}
          className="px-6 py-2 text-[11px] font-bold bg-[#E8200C] text-white rounded hover:bg-[#c01a0a] disabled:opacity-30">Save Quote</button>
      </div>
    </div>
  )
}

function QuoteDetail({ quote, onUpdate, onDelete, onBack, isAdmin }) {
  const [status, setStatus] = useState(quote.status)
  const [note, setNote] = useState('')

  const addNote = () => {
    if (!note.trim()) return
    const notes = (quote.notes || '') + `\n[${new Date().toLocaleString()}] ${note.trim()}`
    onUpdate(quote.id, { notes })
    setNote('')
  }

  return (
    <div className="max-w-[700px]">
      <button onClick={onBack} className="text-[10px] text-[#888] hover:text-white mb-3">← Back to pipeline</button>
      <div className="bg-[#111120] rounded-xl border border-[#2a2a3a] p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>{quote.customerName}</h2>
            <p className="text-[11px] text-[#888]">{quote.padName || 'No pad'} — {quote.basin || ''}</p>
          </div>
          <span className="px-3 py-1 rounded text-[10px] font-bold" style={{ backgroundColor: (STAGE_COLORS[quote.status] || '#888') + '20', color: STAGE_COLORS[quote.status] }}>
            {quote.status}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4 text-[11px]">
          <div><span className="text-[#888]">Wells:</span> <span className="text-white font-bold">{quote.wellCount || '—'}</span></div>
          <div><span className="text-[#888]">Compressors:</span> <span className="text-white font-bold">{quote.compressorCount || '—'}</span></div>
          <div><span className="text-[#888]">Value:</span> <span className="text-[#22c55e] font-bold">{quote.estimatedValue ? `$${Number(quote.estimatedValue).toLocaleString()}` : '—'}</span></div>
          <div><span className="text-[#888]">Contact:</span> <span className="text-white">{quote.contactName || '—'}</span></div>
          <div><span className="text-[#888]">Phone:</span> <span className="text-white">{quote.contactPhone || '—'}</span></div>
          <div><span className="text-[#888]">Email:</span> <span className="text-white">{quote.contactEmail || '—'}</span></div>
          <div><span className="text-[#888]">Sales Rep:</span> <span className="text-white">{quote.salesRep || '—'}</span></div>
          <div><span className="text-[#888]">Created:</span> <span className="text-white">{new Date(quote.createdAt).toLocaleString()}</span></div>
          <div><span className="text-[#888]">By:</span> <span className="text-white">{quote.createdBy}</span></div>
        </div>

        {/* Status update */}
        <div className="mb-4">
          <label className="text-[9px] text-[#888] uppercase tracking-wider font-bold">Update Status</label>
          <div className="flex gap-1 mt-1 flex-wrap">
            {STAGES.map(s => (
              <button key={s} onClick={() => { setStatus(s); onUpdate(quote.id, { status: s }) }}
                className={`px-2 py-1 rounded text-[9px] font-bold transition-colors ${quote.status === s ? 'text-white' : 'text-[#888] hover:text-white'}`}
                style={quote.status === s ? { backgroundColor: STAGE_COLORS[s], color: '#000' } : { backgroundColor: '#1a1a2a' }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="text-[9px] text-[#888] uppercase tracking-wider font-bold">Notes</label>
          <pre className="text-[10px] text-[#ccc] bg-[#0a0a14] rounded p-2 mt-1 whitespace-pre-wrap max-h-[150px] overflow-y-auto">{quote.notes || 'No notes'}</pre>
          <div className="flex gap-1 mt-2">
            <input type="text" value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote()}
              placeholder="Add a note..." className="flex-1 bg-[#0a0a14] border border-[#333] rounded px-2 py-1.5 text-white text-[10px] outline-none" />
            <button onClick={addNote} className="px-3 py-1.5 text-[9px] font-bold bg-[#E8200C] text-white rounded">Add</button>
          </div>
        </div>

        {/* History */}
        <div>
          <label className="text-[9px] text-[#888] uppercase tracking-wider font-bold">History</label>
          <div className="mt-1 space-y-1 max-h-[120px] overflow-y-auto">
            {(quote.history || []).map((h, i) => (
              <div key={i} className="text-[9px] text-[#666]">{new Date(h.at).toLocaleString()} — {h.by}: {h.action}</div>
            ))}
          </div>
        </div>

        {isAdmin && (
          <button onClick={() => { if (confirm('Delete this quote?')) onDelete(quote.id) }}
            className="mt-4 px-3 py-1 text-[9px] text-[#E8200C] border border-[#E8200C]/30 rounded hover:bg-[#E8200C] hover:text-white">
            Delete Quote
          </button>
        )}
      </div>
    </div>
  )
}

// Form helpers
function FormSection({ title, children }) {
  return <div className="bg-[#0a0a14] rounded-lg border border-[#2a2a3a] p-3">
    <div className="text-[9px] text-[#E8200C] font-bold uppercase tracking-wider mb-2">{title}</div>{children}</div>
}
function Row({ children }) { return <div className="grid grid-cols-2 gap-2 mb-2">{children}</div> }
function Input({ label, value, onChange, type = 'text' }) {
  return <div><label className="text-[9px] text-[#888] block mb-0.5">{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      className="w-full bg-[#111120] border border-[#333] rounded px-2 py-1.5 text-white text-[11px] outline-none focus:border-[#E8200C]" /></div>
}
function Select({ label, value, onChange, options }) {
  return <div><label className="text-[9px] text-[#888] block mb-0.5">{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full bg-[#111120] border border-[#333] rounded px-2 py-1.5 text-white text-[11px] outline-none">{options.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
}
function Textarea({ label, value, onChange }) {
  return <div className="col-span-2"><label className="text-[9px] text-[#888] block mb-0.5">{label}</label>
    <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
      className="w-full bg-[#111120] border border-[#333] rounded px-2 py-1.5 text-white text-[11px] outline-none focus:border-[#E8200C] resize-none" /></div>
}
