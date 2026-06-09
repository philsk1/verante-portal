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
    features: ['AI answers missed calls', 'Lead capture', 'SMS notification', 'No monthly commitment'],
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
    features: ['120 min/month included', 'Lead capture + triage', 'Partner referral network', 'Email summaries'],
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
    features: ['250 min/month included', 'Everything in Light', 'Analytics dashboard', 'Provisional booking'],
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
    features: ['450 min/month included', '2 concurrent calls', 'CalDAV calendar sync', 'Custom AI behaviour'],
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
    features: ['1,000 min/month included', '3+ concurrent calls', 'Staff extension routing', 'No referral network cap'],
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
    name: 'Standard',
    price: 0,
    priceLabel: '3p/min',
    usageLabel: 'Per minute of live call',
    features: ['Real-time transcription', 'Intent detection', 'Call logged for every call', 'Lead auto-logged on selection', 'Date → calendar link', 'Post-call summary'],
    badge: null,
    requiresAnswer: true,
  },
  {
    id: 'advanced',
    name: 'Advanced',
    price: 0,
    priceLabel: '4p/min',
    usageLabel: 'Per minute of live call',
    features: ['Everything in Standard', 'Live catalogue card surfacing', 'Competitor intelligence lookup', 'Booking trigger voice command'],
    badge: 'Full Assist',
    requiresAnswer: true,
  },
]

const CALENDAR_TIERS = [
  {
    id: 'entry',
    name: 'Entry',
    price: 0,
    priceLabel: 'Free',
    usageLabel: 'Always included',
    features: ['Single-person calendar', 'Manual booking', 'Drag-and-drop rescheduling', 'Status tracking'],
    badge: 'Included free',
    alwaysFree: true,
  },
  {
    id: 'multi',
    name: 'Multi-staff',
    price: 5,
    priceLabel: '£5/mo',
    usageLabel: '+ £2/staff member',
    features: ['Unlimited staff profiles', 'Team column view + staff filter', 'Service-driven slot generation', 'Work schedules per staff', 'Reminder cadence (48h/24h/1h)', 'Waitlist + intake capture', 'Recurring series booking'],
    badge: null,
    alwaysFree: false,
  },
]

// ─── Named packages ───────────────────────────────────────────────────────────

const PACKAGES = [
  {
    id: 'solo',
    name: 'Solo',
    tagline: 'Start capturing every lead',
    answer: 'light', listen: 'standard', calendar: 'entry',
    priceLabel: '£29/mo + usage',
    colour: '#5e3b87',
    bg: '#f5f3ff',
    border: 'rgba(94,59,135,0.25)',
  },
  {
    id: 'professional',
    name: 'Professional',
    tagline: 'More minutes, full analytics',
    answer: 'standard', listen: 'standard', calendar: 'entry',
    priceLabel: '£49/mo + usage',
    colour: '#1d4ed8',
    bg: '#eff6ff',
    border: 'rgba(29,78,216,0.25)',
  },
  {
    id: 'team',
    name: 'Team',
    tagline: 'Multi-staff calendar + booking engine',
    answer: 'standard', listen: 'standard', calendar: 'multi',
    priceLabel: '£54/mo + £2/staff',
    colour: '#059669',
    bg: '#f0fdf4',
    border: 'rgba(5,150,105,0.25)',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Full platform, every feature',
    answer: 'enterprise', listen: 'advanced', calendar: 'multi',
    priceLabel: '£254/mo + £2/staff',
    colour: '#f0a500',
    bg: '#fffbeb',
    border: 'rgba(240,165,0,0.3)',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRODUCT_COLOURS = {
  answer:   { dot: '#f0a500', bg: '#fffbeb', border: 'rgba(240,165,0,0.2)',   text: '#92400e', headerBg: '#fef3c7' },
  listen:   { dot: '#1d4ed8', bg: '#eff6ff', border: 'rgba(29,78,216,0.2)',   text: '#1e3a8a', headerBg: '#dbeafe' },
  calendar: { dot: '#059669', bg: '#f0fdf4', border: 'rgba(5,150,105,0.2)',   text: '#064e3b', headerBg: '#dcfce7' },
}

function priceBreakdown(answer, listen, calendar) {
  const a = ANSWER_TIERS.find(t => t.id === answer)
  const fixed = (a?.price || 0) + (calendar === 'multi' ? 5 : 0)
  const listenLabel = listen === 'none' ? '' : listen === 'standard' ? '+ 3p/min Listen' : '+ 4p/min Listen'
  const calendarNote = calendar === 'multi' ? '+ £2/staff' : ''
  return { fixed, listenLabel, answerOverage: a?.usageLabel || '', calendarNote }
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
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: isSelected ? pc.text : '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tier.name}</span>
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
  const [calendar, setCalendar] = useState(currentCalendar || 'entry')
  const [activePackage, setActivePackage] = useState(null)

  const showDowngradeWarning = currentCalendar === 'multi' && calendar === 'entry' && currentStaffCount > 1

  const applyPackage = (pkg) => {
    setAnswer(pkg.answer)
    setListen(pkg.listen)
    setCalendar(pkg.calendar)
    setActivePackage(pkg.id)
  }

  const listenLocked = answer === 'free'

  useEffect(() => {
    if (listenLocked && listen !== 'none') setListen('none')
  }, [listenLocked])

  const { fixed, listenLabel, answerOverage, calendarNote } = priceBreakdown(answer, listen, calendar)

  const handleContinue = () => {
    if (onSelect) onSelect({ answer, listen, calendar })
    else navigate('/onboarding')
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: '100vh', background: '#f7f6f9', padding: '2rem 1.5rem 6rem', boxSizing: 'border-box' }}>
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
            Three products. Pick what you need. Calendar is always free.
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
            onSelect={t => { setAnswer(t); setActivePackage(null) }}
          />
          <ProductColumn
            product="listen"
            title="Listen"
            subtitle="Live call assist — surfaces the right info in real time"
            icon="🎧"
            tiers={LISTEN_TIERS}
            selected={listen}
            onSelect={t => { setListen(t); setActivePackage(null) }}
            locked={listenLocked}
            lockedMsg="Select an Answer subscription to unlock Listen."
          />
          <ProductColumn
            product="calendar"
            title="Calendar"
            subtitle="Booking engine — appointments, staff, reminders"
            icon="📅"
            tiers={CALENDAR_TIERS}
            selected={calendar}
            onSelect={t => { setCalendar(t); setActivePackage(null) }}
          />
        </div>
      </div>

      {/* ── Sticky footer ─────────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
        {showDowngradeWarning && (
          <div style={{ background: '#fffbeb', borderTop: '1px solid rgba(240,165,0,0.4)', padding: '0.6rem 2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1rem' }}>⚠️</span>
            <span style={{ fontSize: '0.8125rem', color: '#7a5c00', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
              <strong>Downgrading to Entry calendar</strong> — your calendar will switch to single-person view.
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
              calendar === 'multi' ? 'Calendar Multi-staff' : 'Calendar Entry',
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
