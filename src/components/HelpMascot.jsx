import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import VeraDialogue from './VeraDialogue'

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
    @keyframes veraTyping {
      0%, 100% { opacity: 0.4; transform: translateY(0); }
      50%       { opacity: 1;   transform: translateY(-2px); }
    }
    @keyframes veraGlow {
      0%, 100% { box-shadow: 0 0 8px rgba(240,165,0,0.3);  border-color: rgba(240,165,0,0.4); }
      50%       { box-shadow: 0 0 16px rgba(240,165,0,0.5); border-color: rgba(240,165,0,0.7); }
    }
    @keyframes veraHelpPulse {
      0%, 100% { background: rgba(240,165,0,0.05); outline-color: rgba(240,165,0,0.35); }
      50%       { background: rgba(240,165,0,0.12); outline-color: rgba(240,165,0,0.65); }
    }
    .vera-idle      { animation: veraBob    5s ease-in-out infinite; }
    .vera-bubble-in { animation: veraFlyIn  0.18s ease-out forwards; }
    .vera-glow-zone { animation: veraGlow   2s ease-in-out infinite; cursor: pointer; }
    [data-help]     { cursor: help; }
    .vera-hover-mode [data-help] {
      outline: 1.5px dashed rgba(240,165,0,0.5);
      border-radius: 4px;
      animation: veraHelpPulse 2s ease-in-out infinite;
    }
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

// ─── Floating hover bubble ────────────────────────────────────────────────────

