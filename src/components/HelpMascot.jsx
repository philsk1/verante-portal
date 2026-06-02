import { useState, useEffect, useRef } from 'react'

// ─── inject CSS ───────────────────────────────────────────────────────────────

const injectStyles = () => {
  if (document.getElementById('verrante-mascot-styles')) return
  const el = document.createElement('style')
  el.id = 'verrante-mascot-styles'
  el.textContent = `
    @keyframes verranteBob {
      0%, 100% { transform: translateY(0px); }
      50%       { transform: translateY(-4px); }
    }
    @keyframes verrrantePulse {
      0%, 100% { transform: translateY(0px) scale(1); }
      50%       { transform: translateY(-3px) scale(1.04); }
    }
    .vera-idle   { animation: verranteBob   5s ease-in-out infinite; }
    .vera-active { animation: verrrantePulse 3s ease-in-out infinite; }
    .verrante-help-mode [data-help] {
      text-decoration: underline;
      text-decoration-style: dotted;
      text-decoration-color: rgba(94,59,135,0.5);
      text-underline-offset: 3px;
      cursor: help !important;
    }
  `
  document.head.appendChild(el)
}

// ─── owl SVG (reused at two sizes) ───────────────────────────────────────────

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
    {/* Left eye */}
    <circle cx="27" cy="36" r="12" fill="#f0a500" />
    <circle cx="27" cy="36" r="9"  fill="white" />
    {blink
      ? <ellipse cx="27" cy="36" rx="9" ry="2" fill="#5e3b87" />
      : <><circle cx="28" cy="35" r="5.5" fill="#1a0533" /><circle cx="30" cy="33" r="1.8" fill="white" /></>
    }
    {/* Right eye */}
    <circle cx="53" cy="36" r="12" fill="#f0a500" />
    <circle cx="53" cy="36" r="9"  fill="white" />
    {blink
      ? <ellipse cx="53" cy="36" rx="9" ry="2" fill="#5e3b87" />
      : <><circle cx="54" cy="35" r="5.5" fill="#1a0533" /><circle cx="56" cy="33" r="1.8" fill="white" /></>
    }
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

// ─── floating Vera — appears next to hovered element ─────────────────────────

const FloatingVera = ({ text, rect, blink }) => {
  if (!rect || !text) return null

  const BUBBLE_W = 280
  const OWL_W = 30
  const spaceRight = window.innerWidth - rect.right - 16
  const goLeft = spaceRight < BUBBLE_W + OWL_W + 20

  const top  = Math.min(
    Math.max(8, rect.top - 4),
    window.innerHeight - 160
  )
  const left = goLeft
    ? rect.left - BUBBLE_W - OWL_W - 16
    : rect.right + 12

  return (
    <div style={{
      position: 'fixed',
      top,
      left,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'flex-start',
      gap: '6px',
      pointerEvents: 'none',
    }}>
      {/* Mini owl */}
      <div style={{ flexShrink: 0, lineHeight: 0 }}>
        <Owl w={30} h={49} blink={blink} />
      </div>

      {/* Speech bubble */}
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
        {/* Tail pointing left toward owl */}
        <div style={{ position: 'absolute', left: -7, top: 12, width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderRight: '7px solid rgba(94,59,135,0.2)' }} />
        <div style={{ position: 'absolute', left: -5, top: 12, width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderRight: '6px solid white' }} />

        <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#f0a500', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.25rem' }}>
          Vera explains
        </div>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#1a1a1a', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
          {text}
        </p>
      </div>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

const HelpMascot = ({ activeTab }) => {
  const [helpMode, setHelpMode] = useState(false)
  const [blink, setBlink]       = useState(false)
  const [floatEl, setFloatEl]   = useState(null) // { text, rect }

  useEffect(() => { injectStyles() }, [])

  // Occasional blink
  useEffect(() => {
    const schedule = () => setTimeout(() => {
      setBlink(true)
      setTimeout(() => { setBlink(false); schedule() }, 180)
    }, 5000 + Math.random() * 4000)
    const t = schedule()
    return () => clearTimeout(t)
  }, [])

  // Reset when tab changes
  useEffect(() => {
    setHelpMode(false)
    setFloatEl(null)
  }, [activeTab])

  // Help mode: body class + track hovered elements
  useEffect(() => {
    if (helpMode) {
      document.body.classList.add('verrante-help-mode')
    } else {
      document.body.classList.remove('verrante-help-mode')
      setFloatEl(null)
    }
    if (!helpMode) return

    const handleOver = (e) => {
      const el = e.target.closest('[data-help]')
      if (el) {
        setFloatEl({ text: el.getAttribute('data-help'), rect: el.getBoundingClientRect() })
      } else {
        setFloatEl(null)
      }
    }

    // Keep rect up to date on scroll/resize
    const clearFloat = () => setFloatEl(null)

    document.addEventListener('mouseover', handleOver)
    window.addEventListener('scroll', clearFloat, true)
    window.addEventListener('resize', clearFloat)
    return () => {
      document.removeEventListener('mouseover', handleOver)
      window.removeEventListener('scroll', clearFloat, true)
      window.removeEventListener('resize', clearFloat)
      document.body.classList.remove('verrante-help-mode')
    }
  }, [helpMode])

  return (
    <>
      {/* Vera's home */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1.75rem' }}>

        {/* Full-size owl */}
        <div
          className={helpMode ? 'vera-active' : 'vera-idle'}
          onClick={() => { setHelpMode(m => !m); setFloatEl(null) }}
          title={helpMode ? 'Click to put Vera to sleep' : 'Click to wake Vera'}
          style={{ cursor: 'pointer', lineHeight: 0, flexShrink: 0 }}
        >
          <Owl w={44} h={72} blink={blink} />
        </div>

        {/* Vera label */}
        <span
          onClick={() => { setHelpMode(m => !m); setFloatEl(null) }}
          style={{
            fontSize: '0.72rem',
            color: helpMode ? '#5e3b87' : '#bbb',
            fontStyle: 'italic',
            userSelect: 'none',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: helpMode ? 500 : 400,
            cursor: 'pointer',
          }}
        >
          {helpMode ? 'Vera · click to sleep' : 'Vera · click for help'}
        </span>

        {/* Home speech bubble — awake, nothing hovered */}
        {helpMode && !floatEl && (
          <div style={{
            position: 'absolute',
            top: 80,
            left: 0,
            zIndex: 50,
            background: 'white',
            border: '1px solid rgba(94,59,135,0.18)',
            borderRadius: '12px',
            padding: '0.65rem 0.9rem',
            boxShadow: '0 6px 20px rgba(94,59,135,0.1)',
            width: 310,
          }}>
            <div style={{ position: 'absolute', top: -7, left: 20, width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '7px solid rgba(94,59,135,0.18)' }} />
            <div style={{ position: 'absolute', top: -5, left: 20, width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '6px solid white' }} />
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#1a1a1a', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
              Hover over anything on this page and I'll explain it. Click me to put me back to sleep.
            </p>
          </div>
        )}
      </div>

      {/* Floating Vera — rendered via portal-like fixed div, appears next to hovered elements */}
      <FloatingVera text={floatEl?.text} rect={floatEl?.rect} blink={blink} />
    </>
  )
}

export default HelpMascot
