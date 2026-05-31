import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'

const steps = [
  'Business type',
  'Business details',
  'Your services',
  'Boundaries',
  'Referral partners',
  'Review & launch'
]

const Onboarding = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [data, setData] = useState({
    business_name: '',
    business_phone: '',
    business_email: '',
    booking_link: '',
    business_context: '',
    subcategory_id: '',
  })

  const update = (field, value) => setData(prev => ({ ...prev, [field]: value }))

  const handleFinish = async () => {
    setLoading(true)
    setError(null)

    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    const { error } = await supabase.from('tenants').insert({
      ...data,
      referral_code: referralCode,
      subscription_tier: 'light',
      active: true,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/portal')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', width: '100%', maxWidth: '560px', padding: '2.5rem' }}>
        
        {/* Progress */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Step {step + 1} of {steps.length}</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{steps[step]}</span>
          </div>
          <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '9999px' }}>
            <div style={{ height: '4px', background: '#6366f1', borderRadius: '9999px', width: `${((step + 1) / steps.length) * 100}%`, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Step 0 — Business type */}
        {step === 0 && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#0f172a', marginBottom: '0.5rem' }}>What kind of business are you?</h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>This helps us set up the right defaults for you.</p>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Business category selection coming soon.</p>
          </div>
        )}

        {/* Step 1 — Business details */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#0f172a', marginBottom: '0.5rem' }}>Tell us about your business</h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>This information helps your AI assistant introduce your business correctly.</p>

            {[
              { label: 'Business name', field: 'business_name', type: 'text' },
              { label: 'Business phone number', field: 'business_phone', type: 'tel' },
              { label: 'Business email', field: 'business_email', type: 'email' },
              { label: 'Booking link', field: 'booking_link', type: 'url' },
            ].map(({ label, field, type }) => (
              <div key={field} style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>{label}</label>
                <input
                  type={type}
                  value={data[field]}
                  onChange={(e) => update(field, e.target.value)}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Steps 2-4 placeholders */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#0f172a', marginBottom: '0.5rem' }}>Your services</h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Service configuration coming in the next build.</p>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#0f172a', marginBottom: '0.5rem' }}>Set your boundaries</h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Boundary configuration coming in the next build.</p>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#0f172a', marginBottom: '0.5rem' }}>Referral partners</h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Partner configuration coming in the next build.</p>
          </div>
        )}

        {/* Step 5 — Review */}
        {step === 5 && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#0f172a', marginBottom: '0.5rem' }}>You're ready to launch</h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>Here's what we've set up for you.</p>

            {Object.entries(data).map(([key, value]) => value ? (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{key.replace(/_/g, ' ')}</span>
                <span style={{ fontSize: '0.875rem', color: '#0f172a', fontWeight: '500' }}>{value}</span>
              </div>
            ) : null)}

            {error && <p style={{ color: '#ef4444', marginTop: '1rem', fontSize: '0.875rem' }}>{error}</p>}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            style={{ padding: '0.625rem 1.25rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'transparent', color: '#64748b', fontSize: '0.875rem', cursor: step === 0 ? 'not-allowed' : 'pointer', opacity: step === 0 ? 0.4 : 1 }}
          >
            Back
          </button>

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              style={{ padding: '0.625rem 1.25rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={loading}
              style={{ padding: '0.625rem 1.25rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Launching...' : 'Launch my portal'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Onboarding