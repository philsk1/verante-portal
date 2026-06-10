import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const TIER_STYLE = {
  light:        { label: 'Light',        color: '#666',    bg: '#f0f0f0' },
  standard:     { label: 'Standard',     color: '#5e3b87', bg: '#ede8f5' },
  professional: { label: 'Professional', color: '#b07a00', bg: '#fef3d9' },
  enterprise:   { label: 'Enterprise',   color: '#1e7a4a', bg: '#e6f5ee' },
}

const PRODUCT_DOT = { answer: '#f0a500', listen: '#3db87a', schedule: '#60a5fa' }

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
    color: dim ? '#bbb' : '#333', opacity: dim ? 0.65 : 1,
  }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: dim ? '#ccc' : dot, flexShrink: 0 }} />
    {label}
  </span>
)

// ─── Experiences ──────────────────────────────────────────────────────────────

const EXPERIENCES = [
  // ── Schedule only ──────────────────────────────────────────────────────────
  {
    exp: 'schedule-basic',
    title: 'Schedule — Solo',
    subtitle: 'Single calendar · Always free',
    description: 'One person, one calendar. Client-facing booking page, appointment management, reminders.',
    accent: '#60a5fa',
    chips: [{ label: 'Schedule', dot: '#60a5fa' }],
    locked: ['Team', 'Answer', 'Listen'],
    tag: 'Schedule only', tagColor: '#1d4ed8', tagBg: '#dbeafe',
  },
  {
    exp: 'schedule-multi',
    title: 'Schedule — Multi-Staff',
    subtitle: 'Team calendar · £5/mo + £2/person',
    description: 'Full team view. Each staff member gets their own booking page and availability. Great for clinics, salons, studios.',
    accent: '#60a5fa',
    chips: [{ label: 'Schedule', dot: '#60a5fa' }, { label: 'Team', dot: '#60a5fa' }],
    locked: ['Answer', 'Listen'],
    tag: 'Schedule only', tagColor: '#1d4ed8', tagBg: '#dbeafe',
  },
  {
    exp: 'schedule-listen',
    title: 'Schedule + Live Copilot',
    subtitle: 'Team calendar + Listen · ~£15/mo',
    description: 'Multi-staff calendar with Listen active. When a client calls to book, Listen surfaces their history and available slots on screen.',
    accent: '#3db87a',
    chips: [{ label: 'Schedule', dot: '#60a5fa' }, { label: 'Team', dot: '#60a5fa' }, { label: 'Listen', dot: '#3db87a' }],
    locked: ['Answer'],
    tag: 'Schedule + Listen', tagColor: '#065f46', tagBg: '#d1fae5',
  },

  // ── Answer ─────────────────────────────────────────────────────────────────
  {
    exp: 'answer',
    title: 'Answer — Solo',
    subtitle: 'AI call handling · from £29/mo',
    description: 'AI answers missed calls, captures leads, routes to callback or booking. Free single calendar included.',
    accent: '#f0a500',
    chips: [{ label: 'Answer', dot: '#f0a500' }, { label: 'Schedule', dot: '#60a5fa', dim: true }],
    locked: ['Listen', 'Team'],
    tag: 'Answer only', tagColor: '#92400e', tagBg: '#fef3c7',
  },
  {
    exp: 'answer-schedule-multi',
    title: 'Answer + Team',
    subtitle: 'AI + multi-staff calendar · from £34/mo',
    description: 'AI handles missed calls while your team manages their own diaries. Every staff member bookable directly.',
    accent: '#f0a500',
    chips: [{ label: 'Answer', dot: '#f0a500' }, { label: 'Schedule', dot: '#60a5fa' }, { label: 'Team', dot: '#60a5fa' }],
    locked: ['Listen'],
    tag: 'Answer + Schedule', tagColor: '#92400e', tagBg: '#fef3c7',
  },

  // ── Answer + Listen ────────────────────────────────────────────────────────
  {
    exp: 'answer-listen',
    title: 'Answer + Listen',
    subtitle: 'AI + live copilot · ~£39/mo',
    description: 'AI answers when you\'re busy. When you pick up yourself, Listen shows customer history and context in real time. Single calendar included.',
    accent: '#3db87a',
    chips: [{ label: 'Answer', dot: '#f0a500' }, { label: 'Listen', dot: '#3db87a' }, { label: 'Schedule', dot: '#60a5fa', dim: true }],
    locked: ['Team'],
    tag: 'Answer + Listen', tagColor: '#065f46', tagBg: '#d1fae5',
  },
  {
    exp: 'answer-listen-schedule-multi',
    title: 'Answer + Listen + Team',
    subtitle: 'Everything · from £44/mo',
    description: 'Full AI call handling, live copilot when you answer yourself, and a complete multi-staff booking system. Nothing missed, nothing forgotten.',
    accent: '#3db87a',
    chips: [{ label: 'Answer', dot: '#f0a500' }, { label: 'Listen', dot: '#3db87a' }, { label: 'Schedule', dot: '#60a5fa' }, { label: 'Team', dot: '#60a5fa' }],
    locked: [],
    tag: 'Full suite', tagColor: '#065f46', tagBg: '#d1fae5',
  },

  // ── Edge cases ────────────────────────────────────────────────────────────
  {
    exp: 'answer',
    title: 'Answer — Light Tier',
    subtitle: '120 min/mo · £29/mo · Entry-level buyer',
    description: 'The minimum viable Qerxel. A sole trader who just wants missed calls answered and leads captured. No extras.',
    accent: '#f0a500',
    chips: [{ label: 'Answer', dot: '#f0a500' }],
    locked: ['Listen', 'Team', 'Schedule+'],
    tag: 'Light tier', tagColor: '#555', tagBg: '#f0f0f0',
  },
  {
    exp: 'answer-schedule-multi',
    title: 'Answer — Professional Tier',
    subtitle: '450 min/mo · £69/mo · Growing business',
    description: 'A busier practice — physio clinic, legal firm, mortgage broker — who needs full team scheduling alongside AI call handling.',
    accent: '#b07a00',
    chips: [{ label: 'Answer', dot: '#f0a500' }, { label: 'Schedule', dot: '#60a5fa' }, { label: 'Team', dot: '#60a5fa' }],
    locked: ['Listen'],
    tag: 'Professional tier', tagColor: '#b07a00', tagBg: '#fef3d9',
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

const BusinessSelector = () => {
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [view, setView] = useState('businesses')
  const navigate = useNavigate()

  useEffect(() => {
    supabase
      .from('tenants')
      .select('id, business_name, subscription_tier, credit_balance_months, included_minutes, triage_mode')
      .eq('is_demo', true)
      .order('subscription_tier', { ascending: true })
      .then(({ data, error }) => {
        if (error) setLoadError(error.message)
        setBusinesses(data || [])
        setLoading(false)
      })
  }, [])

  const session = JSON.parse(localStorage.getItem('demo_session') || '{}')
  const sourceId = businesses[0]?.id
  const sourceName = businesses[0]?.business_name || 'Demo Business'

  const TabBtn = ({ id, label }) => (
    <button
      onClick={() => setView(id)}
      style={{
        padding: '0.45rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 500,
        cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
        border: view === id ? 'none' : '1px solid rgba(94,59,135,0.2)',
        background: view === id ? '#5e3b87' : 'white',
        color: view === id ? 'white' : '#5e3b87',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )

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
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '2.5rem 2rem' }}>

        {/* Title + view switcher */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: '#1a1a1a', margin: '0 0 0.4rem' }}>
              {view === 'businesses' ? 'Demo businesses' : 'Product experience explorer'}
            </h1>
            <p style={{ color: '#888', fontSize: '0.875rem', margin: 0, lineHeight: 1.55 }}>
              {view === 'businesses'
                ? 'Each business reflects their actual tier and purchased products.'
                : 'Pick a buyer scenario to see exactly what their portal looks like.'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <TabBtn id="businesses" label="By Business" />
            <TabBtn id="experiences" label="By Experience" />
            <button
              onClick={() => navigate('/demo/performance')}
              style={{ padding: '0.45rem 0.9rem', background: 'white', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '6px', color: '#5e3b87', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >
              Overview →
            </button>
          </div>
        </div>

        {/* ── Businesses grid ────────────────────────────────────────── */}
        {view === 'businesses' && (
          loading ? (
            <div style={{ color: '#aaa', fontSize: '0.875rem' }}>Loading businesses…</div>
          ) : loadError ? (
            <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: '8px', padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#991b1b' }}>
              Could not load businesses: {loadError}
            </div>
          ) : businesses.length === 0 ? (
            <div style={{ color: '#aaa', fontSize: '0.875rem' }}>No demo businesses found. Make sure tenants have <code>is_demo = true</code> set in the database.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              {businesses.map(biz => {
                const { hasListen, hasPaidSchedule } = getProducts(biz.subscription_tier, null)
                return (
                  <button
                    key={biz.id}
                    onClick={() => navigate(`/portal?ownerPreview=${biz.id}&ownerName=${encodeURIComponent(biz.business_name)}`)}
                    style={{ background: 'white', border: '0.5px solid rgba(94,59,135,0.12)', borderRadius: '12px', padding: '1.5rem', cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 8px rgba(94,59,135,0.04)', transition: 'box-shadow 0.15s, border-color 0.15s', fontFamily: "'DM Sans', sans-serif" }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(94,59,135,0.12)'; e.currentTarget.style.borderColor = 'rgba(94,59,135,0.25)' }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(94,59,135,0.04)'; e.currentTarget.style.borderColor = 'rgba(94,59,135,0.12)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.0625rem', color: '#1a1a1a', lineHeight: 1.25, marginRight: '0.75rem' }}>
                        {biz.business_name}
                      </div>
                      <TierBadge tier={biz.subscription_tier} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                      <ProductChip label="Answer" dot={PRODUCT_DOT.answer} />
                      {hasListen
                        ? <ProductChip label="Listen" dot={PRODUCT_DOT.listen} />
                        : <ProductChip label="Listen" dot={PRODUCT_DOT.listen} dim />
                      }
                      <ProductChip label={hasPaidSchedule ? 'Schedule +' : 'Schedule'} dot={PRODUCT_DOT.schedule} dim={!hasPaidSchedule} />
                    </div>
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

        {/* ── Experiences grid ───────────────────────────────────────── */}
        {view === 'experiences' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {EXPERIENCES.map((ex, i) => (
              <button
                key={i}
                onClick={() => {
                  const url = sourceId
                    ? `/portal?ownerPreview=${sourceId}&ownerName=${encodeURIComponent(sourceName)}&exp=${ex.exp}`
                    : `/portal?exp=${ex.exp}`
                  navigate(url)
                }}
                style={{
                  background: 'white', border: '0.5px solid rgba(94,59,135,0.12)',
                  borderLeft: `3px solid ${ex.accent}`,
                  borderRadius: '10px', padding: '1.25rem',
                  cursor: 'pointer', textAlign: 'left',
                  boxShadow: '0 2px 8px rgba(94,59,135,0.04)', transition: 'box-shadow 0.15s, border-color 0.15s',
                  fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', gap: '0.65rem',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 18px rgba(94,59,135,0.12)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(94,59,135,0.04)' }}
              >
                <div>
                  <span style={{ display: 'inline-block', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '0.14rem 0.42rem', borderRadius: '3px', background: ex.tagBg, color: ex.tagColor, marginBottom: '0.45rem' }}>
                    {ex.tag}
                  </span>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.9625rem', color: '#1a1a1a', lineHeight: 1.25 }}>
                    {ex.title}
                  </div>
                  <div style={{ fontSize: '0.73rem', color: '#888', marginTop: '0.18rem' }}>{ex.subtitle}</div>
                </div>

                <div style={{ fontSize: '0.76rem', color: '#555', lineHeight: 1.5 }}>{ex.description}</div>

                <div style={{ display: 'flex', gap: '0.28rem', flexWrap: 'wrap' }}>
                  {ex.chips.map(c => <ProductChip key={c.label} label={c.label} dot={c.dot} dim={c.dim} />)}
                  {ex.locked.map(l => (
                    <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.22rem', padding: '0.15rem 0.42rem', borderRadius: '4px', fontSize: '0.67rem', fontWeight: 600, background: '#f4f4f6', border: '1px solid #e8e8e8', color: '#bbb' }}>
                      <span style={{ fontSize: '0.58rem' }}>🔒</span>{l}
                    </span>
                  ))}
                </div>

                <div style={{ fontSize: '0.76rem', color: ex.accent, fontWeight: 600 }}>
                  Explore →
                </div>
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

export default BusinessSelector
