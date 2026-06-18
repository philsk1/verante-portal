import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'

const STEPS_ANSWER = [
  'Choose product',
  'Your website',
  'Business type',
  'About your business',
  'Your services',
  'Your boundaries',
  'Your partners',
  'Choose your plan',
  'Review & launch',
]

const STEPS_CALENDAR = [
  'Choose product',
  'About your business',
  'Appointment types',
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
    {/* Business name + Your name — side by side */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
      {[
        { label: 'Business name',    field: 'business_name',     type: 'text',  hint: 'The name your customers know you by.' },
        { label: 'Your name',        field: 'lead_contact_name', type: 'text',  hint: 'The owner or main contact callers would ask for.' },
      ].map(({ label: lbl, field, type, hint: h }) => (
        <div key={field}>
          <label style={label}>{lbl}</label>
          <p style={hint}>{h}</p>
          <input type={type} value={data[field]} onChange={e => update(field, e.target.value)} style={input} />
        </div>
      ))}
    </div>
    {/* Address — full width */}
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={label}>Business address</label>
      <p style={hint}>Your main address. Used for context — not read out on calls.</p>
      <input type="text" value={data.business_address} onChange={e => update('business_address', e.target.value)} style={input} />
    </div>
    {/* Phone + Email — side by side */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
      {[
        { label: 'Business phone', field: 'business_phone', type: 'tel',   hint: 'The number callers will ring.' },
        { label: 'Business email', field: 'business_email', type: 'email', hint: 'Where lead notifications will be sent.' },
      ].map(({ label: lbl, field, type, hint: h }) => (
        <div key={field}>
          <label style={label}>{lbl}</label>
          <p style={hint}>{h}</p>
          <input type={type} value={data[field]} onChange={e => update(field, e.target.value)} style={input} />
        </div>
      ))}
    </div>
    {/* Booking link — full width */}
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={label}>Booking link (optional)</label>
      <p style={hint}>A link to your online booking page if you have one.</p>
      <input type="url" value={data.booking_link} onChange={e => update('booking_link', e.target.value)} style={input} />
    </div>
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
            background: data.business_outcome_type === opt.value ? '#f0ebf8' : 'white',
            color: data.business_outcome_type === opt.value ? '#5e3b87' : '#1a1a1a',
          }}>{opt.label}</button>
        ))}
      </div>
    </div>
  </div>
)

const Step2Services = ({ subcategoryId, services, onChange, labelOverride, subOverride }) => {
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
      <h2 style={heading}>{labelOverride || 'Your services'}</h2>
      <p style={sub}>{subOverride || "We've suggested services based on your business type. Edit, overwrite, or leave them as they are. Empty rows are ignored."}</p>
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
          {/* Name + Phone side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.625rem' }}>
            {[
              { lbl: 'Name or business name', field: 'name', type: 'text' },
              { lbl: 'Phone number', field: 'phone', type: 'tel' },
            ].map(({ lbl, field, type }) => (
              <div key={field}>
                <label style={{ ...label, fontSize: '0.75rem' }}>{lbl}</label>
                <input type={type} value={p[field]} onChange={e => updatePartner(i, field, e.target.value)} style={{ ...input, padding: '0.5rem 0.625rem' }} />
              </div>
            ))}
          </div>
          {/* Trade — full width */}
          <div style={{ marginBottom: '0.625rem' }}>
            <label style={{ ...label, fontSize: '0.75rem' }}>What they do</label>
            <input type="text" value={p.trade} onChange={e => updatePartner(i, 'trade', e.target.value)} style={{ ...input, padding: '0.5rem 0.625rem' }} />
          </div>
        </div>
      ))}
      <button onClick={addPartner}
        style={{ padding: '0.5rem 1rem', border: '1px dashed rgba(94,59,135,0.25)', borderRadius: '8px', background: 'transparent', color: '#888', fontSize: '0.875rem', cursor: 'pointer', width: '100%', fontFamily: "'DM Sans', sans-serif" }}>
        + Add a partner
      </button>
    </div>
  )
}

// ─── step 0 — product choice ─────────────────────────────────────────────────

