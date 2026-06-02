import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { User, ArrowLeftRight, PhoneOff, Truck, FileText } from 'lucide-react'

// ─── constants ────────────────────────────────────────────────────────────────

const TRIAGE_MODES = [
  { id: 'strict',   label: 'Strict',   desc: 'Short, efficient calls. The AI captures key details in fewer turns and closes quickly.' },
  { id: 'balanced', label: 'Balanced', desc: 'Standard triage. Enough turns to qualify the enquiry and collect contact details.' },
  { id: 'open',     label: 'Open',     desc: 'More conversational. Gives callers more space before closing or escalating.' },
]

const CALL_TYPES = [
  {
    key: 'new_customer',
    label: 'New Customer',
    desc: 'Caller enquiring about a service you offer. Qualify the need and convert.',
    Icon: User,
  },
  {
    key: 'partner_service',
    label: 'Partner Service',
    desc: 'Caller needs a service you refer to an associate. Acknowledge and refer warmly.',
    Icon: ArrowLeftRight,
  },
  {
    key: 'sales_call',
    label: 'Sales Call',
    desc: 'Unsolicited commercial or cold call. Close politely and promptly.',
    Icon: PhoneOff,
  },
  {
    key: 'supplier_delivery',
    label: 'Supplier / Delivery',
    desc: 'Supplier, delivery driver, or trade contact. Take details and confirm.',
    Icon: Truck,
  },
  {
    key: 'invoice_authorities',
    label: 'Invoice / Authorities',
    desc: 'Billing query, creditor, or official body. Take reference details and relay.',
    Icon: FileText,
  },
]

