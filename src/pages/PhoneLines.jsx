import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'

const UK_AREAS = [
  { label: 'No preference', value: '' },
  { label: 'London — 020', value: '020' },
  { label: 'Manchester — 0161', value: '0161' },
  { label: 'Birmingham — 0121', value: '0121' },
  { label: 'Leeds — 0113', value: '0113' },
  { label: 'Sheffield — 0114', value: '0114' },
  { label: 'Bristol — 0117', value: '0117' },
  { label: 'Liverpool — 0151', value: '0151' },
  { label: 'Newcastle — 0191', value: '0191' },
  { label: 'Glasgow — 0141', value: '0141' },
  { label: 'Edinburgh — 0131', value: '0131' },
  { label: 'Cardiff — 029', value: '029' },
  { label: 'Nottingham — 0115', value: '0115' },
  { label: 'Leicester — 0116', value: '0116' },
  { label: 'Southampton — 023', value: '023' },
  { label: 'Brighton — 01273', value: '01273' },
  { label: 'Plymouth — 01752', value: '01752' },
  { label: 'Other (add in notes)', value: 'other' },
]

const s = {
  page: { padding: '0.25rem 2rem 2rem', maxWidth: 820, fontFamily: "'DM Sans', sans-serif" },
  pageHeader: { marginBottom: '0.85rem' },
  h1: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: '#1a1a1a', margin: '0 0 0.3rem' },
  sub: { fontSize: '0.875rem', color: '#888', margin: 0 },
  card: { background: 'white', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.1)', padding: '1.5rem', marginBottom: '1.25rem' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '0.35rem', fontFamily: "'DM Sans', sans-serif" },
  input: { width: '100%', padding: '0.55rem 0.75rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: 8, fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', outline: 'none', boxSizing: 'border-box', background: 'white' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' },
  btn: { padding: '0.65rem 1.5rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: 8, fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  ghostBtn: { padding: '0.6rem 1.25rem', background: 'white', color: '#5e3b87', border: '1px solid rgba(94,59,135,0.3)', borderRadius: 8, fontSize: '0.875rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  sectionTitle: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1a1a1a', margin: '0 0 0.25rem' },
  sectionSub: { fontSize: '0.8rem', color: '#888', margin: '0 0 1.25rem', lineHeight: 1.5 },
}

// ─── Active number card ────────────────────────────────────────────────────────
function ActiveCard({ number, forwardTo, ported }) {
  return (
    <div style={{ ...s.card, borderColor: 'rgba(61,184,122,0.25)', background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 60%)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3db87a', display: 'inline-block', boxShadow: '0 0 0 3px rgba(61,184,122,0.2)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3db87a', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active</span>
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.75rem', color: '#1a1a1a', letterSpacing: '-0.01em' }}>{number}</div>
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.35rem' }}>
            {ported ? 'Your own number, managed by Qerxel Lines' : 'Dedicated Qerxel Lines number'}
            {forwardTo && <span> · Forwarding to <strong style={{ color: '#1a1a1a' }}>{forwardTo}</strong></span>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.25rem', color: '#3db87a' }}>£8<span style={{ fontWeight: 400, fontSize: '0.875rem', color: '#888' }}>/mo</span></div>
          <div style={{ fontSize: '0.72rem', color: '#aaa' }}>billed monthly · no contract</div>
        </div>
      </div>
      <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(61,184,122,0.15)', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        <button style={s.ghostBtn}>Update forwarding number</button>
        {!ported && <button style={s.ghostBtn}>Port my existing number</button>}
        <button style={{ ...s.ghostBtn, color: '#d32f2f', borderColor: 'rgba(211,47,47,0.3)', marginLeft: 'auto' }}>Cancel line</button>
      </div>
    </div>
  )
}

// ─── Offer page ────────────────────────────────────────────────────────────────
function OfferPage({ businessName, email }) {
  const [mode, setMode]               = useState('new')
  const [area, setArea]               = useState('')
  const [portNumber, setPortNumber]   = useState('')
  const [portProvider, setPortProvider] = useState('')
  const [portHolder, setPortHolder]   = useState('')
  const [contactName, setContactName] = useState(businessName || '')
  const [contactPhone, setContactPhone] = useState('')
  const [notes, setNotes]             = useState('')
  const [submitted, setSubmitted]     = useState(false)

  const handleSubmit = () => {
    const subject = encodeURIComponent(`Qerxel Lines request — ${contactName}`)
    const lines = [
      `Business: ${contactName}`,
      `Email: ${email}`,
      `Contact phone: ${contactPhone}`,
      '',
      mode === 'new'
        ? `Request: New number\nPreferred area: ${area || 'No preference'}`
        : `Request: Port existing number\nCurrent number: ${portNumber}\nCurrent provider: ${portProvider}\nAccount holder: ${portHolder}`,
      '',
      notes ? `Notes: ${notes}` : '',
    ].filter(v => v !== undefined).join('\n')
    window.location.href = `mailto:hello@qerxel.app?subject=${subject}&body=${encodeURIComponent(lines)}`
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div style={{ ...s.card, textAlign: 'center', padding: '3rem 2rem' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#e6f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3db87a" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.125rem', color: '#1a1a1a', marginBottom: '0.4rem' }}>Request sent</div>
        <div style={{ fontSize: '0.875rem', color: '#888', lineHeight: 1.6 }}>We'll have your number ready within 24 hours and follow up by email.</div>
      </div>
    )
  }

  return (
    <>
      {/* Value prop strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { icon: '📞', title: 'Dedicated UK number', body: 'A real business number for your clients. Works from day one.' },
          { icon: '🔄', title: 'Keep your number', body: "Already have a number? We'll port it across — no disruption." },
          { icon: '🔌', title: 'Works with anything', body: 'Forwards to any phone. Works with Qerxel AI or completely standalone.' },
        ].map(v => (
          <div key={v.title} style={{ background: 'white', border: '0.5px solid rgba(94,59,135,0.1)', borderRadius: 10, padding: '1rem' }}>
            <div style={{ fontSize: '1.25rem', marginBottom: '0.4rem' }}>{v.icon}</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: '#1a1a1a', marginBottom: '0.25rem' }}>{v.title}</div>
            <div style={{ fontSize: '0.775rem', color: '#888', lineHeight: 1.5 }}>{v.body}</div>
          </div>
        ))}
      </div>

      {/* Pricing callout */}
      <div style={{ background: '#f5f3ff', border: '1px solid rgba(94,59,135,0.15)', borderRadius: 10, padding: '0.9rem 1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: '#5e3b87' }}>£8<span style={{ fontWeight: 400, fontSize: '0.875rem', color: '#888' }}>/month</span></span>
        <span style={{ fontSize: '0.8rem', color: '#5e3b87', lineHeight: 1.5 }}>No contract. No setup fee. Cancel anytime. Works standalone — no obligation to use Qerxel AI.</span>
      </div>

      {/* Form */}
      <div style={s.card}>
        <h3 style={s.sectionTitle}>Request a line</h3>
        <p style={s.sectionSub}>Fill in the details below and we'll follow up within a few hours.</p>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {[{ id: 'new', label: 'New number' }, { id: 'port', label: 'Port existing number' }].map(opt => (
            <button
              key={opt.id}
              onClick={() => setMode(opt.id)}
              style={{
                padding: '0.5rem 1rem', borderRadius: 8, border: `1.5px solid ${mode === opt.id ? '#5e3b87' : 'rgba(94,59,135,0.2)'}`,
                background: mode === opt.id ? '#f5f3ff' : 'white', color: mode === opt.id ? '#5e3b87' : '#666',
                fontSize: '0.8rem', fontWeight: mode === opt.id ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
            >{opt.label}</button>
          ))}
        </div>

        {mode === 'new' ? (
          <div style={{ marginBottom: '1rem' }}>
            <label style={s.label}>Preferred area code</label>
            <select
              value={area}
              onChange={e => setArea(e.target.value)}
              style={{ ...s.input, cursor: 'pointer' }}
            >
              {UK_AREAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        ) : (
          <>
            <div style={s.row}>
              <div>
                <label style={s.label}>Current number</label>
                <input style={s.input} placeholder="e.g. 01612345678" value={portNumber} onChange={e => setPortNumber(e.target.value)} autoComplete="off" data-1p-ignore="true" data-lpignore="true" />
              </div>
              <div>
                <label style={s.label}>Current provider</label>
                <input style={s.input} placeholder="e.g. BT, Sky, Vodafone" value={portProvider} onChange={e => setPortProvider(e.target.value)} autoComplete="off" data-1p-ignore="true" data-lpignore="true" />
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>Account holder name (as on bill)</label>
              <input style={s.input} placeholder="Full name on the account" value={portHolder} onChange={e => setPortHolder(e.target.value)} autoComplete="off" data-1p-ignore="true" data-lpignore="true" />
            </div>
          </>
        )}

        <div style={s.row}>
          <div>
            <label style={s.label}>Your name</label>
            <input style={s.input} value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Business or contact name" autoComplete="off" data-1p-ignore="true" data-lpignore="true" />
          </div>
          <div>
            <label style={s.label}>Best contact number</label>
            <input style={s.input} placeholder="Mobile or direct line" value={contactPhone} onChange={e => setContactPhone(e.target.value)} autoComplete="off" data-1p-ignore="true" data-lpignore="true" />
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={s.label}>Anything else we should know</label>
          <textarea
            style={{ ...s.input, height: 70, resize: 'vertical', lineHeight: 1.5 }}
            placeholder="e.g. geographic preference, specific number pattern, timeframe..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            autoComplete="off" data-1p-ignore="true" data-lpignore="true"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={mode === 'port' && (!portNumber || !portProvider)}
          style={{
            ...s.btn,
            opacity: (mode === 'port' && (!portNumber || !portProvider)) ? 0.5 : 1,
            cursor: (mode === 'port' && (!portNumber || !portProvider)) ? 'not-allowed' : 'pointer',
          }}
        >
          Send request →
        </button>

        <p style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '0.75rem', lineHeight: 1.5 }}>
          We'll follow up by email within a few hours. Your line will be active within 24 hours of confirmation.
        </p>
      </div>
    </>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function PhoneLines() {
  const { user } = useAuth()
  const [loading, setLoading]       = useState(true)
  const [tenantId, setTenantId]     = useState(null)
  const [businessName, setBusiness] = useState('')
  const [phoneNumber, setPhone]     = useState(null)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data: m } = await supabase.from('tenant_memberships').select('tenant_id').eq('user_id', user.id).maybeSingle()
      if (!m) { setLoading(false); return }
      setTenantId(m.tenant_id)
      const { data: t } = await supabase.from('tenants').select('business_name, vapi_phone_number').eq('id', m.tenant_id).maybeSingle()
      if (t) {
        setBusiness(t.business_name || '')
        setPhone(t.vapi_phone_number || null)
      }
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) return null

  return (
    <div data-help-score={phoneNumber ? 95 : 20} style={s.page}>
      <div style={s.pageHeader}>
        <h1 style={s.h1}>Qerxel Lines</h1>
        <p style={s.sub}>Your dedicated business phone number — works with Qerxel AI, or completely standalone.</p>
      </div>

      {phoneNumber ? (
        <ActiveCard number={phoneNumber} ported={false} />
      ) : (
        <OfferPage
          tenantId={tenantId}
          businessName={businessName}
          email={user?.email || ''}
        />
      )}
    </div>
  )
}
