import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'

// ─── CSS ──────────────────────────────────────────────────────────────────────

const injectStyles = () => {
  if (document.getElementById('vera-styles')) return
  const el = document.createElement('style')
  el.id = 'vera-styles'
  el.textContent = `
    @keyframes veraFlyIn {
      0%   { transform: translateY(-80px) scale(0.7); opacity: 0; }
      60%  { transform: translateY(4px)   scale(1.04); opacity: 1; }
      80%  { transform: translateY(-2px)  scale(0.98); }
      100% { transform: translateY(0)     scale(1); opacity: 1; }
    }
    @keyframes veraFlyOut {
      0%   { transform: translateY(0)     scale(1); opacity: 1; }
      100% { transform: translateY(-60px) scale(0.8); opacity: 0; }
    }
    @keyframes veraBob {
      0%, 100% { transform: translateY(0); }
      50%       { transform: translateY(-3px); }
    }
    @keyframes veraWingPulse {
      0%, 100% { transform: scaleX(1); }
      50%       { transform: scaleX(1.04); }
    }
    .vera-fly-in  { animation: veraFlyIn  0.6s cubic-bezier(0.34,1.56,0.64,1) forwards; }
    .vera-fly-out { animation: veraFlyOut 0.4s ease-in forwards; }
    .vera-bob     { animation: veraBob    5s ease-in-out infinite; }
    .vera-speak   { animation: veraWingPulse 0.8s ease-in-out infinite; }
    .vera-help-mode [data-help] { cursor: help !important; }
    .vera-help-icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 16px; height: 16px; border-radius: 50%;
      background: rgba(94,59,135,0.12); color: #5e3b87;
      font-size: 10px; font-weight: 700; cursor: pointer;
      margin-left: 5px; vertical-align: middle; border: none;
      font-family: 'DM Sans', sans-serif; flex-shrink: 0;
      transition: background 0.15s;
    }
    .vera-help-icon:hover { background: rgba(94,59,135,0.22); }
  `
  document.head.appendChild(el)
}

// ─── Owl SVG ──────────────────────────────────────────────────────────────────

