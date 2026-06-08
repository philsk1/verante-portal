import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { usePreview } from '../context/PreviewContext'
import { useDemo } from '../context/DemoContext'
import { User, ArrowLeftRight, PhoneOff, Truck, FileText } from 'lucide-react'

// ─── constants ────────────────────────────────────────────────────────────────

const CALL_MODES = [
  { id: 'strict',   label: 'Efficient', desc: 'Focused calls — captures the key details and closes without unnecessary back-and-forth.' },
  { id: 'balanced', label: 'Balanced',  desc: 'Standard — enough turns to qualify the enquiry and collect contact details.' },
  { id: 'open',     label: 'Relaxed',   desc: 'More space for conversation. Callers can talk through their need before you close or escalate.' },
]

const CONVERSATION_STYLES = [
  { id: 'efficient', triage: 'strict',   tone: 'formal', label: 'Efficient',
    toneNote: 'Professional register', desc: 'Gets straight to the point. Captures key details quickly and closes without unnecessary back-and-forth.',
    border: '#ef4444', bg: '#fecaca', text: '#991b1b', dot: '#ef4444', passiveBg: '#fff5f5', passiveBorder: 'rgba(239,68,68,0.15)' },
  { id: 'balanced',  triage: 'balanced', tone: 'warm',   label: 'Balanced',
    toneNote: 'Friendly & natural',    desc: 'Standard pace — qualifies the enquiry and collects contact details in a natural, warm way.',
    border: '#1d4ed8', bg: '#bfdbfe', text: '#1e3a8a', dot: '#1d4ed8', passiveBg: '#eff6ff', passiveBorder: 'rgba(29,78,216,0.15)' },
  { id: 'relaxed',   triage: 'open',     tone: 'warm',   label: 'Relaxed',
    toneNote: 'Warm & conversational', desc: 'More space for conversation. Callers can talk through their need before you close or escalate.',
    border: '#3db87a', bg: '#bbf7d0', text: '#166534', dot: '#3db87a', passiveBg: '#f0fdf4', passiveBorder: 'rgba(61,184,122,0.15)' },
]

const TRIAGE_COLOUR = {
  strict:   { border: '#ef4444', bg: '#fecaca', text: '#991b1b', dot: '#ef4444', passiveBg: '#fff5f5', passiveBorder: 'rgba(239,68,68,0.18)' },
  balanced: { border: '#1d4ed8', bg: '#bfdbfe', text: '#1e3a8a', dot: '#1d4ed8', passiveBg: '#eff6ff', passiveBorder: 'rgba(29,78,216,0.18)' },
  open:     { border: '#3db87a', bg: '#bbf7d0', text: '#166634', dot: '#3db87a', passiveBg: '#f0fdf4', passiveBorder: 'rgba(61,184,122,0.18)' },
}

