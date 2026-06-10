import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'

const DemoLogin = () => {
  const [email, setEmail]       = useState('')
  const [code, setCode]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data, error: dbErr } = await supabase
        .from('demo_users')
        .select('id, email, name, role')
        .ilike('email', email.trim())
        .eq('access_code', code.trim())
        .maybeSingle()

      if (dbErr || !data) {
        setError('Email or access code not recognised.')
        return
      }

      // Sign in as the shared demo Supabase user so the real Portal shell works
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: 'demo@qerxel.app',
        password: 'QerxelDemo2026!',
      })
      if (authErr) {
        setError('Demo sign-in failed. Please try again.')
        return
      }

      localStorage.setItem('demo_session', JSON.stringify({
        id:    data.id,
        email: data.email,
        name:  data.name || data.email,
        role:  data.role,
      }))
      navigate('/demo/select')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '2rem' }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2.5rem' }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#5e3b87', fontSize: '1.35rem', letterSpacing: '-0.01em' }}>Qerxel</span>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f0a500', display: 'inline-block', marginLeft: 3, marginBottom: 10, flexShrink: 0 }} />
      </div>

      {/* Card */}
      <div style={{ background: 'white', borderRadius: 16, border: '0.5px solid rgba(94,59,135,0.12)', boxShadow: '0 4px 32px rgba(94,59,135,0.08)', padding: '2.25rem 2rem', width: '100%', maxWidth: 380 }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.2rem', color: '#1a1a1a', margin: '0 0 0.3rem' }}>Demo access</h1>
        <p style={{ color: '#aaa', fontSize: '0.82rem', margin: '0 0 1.75rem', lineHeight: 1.5 }}>Enter your email and access code to explore the platform.</p>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.65rem 0.85rem', color: '#b91c1c', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '0.85rem' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.8rem', border: '1.5px solid rgba(94,59,135,0.15)', borderRadius: 8, fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', outline: 'none' }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>Access code</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.8rem', border: '1.5px solid rgba(94,59,135,0.15)', borderRadius: 8, fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', outline: 'none' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email.trim() || !code.trim()}
            style={{ width: '100%', padding: '0.7rem', background: loading || !email.trim() || !code.trim() ? '#f5d98a' : '#f0a500', color: '#1a0533', border: 'none', borderRadius: 8, fontSize: '0.9rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            {loading ? 'Checking…' : 'Enter demo →'}
          </button>
        </form>
      </div>

      <Link to="/login" style={{ marginTop: '1.5rem', fontSize: '0.78rem', color: '#ccc', textDecoration: 'none' }}
        onMouseEnter={e => e.currentTarget.style.color = '#5e3b87'}
        onMouseLeave={e => e.currentTarget.style.color = '#ccc'}
      >
        ← Back to main login
      </Link>
    </div>
  )
}

export default DemoLogin
