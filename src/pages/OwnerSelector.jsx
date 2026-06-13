import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { qScore, qMoodFromScore } from '../utils/qScore.js'

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

const SEV_STYLE = {
  critical: { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444' },
  warning:  { bg: '#fef9c3', color: '#854d0e', dot: '#f59e0b' },
  info:     { bg: '#eff6ff', color: '#1d4ed8', dot: '#60a5fa' },
}

const LandscapeStrip = ({ landscape }) => {
  if (!landscape) return null
  const { calls30d, leadRate, upcoming, issues = [] } = landscape
  return (
    <div style={{ borderTop: '1px solid rgba(94,59,135,0.06)', paddingTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: '#555' }}>
        <span><span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#1a1a1a', fontSize: '0.82rem' }}>{calls30d ?? '—'}</span> calls/30d</span>
        <span style={{ color: '#ccc' }}>·</span>
        <span><span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#1a1a1a', fontSize: '0.82rem' }}>{leadRate != null ? `${Math.round(leadRate * 100)}%` : '—'}</span> lead rate</span>
        <span style={{ color: '#ccc' }}>·</span>
        <span><span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#1a1a1a', fontSize: '0.82rem' }}>{upcoming ?? '—'}</span> upcoming</span>
      </div>
      {/* Issue flags */}
      {issues.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
          {issues.map((iss, i) => {
            const s = SEV_STYLE[iss.severity] || SEV_STYLE.info
            return (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.28rem', fontSize: '0.635rem', fontWeight: 600, background: s.bg, color: s.color, borderRadius: '4px', padding: '0.18rem 0.42rem', letterSpacing: '0.01em' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, flexShrink: 0, display: 'inline-block' }} />
                {iss.label}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

const OwnerSelector = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('name')

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
    const tabParam = tab ? `&ownerTab=${tab}` : ''
    navigate(`/portal?ownerPreview=${tenant.id}&ownerName=${encodeURIComponent(tenant.business_name)}${tabParam}`)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleSort = (field) => {
    setSort(prev => {
      if (prev.field !== field) return { field, dir: 'desc' }
      if (prev.dir === 'desc') return { field, dir: 'asc' }
      return { field: null, dir: 'desc' }
    })
  }

  const sorted = [...tenants].sort((a, b) => {
    if (!sort.field) return a.business_name.localeCompare(b.business_name)
    const va = getSortVal(a, sort.field)
    const vb = getSortVal(b, sort.field)
    const diff = sort.field === 'az' ? va.localeCompare(vb) : (va < vb ? -1 : va > vb ? 1 : 0)
    return sort.dir === 'desc' ? -diff : diff
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
            href="/demo"
            target="_blank"
            rel="noopener noreferrer"
            style={{ padding: '0.35rem 0.85rem', border: '1px solid #f0a500', borderRadius: '6px', background: 'rgba(240,165,0,0.12)', color: '#f0a500', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none', letterSpacing: '0.01em' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(240,165,0,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(240,165,0,0.12)'}
          >
            ▶ Prospect demo
          </a>
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

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.9rem' }}>
            <div>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: '#1a1a1a', margin: '0 0 0.2rem' }}>Select a tenant</h1>
              <p style={{ color: '#888', fontSize: '0.8rem', margin: 0 }}>{tenants.length} accounts · click to open portal</p>
            </div>
            {/* Sort controls */}
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {[
                { id: 'name',       label: 'A–Z' },
                { id: 'q_asc',      label: 'Q score ↑' },
                { id: 'q_desc',     label: 'Q score ↓' },
                { id: 'calls_desc', label: 'Most active' },
                { id: 'tier',       label: 'Tier' },
              ].map(opt => (
                <button key={opt.id} onClick={() => setSort(opt.id)} style={{
                  padding: '0.3rem 0.7rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  fontSize: '0.72rem', fontWeight: sort === opt.id ? 700 : 400,
                  fontFamily: "'DM Sans', sans-serif",
                  background: sort === opt.id ? '#5e3b87' : 'white',
                  color: sort === opt.id ? 'white' : '#666',
                  boxShadow: sort === opt.id ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
                  transition: 'all 0.12s',
                }}>{opt.label}</button>
              ))}
            </div>
          </div>
          {/* Search */}
          <div style={{ position: 'relative', maxWidth: 420 }}>
            <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search name, tier, sms, listen, booking, demo…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '0.52rem 2rem 0.52rem 2rem',
                border: '1px solid rgba(94,59,135,0.2)', borderRadius: '8px',
                fontSize: '0.825rem', color: '#1a1a1a', outline: 'none',
                fontFamily: "'DM Sans', sans-serif", background: 'white',
                boxShadow: '0 1px 4px rgba(94,59,135,0.06)',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '1.1rem', lineHeight: 1, padding: 0 }}>×</button>
            )}
          </div>
        </div>

        {loading && (
          <div style={{ color: '#aaa', fontSize: '0.875rem' }}>Loading accounts…</div>
        )}
        {error && (
          <div style={{ color: '#c0392b', fontSize: '0.875rem' }}>{error}</div>
        )}

        {!loading && !error && (() => {
          const TIER_RANK = { free: 0, light: 1, standard: 2, professional: 3, enterprise: 4, bespoke: 5 }
          const q = search.trim().toLowerCase()

          // Pre-compute Q score for each tenant
          const withScores = tenants.map(t => {
            const score = qScore({ tenant: t, outcomeCounts: t.landscape?.outcomeCounts })
            return { ...t, _qScore: score, _qMood: qMoodFromScore(score) }
          })

          // Filter
          const filtered = q ? withScores.filter(t => {
            const haystack = [
              t.business_name,
              t.subscription_tier,
              t.triage_mode,
              t.business_outcome_type,
              t.billing_model,
              t.sms_followup_enabled ? 'sms sms-followup' : '',
              t.provisional_booking_enabled ? 'booking provisional' : '',
              t.listen_tier && t.listen_tier !== 'none' ? 'listen' : '',
              t.calendar_tier && t.calendar_tier !== 'none' ? 'calendar schedule' : '',
              t.spam_filter_enabled ? 'spam' : '',
              t.holiday_mode ? 'holiday paused' : '',
              t.is_demo ? 'demo' : '',
              ...(t.landscape?.issues || []).map(i => i.label),
            ].filter(Boolean).join(' ').toLowerCase()
            return haystack.includes(q)
          }) : [...withScores]

          // Sort
          const CALLS = t => t.landscape?.calls30d ?? 0
          filtered.sort((a, b) => {
            if (sort === 'name')       return (a.business_name || '').localeCompare(b.business_name || '')
            if (sort === 'q_asc')      return a._qScore - b._qScore
            if (sort === 'q_desc')     return b._qScore - a._qScore
            if (sort === 'calls_desc') return CALLS(b) - CALLS(a)
            if (sort === 'tier')       return (TIER_RANK[b.subscription_tier] || 0) - (TIER_RANK[a.subscription_tier] || 0)
            return 0
          })

          return (
          <>
          {filtered.length === 0 && (
            <div style={{ color: '#888', fontSize: '0.875rem', padding: '1rem 0' }}>
              No tenants match <strong>"{search}"</strong> — try name, tier (standard, professional), sms, listen, demo, holiday…
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {filtered.map(t => (
              <button
                key={t.id}
                onClick={() => select(t)}
                style={{
                  background: 'white', border: '0.5px solid rgba(94,59,135,0.12)', borderRadius: '12px',
                  cursor: 'pointer', textAlign: 'left', padding: '0.9rem 1rem',
                  boxShadow: '0 2px 8px rgba(94,59,135,0.04)', transition: 'box-shadow 0.15s, border-color 0.15s',
                  fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(94,59,135,0.12)'; e.currentTarget.style.borderColor = 'rgba(94,59,135,0.28)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(94,59,135,0.04)'; e.currentTarget.style.borderColor = 'rgba(94,59,135,0.12)' }}
              >
                {/* Name + Q score + tier */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1a1a1a', lineHeight: 1.25, flex: 1, minWidth: 0 }}>
                    {t.business_name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                    <img src={`/qmood/${t._qMood}.png`} alt="Q" style={{ width: 43, height: 43, objectFit: 'contain' }} />
                    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.82rem', color: '#1a1a1a', minWidth: '1.6rem', textAlign: 'right' }}>{t._qScore}</span>
                    <TierBadge tier={t.subscription_tier} />
                  </div>
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
                    on={t.sentry_camera_limit > 0}
                    label="Sentry"
                    detail={t.sentry_camera_limit > 0 ? `${t.sentry_camera_limit} camera${t.sentry_camera_limit !== 1 ? 's' : ''}` : null}
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

                {/* Landscape intel */}
                <LandscapeStrip landscape={t.landscape} />

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
                  <button
                    onClick={e => { e.stopPropagation(); select(t, 'ai') }}
                    style={{ fontSize: '0.68rem', color: '#5e3b87', background: 'transparent', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '4px', padding: '0.15rem 0.45rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginLeft: 'auto' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#ede8f5' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    AI Settings →
                  </button>
                </div>
              </button>
            ))}
          </div>
          </>
          )
        })()}
      </div>
    </div>
  )
}

export default OwnerSelector
