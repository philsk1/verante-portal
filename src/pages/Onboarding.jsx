import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'

const steps = [
  'Business type',
  'About your business',
  'Your services',
  'Your boundaries',
  'Your partners',
  'Review & launch'
]

const emptyRow = () => ({ service_name: '', price_from: '', price_to: '', price_note: '' })

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
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#0f172a', marginBottom: '0.5rem' }}>What kind of business are you?</h2>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>This helps us set up the right defaults for you.</p>
      {loadingCats ? (
        <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Loading...</p>
      ) : (
        <>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>Category</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => onSelect(cat.id, '')}
                style={{
                  padding: '0.625rem 0.75rem',
                  border: `2px solid ${selectedCategoryId === cat.id ? '#6366f1' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  background: selectedCategoryId === cat.id ? '#eef2ff' : 'white',
                  color: selectedCategoryId === cat.id ? '#4f46e5' : '#374151',
                  fontSize: '0.875rem',
                  fontWeight: selectedCategoryId === cat.id ? '600' : '400',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s'
                }}
              >
                {cat.category_name}
              </button>
            ))}
          </div>
          {selectedCategoryId && (
            <>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>Business type</label>
              {loadingSubs ? (
                <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Loading...</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {subcategories.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => onSelect(selectedCategoryId, sub.id)}
                      style={{
                        padding: '0.625rem 0.75rem',
                        border: `2px solid ${subcategoryId === sub.id ? '#6366f1' : '#e2e8f0'}`,
                        borderRadius: '8px',
                        background: subcategoryId === sub.id ? '#eef2ff' : 'white',
                        color: subcategoryId === sub.id ? '#4f46e5' : '#374151',
                        fontSize: '0.875rem',
                        fontWeight: subcategoryId === sub.id ? '600' : '400',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s'
                      }}
                    >
                      {sub.subcategory_name}
                    </button>
                  ))}
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
    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#0f172a', marginBottom: '0.5rem' }}>About your business</h2>
    <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>The basics — this is how your AI assistant will introduce and represent your business on every call.</p>
    {[
      { label: 'Business name', field: 'business_name', type: 'text', hint: 'The name your customers know you by.' },
      { label: 'Your name', field: 'lead_contact_name', type: 'text', hint: 'The owner or main contact callers would ask for.' },
      { label: 'Business address', field: 'business_address', type: 'text', hint: 'Your main address. Used for context — not read out on calls.' },
      { label: 'Business phone', field: 'business_phone', type: 'tel', hint: 'The number callers will ring.' },
      { label: 'Business email', field: 'business_email', type: 'email', hint: 'Where lead notifications will be sent.' },
      { label: 'Booking link (optional)', field: 'booking_link', type: 'url', hint: 'A link to your online booking page if you have one.' },
    ].map(({ label, field, type, hint }) => (
      <div key={field} style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: '#374151' }}>{label}</label>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.375rem', marginTop: 0 }}>{hint}</p>
        <input
          type={type}
          value={data[field]}
          onChange={(e) => update(field, e.target.value)}
          style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }}
        />
      </div>
    ))}
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: '#374151' }}>Describe your business in one or two sentences</label>
      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.375rem', marginTop: 0 }}>What makes you stand out? e.g. "A mobile hairdresser specialising in weddings and proms across South London."</p>
      <textarea
        value={data.business_context}
        onChange={(e) => update('business_context', e.target.value)}
        rows={3}
        style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box', resize: 'vertical' }}
      />
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

  const updateRow = (index, field, value) => {
    onChange(services.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  const addRow = () => onChange([...services, emptyRow()])

  const removeRow = (index) => {
    if (services.length === 1) return
    onChange(services.filter((_, i) => i !== index))
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#0f172a', marginBottom: '0.5rem' }}>Your services</h2>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>We've suggested services based on your business type. Edit, overwrite, or leave them as they are. Empty rows are ignored.</p>
      {loading ? (
        <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Loading suggestions...</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.2fr', gap: '0.5rem', marginBottom: '0.375rem', padding: '0 0.25rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Service</span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>From £</span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>To £</span>
            <span></span>
          </div>
          {services.map((s, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.2fr', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Service name"
                value={s.service_name}
                onChange={e => updateRow(i, 'service_name', e.target.value)}
                style={{ padding: '0.5rem 0.625rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box' }}
              />
              <input
                type="number"
                placeholder="0"
                value={s.price_from}
                onChange={e => updateRow(i, 'price_from', e.target.value)}
                style={{ padding: '0.5rem 0.625rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box' }}
              />
              <input
                type="number"
                placeholder="0"
                value={s.price_to}
                onChange={e => updateRow(i, 'price_to', e.target.value)}
                style={{ padding: '0.5rem 0.625rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box' }}
              />
              <button
                onClick={() => removeRow(i)}
                disabled={services.length === 1}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: services.length === 1 ? 'not-allowed' : 'pointer', fontSize: '1.25rem', lineHeight: 1, padding: '0', opacity: services.length === 1 ? 0.3 : 1 }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={addRow}
            style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', border: '1px dashed #cbd5e1', borderRadius: '8px', background: 'transparent', color: '#64748b', fontSize: '0.875rem', cursor: 'pointer', width: '100%' }}
          >
            + Add a row
          </button>
        </>
      )}
    </div>
  )
}

const Step3Boundaries = ({ data, update }) => (
  <div>
    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#0f172a', marginBottom: '0.5rem' }}>Your boundaries</h2>
    <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>This tells your AI assistant what to do when a caller asks for something outside your normal work.</p>
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: '#374151' }}>Area covered</label>
      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.375rem', marginTop: 0 }}>Where do you work? Leave blank if you're not mobile. e.g. "Within 15 miles of Bristol city centre" or "SW and SE London postcodes only."</p>
      <input
        type="text"
        value={data.area_covered}
        onChange={e => update('area_covered', e.target.value)}
        style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }}
      />
    </div>
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: '#374151' }}>Work you refer to partners</label>
      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.375rem', marginTop: 0 }}>Jobs you don't do yourself but are happy to pass on. Your AI will take the caller's details and refer them. e.g. "Commercial electrical work, anything outside London."</p>
      <textarea
        value={data.refer_out}
        onChange={e => update('refer_out', e.target.value)}
        rows={3}
        style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box', resize: 'vertical' }}
      />
    </div>
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: '#374151' }}>Work you won't touch</label>
      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.375rem', marginTop: 0 }}>Hard no. Your AI will politely tell the caller this isn't something you cover and end the call. e.g. "No gas work, no asbestos, no structural surveys."</p>
      <textarea
        value={data.wont_touch}
        onChange={e => update('wont_touch', e.target.value)}
        rows={3}
        style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box', resize: 'vertical' }}
      />
    </div>
  </div>
)

const Step4Partners = ({ partners, onChange }) => {
  const addPartner = () => onChange([...partners, { name: '', trade: '', phone: '' }])
  const updatePartner = (i, field, value) => onChange(partners.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  const removePartner = (i) => onChange(partners.filter((_, idx) => idx !== i))

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#0f172a', marginBottom: '0.5rem' }}>Your partners</h2>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>Who do you refer work to? When your AI captures a job outside your scope it can pass the caller to someone on this list. You can add more later.</p>
      {partners.length === 0 && (
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>No partners added yet. You can skip this and add them later.</p>
      )}
      {partners.map((p, i) => (
        <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Partner {i + 1}</span>
            <button onClick={() => removePartner(i)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>×</button>
          </div>
          {[
            { label: 'Name or business name', field: 'name', type: 'text' },
            { label: 'What they do', field: 'trade', type: 'text' },
            { label: 'Phone number', field: 'phone', type: 'tel' },
          ].map(({ label, field, type }) => (
            <div key={field} style={{ marginBottom: '0.625rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{label}</label>
              <input
                type={type}
                value={p[field]}
                onChange={e => updatePartner(i, field, e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.625rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>
          ))}
        </div>
      ))}
      <button
        onClick={addPartner}
        style={{ padding: '0.5rem 1rem', border: '1px dashed #cbd5e1', borderRadius: '8px', background: 'transparent', color: '#64748b', fontSize: '0.875rem', cursor: 'pointer', width: '100%' }}
      >
        + Add a partner
      </button>
    </div>
  )
}

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
    area_covered: '',
    refer_out: '',
    wont_touch: '',
    services: [],
    partners: [],
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
        referral_code: referralCode,
        subscription_tier: 'light',
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

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', width: '100%', maxWidth: '560px', padding: '2.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Step {step + 1} of {steps.length}</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{steps[step]}</span>
          </div>
          <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '9999px' }}>
            <div style={{ height: '4px', background: '#6366f1', borderRadius: '9999px', width: `${((step + 1) / steps.length) * 100}%`, transition: 'width 0.3s' }} />
          </div>
        </div>

        {step === 0 && (
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
        {step === 1 && <Step1BusinessDetails data={data} update={update} />}
        {step === 2 && (
          <Step2Services
            subcategoryId={data.subcategory_id}
            services={data.services}
            onChange={(services) => update('services', services)}
          />
        )}
        {step === 3 && <Step3Boundaries data={data} update={update} />}
        {step === 4 && (
          <Step4Partners
            partners={data.partners}
            onChange={(partners) => update('partners', partners)}
          />
        )}
        {step === 5 && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#0f172a', marginBottom: '0.5rem' }}>You're ready to launch</h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>Here's what we've set up for you.</p>
            {[
              { label: 'Business name', value: data.business_name },
              { label: 'Owner', value: data.lead_contact_name },
              { label: 'Address', value: data.business_address },
              { label: 'Phone', value: data.business_phone },
              { label: 'Email', value: data.business_email },
              { label: 'Booking link', value: data.booking_link },
              { label: 'About', value: data.business_context },
              { label: 'Area covered', value: data.area_covered },
              { label: 'Refers out', value: data.refer_out },
              { label: "Won't touch", value: data.wont_touch },
              { label: 'Services', value: data.services.filter(s => s.service_name.trim()).map(s => s.service_name).join(', ') },
              { label: 'Partners', value: data.partners.filter(p => p.name.trim()).map(p => p.name).join(', ') },
            ].filter(item => item.value).map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b', flexShrink: 0, marginRight: '1rem' }}>{item.label}</span>
                <span style={{ fontSize: '0.875rem', color: '#0f172a', fontWeight: '500', textAlign: 'right' }}>{item.value}</span>
              </div>
            ))}
            {error && <p style={{ color: '#ef4444', marginTop: '1rem', fontSize: '0.875rem' }}>{error}</p>}
          </div>
        )}

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
              disabled={loading || !sessionReady}
              style={{ padding: '0.625rem 1.25rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', cursor: (loading || !sessionReady) ? 'not-allowed' : 'pointer', opacity: (loading || !sessionReady) ? 0.7 : 1 }}
            >
              {loading ? 'Launching...' : !sessionReady ? 'Loading...' : 'Launch my portal'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Onboarding