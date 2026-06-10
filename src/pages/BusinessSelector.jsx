import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const TIER_STYLE = {
  light:        { label: 'Light',        color: '#666',    bg: '#f0f0f0' },
  standard:     { label: 'Standard',     color: '#5e3b87', bg: '#ede8f5' },
  professional: { label: 'Professional', color: '#b07a00', bg: '#fef3d9' },
  enterprise:   { label: 'Enterprise',   color: '#1e7a4a', bg: '#e6f5ee' },
}

const PRODUCT_DOT = {
  answer:   '#f0a500',
  listen:   '#3db87a',
  schedule: '#60a5fa',
}

const TierBadge = ({ tier }) => {
  const t = TIER_STYLE[tier] || TIER_STYLE.standard
  return (
    <span style={{ display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600', background: t.bg, color: t.color, letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 }}>
      {t.label}
    </span>
  )
}

const getProducts = (tier, listenTier) => {
  const hasListen = (listenTier && listenTier !== 'none') || ['enterprise', 'bespoke'].includes(tier)
  const hasPaidSchedule = ['professional', 'enterprise', 'bespoke'].includes(tier)
  return { hasListen, hasPaidSchedule }
}

const ProductChip = ({ label, dot, dim }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
    padding: '0.18rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
    background: dim ? '#f4f4f6' : 'rgba(255,255,255,0.9)',
    border: `1px solid ${dim ? '#e0e0e0' : dot + '44'}`,
    color: dim ? '#bbb' : '#333',
    opacity: dim ? 0.65 : 1,
  }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: dim ? '#ccc' : dot, flexShrink: 0 }} />
    {label}
  </span>
)

// ─── Experience combination definitions ───────────────────────────────────────