const FloatingBubble = ({ text, rect, visible }) => {
  if (!rect || !text) return null
  const BUBBLE_W = 280
  const OWL_W   = 30
  const spaceRight = window.innerWidth - rect.right - 16
  const goLeft  = spaceRight < BUBBLE_W + OWL_W + 20
  const top     = Math.min(Math.max(8, rect.top - 4), window.innerHeight - 160)
  const left    = goLeft ? rect.left - BUBBLE_W - OWL_W - 16 : rect.right + 12

  return (
    <div className={visible ? 'vera-bubble-in' : ''} style={{
      position: 'fixed', top, left, zIndex: 9999,
      display: 'flex', alignItems: 'flex-start', gap: '6px',
      pointerEvents: 'none',
      opacity: visible ? 1 : 0,
      transition: visible ? 'none' : 'opacity 0.15s ease-in',
    }}>
      <div style={{ flexShrink: 0, lineHeight: 0 }}><Owl w={30} h={49} /></div>
      <div style={{
        position: 'relative', background: 'white',
        border: '1px solid rgba(94,59,135,0.2)', borderRadius: '10px',
        padding: '0.6rem 0.85rem', boxShadow: '0 6px 20px rgba(94,59,135,0.15)',
        width: BUBBLE_W, marginTop: 4,
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

const TAB_LABELS = {
  dashboard: 'Dashboard',
  profile:   'Business Profile',
  ai:        'AI Behaviour',
  analytics: 'Analytics',
  referrals: 'Partners & Referrals',
  account:   'Account',
}

let dialogueCounter = 0

const HelpMascot = ({ contextKey, tenantId, activeTab, businessName = '' }) => {
  const [blink, setBlink]             = useState(false)

  // Vera hover mode
  const [helpMode, setHelpMode]       = useState(false)
  const [floatEl, setFloatEl]         = useState(null)
  const [bubbleVisible, setBubbleVisible] = useState(false)
  const leaveTimer                    = useRef(null)

  // Need more help mode
  const [needHelpMode, setNeedHelpMode] = useState(false)
  const [zones, setZones]             = useState([])   // { text, rect, el }
  const [dialogues, setDialogues]     = useState([])   // open dialogue panels

  // Proactive speech
  const [proactiveSpeech, setProactiveSpeech] = useState(null)
  const [proactiveVisible, setProactiveVisible] = useState(false)

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

  // Reset modes on tab change
  useEffect(() => {
    setHelpMode(false)
    setNeedHelpMode(false)
    setFloatEl(null)
    setBubbleVisible(false)
    setZones([])
    setDialogues([])
  }, [activeTab])

  // Toggle body class so CSS can highlight all [data-help] elements
  useEffect(() => {
    if (helpMode) {
      document.body.classList.add('vera-hover-mode')
    } else {
      document.body.classList.remove('vera-hover-mode')
    }
    return () => document.body.classList.remove('vera-hover-mode')
  }, [helpMode])

  // ── Vera hover mode — always on when helpMode ────────────────────────────
  useEffect(() => {
    if (!helpMode) return

    const handleOver = (e) => {
      const el = e.target.closest('[data-help]')
      if (!el) return
      clearTimeout(leaveTimer.current)
      setFloatEl({ text: el.getAttribute('data-help'), rect: el.getBoundingClientRect() })
      setBubbleVisible(true)
    }
    const handleOut = (e) => {
      const el = e.target.closest('[data-help]')
      if (!el) return
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
  }, [helpMode])

  // ── Need more help mode — scan data-help zones ───────────────────────────
  useEffect(() => {
    if (!needHelpMode) { setZones([]); return }

    // Deactivate hover mode
    setHelpMode(false)
    setFloatEl(null)
    setBubbleVisible(false)

    const scan = () => {
      const els = Array.from(document.querySelectorAll('[data-help]'))
      setZones(els.map(el => ({
        text: el.getAttribute('data-help'),
        rect: el.getBoundingClientRect(),
        el,
      })))
    }

    scan()
    window.addEventListener('resize', scan)
    window.addEventListener('scroll', scan, true)
    return () => {
      window.removeEventListener('resize', scan)
      window.removeEventListener('scroll', scan, true)
    }
  }, [needHelpMode])

  const openDialogue = useCallback((zone) => {
    // Don't duplicate if same zone already open
    setDialogues(prev => {
      const exists = prev.find(d => d.zoneText === zone.text)
      if (exists) return prev
      dialogueCounter++
      return [...prev, {
        id: dialogueCounter,
        zoneText: zone.text,
        zoneName: zone.text.split(' ').slice(0, 6).join(' '),
        rect: zone.rect,
        tabName: TAB_LABELS[activeTab] || 'Portal',
      }]
    })
  }, [activeTab])

  const closeDialogue = useCallback((id) => {
    setDialogues(prev => prev.filter(d => d.id !== id))
  }, [])

  const closeAll = () => {
    setNeedHelpMode(false)
    setHelpMode(false)
    setDialogues([])
    setZones([])
  }

  // ── Proactive speech ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!contextKey || !tenantId) return
    let cancelled = false
    const tryShow = async () => {
      const { data: seen } = await supabase.from('vera_seen').select('seen_at')
        .eq('tenant_id', tenantId).eq('speech_key', contextKey).maybeSingle()
      if (seen || cancelled) return
      const { data: s } = await supabase.from('vera_speeches').select('speech_text')
        .eq('context_key', contextKey).maybeSingle()
      if (!s || cancelled) return
      setProactiveSpeech(s.speech_text)
      setProactiveVisible(true)
      setTimeout(() => { setProactiveVisible(false); setTimeout(() => setProactiveSpeech(null), 400) }, 9000)
      await supabase.from('vera_seen').insert({ tenant_id: tenantId, speech_key: contextKey }).then(() => {}).catch(() => {})
    }
    tryShow()
    return () => { cancelled = true }
  }, [contextKey, tenantId])

  const tabLabel = TAB_LABELS[activeTab] || 'Portal'
  const anyActive = helpMode || needHelpMode

  return (
    <>
      {/* ── Vera home — top left ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>

        {/* Owl + label */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}>
          <div
            className="vera-idle"
            onClick={() => { if (needHelpMode) closeAll(); else setHelpMode(m => !m) }}
            style={{ lineHeight: 0, cursor: 'pointer' }}
          >
            <Owl w={44} h={72} blink={blink} />
          </div>
          <span style={{
            fontSize: '12px', color: '#f0a500',
            fontStyle: 'italic', fontFamily: "'DM Sans', sans-serif",
            cursor: 'pointer', userSelect: 'none', textAlign: 'center',
            fontWeight: 500, lineHeight: 1.4,
          }} onClick={() => { if (needHelpMode) closeAll(); else setHelpMode(m => !m) }}>
            {helpMode ? 'Click to close' : <><span>Click on Vera the owl</span><br /><span>for suggestions</span></>}
          </span>
        </div>

        {/* Need more help button — right of Vera with extra margin */}
        <div style={{ paddingTop: '1.1rem', flexShrink: 0, marginLeft: '1.25rem' }}>
          {!needHelpMode ? (
            <button
              onClick={() => { setNeedHelpMode(true); setHelpMode(false) }}
              style={{
                padding: '0.35rem 0.85rem',
                background: 'white',
                border: '1px solid rgba(94,59,135,0.25)',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#3a2057',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
              }}
            >
              Need more help?
            </button>
          ) : (
            <button
              onClick={closeAll}
              style={{
                padding: '0.35rem 0.85rem',
                background: '#5e3b87',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: 'white',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
              }}
            >
              Close all · done
            </button>
          )}
        </div>

        {/* Business name + proactive speech */}
        <div style={{ flex: 1, paddingTop: 4 }}>
          {businessName && (
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.6rem', color: '#aaa', margin: '0 0 0.35rem', lineHeight: 1.2 }}>
              {businessName}
            </p>
          )}

          {/* Proactive speech */}
          {proactiveSpeech && (
            <div style={{
              background: 'white', border: '1px solid rgba(94,59,135,0.15)', borderRadius: '10px',
              padding: '0.6rem 0.85rem', boxShadow: '0 4px 16px rgba(94,59,135,0.1)',
              maxWidth: 420, fontSize: '0.8rem', color: '#1a1a1a', lineHeight: 1.6,
              fontFamily: "'DM Sans', sans-serif", marginBottom: '0.5rem',
              opacity: proactiveVisible ? 1 : 0, transition: 'opacity 0.4s',
            }}>
              {proactiveSpeech}
            </div>
          )}
        </div>
      </div>

      {/* ── Hover bubble (Vera mode) ─────────────────────────────────── */}
      {floatEl && (
        <FloatingBubble text={floatEl.text} rect={floatEl.rect} visible={bubbleVisible} />
      )}

      {/* ── Glowing overlays (Need more help mode) ──────────────────── */}
      {needHelpMode && zones.map((zone, i) => {
        const r = zone.rect
        if (r.width < 4 || r.height < 4) return null
        return (
          <div
            key={i}
            className="vera-glow-zone"
            onClick={() => openDialogue(zone)}
            style={{
              position: 'fixed',
              left: r.left - 3,
              top: r.top - 3,
              width: r.width + 6,
              height: r.height + 6,
              borderRadius: '6px',
              border: '2px solid rgba(240,165,0,0.5)',
              background: 'rgba(240,165,0,0.07)',
              zIndex: 9000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'all',
            }}
          >
            <span style={{
              background: '#f0a500',
              color: '#1a0533',
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: '0.04em',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              pointerEvents: 'none',
            }}>
              Click here
            </span>
          </div>
        )
      })}

      {/* ── Dialogue panels ──────────────────────────────────────────── */}
      {dialogues.map(d => (
        <VeraDialogue
          key={d.id}
          id={d.id}
          zoneText={d.zoneText}
          zoneName={d.zoneName}
          tabName={d.tabName}
          initialRect={d.rect}
          onClose={() => closeDialogue(d.id)}
        />
      ))}
    </>
  )
}

export default HelpMascot
