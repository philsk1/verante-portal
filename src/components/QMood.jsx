import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

const STATES = [
  { min: 0,  max: 30,  src: '/qmood/crying.svg',  caption: "I don't know what to say yet…" },
  { min: 31, max: 60,  src: '/qmood/sad.svg',      caption: "Nearly there — I'm missing a few things" },
  { min: 61, max: 85,  src: '/qmood/content.svg',  caption: "I'm ready. You could make me better though." },
  { min: 86, max: 100, src: '/qmood/smile.png',    caption: "I'm ready — you can always fine-tune me later" },
]

function QDialoguePanel({ state, score, sectionLabel, context, anchorRect, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Want me to explain what I'm seeing? Ask me anything." },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async (text) => {
    if (!text.trim() || loading) return
    const userMsg = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'q-section', sectionLabel, score, context, messages: next }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.message || 'Something went wrong — please try again.' }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'I had trouble connecting. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }, [messages, loading, sectionLabel, score, context])

  const PANEL_W = 308
  const left = Math.max(8, Math.min(
    window.innerWidth - PANEL_W - 8,
    (anchorRect.left + anchorRect.right) / 2 - PANEL_W / 2
  ))
  const top = Math.min(anchorRect.bottom + 8, window.innerHeight - 400)

  return createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
      <div style={{
        position: 'fixed', left, top, width: PANEL_W, zIndex: 9999,
        background: '#0f2744',
        borderRadius: 14,
        boxShadow: '0 12px 40px rgba(0,0,0,0.38), 0 2px 8px rgba(0,0,0,0.22)',
        overflow: 'hidden',
        fontFamily: "'DM Sans', sans-serif",
        animation: 'veraFlyIn 0.18s ease-out forwards',
      }}>
        {/* Header */}
        <div style={{ padding: '0.65rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <img src={state.src} alt="Q" style={{ width: 26, height: 26, objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: '0.74rem', color: 'rgba(255,255,255,0.82)', fontWeight: 600, letterSpacing: '0.01em' }}>{sectionLabel}</div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(115,223,217,0.85)', fontWeight: 700, marginRight: 6 }}>{score}/100</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.38)', cursor: 'pointer', fontSize: '1.05rem', lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
        </div>

        {/* Messages */}
        <div style={{ maxHeight: 230, overflowY: 'auto', padding: '0.65rem 0.9rem', display: 'flex', flexDirection: 'column', gap: '0.42rem' }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              background: m.role === 'user' ? 'rgba(255,255,255,0.11)' : 'rgba(115,223,217,0.13)',
              borderRadius: m.role === 'user' ? '10px 10px 2px 10px' : '2px 10px 10px 10px',
              padding: '0.42rem 0.65rem',
              fontSize: '0.775rem',
              color: m.role === 'user' ? 'rgba(255,255,255,0.88)' : '#73DFD9',
              lineHeight: 1.55,
              maxWidth: '88%',
            }}>
              {m.content}
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: 'flex-start', fontSize: '0.72rem', color: 'rgba(115,223,217,0.45)', fontStyle: 'italic' }}>
              Q is thinking…
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '0.5rem 0.7rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '0.38rem', alignItems: 'center' }}>
          <input
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send(input) }}
            placeholder="Ask Q anything…"
            style={{
              flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)',
              borderRadius: 8, padding: '0.36rem 0.58rem', fontSize: '0.765rem', color: 'white',
              outline: 'none', fontFamily: "'DM Sans', sans-serif",
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            style={{
              background: loading || !input.trim() ? 'rgba(115,223,217,0.22)' : '#73DFD9',
              border: 'none', borderRadius: 8, padding: '0.36rem 0.6rem',
              color: loading || !input.trim() ? 'rgba(255,255,255,0.35)' : '#0f2744',
              cursor: loading || !input.trim() ? 'default' : 'pointer',
              fontSize: '0.78rem', fontWeight: 700, flexShrink: 0,
            }}
          >→</button>
        </div>
      </div>
    </>,
    document.body
  )
}

export default function QMood({ score = 0, size = 80, showCaption = true, context = null, sectionLabel = 'Portal', style: outerStyle = {} }) {
  const clamped = Math.max(0, Math.min(100, score))
  const state = STATES.find(s => clamped >= s.min && clamped <= s.max) || STATES[0]
  const [open, setOpen] = useState(false)
  const [anchorRect, setAnchorRect] = useState(null)
  const imgRef = useRef(null)

  const handleClick = useCallback(() => {
    if (!context) return
    const rect = imgRef.current?.getBoundingClientRect()
    if (rect) { setAnchorRect(rect); setOpen(true) }
  }, [context])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    return () => window.removeEventListener('scroll', close, true)
  }, [open])

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flexShrink: 0, ...outerStyle }}>
      <img
        ref={imgRef}
        src={state.src}
        alt={`Q mood: ${state.caption}`}
        style={{ width: size, height: size, objectFit: 'contain', cursor: context ? 'pointer' : 'default' }}
        onClick={context ? handleClick : undefined}
        title={context ? 'Click to ask Q' : undefined}
      />
      {showCaption && (
        <div style={{ fontSize: '0.72rem', color: '#7a5a8a', textAlign: 'center', maxWidth: 160, lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif" }}>
          {state.caption}
        </div>
      )}
      {open && anchorRect && (
        <QDialoguePanel
          state={state}
          score={clamped}
          sectionLabel={sectionLabel}
          context={context}
          anchorRect={anchorRect}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
