import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Product definitions ──────────────────────────────────────────────────────

const ANSWER_TIERS = [
  {
    id: 'free',
    name: 'Pay as you go',
    price: 0,
    priceLabel: '£0/mo',
    usageLabel: '35p/min',
    minutes: 0,
    concurrent: 1,
    features: ['AI answers missed calls', 'Lead capture', 'SMS notification', 'No monthly commitment', 'Up to 1 team member'],
    badge: null,
  },
  {
    id: 'light',
    name: 'Light',
    price: 29,
    priceLabel: '£29/mo',
    usageLabel: 'Overage 18p/min',
    minutes: 120,
    concurrent: 1,
    features: ['120 min/month included', 'Lead capture + triage', 'Partner referral network', 'Email summaries', 'Up to 3 team members'],
    badge: null,
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 49,
    priceLabel: '£49/mo',
    usageLabel: 'Overage 18p/min',
    minutes: 250,
    concurrent: 1,
    features: ['250 min/month included', 'Everything in Light', 'Analytics dashboard', 'Provisional booking', 'Up to 8 team members'],
    badge: 'Most popular',
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 69,
    priceLabel: '£69/mo',
    usageLabel: 'Overage 14p/min',
    minutes: 450,
    concurrent: 2,
    features: ['450 min/month included', '2 concurrent calls', 'CalDAV calendar sync', 'Custom AI behaviour', 'Up to 15 team members'],
    badge: null,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 249,
    priceLabel: '£249/mo',
    usageLabel: 'Overage 14p/min',
    minutes: 1000,
    concurrent: 3,
    features: ['1,000 min/month included', '3+ concurrent calls', 'Staff extension routing', 'No referral network cap', 'Unlimited team members'],
    badge: 'Contact us',
  },
]

const LISTEN_TIERS = [
  {
    id: 'none',
    name: 'Not included',
    price: 0,
    priceLabel: '£0',
    usageLabel: '',
    features: ['AI handles missed calls only', 'No live call assist'],
    badge: null,
    requiresAnswer: false,
  },
  {
    id: 'standard',
    name: 'Listen',
    price: 10,
    priceLabel: '£10/mo',
    usageLabel: '100 mins · 3p/min after',
    features: ['100 mins/month included', 'Real-time transcription', 'Caller history on screen', 'Slot suggestions during call', 'Live note-taking', 'Direct booking from screen', 'Post-call summary'],
    badge: null,
    requiresAnswer: true,
  },
  {
    id: 'advanced',
    name: 'Listen Pro',
    price: 20,
    priceLabel: '£20/mo',
    usageLabel: '250 mins · 4p/min after',
    features: ['250 mins/month included', 'Everything in Listen', 'Catalogue hand-off — product enquiries surface matches on screen', 'Sends checkout link direct to customer', 'Alternative product suggestions'],
    badge: 'Full Assist',
    requiresAnswer: true,
  },
]

const CALENDAR_TIERS = [
  {
    id: 'none',
    name: 'Not active',
    price: 0,
    priceLabel: '—',
    usageLabel: null,
    features: [],
    badge: null,
  },
  {
    id: 'solo',
    name: 'Solo Plan',
    price: 19,
    priceLabel: '£19/mo',
    usageLabel: '1 column · 250 msgs/mo',
    features: ['Public booking portal', 'Product & service listings', 'Drag-and-drop scheduling', '3-month marketing search', '250 campaign messages/mo', 'Status tracking', 'Live support'],
    badge: null,
    desc: 'Independent renters, chair-hire, mobile specialists',
  },
  {
    id: 'small_team',
    name: 'Small Team',
    price: 29,
    priceLabel: '£29/mo',
    usageLabel: '4 columns · 500 msgs/mo',
    features: ['Everything in Solo', 'Up to 4 staff columns', 'Team column view + staff filter', '12-month marketing search', '500 campaign messages/mo', 'Work schedules per staff'],
    badge: null,
    desc: 'Boutique setups, intimate storefront partnerships',
  },
  {
    id: 'growth',
    name: 'Growth Plan',
    price: 39,
    priceLabel: '£39/mo',
    usageLabel: '8 columns · 1,000 msgs/mo',
    features: ['Everything in Small Team', 'Up to 8 staff columns', '24-month marketing search', '1,000 campaign messages/mo', 'Service-driven slot generation', 'Reminder cadence (48h/24h/1h)'],
    badge: 'Most popular',
    desc: 'Standard high-street operations',
  },
  {
    id: 'large_team',
    name: 'Large Team',
    price: 49,
    priceLabel: '£49/mo',
    usageLabel: '20 columns · 2,000 msgs/mo',
    features: ['Everything in Growth', 'Up to 20 staff columns', 'All-time marketing search', '2,000 campaign messages/mo', 'Priority support'],
    badge: null,
    desc: 'High-volume multi-chair venues, walk-in establishments',
  },
]

