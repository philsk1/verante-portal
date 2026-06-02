import { useState, useEffect, useRef } from 'react'

// ─── per-tab help scripts ─────────────────────────────────────────────────────

const PAGE_HELP = {
  dashboard: [
    "Hi, I'm Vera — your Verrante guide. Click me and I'll walk you through this page. You can also hover over anything you don't recognise and I'll explain it.",
    "These four boxes at the top are your key numbers. Calls = conversations your AI had today. Leads = people who expressed interest. Referrals = callers passed to a partner. Minutes = how much of your monthly allowance is used.",
    "The highlighted box below the numbers is a smart recommendation — I've looked at your activity and flagged the most useful thing to act on right now.",
    "Recent Calls is a log of every conversation your AI handled. The coloured dot shows the outcome — green means booked, purple means a lead was captured, grey means the call was closed or filtered.",
    "Leads requiring action are people your AI spoke to who haven't heard back from you yet. The sooner you follow up, the better — leads contacted within 24 hours convert at three times the rate.",
    "Referrals sent today shows which partner businesses your AI passed callers to. Every referral builds goodwill — they're more likely to send callers your way in return.",
  ],
  profile: [
    "Your Business Profile is the foundation of your AI. Everything here shapes how it speaks, who it helps, and how it represents you on every call.",
    "Business Details are the basics your AI uses to represent you — your trading name, phone number, email, and address.",
    "Your Services is the list of things your AI will actively help callers with. If someone asks for something not on this list, the AI handles it differently.",
    "Partner Services are things you can't do yourself but pass to an associate. Your AI gives a warm referral rather than a flat no — much better for the caller.",
    "The Client Directory lets you add known clients by name and phone number. When one of them rings in, your AI recognises them and can treat them differently.",
    "Employee Profiles is an Enterprise feature. Add team members with their specialisms and your AI can route callers to the right person by name.",
  ],
  ai: [
    "AI Behaviour is where you control how your AI handles calls — its pace, its priorities, and what it does in different situations.",
    "Triage Mode controls the conversation style. Strict = short and efficient. Balanced = standard. Open = more relaxed and conversational.",
    "Escalation Preference is what your AI does when it can't resolve a call. Escalate = tries to transfer to you live. Hard close = wraps up and takes a callback.",
    "Call Type Rules let you set completely different behaviour for different kinds of callers — new customers, cold sales, suppliers, and more.",
    "Emergency Keywords make your AI escalate immediately when it hears them. Add things like 'gas leak', 'not breathing', 'flooding'. These override all other rules.",
    "Call Filtering blocks spam, autodiallers, and unsolicited sales calls before they reach your AI — protecting your included minutes for real callers.",
  ],
  analytics: [
    "Analytics shows the patterns across all your call data over time — not just today, but since you joined.",
    "Total calls handled is every conversation your AI has had. Lead capture rate is the percentage of callers who expressed genuine interest — 40%+ is strong.",
    "Average call duration tells you how long conversations last. Very short calls may mean callers are hanging up — worth checking in your Dashboard call log.",
    "The four feature cards are unlocked on Enterprise — pricing intelligence, outcome breakdown, caller patterns by day, and competitor mentions from calls.",
  ],
  referrals: [
    "Partners & Referrals is how you build a network that generates leads without advertising.",
    "Every partner you add is a business your AI can refer callers to when they need something outside your scope. Partners who receive referrals are far more likely to send callers back to you.",
    "Your Referral Code is unique to you. Share it with other business owners — when they sign up using your code, you earn a free month automatically.",
    "Credits are free months earned through referrals. They stack indefinitely and apply automatically at renewal.",
    "Network Activity shows how many callers you've referred to partners and an estimate of the value that generates for them.",
  ],
  account: [
    "Account Settings covers your subscription, your personal details, and your preferences for how Verrante contacts you.",
    "Plan & Billing shows what you're currently on — the plan name, price, included minutes, and how many calls your AI can handle at once.",
    "Account Details lets you update your business name. Your email is read-only — contact support to change it. You can also send yourself a password reset from here.",
    "Notifications control when Verrante emails you — immediately when a lead comes in, as a daily digest, or just a weekly report.",
    "Feedback unlocks after six weeks of real use. We ask then because first impressions are cheap — six weeks of real use tells us something worth knowing.",
    "The Support chat connects directly to the Verrante team. Ask anything about how a setting works or what a term means.",
  ],
}

