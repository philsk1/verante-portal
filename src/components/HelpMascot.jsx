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
    .vera-hover-mode [data-help] {
      cursor: help;
      outline: 1.5px dashed rgba(240,165,0,0.5);
      border-radius: 4px;
      animation: veraHelpPulse 2s ease-in-out infinite;
    }
  `
  document.head.appendChild(el)
}

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
      <div style={{ flexShrink: 0, lineHeight: 0 }}><img src="/qmood/smile.svg" alt="Q" style={{ width: 100, height: 100, objectFit: 'contain' }} /></div>
      <div style={{
        position: 'relative', background: 'white',
        border: '1px solid rgba(94,59,135,0.2)', borderRadius: '10px',
        padding: '0.6rem 0.85rem', boxShadow: '0 6px 20px rgba(94,59,135,0.15)',
        width: BUBBLE_W, marginTop: 4,
      }}>
        <div style={{ position: 'absolute', left: -7, top: 12, width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderRight: '7px solid rgba(94,59,135,0.2)' }} />
        <div style={{ position: 'absolute', left: -5, top: 12, width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderRight: '6px solid white' }} />
        <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#f0a500', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.25rem' }}>Q explains</div>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#1a1a1a', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>{text}</p>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const TAB_LABELS = {
  dashboard:    'Dashboard',
  profile:      'Business Profile',
  ai:           'AI Behaviour',
  analytics:    'Analytics',
  referrals:    'Partners & Referrals',
  account:      'Account',
  calendar:     'Calendar',
  team:         'Team',
  listen:       'Listen',
  integrations: 'Integrations',
  lines:        'Phone Lines',
}

const TAB_TAGLINES = {
  dashboard:    'Questions about your results?',
  ai:           'Q can help you set this up',
  analytics:    'Want more from your data?',
  referrals:    'Q can help you build your network',
  account:      'Q can advise on upgrades',
  profile:      'Q can help configure this',
  calendar:     'Q knows every Schedule feature',
  team:         'Q can help with team setup',
  listen:       'Q can explain how Listen works',
  integrations: 'Q can guide you through this',
  lines:        'Questions? Ask Q',
}

let dialogueCounter = 0

const HelpMascot = ({ contextKey, tenantId, activeTab, veraAlert = null, gaps = [], onNavigate }) => {
  const [alertDismissed, setAlertDismissed] = useState(false)

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

  // Gap message rotation
  const [gapIndex, setGapIndex] = useState(0)
  const [dismissedGapIds, setDismissedGapIds] = useState(() => new Set())

  useEffect(() => { injectStyles() }, [])

  // Reset modes on tab change
  useEffect(() => {
    setHelpMode(false)
    setNeedHelpMode(false)
    setFloatEl(null)
    setBubbleVisible(false)
    setZones([])
    setDialogues([])
    setAlertDismissed(false)
    setGapIndex(0)
  }, [activeTab])

  // Reset dismissed state when the alert message changes
  useEffect(() => {
    setAlertDismissed(false)
  }, [veraAlert])

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

  // Gap rotation — filter by current tab and dismissed state, cycle every 6 s
  const tabGaps = gaps.filter(g => g.tabs.includes(activeTab) && !dismissedGapIds.has(g.id))
  const currentGap = tabGaps.length > 0 ? tabGaps[gapIndex % tabGaps.length] : null

  useEffect(() => {
    if (tabGaps.length <= 1) return
    const t = setInterval(() => setGapIndex(i => i + 1), 6000)
    return () => clearInterval(t)
  }, [tabGaps.length])

  return (
    <>
      {/* ── Vera strip — compact, non-intrusive ──────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>

        {/* Tiny owl — click trigger */}
        <div
          id="vera-trigger-btn"
          className="vera-idle"
          onClick={() => { if (needHelpMode) closeAll(); else setHelpMode(m => !m) }}
          style={{ lineHeight: 0, cursor: 'pointer', flexShrink: 0 }}
          title={helpMode ? 'Close Q' : 'Ask Q for help'}
        >
          <img src="/qmood/smile.svg" alt="Q" style={{ width: 110, height: 110, objectFit: 'contain' }} />
        </div>

        {/* Contextual Q tagline + action */}
        {!needHelpMode ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: '#888', fontFamily: "'DM Sans', sans-serif", fontStyle: 'italic' }}>
              {TAB_TAGLINES[activeTab] || 'Q knows everything'}
            </span>
            <button
              onClick={() => { setNeedHelpMode(true); setHelpMode(false) }}
              style={{
                padding: '0.22rem 0.6rem',
                background: helpMode ? '#f0a500' : 'white',
                border: helpMode ? '1px solid #f0a500' : '1px solid rgba(94,59,135,0.2)',
                borderRadius: '999px',
                fontSize: '0.7rem',
                color: helpMode ? '#1a0533' : '#5e3b87',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                flexShrink: 0,
                transition: 'background 0.15s, color 0.15s, border-color 0.15s',
              }}
            >
              Ask Q
            </button>
          </div>
        ) : (
          <button
            onClick={closeAll}
            style={{ padding: '0.25rem 0.65rem', background: '#5e3b87', border: 'none', borderRadius: '999px', fontSize: '0.72rem', color: 'white', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, flexShrink: 0 }}
          >
            Done
          </button>
        )}

        {/* Alert slot — priority: vera alert > gap messages > proactive speech */}
        {veraAlert && !alertDismissed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: '1px solid rgba(94,59,135,0.18)', borderLeft: '3px solid #f0a500', borderRadius: '10px', padding: '0.4rem 0.75rem 0.4rem 0.7rem', boxShadow: '0 3px 12px rgba(94,59,135,0.08)', fontSize: '0.75rem', color: '#1a1a1a', lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif", maxWidth: 340, animation: 'veraFlyIn 0.25s ease-out forwards' }}>
            <span style={{ flex: 1 }}>{veraAlert}</span>
            <button onClick={() => setAlertDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '0.9rem', lineHeight: 1, padding: '0 0.1rem', flexShrink: 0 }}>×</button>
          </div>
        )}
        {!(veraAlert && !alertDismissed) && currentGap && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: '1px solid rgba(94,59,135,0.18)', borderLeft: '3px solid #f0a500', borderRadius: '10px', padding: '0.4rem 0.75rem 0.4rem 0.7rem', boxShadow: '0 3px 12px rgba(94,59,135,0.08)', fontSize: '0.75rem', color: '#1a1a1a', lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif", maxWidth: 400, animation: 'veraFlyIn 0.25s ease-out forwards' }}>
            <span style={{ flex: 1 }}>{currentGap.message}</span>
            {currentGap.actionTab && onNavigate && (
              <button
                onClick={() => onNavigate(currentGap.actionTab)}
                style={{ background: '#f0a500', border: 'none', borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.68rem', fontWeight: 700, color: '#1a0533', cursor: 'pointer', flexShrink: 0, fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
              >
                {currentGap.actionLabel}
              </button>
            )}
            <button onClick={() => setDismissedGapIds(prev => new Set([...prev, currentGap.id]))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '0.9rem', lineHeight: 1, padding: '0 0.1rem', flexShrink: 0 }}>×</button>
          </div>
        )}
        {!(veraAlert && !alertDismissed) && !currentGap && proactiveSpeech && (
          <div style={{ opacity: proactiveVisible ? 1 : 0, transition: 'opacity 0.4s', background: 'white', border: '1px solid rgba(94,59,135,0.15)', borderRadius: '10px', padding: '0.45rem 0.85rem', boxShadow: '0 4px 16px rgba(94,59,135,0.1)', fontSize: '0.78rem', color: '#1a1a1a', lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", maxWidth: 360 }}>
            {proactiveSpeech}
          </div>
        )}
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
