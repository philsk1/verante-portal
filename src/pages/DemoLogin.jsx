import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const DemoLogin = () => {
  const [email, setEmail]   = useState('')
  const [code, setCode]     = useState('')
  const [error, setError]   = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: dbErr } = await supabase
        .from('demo_users')
        .select('id, email, name, role')
        .eq('email', email.trim().toLowerCase())
        .eq('access_code', code.trim())
        .maybeSingle()

      if (dbErr || !data) {
        setError('Invalid email or access code.')
        return
      }

      localStorage.setItem('demo_session', JSON.stringify({
        id: data.id, email: data.email, name: data.name, role: data.role,
      }))
      navigate('/demo/select')
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#5e3b87', fontSize: '1.25rem', letterSpacing: '-0.01em' }}>Verrante</span>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f0a500', display: 'inline-block', marginLeft: 3, marginBottom: 8, flexShrink: 0 }} />
      </div>
      <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '1.75rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Demo environment</div>

      {/* Card */}
      <div style={{ background: 'white', borderRadius: '14px', border: '0.5px solid rgba(94,59,135,0.12)', boxShadow: '0 4px 24px rgba(94,59,135,0.07)', width: '100%', maxWidth: '400px', padding: '2.5rem' }}>

        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: '#1a1a1a', marginBottom: '0.35rem', marginTop: 0 }}>Sales demo access</h1>
        <p style={{ color: '#888', marginBottom: '2rem', fontSize: '0.875rem', marginTop: 0, lineHeight: 1.5 }}>Enter your demo credentials to explore the Verrante portal.</p>

        {error && (
          <p style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.6rem 0.85rem', fontSize: '0.875rem', marginBottom: '1.25rem', marginTop: 0 }}>
            {error}
          </p>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.35rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="demo@verrante.app"
              style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.35rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Access code</label>
            <input
              type="password"
              value={code}
              onChange={e => setCode(e.target.value)}
              required
              style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', outline: 'none' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem', background: loading ? '#f5d98a' : '#f0a500', color: '#1a0533', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            {loading ? 'Signing in…' : 'Enter demo'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', marginBottom: 0, fontSize: '0.8rem', color: '#bbb' }}>
          <Link to="/login" style={{ color: '#aaa', textDecoration: 'none' }}>← Back to main login</Link>
        </p>
      </div>
    </div>
  )
}

export default DemoLogin
