import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { useDemo } from '../context/DemoContext'
import { usePreview } from '../context/PreviewContext'
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
    background: active ? '#f0ebf8' : 'white',
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
    padding: '0.3rem 0.65rem', background: '#ede8f5', borderRadius: '999px',
    fontSize: '0.78rem', color: '#5e3b87', marginRight: '0.45rem', marginBottom: '0.45rem',
    fontWeight: 500,
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

// ─── greeting preview helper ──────────────────────────────────────────────────

function previewGreeting(tone, name, owner, outcomeType, bLink, callbackNote) {
  const n = name || 'your business'
  const o = owner || 'the owner'
  if (tone === 'formal') {
    return `Good morning. You have reached ${n}. ${o} is currently unavailable — I am their virtual assistant. I will be taking a brief note of your enquiry to ensure it receives ${o}'s personal attention. How may I assist you?`
  }
  let resolution
  if (outcomeType === 'booking' && bLink) {
    resolution = "I'll be taking a brief note and sending you a booking link."
  } else if (outcomeType === 'booking') {
    resolution = "I'll be taking a brief note to get you booked in."
  } else if (callbackNote) {
    resolution = `I'll be taking a brief note, ${o} will call you back ${callbackNote}.`
  } else {
    resolution = `I'll be taking a brief note so ${o} can call you back to discuss what you need.`
  }
  return `Good morning, ${n}. ${o} is busy — I'm their virtual assistant. ${resolution} How can I help you?`
}

// ─── main component ───────────────────────────────────────────────────────────

