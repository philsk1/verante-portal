import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePreview } from '../context/PreviewContext'
import { supabase } from '../supabase'

const OWNER_EMAIL = 'finsolsoffice@gmail.com'

const TIER_STYLE = {
  free:         { label: 'Free',         color: '#888',    bg: '#f0f0f0' },
  light:        { label: 'Light',        color: '#5e3b87', bg: '#ede8f5' },
  standard:     { label: 'Standard',     color: '#1e7a4a', bg: '#e6f5ee' },
  professional: { label: 'Professional', color: '#b07a00', bg: '#fef3d9' },
  enterprise:   { label: 'Enterprise',   color: '#1e3a8a', bg: '#dbeafe' },
  bespoke:      { label: 'Bespoke',      color: '#78460a', bg: '#fef3c7' },
}

const TierBadge = ({ tier }) => {
  const t = TIER_STYLE[tier] || TIER_STYLE.light
  return (
    <span style={{ display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700, background: t.bg, color: t.color, letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 }}>
      {t.label}
    </span>
  )
}

const Dot = ({ on, color = '#3db87a' }) => (
  <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: on ? color : '#e0e0e0', marginRight: '0.35rem', flexShrink: 0 }} />
)

const BulletRow = ({ on, label, detail }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.76rem', color: on ? '#1a1a1a' : '#bbb' }}>
    <Dot on={on} />
    <span>{label}</span>
    {detail && on && <span style={{ color: '#888', fontSize: '0.7rem' }}>— {detail}</span>}
  </div>
)

const TRIAGE_LABEL = { strict: 'Strict', balanced: 'Balanced', open: 'Relaxed', aggressive: 'Aggressive' }
const OUTCOME_LABEL = { booking: 'Booking', callback: 'Callback', quote: 'Quote', enquiry: 'Enquiry' }
const CALENDAR_LABEL = { entry: 'Single calendar', multi: 'Multi-staff calendar', none: 'No calendar' }

const TIER_RANK = { free: 0, light: 1, standard: 2, professional: 3, enterprise: 4, bespoke: 5 }

function productScore(t) {
  let s = (TIER_RANK[t.subscription_tier] || 0) * 2
  if (t.listen_tier && t.listen_tier !== 'none') s += 2
  if (t.calendar_tier === 'multi') s += 1
  if (t.sentry_tier && t.sentry_tier !== 'none') s += 2
  if (t.triage_mode) s += 1
  if (t.business_outcome_type) s += 1
  return s
}

function qMood(score) {
  if (score >= 12) return 'smile'
  if (score >= 7)  return 'content'
  if (score >= 4)  return 'sad'
  return 'crying'
}

