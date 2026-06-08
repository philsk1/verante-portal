import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const Login = () => {
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [error, setError]           = useState(null)
  const [loading, setLoading]       = useState(false)
  const [resetSent, setResetSent]   = useState(false)
  const [resetting, setResetting]   = useState(false)
  const [showPw, setShowPw]         = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/portal')
    }
  }

  const handleReset = async () => {
    if (!email.trim()) { setError('Enter your email address above first.'); return }
    setResetting(true)
    setError(null)
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/portal` })
    setResetSent(true)
    setResetting(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.75rem' }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#5e3b87', fontSize: '1.25rem', letterSpacing: '-0.01em' }}>Qerxel</span>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f0a500', display: 'inline-block', marginLeft: 3, marginBottom: 8, flexShrink: 0 }} />
      </div>

      {/* Card */}
      <div style={{ background: 'white', borderRadius: '14px', border: '0.5px solid rgba(94,59,135,0.12)', boxShadow: '0 4px 24px rgba(94,59,135,0.07)', width: '100%', maxWidth: '400px', padding: '2.5rem' }}>

        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: '#1a1a1a', marginBottom: '0.35rem', marginTop: 0 }}>Welcome back</h1>
        <p style={{ color: '#888', marginBottom: '2rem', fontSize: '0.875rem', marginTop: 0 }}>Sign in to your Qerxel account</p>

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
              style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.35rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '0.625rem 2.5rem 0.625rem 0.75rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', outline: 'none' }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#aaa', display: 'flex', alignItems: 'center' }}>
                {showPw
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem', background: loading ? '#f5d98a' : '#f0a500', color: '#1a0533', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {resetSent ? (
          <p style={{ textAlign: 'center', marginTop: '1.25rem', marginBottom: 0, fontSize: '0.875rem', color: '#3db87a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.6rem 0.85rem' }}>
            Reset link sent — check your email.
          </p>
        ) : (
          <p style={{ textAlign: 'center', marginTop: '1rem', marginBottom: 0, fontSize: '0.8rem', color: '#aaa' }}>
            <button onClick={handleReset} disabled={resetting} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '0.8rem', padding: 0, textDecoration: 'underline', fontFamily: "'DM Sans', sans-serif" }}>
              {resetting ? 'Sending…' : 'Forgot password?'}
            </button>
          </p>
        )}

        <p style={{ textAlign: 'center', marginTop: '0.75rem', marginBottom: 0, fontSize: '0.875rem', color: '#888' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: '#5e3b87', fontWeight: '500', textDecoration: 'none' }}>Sign up</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
