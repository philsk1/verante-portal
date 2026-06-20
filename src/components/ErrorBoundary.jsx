import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[Qerxel] Unhandled error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || 'Unknown error'
      const stack = this.state.error?.stack || ''
      return (
        <div style={{ minHeight: '100vh', background: '#0d0d14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          <div style={{ textAlign: 'center', padding: '2rem', maxWidth: 480 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #6c31a8 0%, #3b1a6e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 auto 1.5rem', letterSpacing: '-0.5px' }}>Q</div>
            <h2 style={{ color: '#e2e0f0', fontFamily: "'Syne', sans-serif", fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Something went wrong</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 0.75rem', lineHeight: 1.6 }}>Q hit an unexpected error. Reloading usually fixes it.</p>
            <div style={{ background: '#1a1a2e', border: '1px solid #2a2a40', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', textAlign: 'left' }}>
              <div style={{ color: '#f87171', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, fontFamily: 'monospace' }}>{msg}</div>
              {stack && <div style={{ color: '#555577', fontSize: '0.7rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 120, overflow: 'auto' }}>{stack.split('\n').slice(1, 5).join('\n')}</div>}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => navigator.clipboard?.writeText(`${msg}\n\n${stack}`)}
                style={{ background: 'transparent', color: '#9ca3af', border: '1px solid #374151', borderRadius: 8, padding: '0.65rem 1.25rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
              >
                Copy error
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{ background: '#5e3b87', color: '#fff', border: 'none', borderRadius: 8, padding: '0.65rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
