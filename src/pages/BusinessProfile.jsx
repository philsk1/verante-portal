import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { useDemo } from '../context/DemoContext'
import { usePreview } from '../context/PreviewContext'

// ─── tier config ──────────────────────────────────────────────────────────────

const CLIENT_LIMIT = { light: 20, standard: 50, professional: 100, enterprise: 200, bespoke: 200 }

// ─── styles ───────────────────────────────────────────────────────────────────

const s = {
  section: {
    background: 'white',
    borderRadius: '10px',
    padding: '1.75rem',
    border: '0.5px solid rgba(94,59,135,0.1)',
    marginBottom: '1.25rem',
  },
  sectionTitle: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: '0 0 0.2rem',
  },
  sectionSubtitle: {
    fontSize: '0.8rem',
    color: '#888',
    marginBottom: '1.25rem',
    lineHeight: 1.55,
  },
  label: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#555',
    marginBottom: '0.35rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '1px solid rgba(94,59,135,0.2)',
    borderRadius: '8px',
    fontSize: '0.875rem',
    color: '#1a1a1a',
    background: '#fff',
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'border-color 0.15s',
  },
  inputFocus: { borderColor: '#5e3b87' },
  textarea: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '1px solid rgba(94,59,135,0.2)',
    borderRadius: '8px',
    fontSize: '0.875rem',
    color: '#1a1a1a',
    background: '#fff',
    boxSizing: 'border-box',
    outline: 'none',
    resize: 'vertical',
    minHeight: '80px',
    fontFamily: "'DM Sans', sans-serif",
    lineHeight: 1.55,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginBottom: '1rem',
  },
  fieldWrap: { marginBottom: '1rem' },
  saveBtn: {
    padding: '0.55rem 1.25rem',
    background: '#f0a500',
    color: '#1a0533',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '0.5rem',
    fontFamily: "'DM Sans', sans-serif",
  },
  saveBtnDisabled: {
    padding: '0.55rem 1.25rem',
    background: '#f5d98a',
    color: '#7a5c1a',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'not-allowed',
    marginTop: '0.5rem',
    fontFamily: "'DM Sans', sans-serif",
  },
  // Chips
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.3rem 0.65rem',
    background: '#fef3d9',
    border: '1px solid rgba(240,165,0,0.25)',
    borderRadius: '20px',
    fontSize: '0.8rem',
    color: '#b07a00',
    marginRight: '0.45rem',
    marginBottom: '0.45rem',
  },
  chipRemove: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#d4aa40',
    fontSize: '1rem',
    lineHeight: 1,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
  },
  chipDefault: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.3rem 0.65rem',
    background: '#ede8f5',
    border: '1px solid rgba(94,59,135,0.15)',
    borderRadius: '20px',
    fontSize: '0.8rem',
    color: '#5e3b87',
    marginRight: '0.45rem',
    marginBottom: '0.45rem',
  },
  addRow: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.75rem',
  },
  addInput: {
    flex: 1,
    padding: '0.55rem 0.75rem',
    border: '1px solid rgba(94,59,135,0.2)',
    borderRadius: '8px',
    fontSize: '0.875rem',
    color: '#1a1a1a',
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
    background: 'white',
  },
  addBtn: {
    padding: '0.55rem 1rem',
    background: 'white',
    border: '1px solid rgba(94,59,135,0.22)',
    borderRadius: '8px',
    fontSize: '0.8125rem',
    color: '#5e3b87',
    cursor: 'pointer',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    fontFamily: "'DM Sans', sans-serif",
  },
  addBtnDisabled: {
    padding: '0.55rem 1rem',
    background: '#f8f7fa',
    border: '1px solid rgba(94,59,135,0.1)',
    borderRadius: '8px',
    fontSize: '0.8125rem',
    color: '#ccc',
    cursor: 'not-allowed',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    fontFamily: "'DM Sans', sans-serif",
  },
  toast: (type) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    marginTop: '0.75rem',
    padding: '0.45rem 0.85rem',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: '500',
    background: type === 'success' ? '#e6f5ee' : '#fef2f2',
    color: type === 'success' ? '#1e7a4a' : '#b91c1c',
    border: `1px solid ${type === 'success' ? '#a7e8c2' : '#fecaca'}`,
  }),
  // Client directory
  clientCard: {
    border: '1px solid rgba(94,59,135,0.12)',
    borderRadius: '8px',
    padding: '0.85rem 1rem',
    marginBottom: '0.5rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
  },
  clientName: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '0.1rem',
  },
  clientPhone: {
    fontSize: '0.775rem',
    color: '#999',
    marginBottom: '0.25rem',
  },
  clientInstructions: {
    fontSize: '0.775rem',
    color: '#5e3b87',
    fontStyle: 'italic',
    lineHeight: 1.45,
    background: '#f3f1f6',
    padding: '0.3rem 0.6rem',
    borderRadius: '4px',
    display: 'inline-block',
    marginTop: '0.2rem',
  },
  quotaBar: {
    height: 4,
    background: '#f3f1f6',
    borderRadius: 2,
    marginBottom: '0.5rem',
    overflow: 'hidden',
  },
  quotaFill: (pct, atLimit) => ({
    height: '100%',
    width: `${Math.min(pct, 100)}%`,
    background: atLimit ? '#f0a500' : '#5e3b87',
    borderRadius: 2,
    transition: 'width 0.3s',
  }),
  quotaLabel: {
    fontSize: '0.775rem',
    color: '#aaa',
    marginBottom: '1rem',
  },
  limitNote: {
    fontSize: '0.775rem',
    color: '#f0a500',
    fontWeight: '500',
    marginTop: '0.5rem',
  },
  // Staff profiles
  staffCard: {
    border: '1px solid rgba(94,59,135,0.12)',
    borderRadius: '8px',
    padding: '0.85rem 1rem',
    marginBottom: '0.5rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
  },
  staffName: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '0.1rem',
  },
  staffRole: {
    fontSize: '0.775rem',
    color: '#888',
    marginBottom: '0.2rem',
  },
  staffSpecialty: {
    display: 'inline-block',
    background: '#ede8f5',
    color: '#5e3b87',
    borderRadius: '4px',
    padding: '0.15rem 0.5rem',
    fontSize: '0.7rem',
    fontWeight: '500',
    marginTop: '0.2rem',
  },
  staffPhone: {
    fontSize: '0.775rem',
    color: '#bbb',
    marginTop: '0.15rem',
  },
  activeDot: (active) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: active ? '#3db87a' : '#d1d5db',
    flexShrink: 0,
    marginTop: 6,
    cursor: 'pointer',
    title: active ? 'Active' : 'Inactive',
  }),
  removeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#ddd',
    fontSize: '1.1rem',
    lineHeight: 1,
    padding: '0 0 2px',
    flexShrink: 0,
  },
  addFormGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  // Locked
  lockedOverlay: {
    position: 'relative',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  lockedBlur: {
    filter: 'blur(3px)',
    pointerEvents: 'none',
    userSelect: 'none',
    opacity: 0.4,
  },
  lockedBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'white',
    border: '1px solid rgba(94,59,135,0.15)',
    borderRadius: '10px',
    padding: '0.85rem 1.5rem',
    textAlign: 'center',
    boxShadow: '0 4px 16px rgba(94,59,135,0.12)',
    zIndex: 2,
    minWidth: '200px',
  },
  lockedTier: {
    fontSize: '0.7rem',
    fontWeight: '600',
    color: '#f0a500',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: '0.3rem',
  },
  lockedTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '0.2rem',
  },
  lockedText: {
    fontSize: '0.75rem',
    color: '#999',
  },
}

