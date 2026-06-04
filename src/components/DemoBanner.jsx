import { useNavigate } from 'react-router-dom'

const TIERS = [
  { id: 'light',        label: 'Light' },
  { id: 'standard',     label: 'Standard' },
  { id: 'professional', label: 'Professional' },
  { id: 'enterprise',   label: 'Enterprise' },
]

const DemoBanner = ({ businessName, tier, businessId }) => {
  const navigate = useNavigate()

  const handleTierChange = (newTier) => {
    if (newTier !== tier) {
      navigate(`/demo/portal/${businessId}/${newTier}`, { replace: true })
    }
  }

  return (
    <div style={{ background: '#f0a500', color: '#1a0533', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', height: 40, boxSizing: 'border-box', flexShrink: 0 }}>

      {/* Left: demo label + business name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
        <span style={{ fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.65, flexShrink: 0 }}>Demo</span>
        <span style={{ opacity: 0.4, flexShrink: 0 }}>·</span>
        <span style={{ fontWeight: '600', fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{businessName}</span>
      </div>

      {/* Right: tier switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0, marginLeft: '1rem' }}>
        {TIERS.map(t => (
          <button
            key={t.id}
            onClick={() => handleTierChange(t.id)}
            style={{
              background: t.id === tier ? 'rgba(26,5,51,0.18)' : 'transparent',
              border: t.id === tier ? '1px solid rgba(26,5,51,0.3)' : '1px solid transparent',
              borderRadius: '5px',
              color: '#1a0533',
              fontSize: '0.72rem',
              fontWeight: t.id === tier ? '700' : '500',
              padding: '0.2rem 0.6rem',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              opacity: t.id === tier ? 1 : 0.65,
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
