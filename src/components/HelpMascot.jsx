import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

// ─── CSS ──────────────────────────────────────────────────────────────────────

const injectStyles = () => {
  if (document.getElementById('vera-styles')) return
  const el = document.createElement('style')
  el.id = 'vera-styles'
  el.textContent = `
    @keyframes veraBob {
      0%, 100% { transform: translateY(0); }
      50%       { transform: translateY(-4px); }
    }
    @keyframes veraFlyIn {
      0%   { opacity: 0; transform: translateY(-8px) scale(0.96); }
      100% { opacity: 1; transform: translateY(0)    scale(1); }
    }
    @keyframes veraFlyOut {
      0%   { opacity: 1; transform: translateY(0)   scale(1); }
      100% { opacity: 0; transform: translateY(-8px) scale(0.96); }
    }
    .vera-idle { animation: veraBob 5s ease-in-out infinite; }
    .vera-bubble-in  { animation: veraFlyIn  0.18s ease-out forwards; }
    .vera-bubble-out { animation: veraFlyOut 0.15s ease-in  forwards; }
    [data-help] { cursor: help; }
  `
  document.head.appendChild(el)
}

// ─── Owl SVG ──────────────────────────────────────────────────────────────────

const Owl = ({ w = 44, h = 72, blink = false }) => (
  <svg width={w} height={h} viewBox="0 0 80 130" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="23" cy="8"  rx="7" ry="13" fill="#4a2d6e" transform="rotate(-18 23 8)" />
    <ellipse cx="57" cy="8"  rx="7" ry="13" fill="#4a2d6e" transform="rotate(18 57 8)" />
    <ellipse cx="40" cy="94" rx="21" ry="28" fill="#5e3b87" />
    <path d="M22,78 C6,84 2,102 10,114 C16,110 20,100 26,90 Z" fill="#4a2d6e" />
    <path d="M58,78 C74,84 78,102 70,114 C64,110 60,100 54,90 Z" fill="#4a2d6e" />
    <ellipse cx="40" cy="100" rx="13" ry="18" fill="rgba(255,255,255,0.1)" />
    <path d="M31,88 Q40,92 49,88"  stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none" />
    <path d="M29,98 Q40,102 51,98" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none" />
    <circle cx="40" cy="38" r="30" fill="#5e3b87" />
    <ellipse cx="40" cy="40" rx="23" ry="20" fill="rgba(255,255,255,0.09)" />
    <circle cx="27" cy="36" r="12" fill="#f0a500" />
    <circle cx="27" cy="36" r="9"  fill="white" />
    {blink
      ? <ellipse cx="27" cy="36" rx="9" ry="2" fill="#5e3b87" />
      : <><circle cx="28" cy="35" r="5.5" fill="#1a0533" /><circle cx="30" cy="33" r="1.8" fill="white" /></>}
    <circle cx="53" cy="36" r="12" fill="#f0a500" />
    <circle cx="53" cy="36" r="9"  fill="white" />
    {blink
      ? <ellipse cx="53" cy="36" rx="9" ry="2" fill="#5e3b87" />
      : <><circle cx="54" cy="35" r="5.5" fill="#1a0533" /><circle cx="56" cy="33" r="1.8" fill="white" /></>}
    <polygon points="40,47 35,57 45,57" fill="#f0a500" />
    <line x1="33" y1="119" x2="33" y2="126" stroke="#f0a500" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="33" y1="126" x2="26" y2="130" stroke="#f0a500" strokeWidth="2" strokeLinecap="round" />
    <line x1="33" y1="126" x2="33" y2="130" stroke="#f0a500" strokeWidth="2" strokeLinecap="round" />
    <line x1="33" y1="126" x2="40" y2="130" stroke="#f0a500" strokeWidth="2" strokeLinecap="round" />
    <line x1="47" y1="119" x2="47" y2="126" stroke="#f0a500" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="47" y1="126" x2="40" y2="130" stroke="#f0a500" strokeWidth="2" strokeLinecap="round" />
    <line x1="47" y1="126" x2="47" y2="130" stroke="#f0a500" strokeWidth="2" strokeLinecap="round" />
    <line x1="47" y1="126" x2="54" y2="130" stroke="#f0a500" strokeWidth="2" strokeLinecap="round" />
    <circle cx="65" cy="14" r="5" fill="#f0a500" />
  </svg>
)

// ─── Floating bubble — fixed to viewport near the hovered element ─────────────