// ─── sub-components ───────────────────────────────────────────────────────────

const Field = ({ label, value, onChange, type = 'text', placeholder = '' }) => {
  const [focused, setFocused] = useState(false)
  return (
    <div style={s.fieldWrap}>
      <label style={s.label}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...s.input, ...(focused ? s.inputFocus : {}) }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  )
}

const TextareaField = ({ label, value, onChange, placeholder = '' }) => (
  <div style={s.fieldWrap}>
    <label style={s.label}>{label}</label>
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={s.textarea} />
  </div>
)

const Toast = ({ msg, type }) =>
  msg ? <div style={s.toast(type)}>{type === 'success' ? '✓' : '!'} {msg}</div> : null

const ServiceChips = ({ items, onRemove, onAdd, placeholder, chipStyle }) => {
  const [draft, setDraft] = useState('')
  const handleAdd = () => {
    const t = draft.trim()
    if (t) { onAdd(t); setDraft('') }
  }
  return (
    <div>
      <div>
        {items.map((item, i) => (
          <span key={i} style={chipStyle || s.chipDefault}>
            {item.service_name || item}
            <button style={s.chipRemove} onClick={() => onRemove(i)}>×</button>
          </span>
        ))}
        {items.length === 0 && <p style={{ fontSize: '0.8rem', color: '#ddd', margin: '0 0 0.5rem' }}>None added yet.</p>}
      </div>
      <div style={s.addRow}>
        <input style={s.addInput} value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }} placeholder={placeholder} />
        <button style={s.addBtn} onClick={handleAdd}>+ Add</button>
      </div>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

