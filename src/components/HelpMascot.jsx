import { useState, useEffect, useRef } from 'react'

// ─── per-tab help scripts ─────────────────────────────────────────────────────

const PAGE_HELP = {
  dashboard: [
    "Hi, I'm Vera — your Verrante guide. Click me and I'll walk you through everything on this page. You can also hover over anything you don't recognise and I'll explain it.",
    "These four boxes at the top are your key numbers. Calls = conversations your AI had today. Leads = people who expressed interest. Referrals = callers passed to a partner. Minutes = how much of your monthly allowance is used.",
    "The highlighted box below the numbers is a smart recommendation — I've looked at your activity and flagged the most useful thing to act on right now.",
    "Recent Calls is a log of every conversation your AI handled. The coloured dot tells you the outcome — green means booked, purple means a lead was captured, grey means the call was closed or filtered.",
    "Leads requiring action are people your AI spoke to who haven't heard back from you. The sooner you follow up, the better — leads contacted within 24 hours convert at three times the rate.",
    "Referrals sent today shows which partner businesses your AI passed callers to. Every referral builds reciprocal obligation — they're more likely to send callers your way in return.",
  ],
  profile: [
    "Your Business Profile is the foundation of your AI. Everything here shapes how it speaks, who it helps, and how it represents you on every call.",
    "Business Details are the basics — your trading name, phone number, email, and address. Your AI uses these when callers ask questions like 'where are you based?' or 'how do I reach you?'",
    "Your Services is a list of what your AI will actively help with. If a caller asks for something not on the list, your AI handles it differently — referring out or declining politely.",
    "Partner Services are things you can't do yourself but actively pass to an associate business. Your AI gives a warm referral — 'I can't help with that but my colleague at X can' — rather than a flat no.",
    "The Client Directory lets you add known clients by name and phone number. When one of them rings in, your AI recognises them and can treat them differently — VIP handling, special instructions, and so on.",
    "Employee Profiles is an Enterprise feature that lets you add staff members with their specialist services. Your AI can then route callers to the right person by name.",
  ],
  ai: [
    "AI Behaviour is where you control how your AI handles calls — its pace, its priorities, and what it does in different situations.",
    "Triage Mode controls the conversation style. Strict means short and efficient — the AI gets what it needs quickly and closes. Balanced is the standard. Open is more relaxed and conversational, good for businesses where the relationship matters.",
    "Escalation Preference is what your AI does when it genuinely can't resolve a call. 'Escalate to me' means it tries to transfer the call live. 'Hard close' means it wraps up politely and offers a callback instead.",
    "Call Type Rules let you set completely different behaviour for different kinds of callers. A new customer gets one treatment, a cold sales call gets another, a supplier gets another. You can set the pace, the closing method, and any special instructions for each.",
    "Emergency Keywords are words that make your AI escalate immediately — no matter what else is happening. Add things like 'gas leak', 'not breathing', or 'urgent'. The AI will treat these as an override above all other settings.",
    "Call Filtering sits upstream of everything else. It blocks known spam patterns, autodialler calls, and unsolicited sales calls before they even reach your AI — so your included minutes go to real callers.",
  ],
  analytics: [
    "Analytics shows you the patterns across all your call data — not just today, but over time.",
    "Total calls handled is the cumulative number of real conversations your AI has had since you joined. This grows every day your number is active.",
    "Lead capture rate is the percentage of callers who gave their details and expressed genuine interest. A rate above 40% is strong. If it's lower, your AI Behaviour settings — especially triage mode — may be worth reviewing.",
    "Average call duration tells you how long conversations typically last. Very short calls can mean callers are hanging up early — which is worth investigating in the Recent Calls log on your Dashboard.",
    "The four feature cards are unlocked on Enterprise. Pricing Intelligence shows market rates callers mention. Call Outcome Breakdown shows how calls resolve. Caller Patterns shows your busiest days. Competitor Intelligence flags businesses callers compare you against.",
  ],
  referrals: [
    "Partners & Referrals is how you build a network that generates inbound leads without paid advertising.",
    "Your Partner Network is the list of businesses your AI refers callers to when they ask for something outside your scope. Every partner you add is a potential source of reciprocal referrals back to you.",
    "Your Referral Code is unique to your account. Share it with other business owners — when they sign up and enter your code, you earn a free month of Verrante automatically. No follow-up needed.",
    "Credits are free months earned through referrals. They stack indefinitely and are applied automatically when your subscription renews. Three referrals = three free months.",
    "Network Activity shows how many callers you've referred to partners and an estimate of the commercial value that generates for them. Partners who receive referrals from you feel a genuine reciprocal obligation.",
  ],
  account: [
    "Account Settings covers your subscription plan, your personal account details, and your preferences for how Verrante communicates with you.",
    "Plan & Billing shows what you're currently on — the plan name, price, included minutes, and concurrent call capacity. Upgrade options appear below if you'd like more.",
    "Account Details lets you update your business name as displayed in the portal. Your email address is read-only — contact support to change it. You can also send yourself a password reset link from here.",
    "Notifications let you choose when Verrante emails you. New lead = immediate alert when your AI captures a lead. Daily summary = end-of-day digest. Weekly report = Monday overview of the past week.",
    "Feedback unlocks after six weeks of real use. We ask then rather than on day one because first impressions are cheap — six weeks tells us something worth knowing.",
    "The Support chat at the bottom connects directly to the Verrante team. Ask anything about how a setting works, what a term means, or how to get more from your AI.",
  ],
}