// ─── inject CSS ───────────────────────────────────────────────────────────────

const STYLE_ID = 'verrante-mascot-styles'

const injectStyles = () => {
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = `
    @keyframes verranteBob {
      0%, 100% { transform: translateY(0px); }
      50%       { transform: translateY(-4px); }
    }
    @keyframes verrrantePulse {
      0%, 100% { transform: translateY(0px) scale(1); }
      50%       { transform: translateY(-4px) scale(1.04); }
    }
    .vera-idle    { animation: verranteBob   5s ease-in-out infinite; }
    .vera-active  { animation: verrrantePulse 3s ease-in-out infinite; }
    .verrante-help-mode [data-help] {
      text-decoration: underline;
      text-decoration-style: dotted;
      text-decoration-color: rgba(94,59,135,0.45);
      text-underline-offset: 3px;
      cursor: help !important;
    }
  `
  document.head.appendChild(el)
}

// ─── owl SVG ─────────────────────────────────────────────────────────────────

const OwlFace = ({ blink, active }) => (
  <svg width="42" height="42" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Ear tufts */}
    <ellipse cx="22" cy="9" rx="7" ry="13" fill="#4a2d6e" transform="rotate(-18 22 9)" />
    <ellipse cx="58" cy="9" rx="7" ry="13" fill="#4a2d6e" transform="rotate(18 58 9)" />

    {/* Head */}
    <circle cx="40" cy="44" r="34" fill="#5e3b87" />

    {/* Facial disc — soft lighter patch around eyes */}
    <ellipse cx="40" cy="46" rx="27" ry="23" fill="rgba(255,255,255,0.09)" />

    {/* ── Left eye ── */}
    <circle cx="26" cy="40" r="13" fill="#f0a500" />
    <circle cx="26" cy="40" r="10" fill="white" />
    {blink
      ? <ellipse cx="26" cy="40" rx="10" ry="2.5" fill="#5e3b87" />
      : <>
          <circle cx={active ? 28 : 27} cy={active ? 38 : 39} r="6" fill="#1a0533" />
          <circle cx={active ? 30 : 29} cy={active ? 35 : 36} r="2" fill="white" />
        </>
    }

    {/* ── Right eye ── */}
    <circle cx="54" cy="40" r="13" fill="#f0a500" />
    <circle cx="54" cy="40" r="10" fill="white" />
    {blink
      ? <ellipse cx="54" cy="40" rx="10" ry="2.5" fill="#5e3b87" />
      : <>
          <circle cx={active ? 56 : 55} cy={active ? 38 : 39} r="6" fill="#1a0533" />
          <circle cx={active ? 58 : 57} cy={active ? 35 : 36} r="2" fill="white" />
        </>
    }

    {/* Beak */}
    <polygon points="40,52 34,63 46,63" fill="#f0a500" />

    {/* Belly fluff */}
    <ellipse cx="40" cy="72" rx="14" ry="7" fill="rgba(255,255,255,0.12)" />

    {/* Amber dot — Verrante brand mark */}
    <circle cx="66" cy="16" r="5" fill="#f0a500" />
  </svg>
)

// ─── component ────────────────────────────────────────────────────────────────