const BusinessProfile = () => {
  const { user } = useAuth()
  const demo = useDemo()
  const isDemo = !!demo?.isDemo
  const preview = usePreview()
  const isPreview = !!preview?.isPreview

  const [tenantId, setTenantId] = useState(null)
  const [tier, setTier] = useState('light')
  const [loading, setLoading] = useState(true)

  // Business details
  const [details, setDetails] = useState({
    business_name: '', business_phone: '', business_email: '',
    business_address: '', booking_link: '', opening_hours: '', business_context: '',
  })
  const [detailsSaving, setDetailsSaving] = useState(false)
  const [detailsToast, setDetailsToast] = useState({ msg: '', type: '' })

  // Services + partner services
  const [services, setServices] = useState([])
  const [partnerServices, setPartnerServices] = useState([])

  // Client directory
  const [clients, setClients] = useState([])
  const [clientDraft, setClientDraft] = useState({ name: '', phone: '', instructions: '' })
  const [clientAdding, setClientAdding] = useState(false)

  // Staff profiles
  const [staff, setStaff] = useState([])
  const [staffDraft, setStaffDraft] = useState({ name: '', role: '', specialist_services: '', phone: '', direct_line_did: '' })
  const [staffAdding, setStaffAdding] = useState(false)
  const [staffError, setStaffError] = useState(false)

  // Demo mode: inject data from DemoContext
  useEffect(() => {
    if (!isDemo || demo?.loading) return
    const biz = demo.business || {}
    setTier(demo.tier)
    setDetails({
      business_name:    biz.business_name    || '',
      business_phone:   biz.business_phone   || '',
      business_email:   biz.business_email   || '',
      business_address: '',
      booking_link:     biz.booking_link     || '',
      opening_hours:    biz.opening_hours    || '',
      business_context: biz.business_context || '',
    })
    setServices(demo.services.filter(s => !s.is_partner_service).map(s => ({ id: s.id, service_name: s.service_name })))
    setPartnerServices(demo.services.filter(s => s.is_partner_service).map(s => ({ id: s.id, service_name: s.service_name })))
    setClients([])
    setStaff(demo.staff.map(s => ({ id: s.id, name: s.name, role: s.role, specialist_services: s.specialist_services, phone: s.phone, active: s.active })))
    setLoading(false)
  }, [isDemo, demo?.loading])

  useEffect(() => {
    if (isDemo || (!user && !isPreview)) return
    const load = async () => {
      setLoading(true)
      try {
        let tid
        if (isPreview) {
          tid = preview.previewTenantId
        } else {
          const { data: membership, error: membershipErr } = await supabase
            .from('tenant_memberships').select('tenant_id').eq('user_id', user.id).maybeSingle()
          if (membershipErr) console.error('Membership lookup error:', membershipErr)
          if (!membership) return
          tid = membership.tenant_id
        }
        setTenantId(tid)

        const { data: tenant } = await supabase
          .from('tenants')
          .select('business_name,business_phone,business_email,business_address,booking_link,opening_hours,business_context,subscription_tier')
          .eq('id', tid).maybeSingle()

        if (tenant) {
          setTier(tenant.subscription_tier || 'light')
          setDetails({
            business_name: tenant.business_name || '',
            business_phone: tenant.business_phone || '',
            business_email: tenant.business_email || '',
            business_address: tenant.business_address || '',
            booking_link: tenant.booking_link || '',
            opening_hours: tenant.opening_hours || '',
            business_context: tenant.business_context || '',
          })
        }

        const [svcRes, bannedRes, clientRes, staffRes] = await Promise.all([
          supabase.from('services').select('id,service_name').eq('tenant_id', tid),
          supabase.from('banned_services').select('id,service_name').eq('tenant_id', tid),
          supabase
            .from('caller_tenant_relationships')
            .select('id, notes, callers(id, name, phone_number)')
            .eq('tenant_id', tid)
            .limit(200),
          supabase
            .from('staff_profiles')
            .select('id, name, role, specialist_services, phone, direct_line_did, active')
            .eq('tenant_id', tid)
            .order('created_at'),
        ])

        setServices(svcRes.data || [])
        setPartnerServices(bannedRes.data || [])
        setClients(clientRes.data || [])
        if (staffRes.error) setStaffError(true)
        else setStaff(staffRes.data || [])
      } catch (err) {
        console.error('Load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, isDemo, isPreview])

  // ── business details ────────────────────────────────────────────────────────

  const saveDetails = async () => {
    if (isDemo || isPreview) return
    if (!tenantId) {
      setDetailsToast({ msg: 'Account not linked to a business. Complete setup at /onboarding.', type: 'error' })
      return
    }
    setDetailsSaving(true)
    setDetailsToast({ msg: '', type: '' })
    const { data: saved, error } = await supabase
      .from('tenants').update(details).eq('id', tenantId).select()
    setDetailsSaving(false)
    if (error) {
      setDetailsToast({ msg: `Could not save: ${error.message}`, type: 'error' })
    } else if (!saved || saved.length === 0) {
      setDetailsToast({ msg: 'Save ran but no row was matched — check tenant ID.', type: 'error' })
    } else {
      setDetailsToast({ msg: 'Details saved.', type: 'success' })
      setTimeout(() => setDetailsToast({ msg: '', type: '' }), 3000)
      syncVapi(tenantId)
    }
  }

  const syncVapi = (tid) => {
    fetch('/api/vapi-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: tid }),
    }).catch(() => {})
  }

  // ── services ────────────────────────────────────────────────────────────────

  const addService = async (name) => {
    if (isDemo || isPreview || !tenantId) return
    const { data, error } = await supabase.from('services')
      .insert({ tenant_id: tenantId, service_name: name }).select().maybeSingle()
    if (!error && data) setServices(prev => [...prev, data])
  }

  const removeService = async (i) => {
    if (isDemo || isPreview) return
    const item = services[i]
    if (item.id) await supabase.from('services').delete().eq('id', item.id)
    setServices(prev => prev.filter((_, idx) => idx !== i))
  }

  // ── partner services ────────────────────────────────────────────────────────

  const addPartnerService = async (name) => {
    if (isDemo || isPreview || !tenantId) return
    const { data, error } = await supabase.from('banned_services')
      .insert({ tenant_id: tenantId, service_name: name }).select().maybeSingle()
    if (!error && data) setPartnerServices(prev => [...prev, data])
  }

  const removePartnerService = async (i) => {
    if (isDemo || isPreview) return
    const item = partnerServices[i]
    if (item.id) await supabase.from('banned_services').delete().eq('id', item.id)
    setPartnerServices(prev => prev.filter((_, idx) => idx !== i))
  }

  // ── client directory ────────────────────────────────────────────────────────

  const clientLimit = CLIENT_LIMIT[tier] || 20
  const atClientLimit = clients.length >= clientLimit

  const addClient = async () => {
    if (isDemo || isPreview) return
    const name = clientDraft.name.trim()
    const phone = clientDraft.phone.trim()
    if (!name || !phone || !tenantId || atClientLimit) return
    setClientAdding(true)

    // Find or create caller record
    let callerId
    const { data: existing } = await supabase
      .from('callers').select('id').eq('phone_number', phone).maybeSingle()

    if (existing) {
      callerId = existing.id
      if (name) await supabase.from('callers').update({ name }).eq('id', callerId)
    } else {
      const { data: newCaller, error } = await supabase
        .from('callers').insert({ phone_number: phone, name }).select().maybeSingle()
      if (error || !newCaller) { setClientAdding(false); return }
      callerId = newCaller.id
    }

    const { data: rel, error: relErr } = await supabase
      .from('caller_tenant_relationships')
      .insert({ tenant_id: tenantId, caller_id: callerId, notes: clientDraft.instructions.trim() || null })
      .select('id, notes, callers(id, name, phone_number)')
      .maybeSingle()

    if (!relErr && rel) {
      setClients(prev => [...prev, rel])
      setClientDraft({ name: '', phone: '', instructions: '' })
    }
    setClientAdding(false)
  }

  const removeClient = async (id) => {
    if (isDemo || isPreview) return
    await supabase.from('caller_tenant_relationships').delete().eq('id', id)
    setClients(prev => prev.filter(c => c.id !== id))
  }

  // ── staff profiles ──────────────────────────────────────────────────────────

  const addStaff = async () => {
    if (isDemo || isPreview) return
    const name = staffDraft.name.trim()
    if (!name || !tenantId) return
    setStaffAdding(true)
    const { data, error } = await supabase.from('staff_profiles')
      .insert({
        tenant_id: tenantId,
        name,
        role: staffDraft.role.trim() || null,
        specialist_services: staffDraft.specialist_services.trim() || null,
        phone: staffDraft.phone.trim() || null,
        direct_line_did: staffDraft.direct_line_did.trim() || null,
        active: true,
      })
      .select().maybeSingle()
    setStaffAdding(false)
    if (!error && data) {
      setStaff(prev => [...prev, data])
      setStaffDraft({ name: '', role: '', specialist_services: '', phone: '' })
    }
  }

  const toggleStaffActive = async (id, current) => {
    await supabase.from('staff_profiles').update({ active: !current }).eq('id', id)
    setStaff(prev => prev.map(s => s.id === id ? { ...s, active: !current } : s))
  }

  const removeStaff = async (id) => {
    if (isDemo || isPreview) return
    await supabase.from('staff_profiles').delete().eq('id', id)
    setStaff(prev => prev.filter(s => s.id !== id))
  }

  // ── computed ────────────────────────────────────────────────────────────────

  const isProfessional = ['professional', 'enterprise', 'bespoke'].includes(tier)
  const isEnterprise = ['enterprise', 'bespoke'].includes(tier)
  const quotaPct = (clients.length / clientLimit) * 100

  if (loading) {
    return <div style={{ padding: '2rem', color: '#aaa', fontSize: '0.875rem' }}>Loading your profile…</div>
  }

  return (
    <div>

      {/* Business Details */}
      <div style={s.section}>
        <h3 style={s.sectionTitle} data-help="Business Details are the basics your AI uses to represent you on every call — your trading name, phone number, email address, and where you're based.">Business Details</h3>
        <p style={s.sectionSubtitle}>Used to personalise your AI and appears in caller communications.</p>
        <div style={s.row}>
          <Field label="Business name" value={details.business_name} onChange={v => setDetails(p => ({ ...p, business_name: v }))} />
          <Field label="Business phone" value={details.business_phone} onChange={v => setDetails(p => ({ ...p, business_phone: v }))} type="tel" />
        </div>
        <div style={s.row}>
          <Field label="Business email" value={details.business_email} onChange={v => setDetails(p => ({ ...p, business_email: v }))} type="email" />
          <Field label="Booking link" value={details.booking_link} onChange={v => setDetails(p => ({ ...p, booking_link: v }))} placeholder="https://" />
        </div>
        <Field label="Business address" value={details.business_address} onChange={v => setDetails(p => ({ ...p, business_address: v }))} />
        <TextareaField label="Opening hours" value={details.opening_hours} onChange={v => setDetails(p => ({ ...p, opening_hours: v }))} placeholder="e.g. Mon–Fri 8am–6pm, Sat 9am–1pm, closed Sunday" />
        <TextareaField label="About your business" value={details.business_context} onChange={v => setDetails(p => ({ ...p, business_context: v }))} placeholder="A short description of what you do — used by your AI to answer questions accurately." />
        <button style={detailsSaving ? s.saveBtnDisabled : s.saveBtn} onClick={saveDetails} disabled={detailsSaving}>
          {detailsSaving ? 'Saving…' : 'Save details'}
        </button>
        <Toast msg={detailsToast.msg} type={detailsToast.type} />
      </div>

      {/* Your Services */}
      <div style={s.section}>
        <h3 style={s.sectionTitle} data-help="Your Services is the list of things your AI will actively help callers with. If someone asks for a service not on this list, the AI handles it differently — referring out or politely declining.">Your Services</h3>
        <p style={s.sectionSubtitle}>The services your AI will accept enquiries and bookings for.</p>
        <ServiceChips items={services} onRemove={removeService} onAdd={addService}
          placeholder="e.g. Boiler service, Emergency callout…" chipStyle={s.chipDefault} />
      </div>

      {/* Partner Services */}
      <div style={s.section}>
        <h3 style={s.sectionTitle} data-help="Partner Services are things you can't do but actively pass to an associate. When a caller asks for one of these, your AI gives a warm referral — 'I can't help with that but my colleague at X can' — rather than a flat no. Much better for the caller.">Partner Services</h3>
        <p style={s.sectionSubtitle}>
          Services you cannot fulfil but actively pass to an associate business. When a caller asks for one of these, your AI makes a warm referral rather than a flat decline. Anything outside both lists is politely turned away.
        </p>
        <ServiceChips items={partnerServices} onRemove={removePartnerService} onAdd={addPartnerService}
          placeholder="e.g. Commercial gas work, Electrical installation…" chipStyle={s.chip} />
      </div>

      {/* Client Directory */}
      <div style={s.section}>
        <h3 style={s.sectionTitle} data-help="The Client Directory is a list of known clients. When one of their numbers calls in, your AI recognises them by name and follows your special instructions for them — great for VIP clients or anyone who needs different handling.">Client Directory</h3>
        <p style={s.sectionSubtitle}>
          Known clients with specialist instructions. When a listed number calls in, your AI recognises them by name and uses your instructions to handle the call appropriately.
        </p>

        {/* Quota */}
        <div style={s.quotaBar}>
          <div style={s.quotaFill(quotaPct, atClientLimit)} />
        </div>
        <div style={s.quotaLabel}>
          {clients.length} of {clientLimit} clients · {tier.charAt(0).toUpperCase() + tier.slice(1)} plan
          {atClientLimit && ' — limit reached'}
        </div>

        {/* Client list */}
        {clients.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            {clients.map(c => (
              <div key={c.id} style={s.clientCard}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.clientName}>{c.callers?.name || 'Unnamed'}</div>
                  <div style={s.clientPhone}>{c.callers?.phone_number || '—'}</div>
                  {c.notes && <span style={s.clientInstructions}>{c.notes}</span>}
                </div>
                <button style={s.removeBtn} onClick={() => removeClient(c.id)} title="Remove">×</button>
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        <div style={{ borderTop: clients.length > 0 ? '1px solid rgba(94,59,135,0.07)' : 'none', paddingTop: clients.length > 0 ? '1rem' : 0 }}>
          <label style={s.label}>Add a client</label>
          <div style={s.addFormGrid}>
            <input style={s.addInput} value={clientDraft.name} onChange={e => setClientDraft(d => ({ ...d, name: e.target.value }))}
              placeholder="Client name" disabled={atClientLimit} />
            <input style={s.addInput} value={clientDraft.phone} onChange={e => setClientDraft(d => ({ ...d, phone: e.target.value }))}
              placeholder="Phone number" type="tel" disabled={atClientLimit} />
          </div>
          <div style={s.addRow}>
            <input style={s.addInput} value={clientDraft.instructions}
              onChange={e => setClientDraft(d => ({ ...d, instructions: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') addClient() }}
              placeholder="Specialist instructions — e.g. VIP client, always offer priority booking"
              disabled={atClientLimit} />
            <button
              style={!clientDraft.name.trim() || !clientDraft.phone.trim() || atClientLimit || clientAdding ? s.addBtnDisabled : s.addBtn}
              onClick={addClient}
              disabled={!clientDraft.name.trim() || !clientDraft.phone.trim() || atClientLimit || clientAdding}
            >
              {clientAdding ? 'Adding…' : '+ Add'}
            </button>
          </div>
          {atClientLimit && (
            <div style={s.limitNote}>
              {tier === 'light' ? 'Upgrade to Standard for 50 clients, Professional for 100, or Enterprise for 200.' : tier === 'standard' ? 'Upgrade to Professional for 100 clients or Enterprise for 200.' : 'Upgrade to Enterprise for 200 clients.'}
            </div>
          )}
        </div>
      </div>

      {/* Employee Profiles */}
      <div style={s.section}>
        <h3 style={s.sectionTitle} data-help="Employee Profiles is an Enterprise feature. Add your team members with their specialist services and your AI can route callers to the right person — and tell callers who handles what.">Employee Profiles</h3>
        <p style={s.sectionSubtitle}>
          Add team members with their specialist services. Your AI uses these to route calls to the right person — and to tell callers who handles what.
        </p>

        {!isEnterprise ? (
          <div style={s.lockedOverlay}>
            <div style={s.lockedBlur}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {[
                  { name: 'Jamie Reed', role: 'Senior Engineer', spec: 'Boiler servicing' },
                  { name: 'Sam Patel', role: 'Electrician', spec: 'Rewires & inspections' },
                ].map(p => (
                  <div key={p.name} style={{ flex: 1, padding: '0.85rem 1rem', border: '1px solid rgba(94,59,135,0.1)', borderRadius: '8px', background: '#faf9fc' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a' }}>{p.name}</div>
                    <div style={{ fontSize: '0.775rem', color: '#888' }}>{p.role}</div>
                    <span style={s.staffSpecialty}>{p.spec}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={s.lockedBadge}>
              <div style={s.lockedTier}>Enterprise</div>
              <div style={s.lockedTitle}>Employee Profiles</div>
              <div style={s.lockedText}>Upgrade to add staff profiles and direct call routing.</div>
            </div>
          </div>
        ) : staffError ? (
          <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
            The staff_profiles table needs to be created in Supabase. Run the SQL provided in the handoff notes.
          </div>
        ) : (
          <>
            {staff.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                {staff.map(member => (
                  <div key={member.id} style={s.staffCard}>
                    <span
                      style={s.activeDot(member.active)}
                      onClick={() => toggleStaffActive(member.id, member.active)}
                      title={member.active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={s.staffName}>{member.name}</div>
                      {member.role && <div style={s.staffRole}>{member.role}</div>}
                      {member.specialist_services && <span style={s.staffSpecialty}>{member.specialist_services}</span>}
                      {member.phone && <div style={s.staffPhone}>{member.phone}</div>}
                      {member.direct_line_did && <div style={{ fontSize: '0.75rem', color: '#5e3b87', marginTop: '0.15rem' }}>DID: {member.direct_line_did}</div>}
                    </div>
                    <button style={s.removeBtn} onClick={() => removeStaff(member.id)} title="Remove">×</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ borderTop: staff.length > 0 ? '1px solid rgba(94,59,135,0.07)' : 'none', paddingTop: staff.length > 0 ? '1rem' : 0 }}>
              <label style={s.label}>Add team member</label>
              <div style={s.addFormGrid}>
                <input style={s.addInput} value={staffDraft.name} onChange={e => setStaffDraft(d => ({ ...d, name: e.target.value }))}
                  placeholder="Full name" />
                <input style={s.addInput} value={staffDraft.role} onChange={e => setStaffDraft(d => ({ ...d, role: e.target.value }))}
                  placeholder="Role or title" />
              </div>
              <div style={s.addFormGrid}>
                <input style={s.addInput} value={staffDraft.specialist_services}
                  onChange={e => setStaffDraft(d => ({ ...d, specialist_services: e.target.value }))}
                  placeholder="Specialist services — e.g. Gas safe, Commercial only" />
                <input style={s.addInput} value={staffDraft.phone} onChange={e => setStaffDraft(d => ({ ...d, phone: e.target.value }))}
                  placeholder="Mobile (optional)" type="tel" />
                <input style={s.addInput} value={staffDraft.direct_line_did} onChange={e => setStaffDraft(d => ({ ...d, direct_line_did: e.target.value }))}
                  placeholder="Direct line DID — e.g. 020 7946 0001" type="tel" />
              </div>
              <button
                style={!staffDraft.name.trim() || staffAdding ? s.addBtnDisabled : s.addBtn}
                onClick={addStaff}
                disabled={!staffDraft.name.trim() || staffAdding}
              >
                {staffAdding ? 'Adding…' : '+ Add team member'}
              </button>
            </div>
          </>
        )}
      </div>

    </div>
  )
}

export default BusinessProfile