// ─── inject styles ────────────────────────────────────────────────────────────

const STYLE_ID = 'verrante-mascot-styles'

const injectStyles = () => {
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = `
    @keyframes verranteBob {
      0%, 100% { transform: translateY(0px); }
      50%       { transform: translateY(-5px); }
    }
    @keyframes verrrantePulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(94,59,135,0.35); }
      50%       { box-shadow: 0 0 0 7px rgba(94,59,135,0); }
    }
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

// ─── component ────────────────────────────────────────────────────────────────

const HelpMascot = ({ activeTab }) => {
  const [helpMode, setHelpMode]       = useState(false)
  const [hovered, setHovered]         = useState(false)
  const [tipIndex, setTipIndex]       = useState(0)
  const [elementHelp, setElementHelp] = useState(null)
  const [blink, setBlink]             = useState(false)
  const [justActivated, setJustActivated] = useState(false)
  const bubbleRef = useRef(null)

  // Inject CSS once
  useEffect(() => { injectStyles() }, [])

  // Blink animation every ~4s
  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 130)
    }, 4000 + Math.random() * 2000)
    return () => clearInterval(id)
  }, [])

  // Reset tip index when tab changes
  useEffect(() => {
    setTipIndex(0)
    setElementHelp(null)
  }, [activeTab])

  // Help mode: add/remove body class + global mouseover listener
  useEffect(() => {
    if (helpMode) {
      document.body.classList.add('verrante-help-mode')
    } else {
      document.body.classList.remove('verrante-help-mode')
      setElementHelp(null)
    }

    if (!helpMode) return

    const handleOver = (e) => {
      // Ignore events inside the mascot bubble itself
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
      if (!m) {
        setTipIndex(0)
        setJustActivated(true)
        setTimeout(() => setJustActivated(false), 600)
      }
      return !m
    })
  }

  const nextTip = (e) => {
    e.stopPropagation()
    setElementHelp(null)
    setTipIndex(i => (i + 1) % tips.length)
  }

  const prevTip = (e) => {
    e.stopPropagation()
    setElementHelp(null)
    setTipIndex(i => (i - 1 + tips.length) % tips.length)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>

      {/* Character */}
      <div
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={helpMode ? 'Click to close help' : 'Click to open help'}
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #5e3b87 0%, #4a2d6e 100%)',
          cursor: 'pointer',
          flexShrink: 0,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: helpMode
            ? '0 0 0 3px rgba(94,59,135,0.25)'
            : hovered
              ? '0 4px 16px rgba(94,59,135,0.35)'
              : '0 2px 8px rgba(94,59,135,0.18)',
          transition: 'box-shadow 0.2s',
          animation: helpMode
            ? 'verrrantePulse 2s ease-in-out infinite'
            : 'verranteBob 3.5s ease-in-out infinite',
        }}
      >
        {/* Eyes */}
        <svg
          width="26" height="14" viewBox="0 0 26 14" fill="none"
          style={{ position: 'absolute', top: 11 }}
        >
          <ellipse cx="7"  cy={blink ? 2 : 5} rx="3.5" ry={blink ? 0.8 : 4} fill="white" />
          <ellipse cx="19" cy={blink ? 2 : 5} rx="3.5" ry={blink ? 0.8 : 4} fill="white" />
          {!blink && (
            <>
              <circle cx={isActive ? 8.5 : 7}  cy="5" r="1.5" fill="#3a2057" />
              <circle cx={isActive ? 20.5 : 19} cy="5" r="1.5" fill="#3a2057" />
              {/* Highlight dots */}
              <circle cx={isActive ? 9.5 : 8}  cy="3.5" r="0.7" fill="rgba(255,255,255,0.6)" />
              <circle cx={isActive ? 21.5 : 20} cy="3.5" r="0.7" fill="rgba(255,255,255,0.6)" />
            </>
          )}
        </svg>

        {/* Mouth */}
        <svg
          width="14" height="7" viewBox="0 0 14 7" fill="none"
          style={{ position: 'absolute', bottom: 9 }}
        >
          <path
            d={isActive ? 'M1 1 Q7 7 13 1' : 'M2 3.5 Q7 5.5 12 3.5'}
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        {/* Amber dot — matches Verrante logo */}
        <div style={{
          position: 'absolute', top: 2, right: 2,
          width: 7, height: 7, borderRadius: '50%',
          background: '#f0a500',
        }} />

        {/* Active ring */}
        {helpMode && (
          <div style={{
            position: 'absolute', inset: -4,
            borderRadius: '50%',
            border: '2px solid rgba(94,59,135,0.3)',
            pointerEvents: 'none',
          }} />
        )}
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

          {/* Source label */}
          {elementHelp && (
            <div style={{ fontSize: '0.65rem', fontWeight: '600', color: '#f0a500', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.3rem' }}>
              Vera explains
            </div>
          )}

          <p style={{ margin: 0, fontSize: '0.8rem', color: '#1a1a1a', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
            {displayText}
          </p>

          {/* Navigation — only for page tips, not element help */}
          {!elementHelp && tips.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.6rem' }}>
              <button onClick={prevTip} style={navBtn} disabled={tipIndex === 0}>← Prev</button>
              <span style={{ fontSize: '0.7rem', color: '#ccc' }}>{tipIndex + 1} / {tips.length}</span>
              <button onClick={nextTip} style={navBtn} disabled={tipIndex === tips.length - 1}>Next →</button>
            </div>
          )}

          {/* Help mode hint */}
          {helpMode && !elementHelp && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#aaa', fontStyle: 'italic' }}>
              Hover anything on this page for an explanation
            </div>
          )}
        </div>
      ) : (
        /* Idle label */
        !helpMode && (
          <div style={{ fontSize: '0.75rem', color: '#aaa', fontStyle: 'italic', userSelect: 'none' }}>
            Vera · {hovered ? 'click to open help' : 'need help?'}
          </div>
        )
      )}

      {/* Help mode active label when bubble not showing */}
      {helpMode && !displayText && (
        <div style={{ fontSize: '0.75rem', color: '#5e3b87', fontWeight: 500, fontStyle: 'italic' }}>
          Help mode on · hover anything for an explanation
        </div>
      )}
    </div>
  )
}

const navBtn = {
  background: 'none',
  border: 'none',
  color: '#5e3b87',
  fontSize: '0.72rem',
  cursor: 'pointer',
  padding: '0.15rem 0.3rem',
  fontFamily: "'DM Sans', sans-serif",
  borderRadius: '4px',
  opacity: 1,
}

export default HelpMascot
