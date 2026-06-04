import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'

const TIERS = [
  {
    id: 'light',
    name: 'Light',
    price: '£29/mo',
    concurrent: '1 concurrent call',
    minutes: '60 mins/month',
    features: ['AI call handling', 'Lead capture', 'Partner referrals', 'Dashboard'],
    color: '#666',
    bg: '#f0f0f0',
    border: '#ddd',
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '£49/mo',
    concurrent: '1 concurrent call',
    minutes: '150 mins/month',
    features: ['Everything in Light', 'Analytics', 'Emergency keywords', 'Call filtering'],
    color: '#5e3b87',
    bg: '#ede8f5',
    border: 'rgba(94,59,135,0.3)',
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '£69/mo',
    concurrent: '2 concurrent calls',
    minutes: '250 mins/month',
    features: ['Everything in Standard', '2 concurrent calls', 'Provisional booking', 'CalDAV integration'],
    color: '#b07a00',
    bg: '#fef3d9',
    border: 'rgba(240,165,0,0.4)',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '£249/mo',
    concurrent: '3+ concurrent calls',
    minutes: '700 mins/month',
    features: ['Everything in Professional', 'Pricing Intelligence', 'Competitor Intelligence', 'Full Analytics', 'Staff routing'],
    color: '#1e7a4a',
    bg: '#e6f5ee',
    border: 'rgba(61,184,122,0.4)',
  },
]

const TierSelector = () => {
  const { businessId } = useParams()
  const navigate = useNavigate()
  const [business, setBusiness] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    supabase
      .from('demo_businesses')
      .select('id, business_name, business_type, tier')
      .eq('id', businessId)
      .maybeSingle()
      .then(({ data }) => {
        setBusiness(data)
        setSelected(data?.tier || 'standard')
      })
  }, [businessId])

  const session = JSON.parse(localStorage.getItem('demo_session') || '{}')

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f9', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: '#5e3b87', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: 'white', fontSize: '1.125rem', letterSpacing: '-0.01em' }}>Verrante</span>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f0a500', display: 'inline-block', marginLeft: 3, marginBottom: 8, flexShrink: 0 }} />
          <span style={{ marginLeft: '0.75rem', fontSize: '0.7rem', background: '#f0a500', color: '#1a0533', borderRadius: '4px', padding: '0.2rem 0.5rem', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Demo</span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>{session.name || session.email}</span>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '2.5rem 2rem' }}>

        {/* Back + title */}
        <button
          onClick={() => navigate('/demo/select')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '0.8rem', padding: 0, marginBottom: '1.5rem', fontFamily: "'DM Sans', sans-serif" }}
        >
          ← All businesses
        </button>

        {business && (
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: '#1a1a1a', margin: '0 0 0.3rem' }}>
              {business.business_name}
            </h1>
            <p style={{ color: '#888', fontSize: '0.875rem', margin: 0 }}>
              {business.business_type} · Choose which tier experience to preview
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {TIERS.map(tier => {
            const isSelected = selected === tier.id
            const isOwn = business?.tier === tier.id
            return (
              <button
                key={tier.id}
                onClick={() => setSelected(tier.id)}
                style={{
                  background: isSelected ? tier.bg : 'white',
                  border: `2px solid ${isSelected ? tier.border : 'rgba(94,59,135,0.1)'}`,
                  borderRadius: '12px',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  fontFamily: "'DM Sans', sans-serif",
                  position: 'relative',
                }}
              >
                {isOwn && (
                  <div style={{ position: 'absolute', top: '0.6rem', right: '0.6rem', fontSize: '0.6rem', background: tier.bg, color: tier.color, border: `1px solid ${tier.border}`, borderRadius: '3px', padding: '0.1rem 0.4rem', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Demo data
                  </div>
                )}
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', color: isSelected ? tier.color : '#1a1a1a', marginBottom: '0.25rem' }}>
                  {tier.name}
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: isSelected ? tier.color : '#5e3b87', marginBottom: '0.5rem' }}>
                  {tier.price}
                </div>
                <div style={{ fontSize: '0.725rem', color: '#888', marginBottom: '0.15rem' }}>{tier.concurrent}</div>
                <div style={{ fontSize: '0.725rem', color: '#888', marginBottom: '0.85rem' }}>{tier.minutes}</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {tier.features.map(f => (
                    <li key={f} style={{ fontSize: '0.725rem', color: isSelected ? tier.color : '#888', marginBottom: '0.2rem', display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
                      <span style={{ flexShrink: 0, marginTop: '0.1rem' }}>✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            disabled={!selected}
            onClick={() => navigate(`/demo/portal/${businessId}/${selected}`)}
            style={{ padding: '0.75rem 2rem', background: selected ? '#f0a500' : '#f5d98a', color: '#1a0533', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600', cursor: selected ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif" }}
          >
            Preview {TIERS.find(t => t.id === selected)?.name || ''} portal →
          </button>
        </div>
      </div>
    </div>
  )
}

export default TierSelector
