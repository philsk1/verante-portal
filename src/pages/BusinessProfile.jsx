import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { usePreview } from '../context/PreviewContext'
import { qMoodFromScore, qCaption } from '../utils/qScore.js'

// ─── avatar colour — consistent per name, cycles through palette ──────────────

const AVATAR_PALETTE = [
  { bg: '#f0ebf8', text: '#5e3b87' },
  { bg: '#e6f5ee', text: '#1e7a4a' },
  { bg: '#eff6ff', text: '#1d4ed8' },
  { bg: '#fef3d0', text: '#92610a' },
  { bg: '#dcfce7', text: '#166534' },
  { bg: '#fce7f3', text: '#9d174d' },
]
const avatarColour = (name = '') => AVATAR_PALETTE[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_PALETTE.length]
const initials = (name = '') => name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

// ─── styles ───────────────────────────────────────────────────────────────────

const s = {
  section: {
    background: 'white',
    borderRadius: '16px',
    padding: '1.25rem 1.5rem',
    border: '0.5px solid rgba(94,59,135,0.06)',
    marginBottom: '1rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.06)',
  },
  sectionTitle: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    color: '#aaaaaa',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    margin: '0 0 0.2rem',
  },
  sectionSubtitle: {
    fontSize: '0.78rem',
    color: '#999',
    marginBottom: '0.85rem',
    lineHeight: 1.5,
    marginTop: '0.1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.6875rem',
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    color: '#aaaaaa',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
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
    borderRadius: '6px',
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
    borderRadius: '999px',
    padding: '0.15rem 0.55rem',
    fontSize: '0.7rem',
    fontWeight: 600,
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

const BusinessProfile = ({ onNavigate }) => {
  const { user } = useAuth()
  const preview = usePreview()
  const isPreview = !!preview?.isPreview
  const previewReadOnly = preview?.previewReadOnly ?? isPreview

  const [tenantId, setTenantId] = useState(null)
  const [tier, setTier] = useState('light')
  useEffect(() => { if (preview.tierOverride !== null) setTier(preview.tierOverride) }, [preview.tierOverride])
  const [loading, setLoading] = useState(true)
  const [qMode, setQMode] = useState('jump_in')

  // Business details
  const [details, setDetails] = useState({
    business_name: '', business_phone: '', business_email: '',
    business_address: '', booking_link: '', opening_hours: '', business_context: '',
  })
  const [detailsSaving, setDetailsSaving] = useState(false)
  const [detailsToast, setDetailsToast] = useState({ msg: '', type: '' })

  // Partner services (banned_services — referral scope)
  const [partnerServices, setPartnerServices] = useState([])

  useEffect(() => {
    if (!user && !isPreview) return
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
          .select('business_name,business_phone,business_email,business_address,booking_link,opening_hours,business_context,subscription_tier,q_mode')
          .eq('id', tid).maybeSingle()

        if (tenant) {
          setTier(tenant.subscription_tier || 'light')
          setQMode(tenant.q_mode || 'jump_in')
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

        const { data: bannedRes } = await supabase.from('banned_services').select('id,banned_item').eq('tenant_id', tid)
        setPartnerServices((bannedRes || []).map(b => ({ ...b, service_name: b.banned_item })))
      } catch (err) {
        console.error('Load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, isPreview])

  // ── business details ────────────────────────────────────────────────────────

  const saveDetails = async () => {
    if (previewReadOnly) return
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

  // ── partner services ────────────────────────────────────────────────────────

  const addPartnerService = async (name) => {
    if (previewReadOnly || !tenantId) return
    const { data, error } = await supabase.from('banned_services')
      .insert({ tenant_id: tenantId, banned_item: name }).select().maybeSingle()
    if (!error && data) setPartnerServices(prev => [...prev, { ...data, service_name: data.banned_item }])
  }

  const removePartnerService = async (i) => {
    if (previewReadOnly) return
    const item = partnerServices[i]
    if (item.id) await supabase.from('banned_services').delete().eq('id', item.id)
    setPartnerServices(prev => prev.filter((_, idx) => idx !== i))
  }

  // ── computed ────────────────────────────────────────────────────────────────

  // Profile completeness
  const profileChecks = [
    !!details.business_name,
    !!details.business_phone || !!details.business_email,
    !!details.business_address,
    !!details.opening_hours,
    !!details.business_context,
  ]
  const profileScore = profileChecks.filter(Boolean).length
  const profilePct   = Math.round((profileScore / profileChecks.length) * 100)
  const profileQMood    = qMoodFromScore(profilePct)
  const profileQCaption = qCaption(profilePct, qMode)

  if (loading) {
    return <div style={{ padding: '2rem', color: '#aaa', fontSize: '0.875rem' }}>Loading your profile…</div>
  }

  return (
    <div>

      {/* ── Profile summary bar ─────────────────────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: 14, padding: '0.9rem 1.25rem', marginBottom: '1rem', border: '0.5px solid rgba(94,59,135,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
        <img src={`/qmood/${profileQMood}.svg`} alt="Q" style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.3rem' }}>
            <div style={{ flex: 1, height: 5, borderRadius: 3, background: '#f0ebf8', overflow: 'hidden', maxWidth: 120 }}>
              <div style={{ width: `${profilePct}%`, height: '100%', borderRadius: 3, background: profilePct === 100 ? '#3db87a' : '#5e3b87', transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: '0.72rem', color: profilePct === 100 ? '#3db87a' : '#5e3b87', fontWeight: 600, fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
              {profilePct === 100 ? 'Identity complete' : `${profilePct}% complete`}
            </span>
          </div>
          {profileQCaption
            ? <div style={{ fontSize: '0.7rem', color: '#7a5a8a', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }}>{profileQCaption}</div>
            : <span style={{ fontSize: '0.7rem', color: '#aaa' }}>Name · contact · hours · AI context</span>
          }
        </div>
      </div>

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
        {tenantId && (
          <div style={{ marginTop: '-0.25rem', padding: '0.65rem 0.9rem', background: '#f5f3ff', borderRadius: '8px', border: '1px solid rgba(94,59,135,0.12)', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: '#5e3b87', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>Your Qerxel booking page:</span>
            <a href={`/book/${tenantId}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '0.72rem', color: '#5e3b87', fontFamily: "'DM Sans', sans-serif", wordBreak: 'break-all' }}>
              {`${window.location.origin}/book/${tenantId}`}
            </a>
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/book/${tenantId}`).catch(() => {})}
              style={{ padding: '0.2rem 0.55rem', fontSize: '0.68rem', background: '#5e3b87', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
              Copy
            </button>
            <span style={{ fontSize: '0.68rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>— share with clients or use above as booking link</span>
          </div>
        )}
        <Field label="Business address" value={details.business_address} onChange={v => setDetails(p => ({ ...p, business_address: v }))} />
        <TextareaField label="Opening hours" value={details.opening_hours} onChange={v => setDetails(p => ({ ...p, opening_hours: v }))} placeholder="e.g. Mon–Fri 8am–6pm, Sat 9am–1pm, closed Sunday" />
        <TextareaField label="About your business" value={details.business_context} onChange={v => setDetails(p => ({ ...p, business_context: v }))} placeholder="A short description of what you do — used by your AI to answer questions accurately." />
        <button style={detailsSaving ? s.saveBtnDisabled : s.saveBtn} onClick={saveDetails} disabled={detailsSaving}>
          {detailsSaving ? 'Saving…' : 'Save details'}
        </button>
        <Toast msg={detailsToast.msg} type={detailsToast.type} />
      </div>

      {/* Business data tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          { id: 'clients',  label: 'Clients',  sub: 'CRM & campaigns', dot: '#5e3b87', bg: '#f0ebf8' },
          { id: 'services', label: 'Services', sub: 'AI service list',  dot: '#1d4ed8', bg: '#eff6ff' },
          { id: 'products', label: 'Products', sub: 'Products you sell', dot: '#1e7a4a', bg: '#e6f5ee' },
          { id: 'team',     label: 'Team',     sub: 'Staff & schedules', dot: '#f0a500', bg: '#fef3c7' },
        ].map(tile => (
          <button key={tile.id} onClick={() => onNavigate?.(tile.id)} style={{ background: 'white', border: '0.5px solid rgba(94,59,135,0.1)', borderRadius: '12px', padding: '1rem', textAlign: 'left', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'box-shadow 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(94,59,135,0.12)'; e.currentTarget.style.borderColor = 'rgba(94,59,135,0.25)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = 'rgba(94,59,135,0.1)' }}>
            <div style={{ width: 32, height: 32, borderRadius: '8px', background: tile.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.6rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: tile.dot, display: 'inline-block' }} />
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#1a1a1a', marginBottom: '0.15rem' }}>{tile.label}</div>
            <div style={{ fontSize: '0.72rem', color: '#aaa' }}>{tile.sub} →</div>
          </button>
        ))}
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

    </div>
  )
}

export default BusinessProfile
