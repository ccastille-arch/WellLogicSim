import { useState } from 'react'
import { useAuth } from './auth/AuthProvider'

// Customer-facing quote request form
// Answers get saved as a new quote in the CRM pipeline (visible to admin)

export default function QuoteRequest({ onBack }) {
  const { user, addQuote } = useAuth()
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    customerName: '', contactName: user?.name || '', contactPhone: '', contactEmail: '',
    padName: '', basin: 'Permian — Delaware', wellCount: '', compressorCount: '',
    currentSetup: '', injectionType: 'Gas Lift', timeline: '', additionalNotes: '',
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = () => {
    if (!form.customerName || !form.contactName) return
    addQuote({
      ...form,
      wellCount: Number(form.wellCount) || 0,
      compressorCount: Number(form.compressorCount) || 0,
      estimatedValue: '',
      salesRep: '',
      notes: `Submitted by ${user?.name || 'visitor'}\nTimeline: ${form.timeline}\nCurrent Setup: ${form.currentSetup}\n${form.additionalNotes}`,
    })
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#080810]">
        <div className="text-center max-w-[500px] px-6">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl text-white font-bold mb-2" style={{ fontFamily: "'Arial Black'" }}>Quote Request Submitted</h1>
          <p className="text-sm text-[#888] mb-2">Thank you, {form.contactName}.</p>
          <p className="text-[12px] text-[#666] mb-6">
            Your request for <span className="text-white font-bold">{form.customerName}</span> has been received.
            A Service Compression representative will contact you shortly with pricing and next steps.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={onBack} className="px-6 py-2 text-[11px] font-bold bg-[#E8200C] text-white rounded-lg hover:bg-[#c01a0a]">← Back to Home</button>
            <button onClick={() => { setSubmitted(false); setForm(f => ({ ...f, customerName: '', padName: '', wellCount: '', compressorCount: '', additionalNotes: '' })) }}
              className="px-6 py-2 text-[11px] font-bold text-[#888] border border-[#333] rounded-lg hover:text-white">Submit Another</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-[#080810]">
      <div className="max-w-[650px] mx-auto py-8 px-6">
        <div className="text-center mb-6">
          <div className="text-xl tracking-tight mb-1" style={{ fontFamily: "'Arial Black'", fontStyle: 'italic', color: '#E8200C' }}>FieldTune™</div>
          <h1 className="text-xl text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>Request a WellLogic™ Quote</h1>
          <p className="text-[12px] text-[#888] mt-1">Tell us about your pad and we'll provide custom pricing.</p>
        </div>

        <div className="space-y-4">
          <FormSection title="Your Information">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Your Name *" value={form.contactName} onChange={v => set('contactName', v)} placeholder="John Smith" />
              <Input label="Company / Operator *" value={form.customerName} onChange={v => set('customerName', v)} placeholder="Company name" />
              <Input label="Phone" value={form.contactPhone} onChange={v => set('contactPhone', v)} placeholder="(555) 123-4567" />
              <Input label="Email" value={form.contactEmail} onChange={v => set('contactEmail', v)} placeholder="john@company.com" />
            </div>
          </FormSection>

          <FormSection title="Pad Details">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Pad / Lease Name" value={form.padName} onChange={v => set('padName', v)} placeholder="e.g. Wolfcamp 14H" />
              <Select label="Basin" value={form.basin} onChange={v => set('basin', v)}
                options={['Permian — Delaware', 'Permian — Midland', 'Eagle Ford', 'DJ Basin', 'Bakken', 'Other']} />
              <Input label="Number of Wells" value={form.wellCount} onChange={v => set('wellCount', v)} placeholder="e.g. 6" type="number" />
              <Input label="Number of Compressors" value={form.compressorCount} onChange={v => set('compressorCount', v)} placeholder="e.g. 2" type="number" />
              <Select label="Injection Type" value={form.injectionType} onChange={v => set('injectionType', v)}
                options={['Gas Lift', 'Plunger Lift', 'ESP', 'Rod Pump', 'Other']} />
              <Select label="Desired Timeline" value={form.timeline} onChange={v => set('timeline', v)}
                options={['', 'ASAP — within 30 days', '1-3 months', '3-6 months', 'Planning / budgeting phase', 'Just exploring options']} />
            </div>
          </FormSection>

          <FormSection title="Current Setup">
            <Select label="How are choke valves controlled today?" value={form.currentSetup} onChange={v => set('currentSetup', v)}
              options={['', 'Manual — pumper adjusts on-site', 'Timer-based automation', 'Basic PLC / RTU', 'SCADA with manual setpoints', 'No automation', 'Other']} />
            <div className="mt-3">
              <label className="block text-[10px] text-[#aaa] uppercase tracking-wider font-bold mb-1">Additional Notes or Questions</label>
              <textarea value={form.additionalNotes} onChange={e => set('additionalNotes', e.target.value)} rows={4}
                placeholder="Anything else we should know about your operation..."
                className="w-full bg-[#0a0a14] border border-[#333] rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[#E8200C] resize-none" />
            </div>
          </FormSection>
        </div>

        <button onClick={handleSubmit} disabled={!form.customerName || !form.contactName}
          className="w-full mt-6 py-3 bg-[#E8200C] hover:bg-[#c01a0a] text-white font-bold rounded-lg text-sm transition-colors disabled:opacity-30"
          style={{ fontFamily: "'Arial Black'" }}>
          Submit Quote Request
        </button>
        <p className="text-[9px] text-[#444] text-center mt-2">A Service Compression representative will follow up within 1 business day.</p>
      </div>
    </div>
  )
}

function FormSection({ title, children }) {
  return (
    <div className="bg-[#111118] rounded-xl border border-[#222] p-5">
      <h2 className="text-[10px] text-[#E8200C] font-bold uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  )
}

function Input({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-[10px] text-[#aaa] uppercase tracking-wider font-bold mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-[#0a0a14] border border-[#333] rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[#E8200C]" />
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-[10px] text-[#aaa] uppercase tracking-wider font-bold mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-[#0a0a14] border border-[#333] rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[#E8200C]">
        {options.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
      </select>
    </div>
  )
}