const EXPERIENCES = [
  {
    exp: 'schedule-basic',
    title: 'Schedule — Solo',
    subtitle: 'Single calendar · Always free',
    description: 'One person, one calendar. Booking page, appointment management, client history.',
    accent: '#60a5fa',
    chips: [
      { label: 'Schedule', dot: '#60a5fa' },
    ],
    locked: [],
    tag: 'Schedule only',
    tagColor: '#1d4ed8',
    tagBg: '#dbeafe',
  },
  {
    exp: 'schedule-multi',
    title: 'Schedule — Multi-Staff',
    subtitle: 'Team calendar · £5/mo + £2/person',
    description: 'Full team view, staff-specific booking pages, availability management, shared calendar.',
    accent: '#60a5fa',
    chips: [
      { label: 'Schedule', dot: '#60a5fa' },
      { label: 'Team', dot: '#60a5fa' },
    ],
    locked: [],
    tag: 'Schedule only',
    tagColor: '#1d4ed8',
    tagBg: '#dbeafe',
  },
  {
    exp: 'answer',
    title: 'Answer — Solo',
    subtitle: 'AI call handling · from £29/mo',
    description: 'AI answers missed calls, captures leads, routes to callback or booking. Free calendar included.',
    accent: '#f0a500',
    chips: [
      { label: 'Answer', dot: '#f0a500' },
      { label: 'Schedule', dot: '#60a5fa', dim: true },
    ],
    locked: ['Listen', 'Team'],
    tag: 'Answer only',
    tagColor: '#92400e',
    tagBg: '#fef3c7',
  },
  {
    exp: 'answer-schedule-multi',
    title: 'Answer + Multi-Staff',
    subtitle: 'AI + full team calendar · from £34/mo',
    description: 'AI call handling with team scheduling. Every staff member gets their own booking page.',
    accent: '#f0a500',
    chips: [
      { label: 'Answer', dot: '#f0a500' },
      { label: 'Schedule', dot: '#60a5fa' },
      { label: 'Team', dot: '#60a5fa' },
    ],
    locked: ['Listen'],
    tag: 'Answer + Schedule',
    tagColor: '#92400e',
    tagBg: '#fef3c7',
  },
  {
    exp: 'answer-listen',
    title: 'Answer + Listen',
    subtitle: 'AI + live copilot · ~£39/mo',
    description: 'AI answers when you can\'t. When you pick up, Listen surfaces context on screen in real time.',
    accent: '#3db87a',
    chips: [
      { label: 'Answer', dot: '#f0a500' },
      { label: 'Listen', dot: '#3db87a' },
      { label: 'Schedule', dot: '#60a5fa', dim: true },
    ],
    locked: ['Team'],
    tag: 'Answer + Listen',
    tagColor: '#065f46',
    tagBg: '#d1fae5',
  },
  {
    exp: 'answer-listen-schedule-multi',
    title: 'Full Suite',
    subtitle: 'Everything · from £44/mo',
    description: 'AI answers calls, Listen copilot when you pick up, full team scheduling. Nothing missed.',
    accent: '#3db87a',
    chips: [
      { label: 'Answer', dot: '#f0a500' },
      { label: 'Listen', dot: '#3db87a' },
      { label: 'Schedule', dot: '#60a5fa' },
      { label: 'Team', dot: '#60a5fa' },
    ],
    locked: [],
    tag: 'Full suite',
    tagColor: '#065f46',
    tagBg: '#d1fae5',
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

const BusinessSelector = () => {
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('experiences')
  const navigate = useNavigate()

  useEffect(() => {
    supabase
      .from('tenants')
      .select('id, business_name, subscription_tier, listen_tier, credit_balance_months, included_minutes, triage_mode')
      .eq('is_demo', true)
      .order('subscription_tier', { ascending: true })
      .then(({ data }) => {
        setBusinesses(data || [])
        setLoading(false)
      })
  }, [])

  const session = JSON.parse(localStorage.getItem('demo_session') || '{}')

  // Use first loaded business as the data source for experience previews
  const sourceId = businesses[0]?.id
  const sourceName = businesses[0]?.business_name || 'Demo Business'

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f9', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: '#5e3b87', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: 'white', fontSize: '1.125rem', letterSpacing: '-0.01em' }}>Qerxel</span>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f0a500', display: 'inline-block', marginLeft: 3, marginBottom: 8, flexShrink: 0 }} />
          <span style={{ marginLeft: '0.75rem', fontSize: '0.7rem', background: '#f0a500', color: '#1a0533', borderRadius: '4px', padding: '0.2rem 0.5rem', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Demo</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>{session.name || session.email}</span>
          <button
            onClick={() => { localStorage.removeItem('demo_session'); navigate('/demo/login') }}
            style={{ padding: '0.375rem 0.85rem', border: '1px solid rgba(255,255,255,0.22)', borderRadius: '6px', background: 'transparent', color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2.5rem 2rem' }}>

        {/* Title + view switcher */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: '#1a1a1a', margin: '0 0 0.4rem' }}>
              {view === 'experiences' ? 'Explore product experiences' : 'Demo businesses'}
            </h1>
            <p style={{ color: '#888', fontSize: '0.875rem', margin: 0, lineHeight: 1.55 }}>
              {view === 'experiences'
                ? 'Click any combination to see exactly what that buyer\'s portal looks like.'
                : 'Each business reflects their actual subscription tier and purchased products.'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <button
              onClick={() => setView('experiences')}
              style={{ padding: '0.45rem 0.9rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", border: view === 'experiences' ? 'none' : '1px solid rgba(94,59,135,0.2)', background: view === 'experiences' ? '#5e3b87' : 'white', color: view === 'experiences' ? 'white' : '#5e3b87', transition: 'all 0.15s' }}
            >
              By Experience
            </button>
            <button
              onClick={() => setView('businesses')}
              style={{ padding: '0.45rem 0.9rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", border: view === 'businesses' ? 'none' : '1px solid rgba(94,59,135,0.2)', background: view === 'businesses' ? '#5e3b87' : 'white', color: view === 'businesses' ? 'white' : '#5e3b87', transition: 'all 0.15s' }}
            >
              By Business
            </button>
            <button
              onClick={() => navigate('/demo/performance')}
              style={{ padding: '0.45rem 0.9rem', background: 'white', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '6px', color: '#5e3b87', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >
              Overview →
            </button>
          </div>
        </div>

        {/* ── Experiences grid ───────────────────────────────────────── */}
        {view === 'experiences' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {EXPERIENCES.map(ex => (
              <button
                key={ex.exp}
                onClick={() => sourceId && navigate(`/portal?ownerPreview=${sourceId}&ownerName=${encodeURIComponent(sourceName)}&exp=${ex.exp}`)}
                disabled={!sourceId}
                style={{
                  background: 'white',
                  border: '0.5px solid rgba(94,59,135,0.12)',
                  borderLeft: `3px solid ${ex.accent}`,
                  borderRadius: '10px',
                  padding: '1.35rem',
                  cursor: sourceId ? 'pointer' : 'default',
                  textAlign: 'left',
                  boxShadow: '0 2px 8px rgba(94,59,135,0.04)',
                  transition: 'box-shadow 0.15s, border-color 0.15s',
                  fontFamily: "'DM Sans', sans-serif",
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.7rem',
                }}
                onMouseEnter={e => { if (sourceId) { e.currentTarget.style.boxShadow = '0 4px 18px rgba(94,59,135,0.12)'; e.currentTarget.style.borderColor = 'rgba(94,59,135,0.22)' } }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(94,59,135,0.04)'; e.currentTarget.style.borderColor = 'rgba(94,59,135,0.12)' }}
              >
                {/* Tag + title */}
                <div>
                  <span style={{ display: 'inline-block', fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '0.15rem 0.45rem', borderRadius: '3px', background: ex.tagBg, color: ex.tagColor, marginBottom: '0.5rem' }}>
                    {ex.tag}
                  </span>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1a1a1a', lineHeight: 1.25 }}>
                    {ex.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' }}>
                    {ex.subtitle}
                  </div>
                </div>

                {/* Description */}
                <div style={{ fontSize: '0.78rem', color: '#555', lineHeight: 1.5 }}>
                  {ex.description}
                </div>

                {/* Product chips */}
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {ex.chips.map(c => (
                    <ProductChip key={c.label} label={c.label} dot={c.dot} dim={c.dim} />
                  ))}
                  {ex.locked.map(l => (
                    <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.18rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600, background: '#f4f4f6', border: '1px solid #e8e8e8', color: '#bbb' }}>
                      <span style={{ fontSize: '0.6rem' }}>🔒</span>{l}
                    </span>
                  ))}
                </div>

                <div style={{ fontSize: '0.78rem', color: ex.accent, fontWeight: 600, marginTop: '0.1rem' }}>
                  Explore this experience →
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── Businesses grid ────────────────────────────────────────── */}
        {view === 'businesses' && (
          loading ? (
            <div style={{ color: '#aaa', fontSize: '0.875rem' }}>Loading businesses…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              {businesses.map(biz => {
                const { hasListen, hasPaidSchedule } = getProducts(biz.subscription_tier, biz.listen_tier)
                return (
                  <button
                    key={biz.id}
                    onClick={() => navigate(`/portal?ownerPreview=${biz.id}&ownerName=${encodeURIComponent(biz.business_name)}`)}
                    style={{ background: 'white', border: '0.5px solid rgba(94,59,135,0.12)', borderRadius: '12px', padding: '1.5rem', cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 8px rgba(94,59,135,0.04)', transition: 'box-shadow 0.15s, border-color 0.15s', fontFamily: "'DM Sans', sans-serif" }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(94,59,135,0.12)'; e.currentTarget.style.borderColor = 'rgba(94,59,135,0.25)' }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(94,59,135,0.04)'; e.currentTarget.style.borderColor = 'rgba(94,59,135,0.12)' }}
                  >
                    {/* Name + tier */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.0625rem', color: '#1a1a1a', lineHeight: 1.25, marginRight: '0.75rem' }}>
                        {biz.business_name}
                      </div>
                      <TierBadge tier={biz.subscription_tier} />
                    </div>

                    {/* Product chips */}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                      <ProductChip label="Answer" dot={PRODUCT_DOT.answer} />
                      {hasListen
                        ? <ProductChip label="Listen" dot={PRODUCT_DOT.listen} />
                        : <ProductChip label="Listen" dot={PRODUCT_DOT.listen} dim />
                      }
                      <ProductChip label={hasPaidSchedule ? 'Schedule +' : 'Schedule'} dot={PRODUCT_DOT.schedule} dim={!hasPaidSchedule} />
                    </div>

                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: '1.5rem', borderTop: '1px solid rgba(94,59,135,0.06)', paddingTop: '0.85rem' }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.2rem' }}>Minutes/mo</div>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#5e3b87' }}>{biz.included_minutes}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.2rem' }}>Credits</div>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#f0a500' }}>{biz.credit_balance_months || 0}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '0.8rem', color: '#5e3b87', fontWeight: '500' }}>Select →</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )
        )}

      </div>
    </div>
  )
}

export default BusinessSelector
