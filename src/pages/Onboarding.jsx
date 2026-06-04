import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'

const steps = [
  'Your website',
  'Business type',
  'About your business',
  'Your services',
  'Your boundaries',
  'Your partners',
  'Choose your plan',
  'Review & launch',
]

const emptyRow = () => ({ service_name: '', price_from: '', price_to: '', price_note: '' })

// ─── shared style tokens ──────────────────────────────────────────────────────

const input = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  border: '1px solid rgba(94,59,135,0.2)',
  borderRadius: '8px',
  fontSize: '0.875rem',
  boxSizing: 'border-box',
  fontFamily: "'DM Sans', sans-serif",
  color: '#1a1a1a',
  outline: 'none',
}

const label = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: '500',
  marginBottom: '0.25rem',
  color: '#555',
  fontFamily: "'DM Sans', sans-serif",
}

const hint = {
  fontSize: '0.75rem',
  color: '#aaa',
  marginBottom: '0.375rem',
  marginTop: 0,
  lineHeight: 1.5,
}

const heading = {
  fontSize: '1.25rem',
  fontWeight: '700',
  color: '#1a1a1a',
  marginBottom: '0.4rem',
  fontFamily: "'Syne', sans-serif",
}

const sub = {
  color: '#888',
  marginBottom: '1.5rem',
  fontSize: '0.875rem',
  lineHeight: 1.55,
}

const selBtn = (active) => ({
  padding: '0.625rem 0.75rem',
  border: `1.5px solid ${active ? '#5e3b87' : 'rgba(94,59,135,0.18)'}`,
  borderRadius: '8px',
  background: active ? '#ede8f5' : 'white',
  color: active ? '#5e3b87' : '#555',
  fontSize: '0.875rem',
  fontWeight: active ? '600' : '400',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.15s',
  fontFamily: "'DM Sans', sans-serif",
})

// ─── step components ──────────────────────────────────────────────────────────

