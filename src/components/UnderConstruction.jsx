export default function UnderConstruction({ title, description, onBack }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#05233E]">
      <div className="text-center max-w-[500px] px-6">
        <div className="text-6xl mb-6">🚧</div>
        <h1 className="text-2xl text-white font-bold mb-2" style={{ fontFamily: "'Montserrat'" }}>
          {title || 'Under Construction'}
        </h1>
        <p className="text-sm text-[#888] mb-6">{description || 'This section is coming soon.'}</p>
        <div className="w-20 h-0.5 bg-[#D32028] mx-auto mb-6" />
        <button onClick={onBack}
          className="px-6 py-2 text-[11px] font-bold text-[#888] border border-[#333] rounded hover:text-white hover:border-[#D32028] transition-colors">
          ← Back to Home
        </button>
      </div>
    </div>
  )
}
