import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'

const DOCS = [
  {
    id: 'comms',
    title: 'Wellhead Customer Comms — AWI',
    desc: 'SCADA communications spreadsheet for AWI wellhead controller',
    type: 'xlsx',
    file: 'Wellhead_Customer_Comms_AWI.xlsx',
    icon: '📊',
  },
  {
    id: 'registers',
    title: 'Wellhead SCADA Registers — AWI',
    desc: 'SCADA register mapping for AWI wellhead controller',
    type: 'xlsx',
    file: 'Wellhead_SCADA_AWI_Registers.xlsx',
    icon: '📋',
  },
  {
    id: 'electrical',
    title: 'Electrical Drawings — 450 HP',
    desc: 'Electrical drawings for 450HP compressor package',
    type: 'pdf',
    file: 'Drawings_Electrical_450hp.pdf',
    icon: '⚡',
  },
]

const BASE = import.meta.env.BASE_URL || '/'

function XlsxViewer({ file }) {
  const [sheets, setSheets] = useState(null)
  const [activeSheet, setActiveSheet] = useState(0)
  const [error, setError] = useState(null)

  useEffect(() => {
    const url = `${BASE}docs/${file}`
    fetch(url)
      .then(r => r.arrayBuffer())
      .then(buf => {
        const wb = XLSX.read(buf, { type: 'array' })
        const parsed = wb.SheetNames.map(name => {
          const ws = wb.Sheets[name]
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
          return { name, rows }
        })
        setSheets(parsed)
      })
      .catch(() => setError('Could not load file.'))
  }, [file])

  if (error) return <div className="p-6 text-[#D32028] text-sm">{error}</div>
  if (!sheets) return <div className="p-6 text-[#888] text-sm">Loading…</div>

  const current = sheets[activeSheet]
  const headers = current.rows[0] || []
  const body = current.rows.slice(1)

  return (
    <div className="flex flex-col h-full">
      {/* Sheet tabs */}
      {sheets.length > 1 && (
        <div className="flex gap-1 px-4 pt-3 border-b border-[#293C5B] flex-wrap">
          {sheets.map((s, i) => (
            <button key={i} onClick={() => setActiveSheet(i)}
              className={`px-3 py-1 text-[11px] rounded-t font-bold transition-colors ${
                i === activeSheet
                  ? 'bg-[#D32028] text-white'
                  : 'text-[#888] hover:text-white border border-[#333]'
              }`}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Download link */}
      <div className="flex justify-end px-4 py-2 border-b border-[#293C5B] shrink-0">
        <a href={`${BASE}docs/${file}`} download
          className="text-[10px] text-[#4fc3f7] hover:text-white flex items-center gap-1">
          ↓ Download .xlsx
        </a>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-[#111120] sticky top-0 z-10">
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 text-left text-[#D32028] font-bold border-b border-[#293C5B] border-r border-[#293C5B] whitespace-nowrap">
                  {String(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-[#05233E]' : 'bg-[#0c0c18]'}>
                {headers.map((_, ci) => (
                  <td key={ci} className="px-3 py-1.5 text-[#ccc] border-b border-[#111] border-r border-[#111] align-top">
                    {String(row[ci] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {body.length === 0 && (
          <div className="p-6 text-[#888] text-sm text-center">No data rows in this sheet.</div>
        )}
      </div>
    </div>
  )
}

function PdfViewer({ file }) {
  const url = `${BASE}docs/${file}`
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-end px-4 py-2 border-b border-[#293C5B] shrink-0">
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="text-[10px] text-[#4fc3f7] hover:text-white flex items-center gap-1 mr-3">
          ↗ Open in new tab
        </a>
        <a href={url} download
          className="text-[10px] text-[#4fc3f7] hover:text-white flex items-center gap-1">
          ↓ Download PDF
        </a>
      </div>
      <div className="flex-1 min-h-0">
        <iframe
          src={url}
          className="w-full h-full border-0"
          title={file}
        />
      </div>
    </div>
  )
}

export default function TechnicalDocs() {
  const [activeDoc, setActiveDoc] = useState(null)

  return (
    <div className="flex-1 flex flex-col bg-[#05233E] overflow-hidden">
      {/* Top bar */}
      <div className="px-6 py-4 border-b border-[#293C5B] shrink-0">
        <h1 className="text-lg text-white font-bold" style={{ fontFamily: "'Montserrat'" }}>
          Technical Documentation
        </h1>
        <p className="text-[11px] text-[#888] mt-0.5">Engineering specifications, SCADA references, and electrical drawings</p>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar — doc list */}
        <div className="w-[260px] shrink-0 border-r border-[#293C5B] flex flex-col bg-[#0F3C64]">
          {DOCS.map(doc => (
            <button key={doc.id} onClick={() => setActiveDoc(doc)}
              className={`text-left px-4 py-4 border-b border-[#293C5B] transition-colors ${
                activeDoc?.id === doc.id
                  ? 'bg-[#111120] border-l-2 border-l-[#D32028]'
                  : 'hover:bg-[#0F3C64]'
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{doc.icon}</span>
                <span className="text-[11px] font-bold text-white leading-tight">{doc.title}</span>
              </div>
              <p className="text-[10px] text-[#666] leading-tight pl-6">{doc.desc}</p>
              <span className={`ml-6 mt-1 inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold ${
                doc.type === 'pdf' ? 'bg-[#D32028]/20 text-[#D32028]' : 'bg-[#22c55e]/20 text-[#22c55e]'
              }`}>
                {doc.type}
              </span>
            </button>
          ))}
        </div>

        {/* Content pane */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {activeDoc ? (
            activeDoc.type === 'xlsx'
              ? <XlsxViewer file={activeDoc.file} key={activeDoc.id} />
              : <PdfViewer file={activeDoc.file} key={activeDoc.id} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-center px-8">
              <div>
                <div className="text-4xl mb-4">📁</div>
                <div className="text-white font-bold mb-2" style={{ fontFamily: "'Montserrat'" }}>
                  Select a Document
                </div>
                <p className="text-[12px] text-[#666]">Choose a file from the sidebar to view its contents.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
