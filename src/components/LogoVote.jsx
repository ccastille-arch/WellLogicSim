import { useState, useEffect } from 'react'
import { LOGO_OPTIONS } from './BrandLogos'
import { useAuth } from './auth/AuthProvider'
import { api } from '../services/api'

export default function LogoVote() {
  const { user, isAdmin, updateSettings } = useAuth()
  const [counts, setCounts]   = useState({})
  const [myVote, setMyVote]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [casting, setCasting] = useState(null)

  useEffect(() => {
    api.votes.getLogo()
      .then(({ counts, myVote }) => { setCounts(counts); setMyVote(myVote) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const vote = async (logoId) => {
    if (casting) return
    setCasting(logoId)
    try {
      const { counts: newCounts, myVote: newVote } = await api.votes.castLogo(logoId)
      setCounts(newCounts)
      setMyVote(newVote)
    } catch {}
    setCasting(null)
  }

  const setActive = (logoId) => {
    updateSettings('selectedLogo', logoId)
  }

  const totalVotes = Object.values(counts).reduce((s, n) => s + n, 0)

  return (
    <div className="flex-1 flex flex-col bg-[#080810] overflow-auto">
      <div className="max-w-[1200px] w-full mx-auto px-4 py-8">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl text-white font-bold mb-1" style={{ fontFamily: "'Arial Black'" }}>
            Vote on the New Logo
          </h1>
          <p className="text-[12px] text-[#888]">
            Pick your favorite — one vote per person. {totalVotes > 0 && `${totalVotes} vote${totalVotes !== 1 ? 's' : ''} cast so far.`}
          </p>
          {myVote && (
            <p className="text-[11px] text-[#22c55e] mt-1">
              Your vote: <span className="font-bold">{LOGO_OPTIONS.find(l => l.id === myVote)?.name || myVote}</span>
            </p>
          )}
          <div className="w-16 h-0.5 bg-[#E8200C] mx-auto mt-3" />
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#888] text-sm">Loading votes...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {LOGO_OPTIONS.map((logo) => {
              const voteCount = counts[logo.id] || 0
              const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0
              const isMyVote = myVote === logo.id
              const isLeading = voteCount > 0 && voteCount === Math.max(...Object.values(counts))

              return (
                <div key={logo.id}
                  className={`bg-[#111118] rounded-xl border-2 flex flex-col overflow-hidden transition-all
                    ${isMyVote ? 'border-[#22c55e] shadow-lg shadow-[#22c55e]/20' : 'border-[#222] hover:border-[#444]'}`}>

                  {/* Logo preview */}
                  <div className="flex items-center justify-center py-4 px-2 bg-[#0a0a14]">
                    <logo.Full size={130} />
                  </div>

                  {/* Info */}
                  <div className="p-3 flex flex-col flex-1">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-[11px] text-white font-bold">{logo.name}</span>
                      {isLeading && <span className="text-[8px] bg-[#eab308] text-black px-1 rounded font-bold ml-auto">LEADING</span>}
                    </div>
                    <p className="text-[9px] text-[#666] leading-relaxed mb-2 flex-1">{logo.desc}</p>

                    {/* Vote bar */}
                    <div className="mb-2">
                      <div className="flex justify-between text-[9px] text-[#888] mb-0.5">
                        <span>{voteCount} vote{voteCount !== 1 ? 's' : ''}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full bg-[#1a1a2a] rounded h-1.5 overflow-hidden">
                        <div className={`h-full rounded transition-all duration-500 ${isMyVote ? 'bg-[#22c55e]' : 'bg-[#E8200C]'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-1.5">
                      <button onClick={() => vote(logo.id)} disabled={!!casting}
                        className={`flex-1 py-1.5 text-[9px] font-bold rounded transition-colors
                          ${isMyVote
                            ? 'bg-[#22c55e] text-black'
                            : 'bg-[#E8200C] hover:bg-[#c01a0a] text-white disabled:opacity-50'}`}>
                        {casting === logo.id ? '...' : isMyVote ? '✓ Voted' : 'Vote'}
                      </button>
                      {isAdmin && (
                        <button onClick={() => setActive(logo.id)}
                          title="Set as active logo"
                          className="px-2 py-1.5 text-[9px] font-bold text-[#f97316] border border-[#f97316]/30 rounded hover:bg-[#f97316]/10">
                          Use
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-center text-[9px] text-[#333] mt-8">
          Votes are shared across all devices in real time.
          {isAdmin && ' As admin, use the "Use" button to set the active logo for everyone.'}
        </p>
      </div>
    </div>
  )
}