const MULTI_STAFF_TIERS = new Set(['multi', 'small_team', 'growth', 'large_team'])

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRODUCT_COLOURS = {
  answer:   { dot: '#f0a500', bg: '#fffbeb', border: 'rgba(240,165,0,0.2)',   text: '#92400e', headerBg: '#fef3c7' },
  listen:   { dot: '#1d4ed8', bg: '#eff6ff', border: 'rgba(29,78,216,0.2)',   text: '#1e3a8a', headerBg: '#dbeafe' },
  schedule: { dot: '#059669', bg: '#f0fdf4', border: 'rgba(5,150,105,0.2)',   text: '#064e3b', headerBg: '#dcfce7' },
}

const ENTERPRISE_TIERS = ['enterprise', 'bespoke']

function priceBreakdown(answer, listen, calendar) {
  const a = ANSWER_TIERS.find(t => t.id === answer)
  const cal = CALENDAR_TIERS.find(t => t.id === calendar)
  const enterpriseBundle = ENTERPRISE_TIERS.includes(answer)
  const calendarCharge = cal?.price > 0 && !enterpriseBundle ? cal.price : 0
  const fixed = (a?.price || 0) + calendarCharge
  const listenLabel = listen === 'none' ? '' : listen === 'standard' ? '+ 3p/min Listen' : '+ 4p/min Listen'
  const calendarNote = cal?.usageLabel && calendarCharge > 0 ? cal.usageLabel : ''
  return { fixed, listenLabel, answerOverage: a?.usageLabel || '', calendarNote, enterpriseBundle }
}

