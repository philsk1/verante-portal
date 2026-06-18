import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[Qerxel] Unhandled error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#0d0d14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          <div style={{ textAlign: 'center', padding: '2rem', maxWidth: 400 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #6c31a8 0%, #3b1a6e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 auto 1.5rem', letterSpacing: '-0.5px' }}>Q</div>
            <h2 style={{ color: '#e2e0f0', fontFamily: "'Syne', sans-serif", fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Something went wrong</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1.75rem', lineHeight: 1.6 }}>Q hit an unexpected error. Reloading usually fixes it.</p>
            <button
              onClick={() => window.location.reload()}
              style={{ background: '#5e3b87', color: '#fff', border: 'none', borderRadius: 8, padding: '0.65rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