const StepProductChoice = ({ product, onSelect }) => (
  <div>
    <h2 style={heading}>What are you setting up?</h2>
    <p style={sub}>Choose your starting point. You can add more products later.</p>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginTop: '1.25rem' }}>
      {[
        { id: 'answer', icon: '📞', title: 'Answer', desc: 'AI answers calls, captures leads, and handles enquiries when you\'re busy.' },
        { id: 'calendar', icon: '📅', title: 'Calendar', desc: 'Online booking, appointment management, and team scheduling.' },
      ].map(p => (
        <button key={p.id} onClick={() => onSelect(p.id)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.6rem',
            padding: '1.15rem', border: product === p.id ? '2px solid #5e3b87' : '1.5px solid rgba(94,59,135,0.15)',
            borderRadius: 12, background: product === p.id ? '#f3f0f9' : 'white',
            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', width: '100%',
          }}>
          <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{p.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#1a1a1a', marginBottom: 4 }}>{p.title}</div>
            <div style={{ fontSize: '0.78rem', color: '#888', lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>{p.desc}</div>
          </div>
          {product === p.id && (
            <div style={{ alignSelf: 'flex-end', fontSize: '0.65rem', fontWeight: 700, color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'DM Sans', sans-serif" }}>Selected ✓</div>
          )}
        </button>
      ))}
    </div>
  </div>
)

// ─── trade templates ─────────────────────────────────────────────────────────

const TRADE_TEMPLATES = {
  plumber:     { label: 'Plumber',          context: 'A plumbing business serving residential and commercial customers. We handle emergency callouts, boiler repairs, bathroom installations, leak detection, and general plumbing maintenance.', services: ['Emergency callout', 'Boiler service & repair', 'Leak repair', 'Bathroom installation', 'Blocked drain'], emergencyKeywords: ['burst pipe', 'flooding', 'no hot water', 'no heating', 'gas leak', 'leak'], callbackNote: 'We aim to call back within 1 hour for emergencies and within 2 hours for standard enquiries.' },
  electrician: { label: 'Electrician',      context: 'An electrical services business covering domestic and commercial work. We handle fault finding, consumer unit upgrades, EV charger installation, and full rewires.', services: ['Emergency fault finding', 'Consumer unit upgrade', 'EV charger installation', 'Full rewire', 'PAT testing'], emergencyKeywords: ['power cut', 'sparking', 'burning smell', 'no power', 'electrical fault'], callbackNote: 'We aim to call back within 1 hour for electrical emergencies and the same day for standard work.' },
  cleaner:     { label: 'Cleaner',          context: 'A professional cleaning business offering domestic and commercial cleaning services. We provide regular cleans, one-off deep cleans, and end-of-tenancy cleans.', services: ['Regular domestic clean', 'Deep clean', 'End-of-tenancy clean', 'Office clean', 'Carpet clean'], emergencyKeywords: [], callbackNote: 'We aim to call back within 2 hours to discuss your requirements and provide a quote.' },
  builder:     { label: 'Builder',          context: 'A building and contracting business handling extensions, renovations, roofing, and property maintenance for residential customers.', services: ['House extension', 'Loft conversion', 'Bathroom renovation', 'Kitchen renovation', 'Roof repair'], emergencyKeywords: ['roof leak', 'structural damage', 'flooding', 'collapse'], callbackNote: 'We aim to call back within 2 hours to discuss your project and arrange a site visit.' },
  locksmith:   { label: 'Locksmith',        context: 'An emergency and non-emergency locksmith service. We handle lockouts, lock changes, key cutting, and security upgrades for residential and commercial properties.', services: ['Emergency lockout', 'Lock change', 'Key cutting', 'Safe installation', 'Security assessment'], emergencyKeywords: ['locked out', 'break-in', 'burglary', 'lost keys'], callbackNote: 'For lockouts we aim to be with you within 30 minutes. We will call you back immediately.' },
  physio:      { label: 'Physio',           context: 'A physiotherapy practice providing assessment and treatment for musculoskeletal conditions, sports injuries, and post-operative rehabilitation.', services: ['Initial assessment', 'Follow-up treatment', 'Sports massage', 'Acupuncture', 'Home visit'], emergencyKeywords: ['severe pain', 'cant walk', 'accident'], callbackNote: 'We aim to call back within 2 hours to discuss your needs and arrange an appointment.' },
  gardener:    { label: 'Gardener',         context: 'A gardening and landscaping business offering regular garden maintenance, one-off tidy-ups, tree surgery, and full landscaping projects.', services: ['Regular maintenance', 'One-off tidy-up', 'Lawn care', 'Tree surgery', 'Landscaping project'], emergencyKeywords: ['fallen tree', 'storm damage'], callbackNote: 'We aim to call back within 2 hours to discuss your requirements and provide a quote.' },
  trainer:     { label: 'Personal Trainer', context: 'A personal training and fitness coaching business offering one-to-one sessions, group classes, and nutrition guidance.', services: ['1-to-1 personal training', 'Group session', 'Online coaching', 'Nutrition advice', 'Fitness assessment'], emergencyKeywords: [], callbackNote: 'We aim to call back within 2 hours to discuss your fitness goals.' },
  accountant:  { label: 'Accountant',       context: 'An accounting and bookkeeping practice supporting small businesses and sole traders with tax returns, VAT, payroll, and financial advice.', services: ['Self-assessment tax return', 'VAT registration & returns', 'Payroll', 'Bookkeeping', 'Business accounts'], emergencyKeywords: ['HMRC deadline', 'penalty notice'], callbackNote: 'We aim to call back within 2 hours. Please mention if your matter is urgent.' },
  beauty:      { label: 'Beauty & Hair',    context: 'A hair and beauty studio offering cuts, colour, nails, facials, and beauty treatments by appointment.', services: ['Haircut', 'Colour & highlights', 'Nails', 'Facial', 'Massage'], emergencyKeywords: [], callbackNote: 'We aim to call back within 2 hours to arrange your appointment.' },
}

// ─── step 0 (answer) — website scraping ──────────────────────────────────────

const Step0Website = ({ data, update }) => {
  const [url, setUrl] = useState(data.websiteUrl || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { fields, found } or { error }
  const [scrapeOptions, setScrapeOptions] = useState({
    details:  true,
    hours:    true,
    services: true,
    team:     true,
    about:    true,
  })
  const [selectedTrade, setSelectedTrade] = useState(null)
  const [callState, setCallState] = useState('idle') // idle | connecting | active
  const [callError, setCallError] = useState(null)
  const vapiRef = useRef(null)

  const handleSelectTrade = (key) => {
    const t = TRADE_TEMPLATES[key]
    setSelectedTrade(key)
    if (t.context)           update('business_context', t.context)
    if (t.callbackNote)      update('callback_preference_note', t.callbackNote)
    if (t.emergencyKeywords) update('emergency_keywords', t.emergencyKeywords)
    if (t.services?.length)  update('services', t.services.map(s => ({ service_name: s, price_from: '', price_to: '', price_note: '' })))
  }

  useEffect(() => {
    const key = import.meta.env.VITE_VAPI_PUBLIC_KEY
    if (!key) return
    let vapi
    import('@vapi-ai/web').then(({ default: Vapi }) => {
      vapi = new Vapi(key)
      vapiRef.current = vapi
      vapi.on('call-start', () => setCallState('active'))
      vapi.on('call-end',   () => { setCallState('idle'); setCallError(null) })
      vapi.on('error',      () => { setCallState('idle'); setCallError('Could not connect — check microphone permissions.') })
    }).catch(() => {})
    return () => { vapiRef.current?.stop() }
  }, [])

  const startDemoCall = async () => {
    if (!vapiRef.current) { setCallError('Demo calling not configured.'); return }
    setCallState('connecting')
    setCallError(null)
    const t = selectedTrade ? TRADE_TEMPLATES[selectedTrade] : null
    const name = data.business_name || 'this business'
    const systemParts = [
      `You are a demo AI receptionist for ${name}.`,
      t?.context || '',
      t?.services?.length ? `Services offered: ${t.services.slice(0, 5).join(', ')}.` : '',
      t?.emergencyKeywords?.length ? `If the caller mentions ${t.emergencyKeywords.slice(0, 4).join(', ')}, say you will escalate to the owner immediately and take their number.` : '',
      'This is a demonstration so the business owner can hear what you sound like. Be natural, professional, and concise — keep every response under two sentences.',
    ].filter(Boolean).join(' ')
    await vapiRef.current.start({
      firstMessage: `Hello, you've reached ${name}. I'm your Qerxel AI — I handle calls around the clock. How can I help?`,
      model: { provider: 'openai', model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemParts }], temperature: 0.4 },
      voice: { provider: 'deepgram', voiceId: 'aura-stella-en' },
      maxDurationSeconds: 180,
    })
  }

  const stopDemoCall = () => {
    vapiRef.current?.stop()
    setCallState('idle')
  }

  const handleScrape = async () => {
    if (!url.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data_r = await res.json()
      if (!res.ok) {
        setResult({ error: data_r.error || 'Could not scan that website.' })
        return
      }
      // Pre-populate fields based on selected scrape options
      const f = data_r.fields || {}
      if (scrapeOptions.details) {
        if (f.business_name)     update('business_name', f.business_name)
        if (f.business_phone)    update('business_phone', f.business_phone)
        if (f.business_email)    update('business_email', f.business_email)
        if (f.business_address)  update('business_address', f.business_address)
        if (f.lead_contact_name) update('lead_contact_name', f.lead_contact_name)
      }
      if (scrapeOptions.hours && f.opening_hours) update('opening_hours', f.opening_hours)
      if (scrapeOptions.about && f.business_context) update('business_context', f.business_context)
      if (scrapeOptions.services) {
        if (Array.isArray(f.services) && f.services.length > 0) {
          update('services', f.services.map(s => ({ service_name: s, price_from: '', price_to: '', price_note: '' })))
        }
        if (Array.isArray(f.catalogue_items) && f.catalogue_items.length > 0) {
          update('scrapedCatalogue', f.catalogue_items)
        }
      }
      if (scrapeOptions.team && Array.isArray(f.staff) && f.staff.length > 0) {
        update('scrapedStaff', f.staff)
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
    ['services',          'Services'],
    ['staff',             'Team members'],
    ['catalogue_items',   'Priced services'],
  ]

  return (
    <div>
      <h2 style={heading}>Let us do the hard work.</h2>
      <p style={sub}>Pick your trade and we'll fill in the AI settings. Add your website for the rest.</p>

      {/* Trade picker */}
      <div style={{ marginBottom: '1.25rem' }}>
        <p style={{ ...hint, marginBottom: '0.5rem', fontWeight: 600, color: '#444' }}>What kind of business are you?</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {Object.entries(TRADE_TEMPLATES).map(([key, t]) => (
            <button
              key={key}
              onClick={() => handleSelectTrade(key)}
              style={{
                padding: '0.35rem 0.8rem',
                background: selectedTrade === key ? '#5e3b87' : 'white',
                color: selectedTrade === key ? 'white' : '#444',
                border: `1px solid ${selectedTrade === key ? '#5e3b87' : 'rgba(94,59,135,0.25)'}`,
                borderRadius: '999px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: selectedTrade === key ? 600 : 400,
                transition: 'all 0.12s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        {selectedTrade && (
          <p style={{ ...hint, marginTop: '0.5rem', color: '#5e3b87' }}>
            AI settings pre-filled for {TRADE_TEMPLATES[selectedTrade].label.toLowerCase()}. Add your website below for business details.
          </p>
        )}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <p style={{ ...hint, marginBottom: '0.5rem', fontWeight: 600, color: '#444' }}>What would you like to fill in?</p>
        {[
          ['details',  'Business details',   'name, phone, email, address'],
          ['hours',    'Opening hours',       ''],
          ['services', 'Services & pricing',  ''],
          ['team',     'Team members',        ''],
          ['about',    'About the business',  ''],
        ].map(([key, label, desc]) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={scrapeOptions[key]}
              onChange={e => setScrapeOptions(prev => ({ ...prev, [key]: e.target.checked }))}
              style={{ width: 16, height: 16, accentColor: '#5e3b87', cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: '0.8rem', color: '#333', fontFamily: "'DM Sans', sans-serif" }}>
              {label}
              {desc && <span style={{ color: '#999', fontSize: '0.75rem' }}> — {desc}</span>}
            </span>
          </label>
        ))}
      </div>

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
          {loading ? 'Scanning…' : 'Check my website →'}
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
          {(() => {
            const DETAIL_KEYS = ['business_name','business_phone','business_email','business_address','lead_contact_name']
            const isPopulated = (key) => {
              if (DETAIL_KEYS.includes(key))       return scrapeOptions.details
              if (key === 'opening_hours')          return scrapeOptions.hours
              if (['services','catalogue_items'].includes(key)) return scrapeOptions.services
              if (key === 'staff')                  return scrapeOptions.team
              if (key === 'business_context')       return scrapeOptions.about
              return true
            }
            const filledCount = FIELD_LABELS.filter(([key]) => {
              const v = result.fields[key]
              const found = ['services','staff','catalogue_items'].includes(key) ? Array.isArray(v) && v.length > 0 : v
              return found && isPopulated(key)
            }).length
            return (
              <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#15803d', marginBottom: '0.625rem' }}>
                Filled in {filledCount} field{filledCount !== 1 ? 's' : ''} — review them in the next steps.
              </div>
            )
          })()}
          {FIELD_LABELS.filter(([key]) => {
            const v = result.fields[key]
            const found = ['services','staff','catalogue_items'].includes(key) ? Array.isArray(v) && v.length > 0 : v
            if (!found) return false
            const DETAIL_KEYS = ['business_name','business_phone','business_email','business_address','lead_contact_name']
            if (DETAIL_KEYS.includes(key))       return scrapeOptions.details
            if (key === 'opening_hours')          return scrapeOptions.hours
            if (['services','catalogue_items'].includes(key)) return scrapeOptions.services
            if (key === 'staff')                  return scrapeOptions.team
            if (key === 'business_context')       return scrapeOptions.about
            return true
          }).map(([key, label]) => {
            const v = result.fields[key]
            let preview
            if (key === 'services') {
              preview = v.slice(0, 4).join(', ') + (v.length > 4 ? ` +${v.length - 4} more` : '')
            } else if (key === 'staff') {
              preview = v.map(m => m.name).slice(0, 3).join(', ') + (v.length > 3 ? ` +${v.length - 3} more` : '')
            } else if (key === 'catalogue_items') {
              preview = `${v.length} item${v.length !== 1 ? 's' : ''} with pricing`
            } else {
              preview = String(v).slice(0, 60) + (String(v).length > 60 ? '…' : '')
            }
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <span style={{ color: '#22c55e', flexShrink: 0, fontSize: '0.875rem' }}>✓</span>
                <span style={{ fontSize: '0.8rem', color: '#166534' }}>
                  <span style={{ fontWeight: '500' }}>{label}:</span>{' '}{preview}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ borderTop: '1px solid rgba(94,59,135,0.1)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
        <p style={{ ...hint, marginBottom: '0.25rem', color: '#888' }}>No website? No problem.</p>
        <p style={hint}>Leave the website blank and fill in your details on the next screen.</p>
      </div>

      {/* Hear your AI — browser call via Vapi Web SDK */}
      {import.meta.env.VITE_VAPI_PUBLIC_KEY && (
        <div style={{ borderTop: '1px solid rgba(94,59,135,0.1)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
          <p style={{ ...hint, fontWeight: 600, color: '#444', marginBottom: '0.3rem' }}>Hear your AI right now</p>
          <p style={{ ...hint, marginBottom: '0.75rem' }}>No phone needed — talk to it directly in your browser. Experience it from your caller's perspective.</p>
          {callState === 'idle' && (
            <button
              onClick={startDemoCall}
              style={{ padding: '0.625rem 1.25rem', background: '#5e3b87', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >
              Talk to your AI →
            </button>
          )}
          {callState === 'connecting' && (
            <button disabled style={{ padding: '0.625rem 1.25rem', background: '#d1c4e9', color: '#5e3b87', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif" }}>
              Connecting…
            </button>
          )}
          {callState === 'active' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#3db87a', fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>● Live</span>
              <button
                onClick={stopDemoCall}
                style={{ padding: '0.5rem 1rem', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
              >
                End call
              </button>
            </div>
          )}
          {callError && (
            <p style={{ fontSize: '0.78rem', marginTop: '0.5rem', color: '#b91c1c', fontFamily: "'DM Sans', sans-serif" }}>{callError}</p>
          )}
        </div>
      )}
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
        background: billingModel === id ? '#f0ebf8' : 'white',
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
                background: selectedTier === t.id ? '#f0ebf8' : 'white',
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
    product: 'answer',
    selectedCategoryId: '',
    subcategory_id: '',
    business_name: '',
    lead_contact_name: '',
    business_address: '',
    business_phone: '',
    business_email: '',
    booking_link: '',
    business_context: '',
    opening_hours: '',
    emergency_keywords: [],
    callback_preference_note: '',
    business_outcome_type: 'quote',
    area_covered: '',
    refer_out: '',
    wont_touch: '',
    services: [],
    partners: [],
    scrapedStaff: [],
    scrapedCatalogue: [],
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

    const isCalendar = data.product === 'calendar'

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
        opening_hours: data.opening_hours || null,
        emergency_keywords: Array.isArray(data.emergency_keywords) && data.emergency_keywords.length > 0 ? data.emergency_keywords : null,
        callback_preference_note: data.callback_preference_note || null,
        subcategory_id: data.subcategory_id || null,
        business_outcome_type: isCalendar ? 'booked' : (data.business_outcome_type || 'quote'),
        referral_code: referralCode,
        billing_model: data.billing_model || 'subscription',
        subscription_tier: data.billing_model === 'payg' ? 'free' : (data.subscription_tier || 'standard'),
        monthly_cost_limit: data.billing_model === 'payg' ? (data.monthly_cost_limit || 20) : null,
        calendar_tier: isCalendar ? 'entry' : 'none',
        active: true,
      })
      .select()
      .maybeSingle()

    if (tenantError) {
      setError(tenantError.message)
      setLoading(false)
      return
    }

    // Membership must be created before any other data writes — RLS on services,
    // catalogue_items, staff_profiles etc. all require is_tenant_member() to pass.
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

    const activeServices = data.services.filter(s => s.service_name.trim() !== '')
    if (activeServices.length > 0) {
      if (isCalendar) {
        // Calendar path: appointment types go into catalogue_items
        await supabase.from('catalogue_items').insert(
          activeServices.map(s => ({
            tenant_id: tenantData.id,
            item_type: 'service',
            name: s.service_name.trim(),
            price_from: s.price_from ? Number(s.price_from) : null,
            price_to: s.price_to ? Number(s.price_to) : null,
            active: true,
          }))
        )
      } else {
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

    if (data.scrapedStaff.length > 0) {
      await supabase.from('staff_profiles').insert(
        data.scrapedStaff.map(m => ({
          tenant_id: tenantData.id,
          name: m.name,
          role: m.role || null,
          active: true,
        }))
      )
    }

    if (data.scrapedCatalogue.length > 0) {
      await supabase.from('catalogue_items').insert(
        data.scrapedCatalogue.map(item => ({
          tenant_id: tenantData.id,
          item_type: 'service',
          name: item.name,
          description: item.description || null,
          price_from: item.price_from || null,
          price_to: item.price_to || null,
          duration_minutes: item.duration_minutes || null,
          active: true,
        }))
      )
    }

    // Fire welcome email — fire and forget, don't block navigation
    fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send-welcome', tenantId: tenantData.id }),
    }).catch(() => {})

    // Create Vapi assistant — fire and forget
    fetch('/api/vapi-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: tenantData.id }),
    }).catch(() => {})

    navigate('/portal')
  }

  const activeSteps = data.product === 'calendar' ? STEPS_CALENDAR : STEPS_ANSWER
  const progressPct = ((step + 1) / activeSteps.length) * 100

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.75rem' }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#5e3b87', fontSize: '1.25rem', letterSpacing: '-0.01em' }}>Qerxel</span>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f0a500', display: 'inline-block', marginLeft: 3, marginBottom: 8, flexShrink: 0 }} />
      </div>

      {/* Card */}
      <div style={{ background: 'white', borderRadius: '14px', border: '0.5px solid rgba(94,59,135,0.12)', boxShadow: '0 4px 24px rgba(94,59,135,0.07)', width: '100%', maxWidth: '560px', padding: '2.5rem' }}>

        {/* Progress */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#aaa' }}>
              Step <span style={{ color: '#f0a500', fontWeight: 600 }}>{step + 1}</span> of {activeSteps.length}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#aaa' }}>{activeSteps[step]}</span>
          </div>
          <div style={{ height: '3px', background: 'rgba(94,59,135,0.1)', borderRadius: '9999px' }}>
            <div style={{ height: '3px', background: '#5e3b87', borderRadius: '9999px', width: `${progressPct}%`, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Step content */}
        {step === 0 && (
          <StepProductChoice product={data.product} onSelect={p => update('product', p)} />
        )}

        {/* ── Answer path ─────────────────────────────────────────────────── */}
        {data.product === 'answer' && step === 1 && <Step0Website data={data} update={update} />}
        {data.product === 'answer' && step === 2 && (
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
        {data.product === 'answer' && step === 3 && <Step1BusinessDetails data={data} update={update} />}
        {data.product === 'answer' && step === 4 && (
          <Step2Services
            subcategoryId={data.subcategory_id}
            services={data.services}
            onChange={services => update('services', services)}
          />
        )}
        {data.product === 'answer' && step === 5 && <Step3Boundaries data={data} update={update} />}
        {data.product === 'answer' && step === 6 && (
          <Step4Partners
            partners={data.partners}
            onChange={partners => update('partners', partners)}
          />
        )}
        {data.product === 'answer' && step === 7 && <Step5PlanSelection data={data} update={update} />}

        {/* ── Calendar path ────────────────────────────────────────────────── */}
        {data.product === 'calendar' && step === 1 && <Step1BusinessDetails data={data} update={update} />}
        {data.product === 'calendar' && step === 2 && (
          <Step2Services
            subcategoryId=""
            services={data.services}
            onChange={services => update('services', services)}
            labelOverride="Appointment types"
            subOverride="List your bookable services — e.g. Haircut, Consultation, 60-min massage."
          />
        )}
        {data.product === 'calendar' && step === 3 && <Step5PlanSelection data={data} update={update} />}

        {/* ── Shared: review & launch ─────────────────────────────────────── */}
        {(
          (data.product === 'answer' && step === 8) ||
          (data.product === 'calendar' && step === 4)
        ) && (
          <div>
            <h2 style={heading}>You're ready to launch</h2>
            <p style={sub}>Here's what we've set up for you.</p>
            {[
              { label: 'Business name', value: data.business_name },
              { label: 'Owner',         value: data.lead_contact_name },
              { label: 'Phone',         value: data.business_phone },
              { label: 'Email',         value: data.business_email },
              { label: 'Booking link',  value: data.booking_link },
              { label: 'About',         value: data.business_context },
              ...(data.product !== 'calendar' ? [
                { label: 'Area covered',  value: data.area_covered },
                { label: 'Refers out',    value: data.refer_out },
                { label: "Won't touch",   value: data.wont_touch },
                { label: 'Partners',      value: data.partners.filter(p => p.name.trim()).map(p => p.name).join(', ') },
              ] : []),
              { label: data.product === 'calendar' ? 'Appointment types' : 'Services', value: data.services.filter(s => s.service_name.trim()).map(s => s.service_name).join(', ') },
              { label: 'Billing', value: data.billing_model === 'payg' ? `Pay as you go · £${data.monthly_cost_limit}/month limit` : `${(data.subscription_tier || 'standard').charAt(0).toUpperCase() + (data.subscription_tier || 'standard').slice(1)} plan · first month free` },
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
          {step < activeSteps.length - 1 ? (
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
