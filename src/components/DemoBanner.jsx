import { useNavigate } from 'react-router-dom'
import { usePreview } from '../context/PreviewContext'

const TIERS = [
  { id: 'light',        label: 'Light' },
  { id: 'standard',     label: 'Standard' },
  { id: 'professional', label: 'Professional' },
  { id: 'enterprise',   label: 'Enterprise' },
]

const DemoBanner = ({ businessName, baseTier }) => {
  const preview = usePreview()
  const navigate = useNavigate()
  const activeTier = preview.tierOverride || baseTier || 'light'

  return (
    <div style={{ background: '#f0a500', color: '#1a0533', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', height: 40, boxSizing: 'border-box', flexShrink: 0 }}>

      {/* Left: demo label + business + back link */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
        <span style={{ fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.65, flexShrink: 0 }}>Demo</span>
        <span style={{ opacity: 0.4, flexShrink: 0 }}>·</span>
        <span style={{ fontWeight: '600', fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{businessName}</span>
        <span style={{ opacity: 0.3, flexShrink: 0 }}>·</span>
        <button
          onClick={() => navigate('/demo/login')}
          style={{ background: 'none', border: 'none', color: '#1a0533', fontSize: '0.75rem', cursor: 'pointer', padding: 0, opacity: 0.65, fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.65'}
        >
          ← All businesses
        </button>
      </div>

      {/* Right: tier switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0, marginLeft: '1rem' }}>
        <span style={{ fontSize: '0.68rem', opacity: 0.55, marginRight: '0.25rem', whiteSpace: 'nowrap' }}>View as:</span>
        {TIERS.map(t => (
          <button
            key={t.id}
            onClick={() => preview.setTierOverride(t.id === baseTier && !preview.tierOverride ? null : t.id)}
            style={{
              background: t.id === activeTier ? 'rgba(26,5,51,0.18)' : 'transparent',
              border: t.id === activeTier ? '1px solid rgba(26,5,51,0.3)' : '1px solid transparent',
              borderRadius: '5px',
              color: '#1a0533',
              fontSize: '0.72rem',
              fontWeight: t.id === activeTier ? '700' : '500',
              padding: '0.2rem 0.6rem',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              opacity: t.id === activeTier ? 1 : 0.65,
              transition: 'all 0.12s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

    </div>
  )
}

export default DemoBanner
