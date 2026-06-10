import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const TIER_STYLE = {
  light:        { label: 'Light',        color: '#666',    bg: '#f0f0f0' },
  standard:     { label: 'Standard',     color: '#5e3b87', bg: '#ede8f5' },
  professional: { label: 'Professional', color: '#b07a00', bg: '#fef3d9' },
  enterprise:   { label: 'Enterprise',   color: '#1e7a4a', bg: '#e6f5ee' },
}

const TierBadge = ({ tier }) => {
  const t = TIER_STYLE[tier] || TIER_STYLE.standard
  return (
    <span style={{ display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600', background: t.bg, color: t.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      {t.label}
    </span>
  )
}

const BusinessSelector = () => {
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    supabase
      .from('tenants')
      .select('id, business_name, subscription_tier, credit_balance_months, included_minutes, triage_mode')
      .eq('is_demo', true)
      .order('subscription_tier', { ascending: true })
      .then(({ data }) => {
        setBusinesses(data || [])
        setLoading(false)
      })
  }, [])

  const session = JSON.parse(localStorage.getItem('demo_session') || '{}')

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
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '2.5rem 2rem' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem' }}>
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: '#1a1a1a', margin: '0 0 0.4rem' }}>Select a demo business</h1>
            <p style={{ color: '#888', fontSize: '0.875rem', margin: 0, lineHeight: 1.55 }}>
              Choose a business to explore the portal. You'll be able to select which tier experience to preview on the next step.
            </p>
          </div>
          <button
            onClick={() => navigate('/demo/performance')}
            style={{ flexShrink: 0, padding: '0.55rem 1.1rem', background: 'white', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '8px', color: '#5e3b87', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
          >
            Platform overview →
          </button>
        </div>

        {loading ? (
          <div style={{ color: '#aaa', fontSize: '0.875rem' }}>Loading businesses…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            {businesses.map(biz => (
              <button
                key={biz.id}
                onClick={() => navigate(`/portal?ownerPreview=${biz.id}&ownerName=${encodeURIComponent(biz.business_name)}`)}
                style={{ background: 'white', border: '0.5px solid rgba(94,59,135,0.12)', borderRadius: '12px', padding: '1.5rem', cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 8px rgba(94,59,135,0.04)', transition: 'box-shadow 0.15s, border-color 0.15s', fontFamily: "'DM Sans', sans-serif" }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(94,59,135,0.12)'; e.currentTarget.style.borderColor = 'rgba(94,59,135,0.25)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(94,59,135,0.04)'; e.currentTarget.style.borderColor = 'rgba(94,59,135,0.12)' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.0625rem', color: '#1a1a1a', lineHeight: 1.25, marginRight: '0.75rem' }}>
                    {biz.business_name}
                  </div>
                  <TierBadge tier={biz.subscription_tier} />
                </div>

                <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '1rem', textTransform: 'capitalize' }}>{(biz.triage_mode || 'balanced')} triage · {biz.included_minutes} min/mo</div>

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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default BusinessSelector