const DEFAULT_RULES = {
  new_customer:       { mode: 'open',     booking_link: true,  callback: true,  email: true,  email_address: '', instructions: '' },
  partner_service:    { mode: 'balanced', booking_link: false, callback: false, email: false, email_address: '', instructions: '' },
  sales_call:         { mode: 'strict',   booking_link: false, callback: false, email: true,  email_address: '', instructions: '' },
  supplier_delivery:  { mode: 'balanced', booking_link: false, callback: true,  email: true,  email_address: '', instructions: '' },
  invoice_authorities:{ mode: 'strict',   booking_link: false, callback: true,  email: true,  email_address: '', instructions: '' },
}

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
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
  },
  hint: {
    fontSize: '0.775rem',
    color: '#999',
    marginTop: '0.5rem',
    lineHeight: 1.55,
  },
  segmented: {
    display: 'inline-flex',
    background: '#f3f1f6',
    borderRadius: '8px',
    padding: '3px',
    gap: '2px',
  },
  segBtn: (active) => ({
    padding: '0.45rem 1.25rem',
    borderRadius: '6px',
    border: 'none',
    background: active ? '#5e3b87' : 'transparent',
    color: active ? 'white' : '#777',
    fontSize: '0.8125rem',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: "'DM Sans', sans-serif",
  }),
  segBtnSm: (active) => ({
    padding: '0.35rem 0.85rem',
    borderRadius: '5px',
    border: 'none',
    background: active ? '#5e3b87' : 'transparent',
    color: active ? 'white' : '#777',
    fontSize: '0.75rem',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: 'nowrap',
  }),
  pairBtn: (active) => ({
    padding: '0.5rem 1.1rem',
    borderRadius: '8px',
    border: `1.5px solid ${active ? '#5e3b87' : 'rgba(94,59,135,0.18)'}`,
    background: active ? 'rgba(94,59,135,0.07)' : 'white',
    color: active ? '#5e3b87' : '#777',
    fontSize: '0.8125rem',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'all 0.15s',
  }),
  toggleRow: (last) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.9rem 0',
    borderBottom: last ? 'none' : '1px solid rgba(94,59,135,0.07)',
    gap: '1rem',
  }),
  toggleRowLeft: { flex: 1 },
  toggleLabel: { fontSize: '0.875rem', color: '#1a1a1a', fontWeight: '500', marginBottom: '0.15rem' },
  toggleDesc:  { fontSize: '0.775rem', color: '#999', lineHeight: 1.5 },
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
    padding: '0.3rem 0.65rem', background: '#ede8f5', borderRadius: '20px',
    fontSize: '0.8rem', color: '#5e3b87', marginRight: '0.45rem', marginBottom: '0.45rem',
  },
  chipRemove: {
    background: 'none', border: 'none', cursor: 'pointer', color: '#9b87b8',
    fontSize: '1rem', lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center',
  },
  addRow: { display: 'flex', gap: '0.5rem', marginTop: '0.75rem' },
  addInput: {
    flex: 1, padding: '0.55rem 0.75rem', border: '1px solid rgba(94,59,135,0.2)',
    borderRadius: '8px', fontSize: '0.875rem', color: '#1a1a1a', outline: 'none',
    fontFamily: "'DM Sans', sans-serif", background: 'white',
  },
  addBtn: {
    padding: '0.55rem 1rem', background: 'white', border: '1px solid rgba(94,59,135,0.22)',
    borderRadius: '8px', fontSize: '0.8125rem', color: '#5e3b87', cursor: 'pointer',
    fontWeight: '500', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif",
  },
  textarea: {
    width: '100%', padding: '0.65rem 0.75rem', border: '1px solid rgba(94,59,135,0.2)',
    borderRadius: '8px', fontSize: '0.875rem', color: '#1a1a1a', boxSizing: 'border-box',
    outline: 'none', resize: 'vertical', minHeight: '90px',
    fontFamily: "'DM Sans', sans-serif", lineHeight: 1.55,
  },
  ghost: {
    background: 'none', border: 'none', color: '#5e3b87', fontSize: '0.775rem',
    cursor: 'pointer', padding: '0.35rem 0', opacity: 0.75, textDecoration: 'underline',
    fontFamily: "'DM Sans', sans-serif", display: 'block', marginTop: '0.5rem',
  },
  saveRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' },
  saveBtn: {
    padding: '0.6rem 1.5rem', background: '#f0a500', color: '#1a0533', border: 'none',
    borderRadius: '8px', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  saveBtnDisabled: {
    padding: '0.6rem 1.5rem', background: '#f5d98a', color: '#7a5c1a', border: 'none',
    borderRadius: '8px', fontSize: '0.875rem', fontWeight: '500', cursor: 'not-allowed',
    fontFamily: "'DM Sans', sans-serif",
  },
  toast: (type) => ({
    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
    padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '500',
    background: type === 'success' ? '#e6f5ee' : '#fef2f2',
    color: type === 'success' ? '#1e7a4a' : '#b91c1c',
    border: `1px solid ${type === 'success' ? '#a7e8c2' : '#fecaca'}`,
  }),
  lockedOverlay: { position: 'relative', borderRadius: '8px', overflow: 'hidden' },
  lockedBlur: { filter: 'blur(3px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.45 },
  lockedBadge: {
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    background: 'white', border: '1px solid rgba(94,59,135,0.15)', borderRadius: '10px',
    padding: '0.85rem 1.5rem', textAlign: 'center', boxShadow: '0 4px 16px rgba(94,59,135,0.12)',
    zIndex: 2, minWidth: '200px',
  },
  lockedBadgeTitle: { fontSize: '0.875rem', fontWeight: '600', color: '#1a1a1a', marginBottom: '0.2rem' },
  lockedBadgeText: { fontSize: '0.75rem', color: '#999' },
  // ── call type rule cards ──
  ruleCard: {
    border: '1px solid rgba(94,59,135,0.12)',
    borderRadius: '10px',
    padding: '1.1rem 1.25rem',
    marginBottom: '0.75rem',
  },
  ruleCardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '1rem',
    marginBottom: '0.75rem',
  },
  ruleCardLeft: { display: 'flex', alignItems: 'flex-start', gap: '0.6rem', flex: 1 },
  ruleCardIcon: {
    width: 32, height: 32, borderRadius: '7px', background: '#f3f1f6',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  ruleCardName: { fontSize: '0.875rem', fontWeight: '600', color: '#1a1a1a', marginBottom: '0.15rem' },
  ruleCardDesc: { fontSize: '0.775rem', color: '#888', lineHeight: 1.45 },
  closingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem 0',
    borderTop: '1px solid rgba(94,59,135,0.07)',
    flexWrap: 'wrap',
  },
  closingItem: { display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 },
  closingLabel: { fontSize: '0.8rem', color: '#444', userSelect: 'none' },
  emailGroup: { display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: '220px', flexWrap: 'wrap' },
  emailInput: (enabled) => ({
    padding: '0.35rem 0.65rem',
    border: `1px solid ${enabled ? 'rgba(94,59,135,0.2)' : 'rgba(94,59,135,0.08)'}`,
    borderRadius: '6px',
    fontSize: '0.775rem',
    color: enabled ? '#1a1a1a' : '#bbb',
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
    background: enabled ? 'white' : '#f8f7fa',
    width: '180px',
    transition: 'all 0.15s',
  }),
  useMyEmailBtn: (enabled) => ({
    background: 'none',
    border: 'none',
    fontSize: '0.7rem',
    color: enabled ? '#5e3b87' : '#ccc',
    cursor: enabled ? 'pointer' : 'default',
    padding: '0 0.25rem',
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: 'nowrap',
    textDecoration: enabled ? 'underline' : 'none',
    opacity: enabled ? 0.75 : 1,
  }),
  goodbyeChip: {
    display: 'flex', alignItems: 'center', gap: '0.35rem',
    fontSize: '0.8rem', color: '#3db87a', fontWeight: '500', flexShrink: 0,
  },
  instructionsWrap: {
    marginTop: '0.65rem',
    paddingTop: '0.65rem',
    borderTop: '1px solid rgba(94,59,135,0.06)',
  },
  instructionsLabel: {
    fontSize: '0.7rem', fontWeight: '500', color: '#aaa',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem',
  },
  instructionsInput: {
    width: '100%', padding: '0.5rem 0.7rem',
    border: '1px solid rgba(94,59,135,0.15)', borderRadius: '6px',
    fontSize: '0.8rem', color: '#1a1a1a', outline: 'none',
    fontFamily: "'DM Sans', sans-serif", background: 'white',
    boxSizing: 'border-box', resize: 'vertical', minHeight: '52px', lineHeight: 1.5,
  },
  // ── network card ──
  networkCard: {
    background: 'linear-gradient(135deg, #5e3b87 0%, #3a2057 100%)',
    borderRadius: '10px', padding: '1.5rem', display: 'flex',
    alignItems: 'center', gap: '1.25rem', marginTop: '0.5rem',
  },
  networkIcon: {
    width: 44, height: 44, borderRadius: '10px', background: 'rgba(255,255,255,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  networkCardTitle: { fontSize: '0.9375rem', fontWeight: '600', color: 'white', marginBottom: '0.3rem' },
  networkCardText: { fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.55, marginBottom: '0.9rem' },
  networkCardBtn: {
    padding: '0.45rem 1.1rem', background: '#f0a500', color: '#1a0533', border: 'none',
    borderRadius: '8px', fontSize: '0.8125rem', fontWeight: '500', cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
}

// ─── sub-components ───────────────────────────────────────────────────────────

const Toggle = ({ checked, onChange }) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    style={{
      width: 36, height: 20, borderRadius: 10,
      background: checked ? '#5e3b87' : '#d1d5db',
      border: 'none', cursor: 'pointer', position: 'relative',
      transition: 'background 0.2s', flexShrink: 0, padding: 0,
    }}
  >
    <span style={{
      position: 'absolute', top: 2, left: checked ? 18 : 2,
      width: 16, height: 16, borderRadius: '50%', background: 'white',
      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
    }} />
  </button>
)

const ToggleRow = ({ label, desc, checked, onChange, last }) => (
  <div style={s.toggleRow(last)}>
    <div style={s.toggleRowLeft}>
      <div style={s.toggleLabel}>{label}</div>
      <div style={s.toggleDesc}>{desc}</div>
    </div>
    <Toggle checked={checked} onChange={onChange} />
  </div>
)

const Toast = ({ msg, type }) =>
  msg ? <div style={s.toast(type)}>{type === 'success' ? '✓' : '!'} {msg}</div> : null

// ─── call type card ───────────────────────────────────────────────────────────

const CallTypeCard = ({ type, rule, businessEmail, onChange }) => {
  const { Icon, label, desc } = type

  const set = (field, value) => onChange(type.key, { ...rule, [field]: value })

  return (
    <div style={s.ruleCard}>
      {/* Header: icon + name + desc | mode selector */}
      <div style={s.ruleCardHeader}>
        <div style={s.ruleCardLeft}>
          <div style={s.ruleCardIcon}>
            <Icon size={15} color="#5e3b87" />
          </div>
          <div>
            <div style={s.ruleCardName}>{label}</div>
            <div style={s.ruleCardDesc}>{desc}</div>
          </div>
        </div>
        <div style={{ ...s.segmented, padding: '2px', gap: '1px', flexShrink: 0 }}>
          {['strict', 'balanced', 'open'].map(m => (
            <button key={m} onClick={() => set('mode', m)} style={s.segBtnSm(rule.mode === m)}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Closing methods */}
      <div style={s.closingRow}>
        {/* Booking link */}
        <div style={s.closingItem}>
          <Toggle checked={rule.booking_link} onChange={v => set('booking_link', v)} />
          <span style={s.closingLabel}>Booking link</span>
        </div>

        {/* Callback */}
        <div style={s.closingItem}>
          <Toggle checked={rule.callback} onChange={v => set('callback', v)} />
          <span style={s.closingLabel}>Callback</span>
        </div>

        {/* Email + address field */}
        <div style={s.emailGroup}>
          <Toggle checked={rule.email} onChange={v => set('email', v)} />
          <span style={s.closingLabel}>Email</span>
          <input
            style={s.emailInput(rule.email)}
            value={rule.email_address}
            onChange={e => set('email_address', e.target.value)}
            placeholder="address@example.com"
            disabled={!rule.email}
            type="email"
          />
          <button
            style={s.useMyEmailBtn(rule.email && !!businessEmail)}
            onClick={() => rule.email && businessEmail && set('email_address', businessEmail)}
          >
            Use mine
          </button>
        </div>

        {/* Goodbye — always on */}
        <div style={s.goodbyeChip}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="6" fill="#3db87a" opacity="0.2" />
            <circle cx="6" cy="6" r="3.5" fill="#3db87a" />
          </svg>
          Goodbye
        </div>
      </div>

      {/* Additional instructions */}
      <div style={s.instructionsWrap}>
        <div style={s.instructionsLabel}>Additional instructions (optional)</div>
        <textarea
          style={s.instructionsInput}
          value={rule.instructions}
          onChange={e => set('instructions', e.target.value)}
          placeholder={`e.g. ${
            type.key === 'new_customer'      ? 'If they mention a referral, ask who sent them.' :
            type.key === 'partner_service'   ? 'Always mention the partner by name and offer to send their number via SMS.' :
            type.key === 'sales_call'        ? 'Do not engage with pricing discussions. Close within two turns.' :
            type.key === 'supplier_delivery' ? 'Ask for the expected delivery date and which job it relates to.' :
                                               'Always take a reference number and the full name of the caller.'
          }`}
        />
      </div>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

const AIBehaviour = ({ onNavigate }) => {
  const { user } = useAuth()

  const [tenantId, setTenantId] = useState(null)
  const [tier, setTier] = useState('light')
  const [loading, setLoading] = useState(true)
  const [businessEmail, setBusinessEmail] = useState('')

  // Main AI settings
  const [triageMode, setTriageMode] = useState('balanced')
  const [escalationPref, setEscalationPref] = useState('escalate')
  const [greetingMessage, setGreetingMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: '' })

  // Call type rules
  const [rules, setRules] = useState(DEFAULT_RULES)
  const [rulesSaving, setRulesSaving] = useState(false)
  const [rulesToast, setRulesToast] = useState({ msg: '', type: '' })

  // Call filtering
  const [spamFilter, setSpamFilter] = useState(true)
  const [salesHandling, setSalesHandling] = useState(true)
  const [autodialerDetection, setAutodialerDetection] = useState(true)

  // Emergency keywords
  const [keywords, setKeywords] = useState([])
  const [keywordDraft, setKeywordDraft] = useState('')

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      try {
        const { data: membership } = await supabase
          .from('tenant_memberships').select('tenant_id').eq('user_id', user.id).maybeSingle()
        if (!membership) return
        const tid = membership.tenant_id
        setTenantId(tid)

        const { data: tenant } = await supabase
          .from('tenants')
          .select('triage_mode, escalation_preference, greeting_message, spam_filter_enabled, sales_call_handling, autodialler_detection, emergency_keywords, subscription_tier, business_email')
          .eq('id', tid).maybeSingle()

        if (tenant) {
          setTier(tenant.subscription_tier || 'light')
          setBusinessEmail(tenant.business_email || '')
          setTriageMode(tenant.triage_mode || 'balanced')
          setEscalationPref(tenant.escalation_preference || 'escalate')
          setGreetingMessage(tenant.greeting_message || '')
          setSpamFilter(tenant.spam_filter_enabled !== false)
          setSalesHandling(tenant.sales_call_handling !== false)
          setAutodialerDetection(tenant.autodialler_detection !== false)
          if (tenant.emergency_keywords) {
            setKeywords(Array.isArray(tenant.emergency_keywords)
              ? tenant.emergency_keywords
              : tenant.emergency_keywords.split(',').map(k => k.trim()).filter(Boolean))
          }
        }

        const { data: rulesData } = await supabase
          .from('call_handling_rules')
          .select('call_type, mode, booking_link, callback, email, email_address, instructions')
          .eq('tenant_id', tid)

        if (rulesData && rulesData.length > 0) {
          const merged = { ...DEFAULT_RULES }
          rulesData.forEach(row => {
            if (merged[row.call_type]) {
              merged[row.call_type] = {
                mode:          row.mode          ?? DEFAULT_RULES[row.call_type].mode,
                booking_link:  row.booking_link  ?? DEFAULT_RULES[row.call_type].booking_link,
                callback:      row.callback      ?? DEFAULT_RULES[row.call_type].callback,
                email:         row.email         ?? DEFAULT_RULES[row.call_type].email,
                email_address: row.email_address || '',
                instructions:  row.instructions  || '',
              }
            }
          })
          setRules(merged)
        }
      } catch (err) {
        console.error('AIBehaviour load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  // ── handlers ────────────────────────────────────────────────────────────────

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: '' }), 3000)
  }

  const showRulesToast = (msg, type = 'success') => {
    setRulesToast({ msg, type })
    setTimeout(() => setRulesToast({ msg: '', type: '' }), 3000)
  }

  const saveMainSettings = async () => {
    if (!tenantId) return
    setSaving(true)
    const { error } = await supabase.from('tenants').update({
      triage_mode: triageMode,
      escalation_preference: escalationPref,
      greeting_message: greetingMessage.trim() || null,
    }).eq('id', tenantId)
    setSaving(false)
    showToast(error ? 'Could not save. Please try again.' : 'AI settings saved.', error ? 'error' : 'success')
  }

  const saveRules = async () => {
    if (!tenantId) return
    setRulesSaving(true)
    const rows = CALL_TYPES.map(type => ({
      tenant_id:     tenantId,
      call_type:     type.key,
      mode:          rules[type.key].mode,
      booking_link:  rules[type.key].booking_link,
      callback:      rules[type.key].callback,
      email:         rules[type.key].email,
      email_address: rules[type.key].email_address || null,
      instructions:  rules[type.key].instructions  || null,
    }))
    const { error } = await supabase
      .from('call_handling_rules')
      .upsert(rows, { onConflict: 'tenant_id,call_type' })
    setRulesSaving(false)
    showRulesToast(error ? 'Could not save. Please try again.' : 'Call handling saved.', error ? 'error' : 'success')
  }

  const saveToggle = async (field, value) => {
    if (!tenantId) return
    await supabase.from('tenants').update({ [field]: value }).eq('id', tenantId)
  }

  const updateRule = (callTypeKey, updated) => {
    setRules(prev => ({ ...prev, [callTypeKey]: updated }))
  }

  const addKeyword = async (word) => {
    const trimmed = word.trim()
    if (!trimmed || !tenantId) return
    const updated = [...keywords, trimmed]
    setKeywords(updated)
    setKeywordDraft('')
    await supabase.from('tenants').update({ emergency_keywords: updated }).eq('id', tenantId)
  }

  const removeKeyword = async (index) => {
    const updated = keywords.filter((_, i) => i !== index)
    setKeywords(updated)
    await supabase.from('tenants').update({ emergency_keywords: updated.length ? updated : null }).eq('id', tenantId)
  }

  if (loading) {
    return <div style={{ padding: '2rem', color: '#aaa', fontSize: '0.875rem' }}>Loading settings…</div>
  }

  const currentMode = TRIAGE_MODES.find(m => m.id === triageMode)

  return (
    <div>

      {/* Global Call Handling */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>Call Handling</h3>
        <p style={s.sectionSubtitle}>Global defaults — overridden per call type below.</p>

        <label style={s.label} data-help="Triage mode controls the pace and style of your AI's conversations. Strict = short and efficient, gets what it needs quickly and closes. Balanced = standard, recommended for most businesses. Open = more relaxed and conversational, good where relationship matters more than speed.">Default triage mode</label>
        <div style={s.segmented}>
          {TRIAGE_MODES.map(mode => (
            <button key={mode.id} onClick={() => setTriageMode(mode.id)} style={s.segBtn(triageMode === mode.id)}>
              {mode.label}
            </button>
          ))}
        </div>
        {currentMode && <p style={s.hint}>{currentMode.desc}</p>}

        <div style={{ marginTop: '1.5rem' }}>
          <label style={s.label} data-help="This controls what happens when your AI genuinely can't help a caller. 'Escalate to me' means it tries to transfer the call to you live — if you don't answer, it takes a callback. 'Hard close' means it wraps up politely without trying to reach you, and offers a callback request instead.">When the AI cannot resolve a call</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={() => setEscalationPref('escalate')} style={s.pairBtn(escalationPref === 'escalate')}>Escalate to me</button>
            <button onClick={() => setEscalationPref('hard_close')} style={s.pairBtn(escalationPref === 'hard_close')}>Hard close</button>
          </div>
          <p style={s.hint}>
            {escalationPref === 'escalate'
              ? 'Your AI will attempt to transfer the call to you. If unreachable, it captures a callback request.'
              : 'Your AI politely closes the call and offers a booking link or callback request. Nothing reaches you in real time.'}
          </p>
        </div>
      </div>

      {/* Call Type Rules */}
      <div style={s.section}>
        <h3 style={s.sectionTitle} data-help="Call Type Rules let you set completely different behaviour for different kinds of callers. A new customer gets one treatment, a cold sales call gets another, a supplier gets another. Expand each card to set the pace, closing method, and any special instructions.">Call Type Rules</h3>
        <p style={s.sectionSubtitle}>
          Configure how your AI handles each category of incoming call — the conversation mode, how it closes, and any specialist instructions. Known clients follow their individual instructions instead.
        </p>

        {CALL_TYPES.map(type => (
          <CallTypeCard
            key={type.key}
            type={type}
            rule={rules[type.key]}
            businessEmail={businessEmail}
            onChange={updateRule}
          />
        ))}

        <div style={{ ...s.saveRow, marginTop: '0.5rem' }}>
          <button style={rulesSaving ? s.saveBtnDisabled : s.saveBtn} onClick={saveRules} disabled={rulesSaving}>
            {rulesSaving ? 'Saving…' : 'Save call handling'}
          </button>
          <Toast msg={rulesToast.msg} type={rulesToast.type} />
        </div>
      </div>

      {/* Emergency Keywords */}
      <div style={s.section}>
        <h3 style={s.sectionTitle} data-help="Emergency Keywords are words that trigger an immediate escalation to you, no matter what else is happening on the call. Add things like 'gas leak', 'not breathing', 'flooding', 'emergency'. As soon as your AI hears one of these, it escalates — no other rules apply.">Emergency Keywords</h3>
        <p style={s.sectionSubtitle}>
          If a caller uses any of these words, your AI escalates immediately — regardless of call type rules or triage mode.
        </p>
        <div>
          {keywords.map((kw, i) => (
            <span key={i} style={s.chip}>
              {kw}
              <button style={s.chipRemove} onClick={() => removeKeyword(i)}>×</button>
            </span>
          ))}
          {keywords.length === 0 && <p style={{ fontSize: '0.8rem', color: '#ccc', margin: '0 0 0.5rem' }}>No keywords added yet.</p>}
        </div>
        <div style={s.addRow}>
          <input style={s.addInput} value={keywordDraft} onChange={e => setKeywordDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(keywordDraft) } }}
            placeholder="e.g. gas leak, emergency, not breathing…" />
          <button style={s.addBtn} onClick={() => addKeyword(keywordDraft)}>+ Add</button>
        </div>
      </div>

      {/* Greeting Message */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>Greeting Message</h3>
        <p style={s.sectionSubtitle}>The first thing your AI says when it answers. Leave blank to use the system default.</p>
        <textarea style={s.textarea} value={greetingMessage} onChange={e => setGreetingMessage(e.target.value)}
          placeholder={`e.g. "Hi, you've reached [Business Name]. I'm an AI assistant — how can I help you today?"`} />
        {greetingMessage && (
          <button style={s.ghost} onClick={() => setGreetingMessage('')}>Restore system default</button>
        )}
      </div>

      {/* Save main settings */}
      <div style={s.saveRow}>
        <button style={saving ? s.saveBtnDisabled : s.saveBtn} onClick={saveMainSettings} disabled={saving}>
          {saving ? 'Saving…' : 'Save AI settings'}
        </button>
        <Toast msg={toast.msg} type={toast.type} />
      </div>

      {/* Call Filtering */}
      <div style={s.section}>
        <h3 style={s.sectionTitle} data-help="Call Filtering sits upstream of everything else — it blocks known spam, autodialler patterns, and unsolicited sales calls before they even reach your AI. This protects your included minutes so they go to real callers, not bots and cold callers.">Call Filtering</h3>
        <p style={s.sectionSubtitle}>Upstream filters — applied before call type rules. Changes take effect immediately.</p>
        <ToggleRow label="Spam detection" desc="Block known spam call patterns before they consume triage turns."
          checked={spamFilter} onChange={v => { setSpamFilter(v); saveToggle('spam_filter_enabled', v) }} />
        <ToggleRow label="Sales call handling" desc="Identify and close unsolicited sales calls without wasting your AI's turns."
          checked={salesHandling} onChange={v => { setSalesHandling(v); saveToggle('sales_call_handling', v) }} />
        <ToggleRow label="Autodialler detection" desc="Detect autodialler patterns and end the call before your AI engages."
          checked={autodialerDetection} onChange={v => { setAutodialerDetection(v); saveToggle('autodialler_detection', v) }} last />
      </div>

      {/* Number Blocking */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>Number Blocking</h3>
        <p style={s.sectionSubtitle}>Specific numbers your AI will reject without engaging.</p>
        {tier === 'light' ? (
          <div style={s.lockedOverlay}>
            <div style={s.lockedBlur}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {['+44 7700 900000', '+44 7700 900001', '+44 7700 900002'].map(n => (
                  <div key={n} style={{ padding: '0.6rem 0.85rem', border: '1px solid rgba(94,59,135,0.1)', borderRadius: '8px', fontSize: '0.875rem', color: '#334155', background: '#f8fafc' }}>{n}</div>
                ))}
              </div>
            </div>
            <div style={s.lockedBadge}>
              <div style={s.lockedBadgeTitle}>Standard plan and above</div>
              <div style={s.lockedBadgeText}>Upgrade to block specific numbers.</div>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', color: '#aaa' }}>Number blocking management coming soon.</p>
        )}
      </div>

      {/* Network card */}
      <div style={s.networkCard}>
        <div style={s.networkIcon}>
          <svg width="22" height="22" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={s.networkCardTitle}>Build your referral network</div>
          <p style={s.networkCardText}>Every call your AI refers out is a potential reciprocal referral back. The more partners in your network, the more inbound leads you receive without spending on advertising.</p>
          <button style={s.networkCardBtn} onClick={() => onNavigate && onNavigate('referrals')}>Manage partners</button>
        </div>
      </div>

    </div>
  )
}

export default AIBehaviour