// ─── Tier card ────────────────────────────────────────────────────────────────
function TierCard({ tier, selected, onClick, locked, product }) {
  const [expanded, setExpanded] = useState(false)
  const pc = PRODUCT_COLOURS[product]
  const isSelected = selected === tier.id
  const showAll = expanded || tier.features.length <= 3
  const hidden = tier.features.length - 3

  return (
    <button
      onClick={() => !locked && onClick(tier.id)}
      disabled={locked}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '0.75rem 0.9rem',
        borderRadius: 10,
        border: `${isSelected ? '2px' : '1.5px'} solid ${isSelected ? pc.dot : 'rgba(0,0,0,0.1)'}`,
        background: isSelected ? pc.bg : locked ? '#f9f9f9' : 'white',
        cursor: locked ? 'not-allowed' : 'pointer',
        opacity: locked ? 0.45 : 1,
        position: 'relative',
        transition: 'border-color 0.15s, background 0.15s',
        boxShadow: isSelected ? `0 0 0 3px ${pc.border.replace('0.2)', '0.15)')}` : 'none',
        marginBottom: '0.5rem',
        overflow: 'hidden',
      }}
    >
      {tier.badge && (
        <div style={{ position: 'absolute', top: -9, right: 10, fontSize: '0.62rem', fontWeight: 700, background: isSelected ? pc.dot : '#e8e8e8', color: isSelected ? 'white' : '#555', borderRadius: 4, padding: '0.1rem 0.45rem', letterSpacing: '0.04em', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase' }}>
          {tier.badge}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flex: 1 }}>
          <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${isSelected ? pc.dot : '#ccc'}`, background: isSelected ? pc.dot : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {isSelected && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'white' }} />}
          </span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: isSelected ? pc.text : '#1a1a1a' }}>{tier.name}</span>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: isSelected ? pc.dot : '#1a1a1a' }}>{tier.priceLabel}</div>
          {tier.usageLabel && <div style={{ fontSize: '0.65rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>{tier.usageLabel}</div>}
        </div>
      </div>
      <ul style={{ margin: 0, padding: '0 0 0 1.25rem', listStyle: 'none' }}>
        {(showAll ? tier.features : tier.features.slice(0, 3)).map((f, i) => (
          <li key={i} style={{ fontSize: '0.72rem', color: isSelected ? pc.text : '#666', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.55, display: 'flex', alignItems: 'flex-start', gap: '0.3rem' }}>
            <span style={{ color: isSelected ? pc.dot : '#ccc', flexShrink: 0, marginTop: 1 }}>✓</span>{f}
          </li>
        ))}
        {hidden > 0 && (
          <li style={{ marginTop: 4 }}>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
              style={{ fontSize: '0.68rem', color: isSelected ? pc.dot : '#5e3b87', fontFamily: "'DM Sans', sans-serif", background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 2 }}
            >
              {expanded ? '− Show less' : `+ ${hidden} more`}
            </button>
          </li>
        )}
      </ul>
    </button>
  )
}

// ─── Product column ───────────────────────────────────────────────────────────
function ProductColumn({ product, title, subtitle, icon, tiers, selected, onSelect, locked, lockedMsg }) {
  const pc = PRODUCT_COLOURS[product]
  return (
    <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderRadius: '12px 12px 0 0', background: pc.headerBg, border: `1px solid ${pc.border}`, borderBottom: 'none', padding: '0.9rem 1rem 0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: pc.dot, flexShrink: 0 }} />
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: pc.text }}>{title}</span>
          {icon && <span style={{ fontSize: '1rem', marginLeft: 2 }}>{icon}</span>}
        </div>
        <div style={{ fontSize: '0.72rem', color: pc.text, opacity: 0.7, fontFamily: "'DM Sans', sans-serif", paddingLeft: '1.25rem' }}>{subtitle}</div>
      </div>
      <div style={{ border: `1px solid ${pc.border}`, borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '0.85rem', background: 'white', flex: 1 }}>
        {locked && lockedMsg && (
          <div style={{ padding: '0.6rem 0.75rem', background: '#fef3d9', border: '1px solid rgba(240,165,0,0.3)', borderRadius: 8, fontSize: '0.75rem', color: '#7a5c00', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.75rem', lineHeight: 1.5 }}>
            {lockedMsg}
          </div>
        )}
        {tiers.map(tier => (
          <TierCard
            key={tier.id}
            tier={tier}
            selected={selected}
            onClick={onSelect}
            locked={locked && tier.id !== 'none'}
            product={product}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PlanSelector({ onBack, onSelect, currentAnswer, currentListen, currentCalendar, currentStaffCount = 0, currentStaffNames = [] }) {
  const navigate = useNavigate()

  const [answer, setAnswer]     = useState(currentAnswer   || 'standard')
  const [listen, setListen]     = useState(currentListen   || 'standard')
  // Normalise legacy tier IDs: entry→solo, multi→small_team
  const normaliseCalendar = t => t === 'entry' ? 'solo' : t === 'multi' ? 'small_team' : (t || 'none')
  const [calendar, setCalendar] = useState(normaliseCalendar(currentCalendar))

  const showDowngradeWarning = MULTI_STAFF_TIERS.has(currentCalendar) && !MULTI_STAFF_TIERS.has(calendar) && calendar !== 'none' && currentStaffCount > 1

  const listenLocked = answer === 'free'

  useEffect(() => {
    if (listenLocked && listen !== 'none') setListen('none')
  }, [listenLocked])

  const { fixed, listenLabel, answerOverage, calendarNote, enterpriseBundle } = priceBreakdown(answer, listen, calendar)

  useEffect(() => {
    if (enterpriseBundle && calendar !== 'multi') setCalendar('multi')
  }, [enterpriseBundle])

  const handleContinue = () => {
    if (onSelect) onSelect({ answer, listen, calendar })
    else navigate('/onboarding')
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: '100vh', background: '#f7f6f9', padding: '2rem 1.5rem 6rem', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          {onBack && (
            <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '0.8125rem', fontFamily: "'DM Sans', sans-serif", marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }}>
              ← Back
            </button>
          )}
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.75rem', color: '#1a1a1a', marginBottom: '0.4rem' }}>
            Build your Qerxel
          </div>
          <div style={{ fontSize: '0.9375rem', color: '#666', lineHeight: 1.6, maxWidth: 520, margin: '0 auto' }}>
            Three products. Pick exactly what you need.
          </div>
        </div>

        {/* Three-column picker */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <ProductColumn
            product="answer"
            title="Answer"
            subtitle="Missed call AI — captures leads, handles enquiries"
            icon="📞"
            tiers={ANSWER_TIERS}
            selected={answer}
            onSelect={t => setAnswer(t)}
          />
          <ProductColumn
            product="listen"
            title="Listen"
            subtitle="Live call assist — surfaces the right info in real time"
            icon="🎧"
            tiers={LISTEN_TIERS}
            selected={listen}
            onSelect={t => setListen(t)}
            locked={listenLocked}
            lockedMsg="Select an Answer subscription to unlock Listen."
          />
          <ProductColumn
            product="schedule"
            title="Schedule"
            subtitle="Booking engine — appointments, staff, reminders"
            icon="📅"
            tiers={CALENDAR_TIERS.map(t =>
              t.id === 'large_team' && enterpriseBundle
                ? { ...t, priceLabel: 'Included', usageLabel: 'With Enterprise Answer', badge: 'Included free' }
                : t
            )}
            selected={calendar}
            onSelect={t => !enterpriseBundle && setCalendar(t)}
          />
        </div>
      </div>

      {/* ── Sticky footer ─────────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
        {showDowngradeWarning && (
          <div style={{ background: '#fffbeb', borderTop: '1px solid rgba(240,165,0,0.4)', padding: '0.6rem 2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1rem' }}>⚠️</span>
            <span style={{ fontSize: '0.8125rem', color: '#7a5c00', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
              <strong>Downgrading to Solo Schedule</strong> — your calendar will switch to single-person view.
              {currentStaffNames.length > 0 && (
                <> Existing booking data for <strong>{currentStaffNames.slice(0, -1).join(', ')}{currentStaffNames.length > 1 ? ' and ' : ''}{currentStaffNames.slice(-1)}</strong> will be retained but won't appear in the calendar until you upgrade again.</>
              )}
            </span>
          </div>
        )}
      <div style={{ background: 'white', borderTop: '1px solid rgba(94,59,135,0.1)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: '#1a1a1a' }}>
              £{fixed}<span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#888' }}>/mo</span>
            </span>
            {listenLabel && (
              <span style={{ fontSize: '0.8125rem', color: '#1d4ed8', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                {listenLabel}
              </span>
            )}
            {calendarNote && (
              <span style={{ fontSize: '0.8125rem', color: '#059669', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                {calendarNote}
              </span>
            )}
            {answerOverage && answer !== 'free' && (
              <span style={{ fontSize: '0.75rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>
                · {answerOverage}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif", marginTop: '0.1rem' }}>
            {[
              ANSWER_TIERS.find(t => t.id === answer)?.name + ' Answer',
              listen !== 'none' ? (listen === 'advanced' ? 'Listen Advanced' : 'Listen Standard') : null,
              calendar === 'multi' ? 'Schedule Multi-staff' : 'Schedule Entry',
            ].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          {onBack && (
            <button onClick={onBack}
              style={{ padding: '0.6rem 1.1rem', border: '1px solid rgba(94,59,135,0.22)', borderRadius: 8, background: 'white', color: '#5e3b87', fontSize: '0.8125rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              Back
            </button>
          )}
          {answer === 'enterprise' ? (
            <a href="mailto:hello@qerxel.app?subject=Enterprise enquiry"
              style={{ padding: '0.65rem 1.6rem', border: 'none', borderRadius: 8, background: '#5e3b87', color: 'white', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              Talk to us about Enterprise →
            </a>
          ) : (
            <button onClick={handleContinue}
              style={{ padding: '0.65rem 1.6rem', border: 'none', borderRadius: 8, background: '#f0a500', color: '#1a0533', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
              Continue with this plan →
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