const Step0BusinessType = ({ selectedCategoryId, subcategoryId, onSelect }) => {
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [loadingCats, setLoadingCats] = useState(true)
  const [loadingSubs, setLoadingSubs] = useState(false)

  useEffect(() => {
    supabase
      .from('business_type_categories')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        setCategories(data || [])
        setLoadingCats(false)
      })
  }, [])

  useEffect(() => {
    if (!selectedCategoryId) return
    setLoadingSubs(true)
    supabase
      .from('business_type_subcategories')
      .select('*')
      .eq('category_id', selectedCategoryId)
      .order('sort_order')
      .then(({ data }) => {
        setSubcategories(data || [])
        setLoadingSubs(false)
      })
  }, [selectedCategoryId])

  return (
    <div>
      <h2 style={heading}>What kind of business are you?</h2>
      <p style={sub}>This helps us set up the right defaults for you.</p>
      {loadingCats ? (
        <p style={{ color: '#aaa', fontSize: '0.875rem' }}>Loading...</p>
      ) : (
        <>
          <label style={label}>Category</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => onSelect(cat.id, '')} style={selBtn(selectedCategoryId === cat.id)}>
                {cat.category_name}
              </button>
            ))}
          </div>
          {selectedCategoryId && (
            <>
              <label style={label}>Business type</label>
              {loadingSubs ? (
                <p style={{ color: '#aaa', fontSize: '0.875rem' }}>Loading...</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {subcategories.map(sub => (
                    <button key={sub.id} onClick={() => onSelect(selectedCategoryId, sub.id)} style={selBtn(subcategoryId === sub.id)}>
                      {sub.subcategory_name}
                    </button>
                  ))}
                </div>
              )}
              {subcategories.find(s => s.id === subcategoryId)?.is_sensitive && (
                <div style={{ marginTop: '1rem', padding: '0.875rem 1rem', background: '#fef3d9', borderRadius: '8px', border: '1px solid #f0a500' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#7a5c1a', marginBottom: '0.25rem' }}>Confidentiality mode</div>
                  <p style={{ fontSize: '0.8rem', color: '#7a5c1a', margin: 0, lineHeight: 1.5 }}>
                    Your business type operates under professional confidentiality obligations. Your AI assistant will take caller name, number, and urgency only.
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

const Step1BusinessDetails = ({ data, update }) => (
  <div>
    <h2 style={heading}>About your business</h2>
    <p style={sub}>The basics — this is how your AI assistant will introduce and represent your business on every call.</p>
    {[
      { label: 'Business name',          field: 'business_name',     type: 'text',  hint: 'The name your customers know you by.' },
      { label: 'Your name',              field: 'lead_contact_name', type: 'text',  hint: 'The owner or main contact callers would ask for.' },
      { label: 'Business address',       field: 'business_address',  type: 'text',  hint: 'Your main address. Used for context — not read out on calls.' },
      { label: 'Business phone',         field: 'business_phone',    type: 'tel',   hint: 'The number callers will ring.' },
      { label: 'Business email',         field: 'business_email',    type: 'email', hint: 'Where lead notifications will be sent.' },
      { label: 'Booking link (optional)',field: 'booking_link',      type: 'url',   hint: 'A link to your online booking page if you have one.' },
    ].map(({ label: lbl, field, type, hint: h }) => (
      <div key={field} style={{ marginBottom: '1.25rem' }}>
        <label style={label}>{lbl}</label>
        <p style={hint}>{h}</p>
        <input type={type} value={data[field]} onChange={e => update(field, e.target.value)} style={input} />
      </div>
    ))}
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={label}>Describe your business in one or two sentences</label>
      <p style={hint}>What makes you stand out? e.g. "A mobile hairdresser specialising in weddings and proms across South London."</p>
      <textarea
        value={data.business_context}
        onChange={e => update('business_context', e.target.value)}
        rows={3}
        style={{ ...input, resize: 'vertical' }}
      />
    </div>
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={label}>What does a successful call look like for your business?</label>
      <p style={hint}>This shapes how your AI closes every conversation.</p>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
        {[
          { value: 'booking', label: 'I take bookings and appointments' },
          { value: 'quote',   label: 'I discuss, quote, and arrange' },
        ].map(opt => (
          <button key={opt.value} onClick={() => update('business_outcome_type', opt.value)} style={{
            flex: 1, padding: '0.625rem 0.75rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem',
            fontFamily: "'DM Sans', sans-serif", fontWeight: data.business_outcome_type === opt.value ? 600 : 400,
            border: data.business_outcome_type === opt.value ? '2px solid #5e3b87' : '1.5px solid rgba(94,59,135,0.2)',
            background: data.business_outcome_type === opt.value ? '#f4effe' : 'white',
            color: data.business_outcome_type === opt.value ? '#5e3b87' : '#1a1a1a',
          }}>{opt.label}</button>
        ))}
      </div>
    </div>
  </div>
)

const Step2Services = ({ subcategoryId, services, onChange }) => {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!subcategoryId) {
      onChange([emptyRow()])
      setLoading(false)
      return
    }
    supabase
      .from('template_services')
      .select('*')
      .eq('subcategory_id', subcategoryId)
      .order('sort_order')
      .then(({ data }) => {
        if (data && data.length > 0 && services.length === 0) {
          onChange([
            ...data.map(s => ({
              service_name: s.service_name,
              price_from: s.price_from ? String(s.price_from) : '',
              price_to: s.price_to ? String(s.price_to) : '',
              price_note: s.price_note || '',
            })),
            emptyRow()
          ])
        }
        setLoading(false)
      })
  }, [subcategoryId])

  const updateRow = (index, field, value) => onChange(services.map((s, i) => i === index ? { ...s, [field]: value } : s))
  const addRow = () => onChange([...services, emptyRow()])
  const removeRow = (index) => { if (services.length > 1) onChange(services.filter((_, i) => i !== index)) }

  const colInput = { ...input, width: '100%' }

  return (
    <div>
      <h2 style={heading}>Your services</h2>
      <p style={sub}>We've suggested services based on your business type. Edit, overwrite, or leave them as they are. Empty rows are ignored.</p>
      {loading ? (
        <p style={{ color: '#aaa', fontSize: '0.875rem' }}>Loading suggestions...</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.2fr', gap: '0.5rem', marginBottom: '0.375rem', padding: '0 0.25rem' }}>
            {['Service', 'From £', 'To £', ''].map(h => (
              <span key={h} style={{ fontSize: '0.7rem', color: '#aaa', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>
          {services.map((s, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.2fr', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
              <input type="text" placeholder="Service name" value={s.service_name} onChange={e => updateRow(i, 'service_name', e.target.value)} style={colInput} />
              <input type="number" placeholder="0" value={s.price_from} onChange={e => updateRow(i, 'price_from', e.target.value)} style={colInput} />
              <input type="number" placeholder="0" value={s.price_to} onChange={e => updateRow(i, 'price_to', e.target.value)} style={colInput} />
              <button onClick={() => removeRow(i)} disabled={services.length === 1}
                style={{ background: 'none', border: 'none', color: '#ccc', cursor: services.length === 1 ? 'not-allowed' : 'pointer', fontSize: '1.25rem', lineHeight: 1, padding: 0, opacity: services.length === 1 ? 0.3 : 1 }}>×</button>
            </div>
          ))}
          <button onClick={addRow}
            style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', border: '1px dashed rgba(94,59,135,0.25)', borderRadius: '8px', background: 'transparent', color: '#888', fontSize: '0.875rem', cursor: 'pointer', width: '100%', fontFamily: "'DM Sans', sans-serif" }}>
            + Add a row
          </button>
        </>
      )}
    </div>
  )
}

const Step3Boundaries = ({ data, update }) => (
  <div>
    <h2 style={heading}>Your boundaries</h2>
    <p style={sub}>This tells your AI assistant what to do when a caller asks for something outside your normal work.</p>
    {[
      { lbl: 'Area covered', field: 'area_covered', type: 'input', h: 'Where do you work? Leave blank if you\'re not mobile. e.g. "Within 15 miles of Bristol city centre".' },
      { lbl: 'Work you refer to partners', field: 'refer_out', type: 'textarea', h: 'Jobs you don\'t do yourself but pass on. Your AI will take the caller\'s details and refer them.' },
      { lbl: 'Work you won\'t touch', field: 'wont_touch', type: 'textarea', h: 'Hard no. Your AI will politely tell the caller this isn\'t something you cover. e.g. "No gas work, no asbestos."' },
    ].map(({ lbl, field, type, h }) => (
      <div key={field} style={{ marginBottom: '1.25rem' }}>
        <label style={label}>{lbl}</label>
        <p style={hint}>{h}</p>
        {type === 'input'
          ? <input type="text" value={data[field]} onChange={e => update(field, e.target.value)} style={input} />
          : <textarea value={data[field]} onChange={e => update(field, e.target.value)} rows={3} style={{ ...input, resize: 'vertical' }} />
        }
      </div>
    ))}
  </div>
)

const Step4Partners = ({ partners, onChange }) => {
  const addPartner = () => onChange([...partners, { name: '', trade: '', phone: '' }])
  const updatePartner = (i, field, value) => onChange(partners.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  const removePartner = (i) => onChange(partners.filter((_, idx) => idx !== i))

  return (
    <div>
      <h2 style={heading}>Your partners</h2>
      <p style={sub}>Who do you refer work to? When your AI captures a job outside your scope it can pass the caller to someone on this list. You can add more later.</p>
      {partners.length === 0 && (
        <p style={{ color: '#aaa', fontSize: '0.875rem', marginBottom: '1rem' }}>No partners added yet. You can skip this and add them later.</p>
      )}
      {partners.map((p, i) => (
        <div key={i} style={{ border: '1px solid rgba(94,59,135,0.15)', borderRadius: '8px', padding: '1rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#5e3b87', fontFamily: "'DM Sans', sans-serif" }}>Partner {i + 1}</span>
            <button onClick={() => removePartner(i)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>×</button>
          </div>
          {[
            { lbl: 'Name or business name', field: 'name', type: 'text' },
            { lbl: 'What they do', field: 'trade', type: 'text' },
            { lbl: 'Phone number', field: 'phone', type: 'tel' },
          ].map(({ lbl, field, type }) => (
            <div key={field} style={{ marginBottom: '0.625rem' }}>
              <label style={{ ...label, fontSize: '0.75rem' }}>{lbl}</label>
              <input type={type} value={p[field]} onChange={e => updatePartner(i, field, e.target.value)} style={{ ...input, padding: '0.5rem 0.625rem' }} />
            </div>
          ))}
        </div>
      ))}
      <button onClick={addPartner}
        style={{ padding: '0.5rem 1rem', border: '1px dashed rgba(94,59,135,0.25)', borderRadius: '8px', background: 'transparent', color: '#888', fontSize: '0.875rem', cursor: 'pointer', width: '100%', fontFamily: "'DM Sans', sans-serif" }}>
        + Add a partner
      </button>
    </div>
  )
}

// ─── step 0 — website scraping ───────────────────────────────────────────────

const Step0Website = ({ data, update }) => {
  const [url, setUrl] = useState(data.websiteUrl || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { fields, found } or { error }

  const handleScrape = async () => {
    if (!url.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/scrape-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data_r = await res.json()
      if (!res.ok) {
        setResult({ error: data_r.error || 'Could not scan that website.' })
        return
      }
      // Pre-populate all extracted fields
      const f = data_r.fields || {}
      if (f.business_name)    update('business_name', f.business_name)
      if (f.business_phone)   update('business_phone', f.business_phone)
      if (f.business_email)   update('business_email', f.business_email)
      if (f.business_address) update('business_address', f.business_address)
      if (f.opening_hours)    update('opening_hours', f.opening_hours)
      if (f.lead_contact_name) update('lead_contact_name', f.lead_contact_name)
      if (f.business_context) update('business_context', f.business_context)
      if (Array.isArray(f.services) && f.services.length > 0) {
        update('services', f.services.map(s => ({ service_name: s, price_from: '', price_to: '', price_note: '' })))
      }
      update('websiteUrl', url.trim())
      setResult({ fields: f, found: data_r.found })
    } catch {
      setResult({ error: 'Something went wrong. Please fill in your details manually.' })
    } finally {
      setLoading(false)
    }
  }

  const FIELD_LABELS = [
    ['business_name',     'Business name'],
    ['business_phone',    'Phone number'],
    ['business_email',    'Email address'],
    ['business_address',  'Address'],
    ['opening_hours',     'Opening hours'],
    ['lead_contact_name', 'Contact name'],
    ['business_context',  'About the business'],
    ['services',          'Services list'],
  ]

  return (
    <div>
      <h2 style={heading}>Let us do the hard work.</h2>
      <p style={sub}>Enter your website address and we'll fill in your business details automatically.</p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.625rem' }}>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleScrape()}
          placeholder="yourwebsite.co.uk"
          style={{ ...input, flex: 1 }}
        />
        <button
          onClick={handleScrape}
          disabled={loading || !url.trim()}
          style={{ padding: '0.625rem 1.25rem', background: loading || !url.trim() ? '#f5d98a' : '#f0a500', color: '#1a0533', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '0.875rem', cursor: loading || !url.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}
        >
          {loading ? 'Scanning…' : 'Fill in my details →'}
        </button>
      </div>

      {loading && (
        <p style={{ ...hint, color: '#5e3b87' }}>We're scanning your website — this takes a few seconds…</p>
      )}

      {result?.error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '0.75rem' }}>
          <p style={{ fontSize: '0.8rem', color: '#b91c1c', margin: 0 }}>{result.error}</p>
        </div>
      )}

      {result?.fields && !result.error && (
        <div style={{ padding: '1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#15803d', marginBottom: '0.625rem' }}>
            Found {result.found} field{result.found !== 1 ? 's' : ''} — review them in the next steps.
          </div>
          {FIELD_LABELS.filter(([key]) => {
            const v = result.fields[key]
            return key === 'services' ? Array.isArray(v) && v.length > 0 : v
          }).map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <span style={{ color: '#22c55e', flexShrink: 0, fontSize: '0.875rem' }}>✓</span>
              <span style={{ fontSize: '0.8rem', color: '#166534' }}>
                <span style={{ fontWeight: '500' }}>{label}:</span>{' '}
                {key === 'services'
                  ? result.fields.services.slice(0, 4).join(', ') + (result.fields.services.length > 4 ? `… +${result.fields.services.length - 4} more` : '')
                  : String(result.fields[key]).slice(0, 60) + (String(result.fields[key]).length > 60 ? '…' : '')}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: '1px solid rgba(94,59,135,0.1)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
        <p style={{ ...hint, marginBottom: '0.25rem', color: '#888' }}>No website? No problem.</p>
        <p style={hint}>Leave this blank and fill in your details on the next screen.</p>
      </div>
    </div>
  )
}

// ─── step 5 — plan selection ──────────────────────────────────────────────────

const PLAN_TIERS = [
  { id: 'light',        name: 'Light',        price: '£29', minutes: '120 Premium minutes/month' },
  { id: 'standard',     name: 'Standard',     price: '£49', minutes: '250 Premium minutes/month' },
  { id: 'professional', name: 'Professional', price: '£69', minutes: '450 Premium minutes/month' },
  { id: 'enterprise',   name: 'Enterprise',   price: '£249', minutes: '1,000 Premium minutes/month' },
]

const Step5PlanSelection = ({ data, update }) => {
  const billingModel    = data.billing_model || 'subscription'
  const selectedTier    = data.subscription_tier || 'standard'
  const costLimit       = data.monthly_cost_limit ?? 20

  const pathCard = (id, title, desc, tag) => (
    <button
      key={id}
      onClick={() => update('billing_model', id)}
      style={{
        padding: '1.125rem 1.25rem',
        borderRadius: '10px',
        border: billingModel === id ? '2px solid #5e3b87' : '1.5px solid rgba(94,59,135,0.15)',
        background: billingModel === id ? '#f4effe' : 'white',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        marginBottom: '0.625rem',
      }}
    >
      <div style={{ width: 16, height: 16, borderRadius: '50%', border: billingModel === id ? '5px solid #5e3b87' : '1.5px solid #ccc', flexShrink: 0, marginTop: 3 }} />
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
          <span style={{ fontWeight: '600', fontSize: '0.9rem', color: billingModel === id ? '#5e3b87' : '#1a1a1a' }}>{title}</span>
          {tag && <span style={{ fontSize: '0.65rem', background: '#f0a500', color: '#1a0533', borderRadius: '4px', padding: '0.1rem 0.4rem', fontWeight: '700', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{tag}</span>}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#888', lineHeight: 1.55 }}>{desc}</div>
      </div>
    </button>
  )

  return (
    <div>
      <h2 style={heading}>Choose how you pay</h2>
      <p style={sub}>Two options. No lock-in. Cancel any time.</p>

      {pathCard('subscription', 'Commit to a plan', 'Choose your tier below. First month free — subscription starts in month 2.', 'First month free')}
      {pathCard('payg', 'Pay as you go', 'No subscription. No commitment. Billed per minute at 35p/min. Enter a spending limit and we\'ll pause your AI if you reach it.', null)}

      {/* Tier cards for subscription path */}
      {billingModel === 'subscription' && (
        <div style={{ marginTop: '1.25rem' }}>
          <p style={{ ...hint, marginBottom: '0.625rem' }}>Select your plan:</p>
          {PLAN_TIERS.map(t => (
            <button
              key={t.id}
              onClick={() => update('subscription_tier', t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '0.75rem 1rem',
                marginBottom: '0.4rem',
                borderRadius: '8px',
                border: selectedTier === t.id ? '2px solid #5e3b87' : '1px solid rgba(94,59,135,0.12)',
                background: selectedTier === t.id ? '#f4effe' : 'white',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                textAlign: 'left',
              }}
            >
              <span style={{ fontWeight: '600', fontSize: '0.875rem', color: selectedTier === t.id ? '#5e3b87' : '#1a1a1a' }}>{t.name}</span>
              <span style={{ fontSize: '0.8rem', color: '#888' }}>{t.minutes}</span>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: selectedTier === t.id ? '#5e3b87' : '#1a1a1a', flexShrink: 0 }}>{t.price}<span style={{ fontWeight: 400, fontSize: '0.75rem', color: '#aaa' }}>/mo</span></span>
            </button>
          ))}
          <p style={{ ...hint, marginTop: '0.625rem' }}>Premium voice included. Overage billed at 18p/min.</p>
        </div>
      )}

      {/* Cost limit for PAYG path */}
      {billingModel === 'payg' && (
        <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#fef3d9', borderRadius: '8px', border: '1px solid rgba(240,165,0,0.25)' }}>
          <label style={{ ...label, marginBottom: '0.375rem' }}>Monthly spending limit</label>
          <p style={{ ...hint, marginBottom: '0.5rem' }}>We'll pause your AI and notify you when you reach this. You can change it any time in Account settings.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.125rem', color: '#1a1a1a', fontWeight: '600' }}>£</span>
            <input
              type="number"
              min={5}
              step={5}
              value={costLimit}
              onChange={e => update('monthly_cost_limit', parseFloat(e.target.value) || 20)}
              style={{ ...input, width: '100px', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.125rem' }}
            />
            <span style={{ fontSize: '0.8rem', color: '#888' }}>per month</span>
          </div>
          <p style={{ ...hint, marginTop: '0.5rem', marginBottom: 0 }}>At 35p/min, £{costLimit} covers ~{Math.floor(costLimit / 0.35)} minutes.</p>
        </div>
      )}

      {/* The Tenant Tip */}
      <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', background: 'rgba(94,59,135,0.04)', borderRadius: '8px', borderLeft: '3px solid #5e3b87' }}>
        <p style={{ fontSize: '0.825rem', color: '#444', lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>
          "Higher call charges help cover your monthly costs — but there's nothing stopping you from instructing your AI to keep calls short and to the point. Your AI, your rules."
        </p>
      </div>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

const Onboarding = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setSessionReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    supabase
      .from('tenant_memberships')
      .select('tenant_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) navigate('/portal', { replace: true })
      })
  }, [user])

  const [data, setData] = useState({
    selectedCategoryId: '',
    subcategory_id: '',
    business_name: '',
    lead_contact_name: '',
    business_address: '',
    business_phone: '',
    business_email: '',
    booking_link: '',
    business_context: '',
    business_outcome_type: 'quote',
    area_covered: '',
    refer_out: '',
    wont_touch: '',
    services: [],
    partners: [],
    billing_model: 'subscription',
    subscription_tier: 'standard',
    monthly_cost_limit: 20,
    websiteUrl: '',
  })

  const update = (field, value) => setData(prev => ({ ...prev, [field]: value }))

  const handleFinish = async () => {
    setLoading(true)
    setError(null)

    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    const businessContext = [
      data.business_context,
      data.area_covered ? `Area covered: ${data.area_covered}` : '',
      data.refer_out ? `Work referred to partners: ${data.refer_out}` : '',
      data.wont_touch ? `Work we won't take: ${data.wont_touch}` : '',
    ].filter(Boolean).join('\n\n')

    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        business_name: data.business_name,
        lead_contact_name: data.lead_contact_name,
        business_address: data.business_address,
        business_phone: data.business_phone,
        business_email: data.business_email,
        booking_link: data.booking_link,
        business_context: businessContext,
        subcategory_id: data.subcategory_id || null,
        business_outcome_type: data.business_outcome_type || 'quote',
        referral_code: referralCode,
        billing_model: data.billing_model || 'subscription',
        subscription_tier: data.billing_model === 'payg' ? 'free' : (data.subscription_tier || 'standard'),
        monthly_cost_limit: data.billing_model === 'payg' ? (data.monthly_cost_limit || 20) : null,
        active: true,
      })
      .select()
      .maybeSingle()

    if (tenantError) {
      setError(tenantError.message)
      setLoading(false)
      return
    }

    const activeServices = data.services.filter(s => s.service_name.trim() !== '')
    if (activeServices.length > 0) {
      const { error: servicesError } = await supabase.from('services').insert(
        activeServices.map((s, i) => ({
          tenant_id: tenantData.id,
          service_name: s.service_name.trim(),
          price_from: s.price_from ? Number(s.price_from) : null,
          price_to: s.price_to ? Number(s.price_to) : null,
          price_note: s.price_note || null,
          active: true,
          sort_order: i + 1,
        }))
      )
      if (servicesError) {
        setError(servicesError.message)
        setLoading(false)
        return
      }
    }

    const activePartners = data.partners.filter(p => p.name.trim() !== '')
    if (activePartners.length > 0) {
      const { error: partnersError } = await supabase.from('referral_partners').insert(
        activePartners.map(p => ({
          tenant_id: tenantData.id,
          partner_name: p.name.trim(),
          service_type: p.trade.trim(),
          contact_phone: p.phone.trim(),
          partner_status: 'active',
          active: true,
        }))
      )
      if (partnersError) {
        setError(partnersError.message)
        setLoading(false)
        return
      }
    }

    const { error: membershipError } = await supabase.from('tenant_memberships').insert({
      tenant_id: tenantData.id,
      user_id: user.id,
      role: 'owner',
    })

    if (membershipError) {
      console.error('Membership insert error:', membershipError)
      setError(`Account created but could not link your user: ${membershipError.message}`)
      setLoading(false)
      return
    }

    navigate('/portal')
  }

  const progressPct = ((step + 1) / steps.length) * 100

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.75rem' }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#5e3b87', fontSize: '1.25rem', letterSpacing: '-0.01em' }}>Verrante</span>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f0a500', display: 'inline-block', marginLeft: 3, marginBottom: 8, flexShrink: 0 }} />
      </div>

      {/* Card */}
      <div style={{ background: 'white', borderRadius: '14px', border: '0.5px solid rgba(94,59,135,0.12)', boxShadow: '0 4px 24px rgba(94,59,135,0.07)', width: '100%', maxWidth: '560px', padding: '2.5rem' }}>

        {/* Progress */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#aaa' }}>
              Step <span style={{ color: '#f0a500', fontWeight: 600 }}>{step + 1}</span> of {steps.length}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#aaa' }}>{steps[step]}</span>
          </div>
          <div style={{ height: '3px', background: 'rgba(94,59,135,0.1)', borderRadius: '9999px' }}>
            <div style={{ height: '3px', background: '#5e3b87', borderRadius: '9999px', width: `${progressPct}%`, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Step content */}
        {step === 0 && <Step0Website data={data} update={update} />}
        {step === 1 && (
          <Step0BusinessType
            selectedCategoryId={data.selectedCategoryId}
            subcategoryId={data.subcategory_id}
            onSelect={(categoryId, subcategoryId) => {
              update('selectedCategoryId', categoryId)
              update('subcategory_id', subcategoryId)
              update('services', [])
            }}
          />
        )}
        {step === 2 && <Step1BusinessDetails data={data} update={update} />}
        {step === 3 && (
          <Step2Services
            subcategoryId={data.subcategory_id}
            services={data.services}
            onChange={services => update('services', services)}
          />
        )}
        {step === 4 && <Step3Boundaries data={data} update={update} />}
        {step === 5 && (
          <Step4Partners
            partners={data.partners}
            onChange={partners => update('partners', partners)}
          />
        )}
        {step === 6 && (
          <Step5PlanSelection data={data} update={update} />
        )}
        {step === 7 && (
          <div>
            <h2 style={heading}>You're ready to launch</h2>
            <p style={sub}>Here's what we've set up for you.</p>
            {[
              { label: 'Business name', value: data.business_name },
              { label: 'Owner',         value: data.lead_contact_name },
              { label: 'Address',       value: data.business_address },
              { label: 'Phone',         value: data.business_phone },
              { label: 'Email',         value: data.business_email },
              { label: 'Booking link',  value: data.booking_link },
              { label: 'About',         value: data.business_context },
              { label: 'Area covered',  value: data.area_covered },
              { label: 'Refers out',    value: data.refer_out },
              { label: "Won't touch",   value: data.wont_touch },
              { label: 'Services',      value: data.services.filter(s => s.service_name.trim()).map(s => s.service_name).join(', ') },
              { label: 'Partners',      value: data.partners.filter(p => p.name.trim()).map(p => p.name).join(', ') },
              { label: 'Billing',       value: data.billing_model === 'payg' ? `Pay as you go · £${data.monthly_cost_limit}/month limit` : `${(data.subscription_tier || 'standard').charAt(0).toUpperCase() + (data.subscription_tier || 'standard').slice(1)} plan · first month free` },
            ].filter(item => item.value).map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(94,59,135,0.06)' }}>
                <span style={{ fontSize: '0.8rem', color: '#aaa', flexShrink: 0, marginRight: '1rem' }}>{item.label}</span>
                <span style={{ fontSize: '0.875rem', color: '#1a1a1a', fontWeight: '500', textAlign: 'right' }}>{item.value}</span>
              </div>
            ))}
            {error && <p style={{ color: '#b91c1c', marginTop: '1rem', fontSize: '0.875rem' }}>{error}</p>}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            style={{
              padding: '0.625rem 1.25rem',
              border: '1px solid rgba(94,59,135,0.2)',
              borderRadius: '8px',
              background: 'transparent',
              color: '#5e3b87',
              fontSize: '0.875rem',
              cursor: step === 0 ? 'not-allowed' : 'pointer',
              opacity: step === 0 ? 0.35 : 1,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Back
          </button>
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              style={{
                padding: '0.625rem 1.5rem',
                background: '#f0a500',
                color: '#1a0533',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={loading || !sessionReady}
              style={{
                padding: '0.625rem 1.5rem',
                background: loading || !sessionReady ? '#f5d98a' : '#f0a500',
                color: '#1a0533',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: loading || !sessionReady ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {loading ? 'Launching…' : !sessionReady ? 'Loading…' : 'Launch my portal'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Onboarding
