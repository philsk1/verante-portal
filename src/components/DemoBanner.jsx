import { useNavigate } from 'react-router-dom'

const TIER_LABELS = {
  light:        'Light',
  standard:     'Standard',
  professional: 'Professional',
  enterprise:   'Enterprise',
}

const DemoBanner = ({ businessName, tier, businessId }) => {
  const navigate = useNavigate()

  return (
    <div style={{ background: '#f0a500', color: '#1a0533', fontSize: '0.8rem', fontWeight: '500', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', height: 36, boxSizing: 'border-box', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7 }}>Demo mode</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span style={{ fontWeight: '600' }}>{businessName}</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span style={{ background: 'rgba(26,5,51,0.12)', borderRadius: '4px', padding: '0.15rem 0.5rem', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {TIER_LABELS[tier] || tier}
        </span>
      </div>
      <button
        onClick={() => navigate(`/demo/tier/${businessId}`)}
        style={{ background: 'none', border: '1px solid rgba(26,5,51,0.25)', borderRadius: '5px', color: '#1a0533', fontSize: '0.75rem', fontWeight: '500', cursor: 'pointer', padding: '0.2rem 0.65rem', fontFamily: "'DM Sans', sans-serif" }}
      >
        Change tier
      </button>
    </div>
  )
}

export default DemoBanner