const OwnerSelector = () => {
  const { user, signOut } = useAuth()
  const preview = usePreview()
  const navigate = useNavigate()
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState('az')

  useEffect(() => {
    if (!user) return
    if (user.email !== OWNER_EMAIL) { navigate('/portal', { replace: true }); return }

    fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: user.email }),
    })
      .then(r => r.json())
      .then(d => { setTenants(d.tenants || []); setLoading(false) })
      .catch(() => { setError('Could not load tenants'); setLoading(false) })
  }, [user])

  const select = (tenant, tab = '') => {
    const tabParam = tab ? `&tab=${tab}` : ''
    navigate(`/portal?ownerPreview=${tenant.id}&ownerName=${encodeURIComponent(tenant.business_name)}${tabParam}`)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const sorted = [...tenants].sort((a, b) => {
    if (sortBy === 'tier') return (TIER_RANK[b.subscription_tier] || 0) - (TIER_RANK[a.subscription_tier] || 0)
    if (sortBy === 'products') return productScore(b) - productScore(a)
    return a.business_name.localeCompare(b.business_name)
  })

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f9', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: '#5e3b87', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: 'white', fontSize: '1.125rem', letterSpacing: '-0.01em' }}>Qerxel</span>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f0a500', display: 'inline-block', marginBottom: 8, flexShrink: 0 }} />
          <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', borderRadius: '4px', padding: '0.2rem 0.5rem', fontWeight: 500, letterSpacing: '0.03em' }}>Owner</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a
            href="/owner/audit"
            style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}
            onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.9)'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.55)'}
          >
            DB Audit →
          </a>
          <button
            onClick={handleSignOut}
            style={{ padding: '0.375rem 0.85rem', border: '1px solid rgba(255,255,255,0.22)', borderRadius: '6px', background: 'transparent', color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '2.5rem 2rem' }}>

        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: '#1a1a1a', margin: '0 0 0.4rem' }}>
              Select a tenant
            </h1>
            <p style={{ color: '#888', fontSize: '0.875rem', margin: 0 }}>
              {tenants.length} account{tenants.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {[
              { key: 'az',       label: 'A–Z' },
              { key: 'tier',     label: 'By tier' },
              { key: 'products', label: 'By products' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                style={{
                  padding: '0.35rem 0.75rem', border: 'none', borderRadius: 6, cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', fontWeight: 500,
                  background: sortBy === opt.key ? '#5e3b87' : 'white',
                  color: sortBy === opt.key ? 'white' : '#666',
                  boxShadow: '0 1px 3px rgba(94,59,135,0.1)',
                  transition: 'background 0.12s, color 0.12s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div style={{ color: '#aaa', fontSize: '0.875rem' }}>Loading accounts…</div>
        )}
        {error && (
          <div style={{ color: '#c0392b', fontSize: '0.875rem' }}>{error}</div>
        )}

        {!loading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {sorted.map(t => {
              const mood = qMood(productScore(t))
              return (
              <div
                key={t.id}
                style={{
                  background: 'white', border: '0.5px solid rgba(94,59,135,0.12)', borderRadius: '12px',
                  cursor: 'pointer', textAlign: 'left',
                  boxShadow: '0 2px 8px rgba(94,59,135,0.04)', transition: 'box-shadow 0.15s, border-color 0.15s',
                  fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(94,59,135,0.12)'; e.currentTarget.style.borderColor = 'rgba(94,59,135,0.28)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(94,59,135,0.04)'; e.currentTarget.style.borderColor = 'rgba(94,59,135,0.12)' }}
              >
                {/* Card body — click to open portal */}
                <div onClick={() => select(t)} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
                {/* Name + tier + Q mood */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                    <img src={`/qmood/${mood}.svg`} alt="Q" style={{ width: 28, height: 28, flexShrink: 0, objectFit: 'contain' }} />
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1a1a1a', lineHeight: 1.25 }}>
                      {t.business_name}
                    </div>
                  </div>
                  <TierBadge tier={t.subscription_tier} />
                </div>

                {/* Feature bullets */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', borderTop: '1px solid rgba(94,59,135,0.06)', paddingTop: '0.75rem' }}>
                  <BulletRow
                    on={t.listen_tier && t.listen_tier !== 'none'}
                    label="Listen"
                    detail={t.listen_tier !== 'none' ? t.listen_tier : null}
                  />
                  <BulletRow
                    on={t.calendar_tier && t.calendar_tier !== 'none'}
                    label="Schedule"
                    detail={CALENDAR_LABEL[t.calendar_tier] || t.calendar_tier}
                  />
                  <BulletRow
                    on={!!t.provisional_booking_enabled}
                    label="Provisional booking"
                  />
                  <BulletRow
                    on={!!t.sms_followup_enabled}
                    label="SMS follow-up"
                  />
                  <BulletRow
                    on={!!t.spam_filter_enabled}
                    label="Spam filter"
                  />
                </div>

                {/* Mode row */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid rgba(94,59,135,0.06)', paddingTop: '0.6rem' }}>
                  {t.triage_mode && (
                    <span style={{ fontSize: '0.68rem', color: '#5e3b87', background: '#ede8f5', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 500 }}>
                      {TRIAGE_LABEL[t.triage_mode] || t.triage_mode} triage
                    </span>
                  )}
                  {t.business_outcome_type && (
                    <span style={{ fontSize: '0.68rem', color: '#78460a', background: '#fef3c7', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 500 }}>
                      {OUTCOME_LABEL[t.business_outcome_type] || t.business_outcome_type} goal
                    </span>
                  )}
                  {t.billing_model === 'payg' && (
                    <span style={{ fontSize: '0.68rem', color: '#1e7a4a', background: '#e6f5ee', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 500 }}>
                      PAYG
                    </span>
                  )}
                  {t.is_demo && (
                    <span style={{ fontSize: '0.68rem', color: '#888', background: '#f0f0f0', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 500 }}>
                      demo
                    </span>
                  )}
                </div>
                </div>

                {/* Quick-access row */}
                <div style={{ display: 'flex', borderTop: '1px solid rgba(94,59,135,0.06)', background: '#faf9fc' }}>
                  {[
                    { label: 'Dashboard',   tab: '' },
                    { label: 'AI Settings', tab: 'ai' },
                    { label: 'Calendar',    tab: 'calendar' },
                  ].map((link, i, arr) => (
                    <button
                      key={link.tab}
                      onClick={e => { e.stopPropagation(); select(t, link.tab) }}
                      style={{
                        flex: 1, padding: '0.5rem 0.25rem', border: 'none',
                        borderRight: i < arr.length - 1 ? '1px solid rgba(94,59,135,0.06)' : 'none',
                        background: 'transparent', cursor: 'pointer',
                        fontSize: '0.72rem', color: '#888', fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                        transition: 'background 0.1s, color 0.1s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f0ebf8'; e.currentTarget.style.color = '#5e3b87' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#888' }}
                    >
                      {link.label} →
                    </button>
                  ))}
                </div>
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  )
}

export default OwnerSelector
