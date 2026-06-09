import { useState, useRef, useEffect, useCallback } from 'react'

const PANEL_W = 340
const PANEL_H = 420

const VeraDialogue = ({ id, zoneText, zoneName, tabName, initialRect, onClose }) => {
  const [messages, setMessages]   = useState([])
  const [draft, setDraft]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [pos, setPos]             = useState(() => clampToViewport(
    initialRect.left + initialRect.width  / 2 - PANEL_W / 2,
    initialRect.top  + initialRect.height / 2 - PANEL_H / 2,
  ))

  const threadRef  = useRef(null)
  const dragState  = useRef(null) // { startX, startY, origX, origY }
  const inputRef   = useRef(null)

  // Auto-scroll thread on new message
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [messages, loading])

  // Focus input on open
  useEffect(() => { inputRef.current?.focus() }, [])

  // ── drag ──────────────────────────────────────────────────────────────────
  const onHeaderDown = useCallback((e) => {
    e.preventDefault()
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }

    const onMove = (ev) => {
      const dx = ev.clientX - dragState.current.startX
      const dy = ev.clientY - dragState.current.startY
      setPos(clampToViewport(dragState.current.origX + dx, dragState.current.origY + dy))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      dragState.current = null
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [pos])

  // ── send message ──────────────────────────────────────────────────────────
  const send = async () => {
    const text = draft.trim()
    if (!text || loading) return
    setDraft('')

    const updated = [...messages, { role: 'user', content: text }]
    setMessages(updated)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'vera', zoneText, zoneName, tabName, messages: updated }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message || data.error }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const title = zoneName || zoneText.split(' ').slice(0, 5).join(' ') + '…'

  return (
    <div style={{
      position: 'fixed',
      left: pos.x,
      top: pos.y,
      width: PANEL_W,
      height: PANEL_H,
      background: 'white',
      borderRadius: '12px',
      border: '1px solid rgba(94,59,135,0.2)',
      boxShadow: '0 12px 40px rgba(94,59,135,0.18)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10000,
      overflow: 'hidden',
      userSelect: 'none',
    }}>

      {/* Header — drag handle */}
      <div
        onMouseDown={onHeaderDown}
        style={{
          background: '#5e3b87',
          padding: '0.65rem 0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'grab',
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 2 }}>
            Vera · {tabName}
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white', fontFamily: "'DM Sans', sans-serif" }}>
            {title}
          </div>
        </div>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', cursor: 'pointer', lineHeight: 1, padding: '2px 4px', fontFamily: 'sans-serif' }}
        >
          ×
        </button>
      </div>

      {/* Context chip */}
      <div style={{ padding: '0.5rem 0.85rem', borderBottom: '1px solid rgba(94,59,135,0.08)', flexShrink: 0, background: '#faf8fc' }}>
        <p style={{ margin: 0, fontSize: '0.72rem', color: '#888', lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>
          {zoneText.length > 120 ? zoneText.slice(0, 120) + '…' : zoneText}
        </p>
      </div>

      {/* Thread */}
      <div ref={threadRef} style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {messages.length === 0 && (
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#bbb', fontStyle: 'italic', fontFamily: "'DM Sans', sans-serif" }}>
            What would you like to know about this?
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '88%',
            padding: '0.45rem 0.7rem',
            borderRadius: m.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
            background: m.role === 'user' ? '#5e3b87' : '#f3f1f6',
            color: m.role === 'user' ? 'white' : '#1a1a1a',
            fontSize: '0.8rem',
            lineHeight: 1.55,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', padding: '0.45rem 0.7rem', borderRadius: '10px 10px 10px 2px', background: '#f3f1f6' }}>
            <span style={{ display: 'inline-flex', gap: 3 }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#5e3b87', opacity: 0.4, animation: `veraTyping 1s ${i * 0.2}s ease-in-out infinite` }} />
              ))}
            </span>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '0.6rem 0.75rem', borderTop: '1px solid rgba(94,59,135,0.08)', display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Ask about this…"
          style={{
            flex: 1,
            padding: '0.45rem 0.65rem',
            border: '1px solid rgba(94,59,135,0.2)',
            borderRadius: '7px',
            fontSize: '0.8rem',
            fontFamily: "'DM Sans', sans-serif",
            outline: 'none',
            color: '#1a1a1a',
          }}
        />
        <button
          onClick={send}
          disabled={loading || !draft.trim()}
          style={{
            padding: '0.45rem 0.9rem',
            background: loading || !draft.trim() ? '#f5d98a' : '#f0a500',
            color: loading || !draft.trim() ? '#7a5c1a' : '#1a0533',
            border: 'none',
            borderRadius: '7px',
            fontSize: '0.8rem',
            fontWeight: 500,
            cursor: loading || !draft.trim() ? 'default' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}

function clampToViewport(x, y) {
  const maxX = window.innerWidth  - PANEL_W - 12
  const maxY = window.innerHeight - PANEL_H - 12
  return {
    x: Math.max(8, Math.min(x, maxX)),
    y: Math.max(8, Math.min(y, maxY)),
  }
}

export default VeraDialogue