const CALL_TYPES = [
  {
    key: 'new_customer',
    label: 'New Customer',
    desc: 'Caller enquiring about a service you offer. Qualify the need and convert.',
    Icon: User,
    accent: { bg: '#bbf7d0', color: '#166534', border: '#3db87a', passiveBg: '#f0fdf4' },
  },
  {
    key: 'partner_service',
    label: 'Partner Service',
    desc: 'Caller needs a service you refer to an associate. Acknowledge and refer warmly.',
    Icon: ArrowLeftRight,
    accent: { bg: '#bfdbfe', color: '#1e3a8a', border: '#1d4ed8', passiveBg: '#eff6ff' },
  },
  {
    key: 'sales_call',
    label: 'Sales Call',
    desc: 'Unsolicited commercial or cold call. Close politely and promptly.',
    Icon: PhoneOff,
    accent: { bg: '#fecaca', color: '#991b1b', border: '#ef4444', passiveBg: '#fff5f5' },
  },
  {
    key: 'supplier_delivery',
    label: 'Supplier / Delivery',
    desc: 'Supplier, delivery driver, or trade contact. Take details and confirm.',
    Icon: Truck,
    accent: { bg: '#fde68a', color: '#78460a', border: '#f0a500', passiveBg: '#fffbeb' },
  },
  {
    key: 'invoice_authorities',
    label: 'Invoice / Authorities',
    desc: 'Billing query, creditor, or official body. Take reference details and relay.',
    Icon: FileText,
    accent: { bg: '#fde68a', color: '#78460a', border: '#f0a500', passiveBg: '#fffbeb' },
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
  segBtnSm: (active, mode) => {
    const c = TRIAGE_COLOUR[mode] || {}
    return {
      padding: '0.35rem 0.85rem',
      borderRadius: '5px',
      border: 'none',
      background: active ? (c.bg || '#5e3b87') : (c.passiveBg || '#f8f8f8'),
      color: active ? (c.text || 'white') : '#777',
      fontSize: '0.75rem',
      fontWeight: active ? 600 : 400,
      cursor: 'pointer',
      transition: 'all 0.15s',
      fontFamily: "'DM Sans', sans-serif",
      whiteSpace: 'nowrap',
      outline: active ? `1.5px solid ${c.border || '#5e3b87'}` : 'none',
      outlineOffset: '-1px',
    }
  },
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
  const { Icon, label, desc, accent } = type

  const set = (field, value) => onChange(type.key, { ...rule, [field]: value })

  return (
    <div style={{ ...s.ruleCard, borderLeft: `3px solid ${accent.border}`, background: accent.passiveBg }}>
      {/* Header: icon + name + desc | mode selector */}
      <div style={s.ruleCardHeader}>
        <div style={s.ruleCardLeft}>
          <div style={{ ...s.ruleCardIcon, background: accent.bg }}>
            <Icon size={15} color={accent.color} />
          </div>
          <div>
            <div style={s.ruleCardName}>{label}</div>
            <div style={s.ruleCardDesc}>{desc}</div>
          </div>
        </div>
        <div style={{ ...s.segmented, padding: '2px', gap: '1px', flexShrink: 0 }}>
          {['strict', 'balanced', 'open'].map(m => (
            <button key={m} onClick={() => set('mode', m)} style={s.segBtnSm(rule.mode === m, m)}>
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
  const preview = usePreview()
  const demo = useDemo()
  const isDemo = !!demo?.isDemo || !!preview?.isDemo
  const isPreview = !!preview?.isPreview

  const [tenantId, setTenantId] = useState(null)
  const [tier, setTier] = useState('light')
  useEffect(() => { if (preview?.tierOverride !== null) setTier(preview?.tierOverride) }, [preview?.tierOverride])
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

  // SMS follow-up
  const [smsFollowupEnabled, setSmsFollowupEnabled] = useState(false)
  const [smsFollowupMessage, setSmsFollowupMessage] = useState('')

  // New settings
  const [toneRegister, setToneRegister] = useState('warm')
  const [businessOutcomeType, setBusinessOutcomeType] = useState('quote')
  const [customOutcomeText, setCustomOutcomeText] = useState('')
  const [callbackPrefNote, setCallbackPrefNote] = useState('')
  const [additionalInstructions, setAdditionalInstructions] = useState('')

  // Urgent callback
  const [urgentCallbackMins, setUrgentCallbackMins] = useState(60)
  const [urgentEscalationMethod, setUrgentEscalationMethod] = useState('both')
  const [urgentOutcomes, setUrgentOutcomes] = useState(['escalated'])

  // Greeting generator
  const [businessName, setBusinessName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [bookingLink, setBookingLink] = useState('')
  const [greetingModalShown, setGreetingModalShown] = useState(false)
  const [showProtectedModal, setShowProtectedModal] = useState(false)
  const [generatorNotes, setGeneratorNotes] = useState('')
  const [generatingGreeting, setGeneratingGreeting] = useState(false)

  // Number blocking
  const [blockedNumbers, setBlockedNumbers] = useState([])
  const [numberDraft, setNumberDraft] = useState('')
  const [numberSaving, setNumberSaving] = useState(false)

  // Provisional booking
  const [provisionalBookingEnabled, setProvisionalBookingEnabled] = useState(false)
  const [provisionalBookingRule, setProvisionalBookingRule] = useState('')
  const [bookingSlotsToOffer, setBookingSlotsToOffer] = useState(2)
  const [bookingBufferMins, setBookingBufferMins] = useState(30)
  const [bookingConfirmationWindowMins, setBookingConfirmationWindowMins] = useState(120)
  const [bookingConfWindowUnit, setBookingConfWindowUnit] = useState('hours') // mins | hours | days

  // Overage voice preference
  const [overageVoicePref, setOverageVoicePref] = useState('premium')

  // Emergency keywords
  const [keywords, setKeywords] = useState([])
  const [keywordDraft, setKeywordDraft] = useState('')

  // ── Demo mode: inject AI settings from DemoContext ───────────────────────────
  useEffect(() => {
    if (!demo?.isDemo || !demo.business) return
    const biz = demo.business
    setTier(demo.tier || 'light')
    setBusinessName(biz.business_name || '')
    setTriageMode(biz.triage_mode || 'balanced')
    setToneRegister(biz.tone_register || 'warm')
    setGreetingMessage(biz.greeting_message || '')
    setBusinessOutcomeType(biz.business_outcome_type || 'callback')
    setLoading(false)
  }, [demo?.isDemo, demo?.business?.id, demo?.tier])

  useEffect(() => {
    if (demo?.isDemo) return
    if (!user && !isPreview) return
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
          .select('triage_mode, escalation_preference, greeting_message, spam_filter_enabled, sales_call_handling, autodialler_detection, emergency_keywords, subscription_tier, business_email, tone_register, business_outcome_type, custom_outcome_text, callback_preference_note, additional_instructions, business_name, lead_contact_name, booking_link, urgent_callback_mins, urgent_escalation_method, urgent_outcomes, provisional_booking_enabled, provisional_booking_rule, booking_slots_to_offer, booking_buffer_mins, booking_confirmation_window_mins, overage_voice_preference, sms_followup_enabled, sms_followup_message, blocked_phone_numbers')
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
          setSmsFollowupEnabled(tenant.sms_followup_enabled || false)
          setSmsFollowupMessage(tenant.sms_followup_message || '')
          setToneRegister(tenant.tone_register || 'warm')
          setBusinessOutcomeType(tenant.business_outcome_type || 'quote')
          setCustomOutcomeText(tenant.custom_outcome_text || '')
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
          setBlockedNumbers(tenant.blocked_phone_numbers || [])
          const confMins = tenant.booking_confirmation_window_mins ?? 120
          if (confMins % 1440 === 0 && confMins >= 1440) setBookingConfWindowUnit('days')
          else if (confMins % 60 === 0 && confMins >= 60) setBookingConfWindowUnit('hours')
          else setBookingConfWindowUnit('mins')
          setUrgentOutcomes(Array.isArray(tenant.urgent_outcomes) && tenant.urgent_outcomes.length > 0 ? tenant.urgent_outcomes : ['escalated'])
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
  }, [user, isPreview])

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
      custom_outcome_text: businessOutcomeType === 'custom' ? (customOutcomeText.trim() || null) : null,
      callback_preference_note: callbackPrefNote.trim() || null,
      additional_instructions: additionalInstructions.trim() || null,
      urgent_callback_mins: urgentCallbackMins,
      urgent_escalation_method: urgentEscalationMethod,
      urgent_outcomes: urgentOutcomes,
      provisional_booking_enabled: provisionalBookingEnabled,
      provisional_booking_rule: provisionalBookingRule.trim() || null,
      booking_slots_to_offer: bookingSlotsToOffer,
      booking_buffer_mins: bookingBufferMins,
      booking_confirmation_window_mins: bookingConfirmationWindowMins,
      overage_voice_preference: overageVoicePref,
      sms_followup_message: smsFollowupMessage.trim() || null,
      blocked_phone_numbers: blockedNumbers,
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

  const currentMode = CALL_MODES.find(m => m.id === triageMode)
  const isProfessional = ['professional', 'enterprise', 'bespoke'].includes(tier)
  const isEnterprise = ['enterprise', 'bespoke'].includes(tier)

  // Derive current state labels for status hero
  const modeInfo   = TRIAGE_COLOUR[triageMode] || TRIAGE_COLOUR.balanced
  const activeStyle = CONVERSATION_STYLES.find(s => s.triage === triageMode) || CONVERSATION_STYLES[1]
  const outcomeLabels = { booking: 'Books appointments', quote: 'Discusses & quotes', custom: 'Custom outcome' }
  const outcomeLabel  = outcomeLabels[businessOutcomeType] || 'Discusses & quotes'

  return (
    <div>

      {/* ── AI Status Hero ───────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #3a2057 0%, #5e3b87 60%, #4a2d6e 100%)',
        borderRadius: 16,
        padding: '1.25rem 1.5rem',
        marginBottom: '1rem',
        boxShadow: '0 4px 24px rgba(94,59,135,0.28), 0 1px 4px rgba(0,0,0,0.12)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background noise texture */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Left — live indicator + label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3db87a' }} />
              <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: '2px solid rgba(61,184,122,0.4)', animation: 'veraBob 2s ease-in-out infinite' }} />
            </div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', color: 'white', lineHeight: 1 }}>Answer AI · Live</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem', fontFamily: "'DM Sans', sans-serif" }}>Your AI is answering missed calls</div>
            </div>
          </div>

          {/* Right — style + outcome badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Style badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.35rem 0.7rem', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: modeInfo.dot }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'white', fontFamily: "'DM Sans', sans-serif" }}>{activeStyle.label}</span>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', fontFamily: "'DM Sans', sans-serif" }}>· {activeStyle.toneNote}</span>
            </div>
            {/* Outcome badge */}
            <div style={{ background: 'rgba(240,165,0,0.22)', borderRadius: 8, padding: '0.35rem 0.7rem', border: '1px solid rgba(240,165,0,0.3)' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#f0a500', fontFamily: "'DM Sans', sans-serif" }}>{outcomeLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Call Style & Outcome ─────────────────────────────────────────────── */}
      <div style={s.section}>
        <h3 style={s.sectionTitle} data-help="Conversation style controls both the pace of your calls and the language register your AI uses. These are global defaults — you can override them per call type below.">Conversation style</h3>
        <p style={s.sectionSubtitle}>How your AI sounds and how it manages the flow of every call. Choose the style that fits your business.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.7rem', marginBottom: '1.5rem' }}>
          {CONVERSATION_STYLES.map(style => {
            const active = triageMode === style.triage
            return (
              <button key={style.id}
                onClick={() => { setTriageMode(style.triage); setToneRegister(style.tone) }}
                style={{
                  textAlign: 'left', padding: '0.85rem 1rem', borderRadius: 12, cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  border: active ? `2px solid ${style.border}` : `1.5px solid ${style.passiveBorder}`,
                  background: active ? style.bg : style.passiveBg,
                  transition: 'all 0.15s',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: active ? style.dot : 'transparent', border: active ? `none` : `2px solid ${style.dot}`, flexShrink: 0, opacity: active ? 1 : 0.5 }} />
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: active ? style.text : '#1a1a1a' }}>{style.label}</div>
                </div>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, color: active ? style.text : '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem', paddingLeft: '1.4rem' }}>{style.toneNote}</div>
                <div style={{ fontSize: '0.75rem', color: active ? style.text : '#777', lineHeight: 1.5, paddingLeft: '1.4rem', opacity: active ? 0.85 : 1 }}>{style.desc}</div>
              </button>
            )
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div>
            <label style={s.label} data-help="Tells your AI what a successful call looks like. This shapes how it closes every conversation.">Successful call outcome</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[
                { id: 'booking', label: 'I take bookings and appointments', passiveBg: '#f0fdf4', passiveBorder: 'rgba(61,184,122,0.25)', activeBg: '#bbf7d0', activeBorder: '#3db87a', activeText: '#166534' },
                { id: 'quote',   label: 'I discuss, quote, and arrange',    passiveBg: '#eff6ff', passiveBorder: 'rgba(29,78,216,0.2)',   activeBg: '#bfdbfe', activeBorder: '#1d4ed8', activeText: '#1e3a8a' },
                { id: 'custom',  label: 'My business works differently',    passiveBg: '#f5f3ff', passiveBorder: 'rgba(94,59,135,0.2)',   activeBg: '#ddd6fe', activeBorder: '#5e3b87', activeText: '#4a2d6e' },
              ].map(opt => {
                const on = businessOutcomeType === opt.id
                return (
                  <button key={opt.id} onClick={() => setBusinessOutcomeType(opt.id)} style={{
                    width: '100%', textAlign: 'left', padding: '0.6rem 0.8rem',
                    borderRadius: '8px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.8125rem', fontWeight: on ? 600 : 400,
                    border: `${on ? '2px' : '1.5px'} solid ${on ? opt.activeBorder : opt.passiveBorder}`,
                    background: on ? opt.activeBg : opt.passiveBg, color: on ? opt.activeText : '#555',
                  }}>{opt.label}</button>
                )
              })}
              {businessOutcomeType === 'custom' && (
                <input
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1.5px solid rgba(94,59,135,0.25)', borderRadius: '8px', fontSize: '0.8125rem', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', background: '#faf9fc', marginTop: '0.2rem' }}
                  value={customOutcomeText}
                  onChange={e => setCustomOutcomeText(e.target.value)}
                  placeholder="e.g. I sell products and take orders, or I provide emergency callouts…"
                  autoFocus
                />
              )}
            </div>
          </div>

          <div>
            <label style={s.label} data-help="When the AI cannot resolve a call — Escalate transfers to you live. Hard close wraps up politely and offers a callback.">When AI can't resolve</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <button onClick={() => setEscalationPref('escalate')} style={{
                textAlign: 'left', padding: '0.6rem 0.8rem', borderRadius: '8px', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", fontSize: '0.8125rem', fontWeight: escalationPref === 'escalate' ? 600 : 400,
                border: escalationPref === 'escalate' ? '2px solid #f0a500' : '1.5px solid rgba(240,165,0,0.3)',
                background: escalationPref === 'escalate' ? '#fde68a' : '#fffbeb',
                color: escalationPref === 'escalate' ? '#78460a' : '#92610a',
              }}>
                <div>Escalate to me</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 400, marginTop: '0.15rem', opacity: 0.75 }}>Transfer the call to you live</div>
              </button>
              <button onClick={() => setEscalationPref('hard_close')} style={{
                textAlign: 'left', padding: '0.6rem 0.8rem', borderRadius: '8px', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", fontSize: '0.8125rem', fontWeight: escalationPref === 'hard_close' ? 600 : 400,
                border: escalationPref === 'hard_close' ? '2px solid #94a3b8' : '1.5px solid rgba(148,163,184,0.35)',
                background: escalationPref === 'hard_close' ? '#f1f5f9' : '#f8fafc',
                color: escalationPref === 'hard_close' ? '#475569' : '#64748b',
              }}>
                <div>Hard close</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 400, marginTop: '0.15rem', opacity: 0.75 }}>Wrap up politely, offer a callback</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Response & urgency ───────────────────────────────────────────────── */}
      <div style={s.section}>
        <h3 style={s.sectionTitle} data-help="Configure how quickly you respond to urgent calls, how your AI closes conversations, and what qualifies as urgent in your Listen inbox.">Response & urgency</h3>
        <p style={s.sectionSubtitle}>Callback commitments, urgency thresholds, and what surfaces in your Urgent inbox.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
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
            <label style={{ ...s.label, marginBottom: '0.4rem' }} data-help="Your AI says this when closing a call: 'Please allow me to take your details — [your name] will call you back [this].'">Call return note</label>
            <input
              style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '8px', fontSize: '0.8125rem', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a' }}
              value={callbackPrefNote}
              onChange={e => setCallbackPrefNote(e.target.value)}
              placeholder="e.g. after 3pm same day"
            />
          </div>
        </div>

        <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(94,59,135,0.06)', marginBottom: tier !== 'free' ? '1.25rem' : 0 }} data-help="Choose which call outcomes appear in the Urgent tab of your Listen inbox.">
          <label style={{ ...s.label, marginBottom: '0.5rem' }}>What counts as Urgent in your Listen inbox?</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {[
              { id: 'escalated',     label: 'Escalated calls' },
              { id: 'booked',        label: 'Bookings' },
              { id: 'lead_captured', label: 'Leads captured' },
              { id: 'referred_out',  label: 'Referred out' },
            ].map(opt => {
              const on = urgentOutcomes.includes(opt.id)
              return (
                <button key={opt.id} onClick={() => setUrgentOutcomes(prev => on ? prev.filter(x => x !== opt.id) : [...prev, opt.id])} style={{
                  padding: '0.3rem 0.75rem', borderRadius: '999px', border: `1.5px solid ${on ? '#b91c1c' : 'rgba(94,59,135,0.15)'}`,
                  background: on ? '#fef2f2' : 'white', color: on ? '#b91c1c' : '#888',
                  fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', fontWeight: on ? 600 : 400,
                  cursor: 'pointer', transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: '0.35rem',
                }}>
                  {on && <span style={{ fontSize: '0.7rem' }}>●</span>}
                  {opt.label}
                </button>
              )
            })}
          </div>
          {urgentOutcomes.length === 0 && (
            <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '0.35rem', fontFamily: "'DM Sans', sans-serif" }}>
              Nothing selected — your Urgent tab will always be empty.
            </div>
          )}
        </div>

        {tier !== 'free' && (
          <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(94,59,135,0.06)' }} data-help="When your included minutes run out, your AI keeps going. Choose whether to stay on Premium (18p/min) or drop to Standard voice (14p/min).">
            <label style={{ ...s.label, marginBottom: '0.5rem' }}>When you run over your included minutes</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              {[
                { id: 'premium',  title: 'Stay on Premium — 18p/min',  desc: 'Same quality your callers expect.', activeBorder: '#5e3b87', activeBg: '#ddd6fe', activeText: '#4a2d6e', activeDot: '#5e3b87', passiveBg: '#f5f3ff', passiveBorder: 'rgba(94,59,135,0.2)' },
                { id: 'standard', title: 'Switch to Standard — 14p/min', desc: 'Save 4p/min. Returns to Premium at renewal.', activeBorder: '#3db87a', activeBg: '#bbf7d0', activeText: '#166534', activeDot: '#3db87a', passiveBg: '#f0fdf4', passiveBorder: 'rgba(61,184,122,0.2)' },
              ].map(opt => {
                const on = overageVoicePref === opt.id
                return (
                  <button key={opt.id} onClick={() => setOverageVoicePref(opt.id)} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                    padding: '0.65rem 0.85rem', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    border: on ? `2px solid ${opt.activeBorder}` : `1.5px solid ${opt.passiveBorder}`,
                    background: on ? opt.activeBg : opt.passiveBg,
                  }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', border: on ? `4px solid ${opt.activeDot}` : '1.5px solid #ccc', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: on ? opt.activeText : '#1a1a1a', marginBottom: '0.15rem' }}>{opt.title}</div>
                      <div style={{ fontSize: '0.72rem', color: on ? opt.activeText : '#888', lineHeight: 1.4, opacity: on ? 0.8 : 1 }}>{opt.desc}</div>
                    </div>
                  </button>
                )
              })}
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

      {/* Lead Follow-up SMS */}
      <div style={s.section} data-help="When SMS follow-up is on, your AI texts every captured lead within seconds of the call ending. The caller knows immediately that their enquiry was received. Leave the message blank to use the auto-generated version.">
        <h3 style={s.sectionTitle}>Lead Follow-up</h3>
        <p style={s.sectionSubtitle}>Send an automatic SMS to every caller whose lead is captured — confirms receipt instantly.</p>
        <ToggleRow
          label="SMS follow-up to leads"
          desc="Text the caller within seconds of hanging up. Uses your Qerxel number."
          checked={smsFollowupEnabled}
          onChange={v => { setSmsFollowupEnabled(v); saveToggle('sms_followup_enabled', v) }}
          last={!smsFollowupEnabled}
        />
        {smsFollowupEnabled && (
          <div style={{ paddingTop: '0.75rem', borderTop: '1px solid rgba(94,59,135,0.07)' }}>
            <label style={s.label}>Message template <span style={{ color: '#bbb', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — leave blank for auto-generated)</span></label>
            <textarea
              value={smsFollowupMessage}
              onChange={e => setSmsFollowupMessage(e.target.value)}
              placeholder={`Hi [name], thanks for calling [business]. [owner] will be in touch shortly.`}
              maxLength={160}
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box',
                border: '1.5px solid rgba(94,59,135,0.18)', borderRadius: '8px',
                padding: '0.6rem 0.75rem', fontSize: '0.825rem',
                fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a',
                resize: 'vertical', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
              <span style={s.hint}>Keep under 160 characters for a single SMS.</span>
              <span style={{ fontSize: '0.75rem', color: smsFollowupMessage.length > 140 ? '#f0a500' : '#bbb' }}>{smsFollowupMessage.length}/160</span>
            </div>
          </div>
        )}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {blockedNumbers.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {blockedNumbers.map(num => (
                  <div key={num} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.85rem', background: '#fff5f5', border: '1px solid rgba(185,28,28,0.15)', borderRadius: 8 }}>
                    <span style={{ fontSize: '0.875rem', color: '#334155', fontFamily: 'monospace' }}>{num}</span>
                    <button
                      onClick={() => setBlockedNumbers(prev => prev.filter(n => n !== num))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontSize: '1rem', lineHeight: 1, padding: '0 0.25rem' }}
                      title="Remove"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="tel"
                value={numberDraft}
                onChange={e => setNumberDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && numberDraft.trim()) {
                    const n = numberDraft.trim()
                    if (!blockedNumbers.includes(n)) setBlockedNumbers(prev => [...prev, n])
                    setNumberDraft('')
                  }
                }}
                placeholder="+44 7700 900000"
                style={{ ...s.textarea, flex: 1, fontFamily: 'monospace', minHeight: 'unset', resize: 'none', padding: '0.55rem 0.85rem' }}
              />
              <button
                onClick={() => {
                  const n = numberDraft.trim()
                  if (n && !blockedNumbers.includes(n)) { setBlockedNumbers(prev => [...prev, n]); setNumberDraft('') }
                }}
                style={{ padding: '0.55rem 1rem', background: '#5e3b87', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}
              >Add</button>
            </div>
            <p style={s.hint}>Type a number and press Enter or Add. Changes save with the main Save button.</p>
          </div>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                    <button onClick={() => setBookingSlotsToOffer(v => Math.max(1, v - 1))} style={{ width: 36, height: 36, border: '1px solid rgba(94,59,135,0.25)', borderRight: 'none', borderRadius: '8px 0 0 8px', background: '#fff', cursor: 'pointer', fontSize: '1.1rem', color: '#5e3b87' }}>−</button>
                    <div style={{ width: 52, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(94,59,135,0.25)', fontSize: '0.925rem', fontWeight: 600, color: '#1a1a1a', background: '#fff' }}>{bookingSlotsToOffer}</div>
                    <button onClick={() => setBookingSlotsToOffer(v => Math.min(5, v + 1))} style={{ width: 36, height: 36, border: '1px solid rgba(94,59,135,0.25)', borderLeft: 'none', borderRadius: '0 8px 8px 0', background: '#fff', cursor: 'pointer', fontSize: '1.1rem', color: '#5e3b87' }}>+</button>
                  </div>
                  <p style={s.hint}>How many available slots your AI offers the caller to choose from.</p>
                </div>

                <div>
                  <label style={s.label}>Booking buffer</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                    <button onClick={() => setBookingBufferMins(v => Math.max(5, v - 5))} style={{ width: 36, height: 36, border: '1px solid rgba(94,59,135,0.25)', borderRight: 'none', borderRadius: '8px 0 0 8px', background: '#fff', cursor: 'pointer', fontSize: '1.1rem', color: '#5e3b87' }}>−</button>
                    <div style={{ width: 72, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(94,59,135,0.25)', fontSize: '0.875rem', fontWeight: 600, color: '#1a1a1a', background: '#fff' }}>{bookingBufferMins} min</div>
                    <button onClick={() => setBookingBufferMins(v => Math.min(480, v + 5))} style={{ width: 36, height: 36, border: '1px solid rgba(94,59,135,0.25)', borderLeft: 'none', borderRadius: '0 8px 8px 0', background: '#fff', cursor: 'pointer', fontSize: '1.1rem', color: '#5e3b87' }}>+</button>
                  </div>
                  <p style={s.hint}>Minimum gap between now and the earliest slot your AI can offer.</p>
                </div>

                <div>
                  <label style={s.label}>Confirmation window</label>
                  {(() => {
                    const unitMult = bookingConfWindowUnit === 'days' ? 1440 : bookingConfWindowUnit === 'hours' ? 60 : 1
                    const displayVal = Math.round(bookingConfirmationWindowMins / unitMult) || 1
                    const setDisplayVal = n => setBookingConfirmationWindowMins(Math.max(1, n) * unitMult)
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                          <button onClick={() => setDisplayVal(displayVal - 1)} style={{ width: 36, height: 36, border: '1px solid rgba(94,59,135,0.25)', borderRight: 'none', borderRadius: '8px 0 0 8px', background: '#fff', cursor: 'pointer', fontSize: '1.1rem', color: '#5e3b87' }}>−</button>
                          <div style={{ width: 52, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(94,59,135,0.25)', fontSize: '0.925rem', fontWeight: 600, color: '#1a1a1a', background: '#fff' }}>{displayVal}</div>
                          <button onClick={() => setDisplayVal(displayVal + 1)} style={{ width: 36, height: 36, border: '1px solid rgba(94,59,135,0.25)', borderLeft: 'none', borderRadius: '0 8px 8px 0', background: '#fff', cursor: 'pointer', fontSize: '1.1rem', color: '#5e3b87' }}>+</button>
                        </div>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {['mins', 'hours', 'days'].map(u => (
                            <button key={u} onClick={() => {
                              const curMult = bookingConfWindowUnit === 'days' ? 1440 : bookingConfWindowUnit === 'hours' ? 60 : 1
                              const newMult = u === 'days' ? 1440 : u === 'hours' ? 60 : 1
                              setBookingConfirmationWindowMins(Math.max(newMult, Math.round(bookingConfirmationWindowMins / curMult) * newMult))
                              setBookingConfWindowUnit(u)
                            }} style={{ padding: '0.3rem 0.7rem', borderRadius: 6, border: bookingConfWindowUnit === u ? '1.5px solid #5e3b87' : '1px solid rgba(94,59,135,0.2)', background: bookingConfWindowUnit === u ? '#f4effe' : '#fff', color: bookingConfWindowUnit === u ? '#5e3b87' : '#555', fontSize: '0.8rem', cursor: 'pointer', fontWeight: bookingConfWindowUnit === u ? 600 : 400 }}>{u}</button>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
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
              <button
                onClick={() => onNavigate && onNavigate('integrations')}
                style={{ marginTop: '0.5rem', padding: '0.55rem 1.1rem', background: '#5e3b87', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}
              >Connect calendar in Integrations →</button>
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