const FloatingBubble = ({ text, rect, visible }) => {
  if (!rect || !text) return null

  const BUBBLE_W = 280
  const OWL_W   = 30
  const spaceRight = window.innerWidth - rect.right - 16
  const goLeft  = spaceRight < BUBBLE_W + OWL_W + 20
  const top     = Math.min(Math.max(8, rect.top - 4), window.innerHeight - 160)
  const left    = goLeft ? rect.left - BUBBLE_W - OWL_W - 16 : rect.right + 12

  return (
    <div
      className={visible ? 'vera-bubble-in' : 'vera-bubble-out'}
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '6px',
        pointerEvents: 'none',
      }}
    >
      <div style={{ flexShrink: 0, lineHeight: 0 }}>
        <Owl w={30} h={49} />
      </div>
      <div style={{
        position: 'relative',
        background: 'white',
        border: '1px solid rgba(94,59,135,0.2)',
        borderRadius: '10px',
        padding: '0.6rem 0.85rem',
        boxShadow: '0 6px 20px rgba(94,59,135,0.15)',
        width: BUBBLE_W,
        marginTop: 4,
      }}>
        <div style={{ position: 'absolute', left: -7, top: 12, width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderRight: '7px solid rgba(94,59,135,0.2)' }} />
        <div style={{ position: 'absolute', left: -5, top: 12, width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderRight: '6px solid white' }} />
        <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#f0a500', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.25rem' }}>Vera explains</div>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#1a1a1a', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>{text}</p>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const HelpMascot = ({ contextKey, tenantId, activeTab, businessName = '' }) => {
  const [blink, setBlink]       = useState(false)
  const [floatEl, setFloatEl]   = useState(null)   // { text, rect }
  const [bubbleVisible, setBubbleVisible] = useState(false)
  const leaveTimer = useRef(null)

  useEffect(() => { injectStyles() }, [])

  // Blink
  useEffect(() => {
    const schedule = () => setTimeout(() => {
      setBlink(true)
      setTimeout(() => { setBlink(false); schedule() }, 180)
    }, 5000 + Math.random() * 4000)
    const t = schedule()
    return () => clearTimeout(t)
  }, [])

  // Reset on tab change
  useEffect(() => {
    setFloatEl(null)
    setBubbleVisible(false)
  }, [activeTab])

  // Hover detection — always on, no click required
  useEffect(() => {
    const handleOver = (e) => {
      const el = e.target.closest('[data-help]')
      if (!el) return
      clearTimeout(leaveTimer.current)
      const text = el.getAttribute('data-help')
      const rect = el.getBoundingClientRect()
      setFloatEl({ text, rect })
      setBubbleVisible(true)
    }

    const handleOut = (e) => {
      const el = e.target.closest('[data-help]')
      if (!el) return
      // Small delay: if mouse moves directly to another data-help element
      // the over handler fires before this clears, keeping the bubble alive
      leaveTimer.current = setTimeout(() => {
        setBubbleVisible(false)
        setTimeout(() => setFloatEl(null), 180)
      }, 80)
    }

    document.addEventListener('mouseover', handleOver)
    document.addEventListener('mouseout', handleOut)
    return () => {
      document.removeEventListener('mouseover', handleOver)
      document.removeEventListener('mouseout', handleOut)
      clearTimeout(leaveTimer.current)
    }
  }, [])

  // Proactive speech (contextKey → vera_speeches → vera_seen)
  const [proactiveSpeech, setProactiveSpeech] = useState(null)
  const [proactiveVisible, setProactiveVisible] = useState(false)

  useEffect(() => {
    if (!contextKey || !tenantId) return
    let cancelled = false

    const tryShow = async () => {
      const { data: seen } = await supabase
        .from('vera_seen').select('seen_at')
        .eq('tenant_id', tenantId).eq('speech_key', contextKey).maybeSingle()
      if (seen || cancelled) return

      const { data: s } = await supabase
        .from('vera_speeches').select('speech_text, audio_url')
        .eq('context_key', contextKey).maybeSingle()
      if (!s || cancelled) return

      setProactiveSpeech(s.speech_text)
      setProactiveVisible(true)
      setTimeout(() => {
        setProactiveVisible(false)
        setTimeout(() => setProactiveSpeech(null), 400)
      }, 9000)

      await supabase.from('vera_seen')
        .insert({ tenant_id: tenantId, speech_key: contextKey })
        .then(() => {}).catch(() => {})
    }

    tryShow()
    return () => { cancelled = true }
  }, [contextKey, tenantId])

  return (
    <>
      {/* Vera — top left, full size, always present */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div className="vera-idle" style={{ lineHeight: 0, flexShrink: 0 }}>
          <Owl w={44} h={72} blink={blink} />
        </div>

        <div style={{ paddingTop: 4, flex: 1 }}>
          {/* Business name */}
          {businessName && (
            <p style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: '1.6rem',
              color: '#aaa',
              margin: '0 0 0.25rem',
              lineHeight: 1.2,
            }}>
              {businessName}
            </p>
          )}

          {/* Proactive speech inline below name */}
          {proactiveSpeech && (
            <div
              className={proactiveVisible ? 'vera-bubble-in' : 'vera-bubble-out'}
              style={{
                background: 'white',
                border: '1px solid rgba(94,59,135,0.15)',
                borderRadius: '10px',
                padding: '0.6rem 0.85rem',
                boxShadow: '0 4px 16px rgba(94,59,135,0.1)',
                maxWidth: 400,
                fontSize: '0.8rem',
                color: '#1a1a1a',
                lineHeight: 1.6,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {proactiveSpeech}
            </div>
          )}
        </div>
      </div>

      {/* Floating bubble — follows hovered data-help element */}
      {floatEl && <FloatingBubble text={floatEl.text} rect={floatEl.rect} visible={bubbleVisible} />}
    </>
  )
}

export default HelpMascot
