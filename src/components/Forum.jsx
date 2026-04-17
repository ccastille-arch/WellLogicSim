import { useState, useEffect } from 'react'
import { useAuth } from './auth/AuthProvider'

// Forum — localStorage for now, swap to Firebase when ready
// Floating button on every page, opens slide-out panel

function getPosts() {
  try { return JSON.parse(localStorage.getItem('welllogic_forum') || '[]') } catch { return [] }
}
function savePosts(posts) { localStorage.setItem('welllogic_forum', JSON.stringify(posts)) }

export function ForumButton({ onClick }) {
  return (
    <button onClick={onClick}
      className="fixed bottom-5 right-5 z-40 w-14 h-14 bg-[#D32028] hover:bg-[#B01A20] text-white rounded-full shadow-lg shadow-[#D32028]/30 flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95"
      title="Feedback & Discussion">
      💬
    </button>
  )
}

export function ForumPanel({ onClose }) {
  const { user, isAdmin } = useAuth()
  const [posts, setPosts] = useState(getPosts)
  const [name, setName] = useState(user?.name || '')
  const [comment, setComment] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [replyText, setReplyText] = useState('')

  // Refresh posts periodically (for multi-tab usage)
  useEffect(() => {
    const interval = setInterval(() => setPosts(getPosts()), 3000)
    return () => clearInterval(interval)
  }, [])

  const submitPost = () => {
    if (!name.trim() || !comment.trim()) return
    const newPost = {
      id: Date.now(),
      name: name.trim(),
      comment: comment.trim(),
      timestamp: new Date().toISOString(),
      replies: [],
    }
    const updated = [newPost, ...posts]
    setPosts(updated)
    savePosts(updated)
    setComment('')
  }

  const submitReply = (postId) => {
    if (!replyText.trim()) return
    const updated = posts.map(p => {
      if (p.id === postId) {
        return { ...p, replies: [...(p.replies || []), {
          author: user?.name || 'Admin',
          text: replyText.trim(),
          timestamp: new Date().toISOString(),
          isAdmin: isAdmin,
        }]}
      }
      return p
    })
    setPosts(updated)
    savePosts(updated)
    setReplyTo(null)
    setReplyText('')
  }

  const deletePost = (postId) => {
    if (!isAdmin) return
    const updated = posts.filter(p => p.id !== postId)
    setPosts(updated)
    savePosts(updated)
  }

  const formatTime = (iso) => {
    try { return new Date(iso).toLocaleString() } catch { return iso }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="w-[420px] h-full bg-[#0e0e18] border-l border-[#2a2a3a] shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-4 py-3 bg-[#0F3C64] border-b border-[#2a2a3a] shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm text-white font-bold" style={{ fontFamily: "'Montserrat'" }}>💬 Feedback & Discussion</h2>
            <button onClick={onClose} className="text-[#888] hover:text-white text-lg">✕</button>
          </div>
          <p className="text-[10px] text-[#666] mt-1">Share feedback, ask questions, or suggest improvements.</p>
        </div>

        {/* New post form */}
        <div className="px-4 py-3 bg-[#111120] border-b border-[#2a2a3a] shrink-0">
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Your name" className="w-full bg-[#03172A] border border-[#333] rounded px-3 py-2 text-white text-sm outline-none focus:border-[#D32028] mb-2" />
          <textarea value={comment} onChange={e => setComment(e.target.value)}
            placeholder="Your feedback or question..." rows={3}
            className="w-full bg-[#03172A] border border-[#333] rounded px-3 py-2 text-white text-sm outline-none focus:border-[#D32028] mb-2 resize-none" />
          <button onClick={submitPost} disabled={!name.trim() || !comment.trim()}
            className="w-full py-2 text-[11px] font-bold bg-[#D32028] text-white rounded hover:bg-[#B01A20] disabled:opacity-30">
            Post
          </button>
        </div>

        {/* Posts list */}
        <div className="flex-1 overflow-y-auto sidebar-scroll p-3 space-y-3">
          {posts.length === 0 ? (
            <div className="text-center py-10 text-[#555] text-sm">No posts yet. Be the first!</div>
          ) : posts.map(post => (
            <div key={post.id} className="bg-[#111120] rounded-lg border border-[#2a2a3a] p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-white font-bold">{post.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-[#555]">{formatTime(post.timestamp)}</span>
                  {isAdmin && <button onClick={() => deletePost(post.id)} className="text-[9px] text-[#D32028] hover:text-white">✕</button>}
                </div>
              </div>
              <p className="text-[11px] text-[#ccc] leading-relaxed">{post.comment}</p>

              {/* Replies */}
              {post.replies?.length > 0 && (
                <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-[#D32028]/30">
                  {post.replies.map((reply, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-bold ${reply.isAdmin ? 'text-[#D32028]' : 'text-[#4fc3f7]'}`}>
                          {reply.author} {reply.isAdmin && '(Admin)'}
                        </span>
                        <span className="text-[8px] text-[#555]">{formatTime(reply.timestamp)}</span>
                      </div>
                      <p className="text-[10px] text-[#aaa]">{reply.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply button (admin) or anyone */}
              {replyTo === post.id ? (
                <div className="mt-2 flex gap-1">
                  <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitReply(post.id)}
                    placeholder="Your reply..." autoFocus
                    className="flex-1 bg-[#03172A] border border-[#333] rounded px-2 py-1 text-white text-[10px] outline-none focus:border-[#D32028]" />
                  <button onClick={() => submitReply(post.id)} className="px-2 py-1 text-[9px] font-bold bg-[#D32028] text-white rounded">Reply</button>
                  <button onClick={() => setReplyTo(null)} className="px-2 py-1 text-[9px] text-[#888] border border-[#333] rounded">✕</button>
                </div>
              ) : (
                <button onClick={() => setReplyTo(post.id)} className="mt-1 text-[9px] text-[#888] hover:text-[#D32028]">
                  Reply
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
