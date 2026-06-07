import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const DEMO_BUSINESSES = [
  {
    email: 'demo-plumber@qerxel.app',
    name: "Henderson's Plumbing",
    industry: 'Plumbing & heating',
    tier: 'Light',
    tierColor: '#6b7280',
    description: 'Sole trader, South Yorkshire. Emergency callouts, boiler servicing, general plumbing.',
    icon: '🔧',
  },
  {
    email: 'demo-salon@qerxel.app',
    name: 'Meridian Hair & Beauty',
    industry: 'Hair & beauty salon',
    tier: 'Standard',
    tierColor: '#5e3b87',
    description: 'Boutique salon, Birmingham. Appointment bookings, colour services, nail care.',
    icon: '✂️',
  },
  {
    email: 'demo-physio@qerxel.app',
    name: 'Restore Physiotherapy',
    industry: 'Private physiotherapy',
    tier: 'Professional',
    tierColor: '#1d4ed8',
    description: 'City centre clinic, Manchester. Assessments, sports rehab, clinical Pilates.',
    icon: '🏥',
  },
  {
    email: 'demo-electrical@qerxel.app',
    name: 'Apex Electrical Services',
    industry: 'Electrical contractor',
    tier: 'Enterprise',
    tierColor: '#065f46',
    description: 'London contractor, 8 electricians. Residential, commercial, solar & EV.',
    icon: '⚡',
  },
]

const DEMO_PASSWORD = 'QerxelDemo2026!'

const DemoLogin = () => {
  const [signingIn, setSigningIn] = useState(null)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleSignIn = async (biz) => {
    setSigningIn(biz.email)
    setError(null)
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: biz.email,
        password: DEMO_PASSWORD,
      })
      if (authErr) {
        setError(`Could not sign in to ${biz.name}. The demo may not be initialised yet.`)
        return
      }
      navigate('/portal')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSigningIn(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f9', fontFamily: "'DM Sans', system-ui, sans-serif", padding: '2.5rem 1.5rem' }}>

      {/* Header */}
      <div style={{ maxWidth: 880, margin: '0 auto 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#5e3b87', fontSize: '1.15rem', letterSpacing: '-0.01em' }}>Qerxel</span>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f0a500', display: 'inline-block', marginBottom: 6 }} />
          <span style={{ fontSize: '0.8rem', color: '#aaa', marginLeft: '0.5rem' }}>Demo portal</span>
        </div>
        <Link to="/login" style={{ fontSize: '0.8rem', color: '#aaa', textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.color = '#5e3b87'}
          onMouseLeave={e => e.currentTarget.style.color = '#aaa'}
        >
          ← Main login
        </Link>
      </div>

      {/* Intro */}
      <div style={{ maxWidth: 880, margin: '0 auto 2rem' }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.6rem', color: '#1a1a1a', margin: '0 0 0.4rem' }}>
          Choose a demo business
        </h1>
        <p style={{ color: '#888', margin: 0, fontSize: '0.9rem' }}>
          Each shows a real portal with seeded data. Use the tier switcher inside to see locked and unlocked features.
        </p>
      </div>

      {error && (
        <div style={{ maxWidth: 880, margin: '0 auto 1.5rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.75rem 1rem', color: '#b91c1c', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Business cards */}
      <div style={{ maxWidth: 880, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1rem' }}>
        {DEMO_BUSINESSES.map(biz => {
          const isLoading = signingIn === biz.email
          return (
            <div
              key={biz.email}
              style={{ background: 'white', borderRadius: 14, border: '0.5px solid rgba(94,59,135,0.12)', boxShadow: '0 2px 12px rgba(94,59,135,0.06)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(94,59,135,0.13)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(94,59,135,0.06)'}
            >
              {/* Tier badge + icon */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1.5rem' }}>{biz.icon}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: biz.tierColor, background: `${biz.tierColor}14`, borderRadius: 20, padding: '0.2rem 0.65rem', border: `1px solid ${biz.tierColor}30` }}>
                  {biz.tier}
                </span>
              </div>

              {/* Name + industry */}
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: '#1a1a1a', marginBottom: '0.2rem' }}>{biz.name}</div>
                <div style={{ fontSize: '0.78rem', color: '#5e3b87', fontWeight: 500 }}>{biz.industry}</div>
              </div>

              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#666', lineHeight: 1.55 }}>{biz.description}</p>

              <button
                onClick={() => handleSignIn(biz)}
                disabled={!!signingIn}
                style={{ marginTop: 'auto', width: '100%', padding: '0.65rem', background: isLoading ? '#f5d98a' : !!signingIn ? '#f7f6f9' : '#f0a500', color: isLoading ? '#7a5c1a' : !!signingIn ? '#bbb' : '#1a0533', border: 'none', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: signingIn ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.12s' }}
              >
                {isLoading ? 'Signing in…' : `Enter as ${biz.name.split(' ')[0]} →`}
              </button>
            </div>
          )
        })}
      </div>

    </div>
  )
}

export default DemoLogin