const HelpMascot = ({ activeTab }) => {
  const [helpMode, setHelpMode]       = useState(false)
  const [hovered, setHovered]         = useState(false)
  const [tipIndex, setTipIndex]       = useState(0)
  const [elementHelp, setElementHelp] = useState(null)
  const [blink, setBlink]             = useState(false)
  const bubbleRef = useRef(null)

  useEffect(() => { injectStyles() }, [])

  // Slow, occasional blink — owls blink less than humans
  useEffect(() => {
    const schedule = () => setTimeout(() => {
      setBlink(true)
      setTimeout(() => { setBlink(false); schedule() }, 180)
    }, 5000 + Math.random() * 4000)
    const t = schedule()
    return () => clearTimeout(t)
  }, [])

  // Reset tips when tab changes
  useEffect(() => {
    setTipIndex(0)
    setElementHelp(null)
  }, [activeTab])

  // Help mode: body class + global mouseover
  useEffect(() => {
    if (helpMode) {
      document.body.classList.add('verrante-help-mode')
    } else {
      document.body.classList.remove('verrante-help-mode')
      setElementHelp(null)
    }
    if (!helpMode) return

    const handleOver = (e) => {
      if (bubbleRef.current?.contains(e.target)) return
      const el = e.target.closest('[data-help]')
      setElementHelp(el ? el.getAttribute('data-help') : null)
    }
    document.addEventListener('mouseover', handleOver)
    return () => {
      document.removeEventListener('mouseover', handleOver)
      document.body.classList.remove('verrante-help-mode')
    }
  }, [helpMode])

  const tips = PAGE_HELP[activeTab] || []
  const displayText = elementHelp || tips[tipIndex] || ''
  const isActive = helpMode || hovered

  const handleClick = () => {
    setHelpMode(m => {
      if (!m) setTipIndex(0)
      return !m
    })
  }

  const nextTip = (e) => { e.stopPropagation(); setElementHelp(null); setTipIndex(i => (i + 1) % tips.length) }
  const prevTip = (e) => { e.stopPropagation(); setElementHelp(null); setTipIndex(i => (i - 1 + tips.length) % tips.length) }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>

      {/* Owl — animation class on wrapper so React state changes don't restart it */}
      <div
        className={helpMode ? 'vera-active' : 'vera-idle'}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={helpMode ? 'Click to close help' : 'Click for help'}
        style={{ cursor: 'pointer', flexShrink: 0, lineHeight: 0 }}
      >
        <OwlFace blink={blink} active={isActive} />
      </div>

      {/* Speech bubble */}
      {isActive && displayText ? (
        <div
          ref={bubbleRef}
          style={{
            background: 'white',
            border: '0.5px solid rgba(94,59,135,0.15)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            boxShadow: '0 4px 20px rgba(94,59,135,0.1)',
            maxWidth: 360,
            position: 'relative',
            flex: 1,
          }}
        >
          {/* Pointer */}
          <div style={{ position: 'absolute', left: -7, top: 14, width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderRight: '7px solid rgba(94,59,135,0.15)' }} />
          <div style={{ position: 'absolute', left: -6, top: 14, width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderRight: '7px solid white' }} />

          {elementHelp && (
            <div style={{ fontSize: '0.65rem', fontWeight: '600', color: '#f0a500', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.3rem' }}>
              Vera explains
            </div>
          )}

          <p style={{ margin: 0, fontSize: '0.8rem', color: '#1a1a1a', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
            {displayText}
          </p>

          {!elementHelp && tips.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.6rem' }}>
              <button onClick={prevTip} disabled={tipIndex === 0}
                style={{ ...navBtn, opacity: tipIndex === 0 ? 0.3 : 1 }}>← Prev</button>
              <span style={{ fontSize: '0.7rem', color: '#ccc' }}>{tipIndex + 1} / {tips.length}</span>
              <button onClick={nextTip} disabled={tipIndex === tips.length - 1}
                style={{ ...navBtn, opacity: tipIndex === tips.length - 1 ? 0.3 : 1 }}>Next →</button>
            </div>
          )}

          {helpMode && !elementHelp && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#aaa', fontStyle: 'italic' }}>
              Hover anything on this page for an explanation
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: '0.75rem', color: '#aaa', fontStyle: 'italic', userSelect: 'none' }}>
          {helpMode ? 'Help mode on · hover anything to explain it' : 'Vera · click for help'}
        </div>
      )}
    </div>
  )
}

const navBtn = {
  background: 'none', border: 'none', color: '#5e3b87',
  fontSize: '0.72rem', cursor: 'pointer', padding: '0.15rem 0.3rem',
  fontFamily: "'DM Sans', sans-serif", borderRadius: '4px',
}

export default HelpMascot