const Owl = ({ w = 44, h = 72, blink = false, speaking = false }) => (
  <svg width={w} height={h} viewBox="0 0 80 130" fill="none" xmlns="http://www.w3.org/2000/svg"
    className={speaking ? 'vera-speak' : ''}>
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

// ─── Main component ───────────────────────────────────────────────────────────

const HelpMascot = ({ contextKey, tenantId, activeTab, businessName = '' }) => {
  const [phase, setPhase]         = useState('hidden')   // hidden | entering | visible | leaving
  const [speech, setSpeech]       = useState(null)       // { speech_text, audio_url }
  const [helpMode, setHelpMode]   = useState(false)
  const [helpTarget, setHelpTarget] = useState(null)     // { text, rect } for on-demand
  const [blink, setBlink]         = useState(false)
  const audioRef                  = useRef(null)
  const dismissTimer              = useRef(null)

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

  // Reset help mode when tab changes
  useEffect(() => {
    setHelpMode(false)
    setHelpTarget(null)
  }, [activeTab])

  // Proactive appearance — check vera_speeches + vera_seen on contextKey change
  useEffect(() => {
    if (!contextKey || !tenantId) return
    let cancelled = false

    const tryShow = async () => {
      // Already showing something
      if (phase !== 'hidden') return

      // Check if already seen
      const { data: seen } = await supabase
        .from('vera_seen')
        .select('seen_at')
        .eq('tenant_id', tenantId)
        .eq('speech_key', contextKey)
        .maybeSingle()
      if (seen || cancelled) return

      // Load speech
      const { data: s } = await supabase
        .from('vera_speeches')
        .select('speech_text, audio_url')
        .eq('context_key', contextKey)
        .maybeSingle()
      if (!s || cancelled) return

      setSpeech(s)
      flyIn(s, true) // mark as seen

      // Mark seen
      await supabase.from('vera_seen').insert({
        tenant_id: tenantId,
        speech_key: contextKey,
      }).then(() => {}).catch(() => {})
    }

    tryShow()
    return () => { cancelled = true }
  }, [contextKey, tenantId])

  // Help mode — inject ? icons on data-help elements
  useEffect(() => {
    if (!helpMode) {
      document.body.classList.remove('vera-help-mode')
      return
    }
    document.body.classList.add('vera-help-mode')

    const icons = []
    document.querySelectorAll('[data-help]').forEach(el => {
      if (el.querySelector('.vera-help-icon')) return
      const btn = document.createElement('button')
      btn.className = 'vera-help-icon'
      btn.textContent = '?'
      btn.title = 'Ask Vera'
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const text = el.getAttribute('data-help')
        const rect = el.getBoundingClientRect()
        setHelpTarget({ text, rect })
        setSpeech({ speech_text: text, audio_url: null })
        flyIn({ speech_text: text, audio_url: null }, false)
      })
      el.appendChild(btn)
      icons.push({ el, btn })
    })

    return () => {
      document.body.classList.remove('vera-help-mode')
      icons.forEach(({ el, btn }) => {
        if (el.contains(btn)) el.removeChild(btn)
      })
    }
  }, [helpMode])

  const flyIn = useCallback((s, autoHide = true) => {
    setSpeech(s)
    setPhase('entering')
    setTimeout(() => {
      setPhase('visible')
      // Play audio if available
      if (s.audio_url && audioRef.current) {
        audioRef.current.src = s.audio_url
        audioRef.current.play().catch(() => {})
      }
      // Auto-dismiss after 9s (reading time)
      if (autoHide) {
        clearTimeout(dismissTimer.current)
        dismissTimer.current = setTimeout(() => flyOut(), 9000)
      }
    }, 600)
  }, [])

  const flyOut = useCallback(() => {
    clearTimeout(dismissTimer.current)
    if (audioRef.current) audioRef.current.pause()
    setPhase('leaving')
    setTimeout(() => {
      setPhase('hidden')
      setSpeech(null)
      setHelpTarget(null)
    }, 400)
  }, [])

  const isVisible = phase !== 'hidden'
  const animClass = phase === 'entering' ? 'vera-fly-in'
                  : phase === 'leaving'  ? 'vera-fly-out'
                  : 'vera-bob'

  return (
    <>
      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* Top bar — business name + help toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        {businessName && (
          <p style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: '1.6rem',
            color: '#aaa',
            margin: 0,
            lineHeight: 1.2,
            flex: 1,
          }}>
            {businessName}
          </p>
        )}

        {/* Vera trigger — small owl icon, always available */}
        <button
          onClick={() => {
            if (isVisible) { flyOut(); setHelpMode(false) }
            else setHelpMode(m => !m)
          }}
          title={helpMode ? 'Close Vera' : 'Ask Vera for help'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '4px', lineHeight: 0, opacity: helpMode ? 1 : 0.5,
            transition: 'opacity 0.2s', flexShrink: 0,
          }}
        >
          <Owl w={28} h={46} blink={blink} />
        </button>
        {helpMode && !isVisible && (
          <span style={{ fontSize: '0.72rem', color: '#5e3b87', fontStyle: 'italic', fontFamily: "'DM Sans', sans-serif', userSelect: 'none'" }}>
            Click ? on anything
          </span>
        )}
      </div>

      {/* Proactive / on-demand speech — flies in from top */}
      {isVisible && speech && (
        <div
          className={animClass}
          style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid rgba(94,59,135,0.15)',
            boxShadow: '0 8px 28px rgba(94,59,135,0.12)',
            padding: '1rem 1rem 1rem 0.75rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}
        >
          <div style={{ flexShrink: 0, lineHeight: 0, marginTop: 2 }}>
            <Owl w={36} h={59} blink={blink} speaking={phase === 'visible'} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#f0a500', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>
              Vera
            </div>
            <p style={{ margin: 0, fontSize: '0.825rem', color: '#1a1a1a', lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif" }}>
              {speech.speech_text}
            </p>
          </div>
          <button
            onClick={flyOut}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '1rem', lineHeight: 1, padding: '0 0 0 4px', flexShrink: 0, marginTop: -2, fontFamily: 'sans-serif' }}
          >
            ×
          </button>
        </div>
      )}
    </>
  )
}

export default HelpMascot