const AIBehaviour = ({ onNavigate }) => {
  const { user } = useAuth()
  const demo = useDemo()
  const isDemo = !!demo?.isDemo
  const preview = usePreview()
  const isPreview = !!preview?.isPreview

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

  // New settings
  const [toneRegister, setToneRegister] = useState('warm')
  const [businessOutcomeType, setBusinessOutcomeType] = useState('quote')
  const [callbackPrefNote, setCallbackPrefNote] = useState('')
  const [additionalInstructions, setAdditionalInstructions] = useState('')

  // Urgent callback
  const [urgentCallbackMins, setUrgentCallbackMins] = useState(60)
  const [urgentEscalationMethod, setUrgentEscalationMethod] = useState('both')

  // Greeting generator
  const [businessName, setBusinessName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [bookingLink, setBookingLink] = useState('')
  const [greetingModalShown, setGreetingModalShown] = useState(false)
  const [showProtectedModal, setShowProtectedModal] = useState(false)
  const [generatorNotes, setGeneratorNotes] = useState('')
  const [generatingGreeting, setGeneratingGreeting] = useState(false)

  // Provisional booking
  const [provisionalBookingEnabled, setProvisionalBookingEnabled] = useState(false)
  const [provisionalBookingRule, setProvisionalBookingRule] = useState('')
  const [bookingSlotsToOffer, setBookingSlotsToOffer] = useState(2)
  const [bookingBufferMins, setBookingBufferMins] = useState(30)
  const [bookingConfirmationWindowMins, setBookingConfirmationWindowMins] = useState(120)

  // Overage voice preference
  const [overageVoicePref, setOverageVoicePref] = useState('premium')

  // Emergency keywords
  const [keywords, setKeywords] = useState([])
  const [keywordDraft, setKeywordDraft] = useState('')

  // Demo mode: inject data from DemoContext
  useEffect(() => {
    if (!isDemo || demo?.loading) return
    const biz = demo.business || {}
    setTier(demo.tier)
    setBusinessEmail(biz.business_email || '')
    setTriageMode(biz.triage_mode || 'balanced')
    setGreetingMessage(biz.greeting_message || '')
    setToneRegister(biz.tone_register || 'warm')
    setBusinessOutcomeType(biz.business_outcome_type || 'quote')
    setEscalationPref('escalate')
    setSpamFilter(true)
    setSalesHandling(true)
    setAutodialerDetection(true)
    setUrgentCallbackMins(60)
    setBusinessName(biz.business_name || '')
    setOwnerName(biz.lead_contact_name || '')
    setBookingLink(biz.booking_link || '')
    setOverageVoicePref('premium')
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
          const { data: membership } = await supabase
            .from('tenant_memberships').select('tenant_id').eq('user_id', user.id).maybeSingle()
          if (!membership) return
          tid = membership.tenant_id
        }
        setTenantId(tid)

        const { data: tenant } = await supabase
          .from('tenants')
          .select('triage_mode, escalation_preference, greeting_message, spam_filter_enabled, sales_call_handling, autodialler_detection, emergency_keywords, subscription_tier, business_email, tone_register, business_outcome_type, callback_preference_note, additional_instructions, business_name, lead_contact_name, booking_link, urgent_callback_mins, urgent_escalation_method, provisional_booking_enabled, provisional_booking_rule, booking_slots_to_offer, booking_buffer_mins, booking_confirmation_window_mins, overage_voice_preference')
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
          setToneRegister(tenant.tone_register || 'warm')
          setBusinessOutcomeType(tenant.business_outcome_type || 'quote')
          setCallbackPrefNote(tenant.callback_preference_note || '')
          setAdditionalInstructions(tenant.additional_instructions || '')
          setBusinessName(tenant.business_name || '')
          setOwnerName(tenant.lead_contact_name || '')
          setBookingLink(tenant.booking_link || '')
          setUrgentCallbackMins(tenant.urgent_callback_mins ?? 60)
          setUrgentEscalationMethod(tenant.urgent_escalation_method || 'both')
          setProvisionalBookingEnabled(tenant.provisional_booking_enabled || false)
          setProvisionalBookingRule(tenant.provisional_booking_rule || '')
          setBookingSlotsToOffer(tenant.booking_slots_to_offer ?? 2)
          setBookingBufferMins(tenant.booking_buffer_mins ?? 30)
          setBookingConfirmationWindowMins(tenant.booking_confirmation_window_mins ?? 120)
          setOverageVoicePref(tenant.overage_voice_preference || 'premium')
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
  }, [user, isDemo, isPreview])

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
    if (isDemo || isPreview || !tenantId) return
    setSaving(true)
    const { error } = await supabase.from('tenants').update({
      triage_mode: triageMode,
      escalation_preference: escalationPref,
      greeting_message: greetingMessage.trim() || null,
      tone_register: toneRegister,
      business_outcome_type: businessOutcomeType,
      callback_preference_note: callbackPrefNote.trim() || null,
      additional_instructions: additionalInstructions.trim() || null,
      urgent_callback_mins: urgentCallbackMins,
      urgent_escalation_method: urgentEscalationMethod,
      provisional_booking_enabled: provisionalBookingEnabled,
      provisional_booking_rule: provisionalBookingRule.trim() || null,
      booking_slots_to_offer: bookingSlotsToOffer,
      booking_buffer_mins: bookingBufferMins,
      booking_confirmation_window_mins: bookingConfirmationWindowMins,
      overage_voice_preference: overageVoicePref,
    }).eq('id', tenantId)
    setSaving(false)
    showToast(error ? 'Could not save. Please try again.' : 'AI settings saved.', error ? 'error' : 'success')
    if (!error) syncVapi(tenantId)
  }

  const saveRules = async () => {
    if (isDemo || isPreview || !tenantId) return
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
    if (!error) syncVapi(tenantId)
  }

  const syncVapi = (tid) => {
    fetch('/api/vapi-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: tid }),
    }).catch(() => {})
  }

  const saveToggle = async (field, value) => {
    if (isDemo || isPreview || !tenantId) return
    await supabase.from('tenants').update({ [field]: value }).eq('id', tenantId)
  }

  const updateRule = (callTypeKey, updated) => {
    setRules(prev => ({ ...prev, [callTypeKey]: updated }))
  }

  const addKeyword = async (word) => {
    if (isDemo || isPreview) return
    const trimmed = word.trim()
    if (!trimmed || !tenantId) return
    const updated = [...keywords, trimmed]
    setKeywords(updated)
    setKeywordDraft('')
    await supabase.from('tenants').update({ emergency_keywords: updated }).eq('id', tenantId)
  }

  const removeKeyword = async (index) => {
    if (isDemo) return
    const updated = keywords.filter((_, i) => i !== index)
    setKeywords(updated)
    await supabase.from('tenants').update({ emergency_keywords: updated.length ? updated : null }).eq('id', tenantId)
  }

  const generateGreeting = async () => {
    if (!generatorNotes.trim()) return
    setGeneratingGreeting(true)
    try {
      const res = await fetch('/api/greeting-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantNotes: generatorNotes, businessName, ownerName }),
      })
      const data = await res.json()
      if (data.greeting) setGreetingMessage(data.greeting)
    } catch {
      // silent — user can retry
    } finally {
      setGeneratingGreeting(false)
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem', color: '#aaa', fontSize: '0.875rem' }}>Loading settings…</div>
  }

  const currentMode = TRIAGE_MODES.find(m => m.id === triageMode)
  const isProfessional = ['professional', 'enterprise', 'bespoke'].includes(tier)
  const isEnterprise = ['enterprise', 'bespoke'].includes(tier)

  return (
    <div>

      {/* Global Call Handling */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>Call Handling</h3>
        <p style={s.sectionSubtitle}>Global defaults — overridden per call type below.</p>

        {/* Row 1: Tone + Outcome type side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1rem' }}>
          <div>
            <label style={s.label} data-help="Your assistant's tone. Warm is friendly and natural. Formal is professional and precise — suits solicitors, accountants, formal practices.">Assistant tone</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {['warm', 'formal'].map(tone => (
                <button key={tone} onClick={() => setToneRegister(tone)} style={{
                  padding: '0.65rem 0.85rem', borderRadius: '8px', textAlign: 'left', cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  border: toneRegister === tone ? '2px solid #5e3b87' : '1.5px solid rgba(94,59,135,0.15)',
                  background: toneRegister === tone ? '#ddd6fe' : 'white',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <div style={{ width: 13, height: 13, borderRadius: '50%', border: toneRegister === tone ? '4px solid #5e3b87' : '1.5px solid #ccc', flexShrink: 0 }} />
                    <div style={{ fontWeight: 600, fontSize: '0.8375rem', color: toneRegister === tone ? '#4a2d6e' : '#1a1a1a' }}>{tone === 'warm' ? 'Warm' : 'Formal'}</div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#888', lineHeight: 1.45, fontStyle: 'italic', paddingLeft: '1.3rem' }}>
                    "{previewGreeting(tone, businessName, ownerName, businessOutcomeType, bookingLink, callbackPrefNote)}"
                  </div>
                </button>
              ))}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#bbb', marginTop: '0.4rem', lineHeight: 1.4 }}>"Please allow me" is locked — it protects call quality.</div>
          </div>

          <div>
            <label style={s.label} data-help="Booking businesses route callers to an appointment. Quote businesses route callers to a callback conversation.">Successful call outcome</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
              <button onClick={() => setBusinessOutcomeType('booking')} style={{ ...s.pairBtn(businessOutcomeType === 'booking'), width: '100%', textAlign: 'left', padding: '0.65rem 0.85rem' }}>I take bookings and appointments</button>
              <button onClick={() => setBusinessOutcomeType('quote')} style={{ ...s.pairBtn(businessOutcomeType === 'quote'), width: '100%', textAlign: 'left', padding: '0.65rem 0.85rem' }}>I discuss, quote, and arrange</button>
            </div>

            <label style={s.label} data-help="When the AI cannot resolve a call — Escalate transfers to you live. Hard close wraps up politely and offers a callback.">When AI cannot resolve</label>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button onClick={() => setEscalationPref('escalate')} style={s.pairBtn(escalationPref === 'escalate')}>Escalate to me</button>
              <button onClick={() => setEscalationPref('hard_close')} style={s.pairBtn(escalationPref === 'hard_close')}>Hard close</button>
            </div>
          </div>
        </div>

        {/* Row 2: Triage mode */}
        <label style={{ ...s.label, marginBottom: '0.4rem' }} data-help="Triage mode controls the pace of conversations. Strict = short and efficient. Balanced = standard. Open = more conversational.">Default triage mode</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginBottom: '1rem' }}>
          {TRIAGE_MODES.map(mode => (
            <button key={mode.id} onClick={() => setTriageMode(mode.id)} style={{
              padding: '0.65rem 0.85rem', borderRadius: '8px', textAlign: 'left', cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              border: triageMode === mode.id ? '2px solid #5e3b87' : '1.5px solid rgba(94,59,135,0.15)',
              background: triageMode === mode.id ? '#ddd6fe' : 'white',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
                <div style={{ width: 13, height: 13, borderRadius: '50%', border: triageMode === mode.id ? '4px solid #5e3b87' : '1.5px solid #ccc', flexShrink: 0 }} />
                <div style={{ fontWeight: 600, fontSize: '0.8375rem', color: triageMode === mode.id ? '#4a2d6e' : '#1a1a1a' }}>{mode.label}</div>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#777', lineHeight: 1.45, paddingLeft: '1.25rem' }}>{mode.desc}</div>
            </button>
          ))}
        </div>

        {/* Row 3: Urgent + Call return side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ ...s.label, marginBottom: '0.4rem' }} data-help="If a caller sounds urgent, how quickly can you respond? This promise is made to the caller.">Urgent call response</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: '#444' }}>Respond within</span>
              <input
                type="number" min={1}
                style={{ width: '52px', padding: '0.35rem 0.4rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '6px', fontSize: '0.8rem', textAlign: 'center', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a' }}
                value={urgentCallbackMins}
                onChange={e => setUrgentCallbackMins(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <span style={{ fontSize: '0.8rem', color: '#444' }}>minutes</span>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {[{ id: 'sms', label: 'Text me' }, { id: 'email', label: 'Email me' }, { id: 'both', label: 'Both' }].map(opt => (
                <button key={opt.id} onClick={() => setUrgentEscalationMethod(opt.id)} style={s.pairBtn(urgentEscalationMethod === opt.id)}>{opt.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ ...s.label, marginBottom: '0.4rem' }} data-help="Your AI says this when closing a call: 'Please allow me to take your details — [your name] will call you back [this].'">Call return preference</label>
            <input
              style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '8px', fontSize: '0.8125rem', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a' }}
              value={callbackPrefNote}
              onChange={e => setCallbackPrefNote(e.target.value)}
              placeholder="e.g. after 3pm same day"
            />
          </div>
        </div>

        {/* Row 4: Overage voice — 2 col */}
        {tier !== 'free' && (
          <div data-help="When your included minutes run out, your AI keeps going. Choose whether to stay on Premium (18p/min) or drop to Standard voice (14p/min).">
            <label style={{ ...s.label, marginBottom: '0.4rem' }}>When you run over your included minutes</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              {[
                { id: 'premium', title: 'Stay on Premium — 18p/min', desc: 'Same quality your callers expect. No change.' },
                { id: 'standard', title: 'Switch to Standard — 14p/min', desc: 'Save 4p/min. Returns to Premium at renewal.' },
              ].map(opt => (
                <button key={opt.id} onClick={() => setOverageVoicePref(opt.id)} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                  padding: '0.65rem 0.85rem', borderRadius: '8px', textAlign: 'left', cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  border: overageVoicePref === opt.id ? '2px solid #5e3b87' : '1.5px solid rgba(94,59,135,0.15)',
                  background: overageVoicePref === opt.id ? '#ddd6fe' : 'white',
                }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: overageVoicePref === opt.id ? '4px solid #5e3b87' : '1.5px solid #ccc', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: overageVoicePref === opt.id ? '#4a2d6e' : '#1a1a1a', marginBottom: '0.15rem' }}>{opt.title}</div>
                    <div style={{ fontSize: '0.72rem', color: '#888', lineHeight: 1.4 }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
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

        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(94,59,135,0.07)' }}>
          <label style={s.label} data-help="Anything not covered above. Describe specific situations and how you'd like your AI to handle them. For example: 'If a caller wants to cancel, tell them I will be in contact immediately.' Your AI follows these instructions for anything not covered by the rules above.">Anything else?</label>
          <p style={{ fontSize: '0.775rem', color: '#aaa', margin: '0 0 0.5rem', lineHeight: 1.5 }}>
            It's impossible to anticipate every type of call. If there are specific situations you'd like your AI to handle in a particular way, describe them here.
          </p>
          <textarea
            style={{ ...s.textarea, minHeight: '80px' }}
            value={additionalInstructions}
            onChange={e => setAdditionalInstructions(e.target.value)}
            placeholder={'e.g. "If a caller wants to cancel, tell them I will be in contact with them immediately."\ne.g. "If someone asks about parking, tell them there is free parking on Mill Lane."'}
          />
        </div>

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
        <h3 style={s.sectionTitle} data-help="Your greeting is the first thing every caller hears. The system default is professionally written and works for any business. Personalise it here if you'd like something more specific to how you sound.">Greeting Message</h3>
        <p style={s.sectionSubtitle}>Your AI uses the system greeting by default — crafted to work for any business. Personalise it here if you'd like something more specific to how you sound.</p>

        {showProtectedModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.75rem', maxWidth: '420px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: '#1a1a1a', marginBottom: '0.75rem' }}>Edit with care</div>
              <p style={{ fontSize: '0.875rem', color: '#444', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                This content directly affects how your AI handles every call. Edit with care — if you change your mind at any time and want to return to the original text click Restore Default.
              </p>
              <button onClick={() => setShowProtectedModal(false)} style={{ background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: '8px', padding: '0.6rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Got it</button>
            </div>
          </div>
        )}

        <textarea
          style={s.textarea}
          value={greetingMessage}
          onFocus={() => { if (!greetingModalShown) { setShowProtectedModal(true); setGreetingModalShown(true) } }}
          onChange={e => setGreetingMessage(e.target.value)}
          placeholder="Leave blank to use the system greeting based on your tone and outcome type settings above."
        />
        <div style={{ marginTop: '0.5rem' }}>
          <button style={s.ghost} onClick={() => {
            if (!greetingMessage || window.confirm('Restore the system default greeting? Your custom greeting will be removed.')) setGreetingMessage('')
          }}>Restore Default</button>
        </div>

        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(94,59,135,0.07)' }}>
          <label style={s.label}>Want to personalise it?</label>
          <p style={s.hint}>Tell us anything about your business or how you'd like to sound — we'll write it for you.</p>
          <textarea
            style={{ ...s.textarea, marginBottom: '0.75rem' }}
            value={generatorNotes}
            onChange={e => setGeneratorNotes(e.target.value)}
            placeholder="e.g. We're a family-run plumbing business, friendly but efficient. Callers are usually homeowners with an urgent job."
          />
          <button
            style={generatingGreeting || !generatorNotes.trim() ? s.saveBtnDisabled : s.saveBtn}
            onClick={generateGreeting}
            disabled={generatingGreeting || !generatorNotes.trim()}
          >
            {generatingGreeting ? 'Writing…' : 'Write my greeting'}
          </button>
        </div>
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

      {/* Provisional Booking */}
      <div style={s.section}>
        <h3 style={s.sectionTitle} data-help="Provisional Booking lets your AI offer real appointment slots on your behalf, based on rules you set. It checks your calendar for availability and holds a slot — the caller gets confirmation, you get a notification. Professional and Enterprise only.">Provisional Booking</h3>
        <p style={s.sectionSubtitle}>Let your AI offer provisional appointment slots based on your calendar availability.</p>

        {!isProfessional ? (
          <div style={s.lockedOverlay}>
            <div style={s.lockedBlur}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem 1rem', border: '1px solid rgba(94,59,135,0.1)', borderRadius: '8px', fontSize: '0.875rem', color: '#334155', background: '#f8fafc' }}>Allow my AI to make provisional bookings — Off</div>
                <div style={{ padding: '0.75rem 1rem', border: '1px solid rgba(94,59,135,0.1)', borderRadius: '8px', fontSize: '0.875rem', color: '#334155', background: '#f8fafc' }}>When should your AI book? — [your rule here]</div>
              </div>
            </div>
            <div style={s.lockedBadge}>
              <div style={s.lockedBadgeTitle}>Professional plan and above</div>
              <div style={s.lockedBadgeText}>Upgrade to enable provisional booking.</div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(94,59,135,0.07)', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1a1a1a' }}>Allow my AI to make provisional bookings</div>
                <div style={{ fontSize: '0.775rem', color: '#888', marginTop: '0.2rem' }}>Your AI will offer slots from your connected calendar when the booking rule is met.</div>
              </div>
              <button
                role="switch"
                aria-checked={provisionalBookingEnabled}
                onClick={() => setProvisionalBookingEnabled(v => !v)}
                style={{ width: 42, height: 24, borderRadius: 12, background: provisionalBookingEnabled ? '#5e3b87' : '#d1d5db', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0, padding: 0 }}
              >
                <span style={{ position: 'absolute', top: 3, left: provisionalBookingEnabled ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
              </button>
            </div>

            {provisionalBookingEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={s.label} data-help="Write the rule your AI follows when deciding whether to offer a booking. It applies this with good judgement — if the caller clearly meets the rule it books, if uncertain it takes details for a callback.">When should your AI make a provisional booking?</label>
                  <textarea
                    style={{ ...s.textarea, minHeight: '72px' }}
                    value={provisionalBookingRule}
                    onChange={e => setProvisionalBookingRule(e.target.value)}
                    placeholder="e.g. Make a provisional booking if the caller has expressed a clear intent to use my services within one month."
                  />
                </div>

                <div>
                  <label style={s.label}>Slots to offer</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[1, 2, 3].map(n => (
                      <button key={n} onClick={() => setBookingSlotsToOffer(n)} style={{ ...s.pairBtn(bookingSlotsToOffer === n), minWidth: '52px' }}>{n}</button>
                    ))}
                  </div>
                  <p style={s.hint}>How many available slots your AI offers the caller to choose from.</p>
                </div>

                <div>
                  <label style={s.label}>Booking buffer</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[15, 30, 45, 60].map(n => (
                      <button key={n} onClick={() => setBookingBufferMins(n)} style={{ ...s.pairBtn(bookingBufferMins === n), minWidth: '52px' }}>{n} min</button>
                    ))}
                  </div>
                  <p style={s.hint}>Minimum gap between now and the earliest slot your AI can offer.</p>
                </div>

                <div>
                  <label style={s.label}>Confirmation window</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[{ label: '1 hour', value: 60 }, { label: '2 hours', value: 120 }, { label: 'Same day', value: 1440 }].map(opt => (
                      <button key={opt.value} onClick={() => setBookingConfirmationWindowMins(opt.value)} style={s.pairBtn(bookingConfirmationWindowMins === opt.value)}>{opt.label}</button>
                    ))}
                  </div>
                  <p style={s.hint}>How long the caller has to confirm before the provisional slot is released.</p>
                </div>

                <div style={{ padding: '1rem', background: '#f4effe', borderRadius: '8px', fontSize: '0.8rem', color: '#5e3b87', lineHeight: 1.5 }}>
                  <strong>Calendar not connected.</strong> Connect your calendar below to enable provisional booking. Without a connected calendar your AI will revert to standard callback behaviour.
                </div>
              </div>
            )}

            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(94,59,135,0.07)' }}>
              <label style={s.label} data-help="Connect your calendar so your AI can check availability and make provisional bookings. Supports Google Calendar, Apple Calendar, Outlook, Fastmail, and any CalDAV-compatible service.">Calendar integration</label>
              <p style={s.hint}>Read availability · Write provisional bookings · Supports Google, Apple, Outlook, Fastmail, and all CalDAV providers.</p>
              <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '0.25rem' }}>Calendar connection coming soon.</p>
            </div>
          </>
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
