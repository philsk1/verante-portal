import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { usePreview } from '../context/PreviewContext'
import { User, ArrowLeftRight, PhoneOff, Truck, FileText } from 'lucide-react'
import AIFoundation from './AIFoundation'
import MoodQ from '../components/MoodQ'

// ─── constants ────────────────────────────────────────────────────────────────

const CONVERSATION_STYLES = [
  { id: 'efficient', triage: 'strict',   tone: 'formal', label: 'Efficient',
    toneNote: 'Professional register', desc: 'Gets straight to the point. Captures key details quickly and closes without unnecessary back-and-forth.',
    border: '#fcbe03', bg: '#fef3c7', text: '#78460a', dot: '#fcbe03', passiveBg: '#fffbeb', passiveBorder: 'rgba(252,190,3,0.25)' },
  { id: 'balanced',  triage: 'balanced', tone: 'warm',   label: 'Balanced',
    toneNote: 'Friendly & natural',    desc: 'Standard pace — qualifies the enquiry and collects contact details in a natural, warm way.',
    border: '#1d4ed8', bg: '#bfdbfe', text: '#1e3a8a', dot: '#1d4ed8', passiveBg: '#eff6ff', passiveBorder: 'rgba(29,78,216,0.15)' },
  { id: 'relaxed',   triage: 'open',     tone: 'warm',   label: 'Relaxed',
    toneNote: 'Warm & conversational', desc: 'More space for conversation. Callers can talk through their need before you close or escalate.',
    border: '#3db87a', bg: '#bbf7d0', text: '#166534', dot: '#3db87a', passiveBg: '#f0fdf4', passiveBorder: 'rgba(61,184,122,0.15)' },
]

const TRIAGE_COLOUR = {
  strict:   { border: '#fcbe03', bg: '#fef3c7', text: '#78460a', dot: '#fcbe03', passiveBg: '#fffbeb', passiveBorder: 'rgba(252,190,3,0.25)' },
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
    accent: { bg: '#f7cee3', color: '#6b2049', border: '#9e4770', passiveBg: '#fdf0f7' },
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

// ─── canonical greeting preview (mirrors _build-prompt.js buildGreeting) ─────

function canonicalGreeting(tone, name, owner) {
  const n = name?.trim() || 'your business'
  const o = owner?.trim() || 'the owner'
  const opener = tone === 'formal' ? `Good morning, ${n}.` : `${n}.`
  return `${opener} I'm Q, ${o}'s AI assistant. Please tell me what you need, and I will make it happen. Information and bookings I can handle myself—and for anything I can't do, I'll take a note and get ${o} to call you straight back.`
}

// ─── main component ───────────────────────────────────────────────────────────

const MSG_TYPES = [
  { key: 'call_summary',        label: 'Thank you / callback confirmation', desc: 'Sent after any genuine call. Thanks the caller and confirms someone will be in touch.' },
  { key: 'booking_link',        label: 'Booking link', desc: 'Sent after a lead is captured. Includes your online booking link. Replaces the callback message if enabled together.' },
  { key: 'detail_confirmation', label: 'Address & detail confirmation', desc: 'Sent after a call where an address or appointment details were taken. Asks the caller to confirm or correct.' },
  { key: 'booking_confirmed',   label: 'Booking confirmed', desc: 'Sent when a provisional booking is confirmed. Triggered manually or when appointment status changes.' },
  { key: 'reminder',            label: 'Appointment reminder', desc: 'Sent X hours before the appointment. Requires a scheduled job — contact support to activate.' },
]
const CHANNELS = [{ v: 'whatsapp', l: 'WhatsApp' }, { v: 'sms', l: 'SMS' }, { v: 'email', l: 'Email' }]
const MSG_VARS = '{caller_name}  {business_name}  {lead_contact_name}  {booking_link}  {service_requested}  {appointment_address}  {appointment_datetime}'
const emptyMsgConfig = () => Object.fromEntries(MSG_TYPES.map(t => [t.key, { enabled: false, channel: 'whatsapp', template: '' }]))

function ConversationStyleSection({ triageMode, setTriageMode, setToneRegister, businessOutcomeType, setBusinessOutcomeType, customOutcomeText, setCustomOutcomeText, bookingLink, onNavigate, escalationPref, setEscalationPref }) {
  return (
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
          {businessOutcomeType === 'booking' && !bookingLink && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '0.6rem', padding: '0.6rem 0.75rem', background: '#fffbeb', border: '1px solid rgba(240,165,0,0.4)', borderRadius: '8px', fontSize: '0.78rem', color: '#78460a', lineHeight: 1.45 }}>
              <span style={{ flexShrink: 0, marginTop: '0.05rem' }}>⚠</span>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '0.4rem' }}>No booking link set — callers will be told you take bookings with nowhere to go.</div>
                <button onClick={() => onNavigate && onNavigate('profile')} style={{ padding: '0.25rem 0.65rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: 5, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  → Set booking link in Business Profile
                </button>
              </div>
            </div>
          )}
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
  )
}

function ResponseUrgencySection({ urgentCallbackMins, setUrgentCallbackMins, urgentEscalationMethod, setUrgentEscalationMethod, callbackPrefNote, setCallbackPrefNote, urgentOutcomes, setUrgentOutcomes, tier, overageVoicePref, setOverageVoicePref }) {
  return (
    <div style={s.section}>
      <h3 style={s.sectionTitle} data-help="Configure how quickly you respond to urgent calls, how your AI closes conversations, and what qualifies as urgent in your Listen inbox." data-help-score={callbackPrefNote.trim() ? 95 : 50}>Response & urgency</h3>
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
          {(urgentEscalationMethod === 'sms' || urgentEscalationMethod === 'both') && (
            <div style={{ marginTop: '0.4rem', fontSize: '0.72rem', color: '#888' }}>
              Text sent to your Business Profile phone number
            </div>
          )}
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
  )
}

function CallTypeRulesSection({ rules, updateRule, businessEmail, additionalInstructions, setAdditionalInstructions, rulesSaving, saveRules, rulesToast }) {
  return (
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
        <label style={s.label} data-help="Anything not covered above. Describe specific situations and how you'd like your AI to handle them. For example: 'If a caller wants to cancel, tell them I will be in contact immediately.' Your AI follows these instructions for anything not covered by the rules above." data-help-score={additionalInstructions.trim() ? 95 : 20}>Anything else?</label>
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
  )
}

function EmergencyKeywordsSection({ keywords, keywordDraft, setKeywordDraft, addKeyword, removeKeyword }) {
  return (
    <div style={s.section}>
      <h3 style={s.sectionTitle} data-help="Emergency Keywords are words that trigger an immediate escalation to you, no matter what else is happening on the call. Add things like 'gas leak', 'not breathing', 'flooding', 'emergency'. As soon as your AI hears one of these, it escalates — no other rules apply." data-help-score={keywords.length ? 95 : 65}>Emergency Keywords</h3>
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
  )
}

function KeepAliveSection({ keepAliveTopics, keepAliveDraft, setKeepAliveDraft, addKeepAliveTopic, removeKeepAliveTopic, keepAliveMaxMins, setKeepAliveMaxMins, saveKeepAliveMaxMins }) {
  return (
    <div style={s.section}>
      <h3 style={s.sectionTitle} data-help="Keep-Alive Topics tell your AI never to end the call while certain subjects are being discussed. If a caller mentions a booking, asks about a product, or appears to be elderly or confused, the AI will stay on the line until the conversation is naturally complete — rather than closing down to keep calls short.">Topics that keep the call open</h3>
      <p style={s.sectionSubtitle}>
        Your AI will never end the call while any of these topics are being discussed. Add anything where an abrupt ending would lose a sale or let someone down.
      </p>
      <div>
        {keepAliveTopics.map((kw, i) => (
          <span key={i} style={{ ...s.chip, background: '#e8f5ee', color: '#166534' }}>
            {kw}
            <button style={s.chipRemove} onClick={() => removeKeepAliveTopic(i)}>×</button>
          </span>
        ))}
        {keepAliveTopics.length === 0 && <p style={{ fontSize: '0.8rem', color: '#ccc', margin: '0 0 0.5rem' }}>No topics added yet.</p>}
      </div>
      <div style={s.addRow}>
        <input style={s.addInput} value={keepAliveDraft} onChange={e => setKeepAliveDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeepAliveTopic(keepAliveDraft) } }}
          placeholder="e.g. appointment booking, product enquiry, senior citizen…" />
        <button style={s.addBtn} onClick={() => addKeepAliveTopic(keepAliveDraft)}>+ Add</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(94,59,135,0.07)' }}>
        <span style={{ fontSize: '0.8rem', color: '#555', fontFamily: "'DM Sans', sans-serif" }}>Max time to hold the call open:</span>
        <input
          type="number" min="1" max="30"
          value={keepAliveMaxMins}
          onChange={e => setKeepAliveMaxMins(Math.max(1, Math.min(30, parseInt(e.target.value) || 5)))}
          onBlur={e => saveKeepAliveMaxMins(e.target.value)}
          style={{ width: '56px', padding: '0.35rem 0.5rem', border: '1px solid rgba(94,59,135,0.18)', borderRadius: '8px', fontSize: '0.8125rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', textAlign: 'center' }}
        />
        <span style={{ fontSize: '0.8rem', color: '#555', fontFamily: "'DM Sans', sans-serif" }}>minutes</span>
        <span style={{ fontSize: '0.72rem', color: '#bbb', fontFamily: "'DM Sans', sans-serif" }}>(suggested: 4–5)</span>
      </div>
    </div>
  )
}

function GreetingAndSaveSection({ toneRegister, businessName, ownerName, greetingMessage, setGreetingMessage, saving, saveMainSettings, syncStatus, toast }) {
  return (
    <>
      <div style={s.section}>
        <h3 style={s.sectionTitle}>Greeting</h3>
        <p style={s.sectionSubtitle}>Qerxel has spent more time on the greeting than any other aspect of AI behaviour. Let us do the heavy lifting — if you want a specific phrase or piece of information in the greeting, write it here and we'll place it at the end.</p>

        <div style={{ background: '#f5f3ff', border: '1px solid rgba(94,59,135,0.15)', borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.67rem', fontWeight: 700, color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem', fontFamily: "'DM Sans', sans-serif" }}>Your greeting</div>
          <div style={{ fontSize: '0.875rem', color: '#1a1a1a', lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif", fontStyle: 'italic' }}>
            "{canonicalGreeting(toneRegister, businessName, ownerName)}{greetingMessage?.trim() ? ` ${greetingMessage.trim()}` : ''}"
          </div>
        </div>

        <label style={s.label}>Something specific to add? (optional)</label>
        <p style={s.hint}>e.g. "Calls may be recorded for training." · "We also speak Welsh." · "All emergency jobs handled within the hour."</p>
        <textarea
          style={s.textarea}
          value={greetingMessage}
          onChange={e => setGreetingMessage(e.target.value)}
          placeholder="Leave blank — your greeting is already set."
          rows={2}
        />
        {greetingMessage && (
          <div style={{ marginTop: '0.5rem' }}>
            <button style={s.ghost} onClick={() => setGreetingMessage('')}>Remove</button>
          </div>
        )}
      </div>

      <div style={s.saveRow}>
        <button style={saving ? s.saveBtnDisabled : s.saveBtn} onClick={saveMainSettings} disabled={saving}>
          {saving ? 'Saving…' : 'Save AI settings'}
        </button>
        {syncStatus !== 'idle' && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            fontSize: '0.78rem', fontWeight: 500, padding: '0.3rem 0.75rem',
            borderRadius: '999px',
            background: syncStatus === 'synced' ? '#e6f5ee' : syncStatus === 'error' ? '#fdf0f7' : '#f4effe',
            color: syncStatus === 'synced' ? '#1e7a4a' : syncStatus === 'error' ? '#6b2049' : '#5e3b87',
          }}>
            {syncStatus === 'syncing' && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', border: '2px solid #5e3b87', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />}
            {syncStatus === 'synced' && '✓'}
            {syncStatus === 'error' && '✕'}
            {syncStatus === 'syncing' ? 'Syncing AI…' : syncStatus === 'synced' ? 'AI updated' : 'Sync failed'}
          </span>
        )}
        <Toast msg={toast.msg} type={toast.type} />
      </div>
    </>
  )
}

function VoicePaceSection({ qSessionHighlight, responseDelay, saveResponseDelay, speechPace, saveSpeechPace, speechStyle, saveSpeechStyle, qDisplayOnScreen, saveQDisplayOnScreen, previewReadOnly }) {
  return (
    <div style={{ ...s.section, ...(qSessionHighlight.includes('voice-pace') ? { border: '2px solid #5e3b87', boxShadow: '0 0 0 6px rgba(94,59,135,0.1)', borderRadius: 12, transition: 'all 0.3s' } : {}) }} data-help="Voice & Pace controls how Q sounds and how quickly it responds. Think time is the pause before Q speaks — longer feels more considered. Talking pace is how fast the words come out. Communication style shapes how Q structures its answers. Q also reads each caller's energy and steers towards it automatically.">
      <h3 style={s.sectionTitle}>Voice &amp; Pace</h3>
      <p style={s.sectionSubtitle}>Set Q's baseline voice behaviour. Changes take effect on the next call.</p>

      {[
        {
          label: 'Think time', hint: 'Pause before Q responds',
          options: [
            { val: 0.6, label: 'Quick',      sub: '0.6 s' },
            { val: 1.2, label: 'Balanced',   sub: '1.2 s', rec: true },
            { val: 2.0, label: 'Thoughtful', sub: '2.0 s' },
          ],
          current: responseDelay,
          onSelect: saveResponseDelay,
        },
        {
          label: 'Talking pace', hint: 'How fast Q speaks',
          options: [
            { val: 'slow',    label: 'Steady',  sub: 'Slow & clear' },
            { val: 'natural', label: 'Natural', sub: 'Normal pace', rec: true },
            { val: 'fast',    label: 'Brisk',   sub: 'Get on with it' },
          ],
          current: speechPace,
          onSelect: saveSpeechPace,
        },
        {
          label: 'Communication style', hint: 'How Q shapes its answers',
          options: [
            { val: 'warm',     label: 'Warm',     sub: 'Patient & warm' },
            { val: 'balanced', label: 'Balanced', sub: 'Natural register', rec: true },
            { val: 'direct',   label: 'Direct',   sub: 'Short & sharp' },
          ],
          current: speechStyle,
          onSelect: saveSpeechStyle,
        },
      ].map((row, ri) => (
        <div key={row.label} style={{ marginBottom: ri < 2 ? '1rem' : 0 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.45rem', fontFamily: "'DM Sans', sans-serif" }}>
            {row.label} <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#bbb' }}>— {row.hint}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {row.options.map(opt => {
              const active = opt.val === row.current
              return (
                <button
                  key={String(opt.val)}
                  onClick={() => row.onSelect(opt.val)}
                  style={{
                    position: 'relative',
                    padding: '0.55rem 1.1rem',
                    borderRadius: '10px',
                    border: `1.5px solid ${active ? '#5e3b87' : 'rgba(94,59,135,0.15)'}`,
                    background: active ? '#f0ebf8' : 'white',
                    color: active ? '#3a2057' : '#777',
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    textAlign: 'left',
                    minWidth: 90,
                    transition: 'all 0.13s',
                  }}
                >
                  <div style={{ fontSize: '0.8125rem', fontWeight: active ? 600 : 400, marginBottom: '0.1rem' }}>{opt.label}</div>
                  <div style={{ fontSize: '0.68rem', color: active ? '#7b5ca8' : '#bbb' }}>{opt.sub}</div>
                  {opt.rec && (
                    <div style={{ position: 'absolute', top: -7, right: 8, background: '#f0a500', color: '#1a0533', fontSize: '0.55rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 3, letterSpacing: '0.04em', textTransform: 'uppercase' }}>default</div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <div style={{ marginTop: '1rem', padding: '0.65rem 0.85rem', background: '#f7f6f9', borderRadius: 8, fontSize: '0.75rem', color: '#888', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
        Q also reads each caller's energy and steers towards it — a fast-talking caller gets shorter answers, an unhurried caller gets more warmth. Your settings above are the baseline Q adjusts from.
      </div>

      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(94,59,135,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#2d2357', fontFamily: "'DM Sans', sans-serif" }}>Q session display</div>
            <div style={{ fontSize: '0.72rem', color: '#999', marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>
              {qDisplayOnScreen
                ? 'Q navigates your portal and highlights sections during a live call. Switch off if you prefer Q to work quietly in the background.'
                : 'Q is working in the background — you will not see navigation or highlights during a live call. Switch on to watch Q work.'}
            </div>
          </div>
          <button
            onClick={() => saveQDisplayOnScreen(!qDisplayOnScreen)}
            disabled={previewReadOnly}
            style={{ flexShrink: 0, background: qDisplayOnScreen ? '#5e3b87' : '#e5e7eb', border: 'none', borderRadius: 20, width: 44, height: 24, cursor: previewReadOnly ? 'default' : 'pointer', position: 'relative', transition: 'background 0.2s' }}
          >
            <div style={{ position: 'absolute', top: 3, left: qDisplayOnScreen ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
          </button>
        </div>
      </div>
    </div>
  )
}

function CallFilteringSection({ spamFilter, setSpamFilter, salesHandling, setSalesHandling, autodialerDetection, setAutodialerDetection, saveToggle }) {
  return (
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
  )
}

function LeadFollowupSection({ smsFollowupEnabled, setSmsFollowupEnabled, smsFollowupMessage, setSmsFollowupMessage, saveToggle }) {
  return (
    <div style={s.section} data-help="SMS follow-up only fires when a genuine lead is captured — the caller gave their contact details and asked about your services. Spam, filtered calls, and out-of-scope enquiries never receive an SMS. Because the caller provided their number willingly during the call, consent is clear. Leave the message blank to use the auto-generated version." data-help-score={smsFollowupEnabled ? 95 : 65}>
      <h3 style={s.sectionTitle}>Lead Follow-up</h3>
      <p style={s.sectionSubtitle}>When your AI captures a genuine lead — caller left their name and number — it can text them immediately to confirm receipt. Only fires on real enquiries, not spam or filtered calls.</p>
      <ToggleRow
        label="SMS follow-up to captured leads"
        desc="Text the caller within seconds of hanging up. Only sent when a lead is actually captured. Uses your Qerxel number."
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
  )
}

function AfterCallMessagingSection({ messagingConfig, setMessagingConfig, messagingSaving, messagingSaved, saveMessaging, previewReadOnly }) {
  return (
    <div style={s.section}>
      <h3 style={s.sectionTitle} data-help="After-call messaging lets Q send automatic messages to callers based on what happened on the call. Enable at least the thank-you message to give every caller a professional close." data-help-score={MSG_TYPES.some(mt => messagingConfig[mt.key]?.enabled) ? (messagingConfig['call_summary']?.enabled ? 95 : 65) : 20}>After-call messaging</h3>
      <p style={s.sectionSubtitle}>Configure what Q sends to callers after a call ends. Each message fires automatically based on the call outcome. Use {'{'}variables{'}'} to personalise.</p>

      {MSG_TYPES.map((mt, i) => {
        const cfg = messagingConfig[mt.key] || { enabled: false, channel: 'whatsapp', template: '' }
        const isLast = i === MSG_TYPES.length - 1
        const update = (patch) => setMessagingConfig(prev => ({ ...prev, [mt.key]: { ...prev[mt.key], ...patch } }))
        return (
          <div key={mt.key} style={{ borderBottom: isLast ? 'none' : '1px solid rgba(94,59,135,0.07)', paddingBottom: cfg.enabled ? '1rem' : '0.75rem', marginBottom: cfg.enabled ? '0.25rem' : 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#2d1b4e', fontFamily: "'DM Sans', sans-serif" }}>{mt.label}</div>
                <div style={{ fontSize: '0.75rem', color: '#888', fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>{mt.desc}</div>
              </div>
              <button
                onClick={() => update({ enabled: !cfg.enabled })}
                style={{ flexShrink: 0, width: 40, height: 22, borderRadius: 11, border: 'none', cursor: previewReadOnly ? 'default' : 'pointer',
                  background: cfg.enabled ? '#5e3b87' : '#d1d5db', transition: 'background 0.2s', position: 'relative' }}
              >
                <span style={{ position: 'absolute', top: 3, left: cfg.enabled ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </button>
            </div>

            {cfg.enabled && (
              <div style={{ marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#888', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>Send via</span>
                  {CHANNELS.map(ch => (
                    <button key={ch.v} onClick={() => update({ channel: ch.v })}
                      style={{ padding: '0.25rem 0.65rem', borderRadius: 6, border: `1.5px solid ${cfg.channel === ch.v ? '#5e3b87' : 'rgba(94,59,135,0.18)'}`,
                        background: cfg.channel === ch.v ? '#f4effe' : 'transparent', color: cfg.channel === ch.v ? '#5e3b87' : '#888',
                        fontSize: '0.75rem', fontWeight: cfg.channel === ch.v ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                      {ch.l}
                    </button>
                  ))}
                </div>
                <textarea
                  value={cfg.template}
                  onChange={e => update({ template: e.target.value })}
                  placeholder={`Leave blank to use the default message`}
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid rgba(94,59,135,0.18)', borderRadius: 8,
                    padding: '0.6rem 0.75rem', fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', resize: 'vertical', outline: 'none' }}
                />
              </div>
            )}
          </div>
        )
      })}

      <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: 'rgba(94,59,135,0.04)', borderRadius: 8, fontSize: '0.72rem', color: '#888', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
        <strong style={{ color: '#5e3b87' }}>Available variables:</strong> {MSG_VARS}
      </div>

      <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button onClick={saveMessaging} disabled={messagingSaving || previewReadOnly}
          style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', background: '#5e3b87', color: '#fff',
            fontSize: '0.825rem', fontWeight: 600, cursor: messagingSaving || previewReadOnly ? 'not-allowed' : 'pointer', opacity: previewReadOnly ? 0.5 : 1, fontFamily: "'DM Sans', sans-serif" }}>
          {messagingSaving ? 'Saving…' : 'Save messaging'}
        </button>
        {messagingSaved && (
          <span style={{ fontSize: '0.78rem', color: '#1e7a4a', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>✓ Saved</span>
        )}
      </div>
    </div>
  )
}

function NumberBlockingSection({ tier, blockedNumbers, setBlockedNumbers, numberDraft, setNumberDraft }) {
  return (
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
  )
}

function ProvisionalBookingSection({ isProfessional, provisionalBookingEnabled, setProvisionalBookingEnabled, bookingLink, onNavigate, provisionalBookingRule, setProvisionalBookingRule, bookingSlotsToOffer, setBookingSlotsToOffer, bookingBufferMins, setBookingBufferMins, bookingConfirmationWindowMins, setBookingConfirmationWindowMins, bookingConfWindowUnit, setBookingConfWindowUnit, bookingCalendarSource, setBookingCalendarSource, calendarTier, tenantId, isPreview }) {
  return (
    <div style={s.section}>
      <h3 style={s.sectionTitle} data-help="Provisional Booking lets your AI offer real appointment slots on your behalf, based on rules you set. It checks your calendar for availability and holds a slot — the caller gets confirmation, you get a notification. Professional and Enterprise only." data-help-score={provisionalBookingEnabled ? 95 : 65}>Provisional Booking</h3>
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

          {provisionalBookingEnabled && !bookingLink && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '0.5rem', padding: '0.6rem 0.75rem', background: '#fffbeb', border: '1px solid rgba(240,165,0,0.4)', borderRadius: '8px', fontSize: '0.78rem', color: '#78460a', lineHeight: 1.45 }}>
              <span style={{ flexShrink: 0, marginTop: '0.05rem' }}>⚠</span>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '0.4rem' }}>Provisional booking is on but no booking link is configured — callers won't be able to confirm.</div>
                <button onClick={() => onNavigate && onNavigate('profile')} style={{ padding: '0.25rem 0.65rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: 5, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  → Set booking link in Business Profile
                </button>
              </div>
            </div>
          )}

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

              <div>
                <label style={s.label}>Book into</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {[
                    { id: 'qerxel',   label: 'Qerxel Schedule',   hint: 'Use your built-in Qerxel calendar' },
                    { id: 'external', label: 'My own calendar',    hint: 'Google, Apple, Outlook or any CalDAV' },
                  ].map(opt => (
                    <button key={opt.id} onClick={async () => {
                      setBookingCalendarSource(opt.id)
                      if (!isPreview && tenantId) await supabase.from('tenants').update({ booking_calendar_source: opt.id }).eq('id', tenantId)
                    }} style={{
                      flex: 1, padding: '0.6rem 0.85rem', borderRadius: '8px', textAlign: 'left', cursor: 'pointer',
                      border: bookingCalendarSource === opt.id ? '1.5px solid #5e3b87' : '1px solid rgba(94,59,135,0.18)',
                      background: bookingCalendarSource === opt.id ? '#f4effe' : 'white',
                      fontFamily: "'DM Sans', sans-serif",
                    }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: bookingCalendarSource === opt.id ? '#5e3b87' : '#1a1a1a', marginBottom: '0.15rem' }}>{opt.label}</div>
                      <div style={{ fontSize: '0.72rem', color: '#999' }}>{opt.hint}</div>
                    </button>
                  ))}
                </div>
                {bookingCalendarSource === 'qerxel' && calendarTier === 'none' && (
                  <div style={{ padding: '0.75rem 1rem', background: '#fffbeb', border: '1px solid rgba(240,165,0,0.4)', borderRadius: '8px', fontSize: '0.8rem', color: '#78460a', lineHeight: 1.5 }}>
                    <strong>Qerxel Schedule not active.</strong> Activate the Schedule product to use your Qerxel calendar for provisional booking.
                  </div>
                )}
                {bookingCalendarSource === 'qerxel' && calendarTier !== 'none' && (
                  <div style={{ padding: '0.75rem 1rem', background: '#e6f5ee', border: '1px solid rgba(61,184,122,0.3)', borderRadius: '8px', fontSize: '0.8rem', color: '#1e7a4a', lineHeight: 1.5 }}>
                    <strong>Qerxel Schedule connected.</strong> Your AI will check your Qerxel calendar for availability before offering slots.
                  </div>
                )}
                {bookingCalendarSource === 'external' && (
                  <div style={{ padding: '0.75rem 1rem', background: '#f4effe', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '8px', fontSize: '0.8rem', color: '#5e3b87', lineHeight: 1.5 }}>
                    <strong>External calendar.</strong> Connect your calendar in Integrations below to enable real-time availability checking. Without a connection your AI reverts to standard callback behaviour.
                  </div>
                )}
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
  )
}

function TestAISection({ demoPhone, setDemoPhone, demoState, handleDemoCall, vapiAssistantId }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #3a2057 0%, #5e3b87 100%)',
      borderRadius: 16,
      padding: '1.25rem 1.5rem',
      marginBottom: '1rem',
      boxShadow: '0 4px 20px rgba(94,59,135,0.25)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="20" height="20" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.41 12a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.41 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.22 6.22l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: 'white', marginBottom: '0.2rem' }}>
            Test your AI now
          </div>
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', margin: '0 0 0.85rem', lineHeight: 1.5 }}>
            Enter your mobile. Q will call you within seconds using your actual configured AI.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={demoPhone}
              onChange={e => setDemoPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && demoState === 'idle' && handleDemoCall()}
              placeholder="+44 7700 900000"
              style={{
                flex: '1 1 180px', padding: '0.55rem 0.85rem',
                borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.1)', color: 'white',
                fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif",
                outline: 'none',
              }}
            />
            <button
              onClick={handleDemoCall}
              disabled={demoState === 'calling' || !demoPhone.trim()}
              style={{
                padding: '0.55rem 1.2rem', borderRadius: 8, border: 'none',
                background: demoState === 'calling' ? 'rgba(255,255,255,0.15)' : '#f0a500',
                color: demoState === 'calling' ? 'rgba(255,255,255,0.5)' : '#1a1a1a',
                fontWeight: 700, fontSize: '0.85rem', cursor: demoState === 'calling' ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
              }}
            >
              {demoState === 'calling' ? 'Calling…' : 'Call me now'}
            </button>
          </div>
          {demoState === 'success' && (
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#a8edca', fontWeight: 500 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              Call on its way — pick up in a few seconds
            </div>
          )}
          {demoState === 'no_assistant' && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#fca5a5', fontWeight: 500 }}>
              Save your AI settings first — the test call uses your real configured AI, not a demo shortcut.
            </div>
          )}
          {demoState === 'error' && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#fca5a5', fontWeight: 500 }}>
              Could not start the call. Check the number is correct and try again.
            </div>
          )}
          {!vapiAssistantId && (
            <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
              No AI assistant configured yet — call will use a generic demo.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function NetworkCard({ onNavigate }) {
  return (
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
  )
}

function applyTenantData(tenant, s) {
  s.setTier(tenant.subscription_tier || 'light')
  s.setBusinessEmail(tenant.business_email || '')
  s.setTriageMode(tenant.triage_mode || 'balanced')
  s.setEscalationPref(tenant.escalation_preference || 'escalate')
  s.setGreetingMessage(tenant.greeting_message || '')
  s.setSpamFilter(tenant.spam_filter_enabled !== false)
  s.setSalesHandling(tenant.sales_call_handling !== false)
  s.setAutodialerDetection(tenant.autodialler_detection !== false)
  s.setSmsFollowupEnabled(tenant.sms_followup_enabled || false)
  s.setSmsFollowupMessage(tenant.sms_followup_message || '')
  s.setToneRegister(tenant.tone_register || 'warm')
  s.setBusinessOutcomeType(tenant.business_outcome_type || 'quote')
  s.setCustomOutcomeText(tenant.custom_outcome_text || '')
  s.setCallbackPrefNote(tenant.callback_preference_note || '')
  s.setAdditionalInstructions(tenant.additional_instructions || '')
  s.setBusinessName(tenant.business_name || '')
  s.setOwnerName(tenant.lead_contact_name || '')
  s.setBookingLink(tenant.booking_link || '')
  s.setUrgentCallbackMins(tenant.urgent_callback_mins ?? 60)
  s.setUrgentEscalationMethod(tenant.urgent_escalation_method || 'both')
  s.setProvisionalBookingEnabled(tenant.provisional_booking_enabled || false)
  s.setProvisionalBookingRule(tenant.provisional_booking_rule || '')
  s.setBookingSlotsToOffer(tenant.booking_slots_to_offer ?? 2)
  s.setBookingBufferMins(tenant.booking_buffer_mins ?? 30)
  s.setBookingConfirmationWindowMins(tenant.booking_confirmation_window_mins ?? 120)
  s.setOverageVoicePref(tenant.overage_voice_preference || 'premium')
  s.setBlockedNumbers(tenant.blocked_phone_numbers || [])
  s.setVapiAssistantId(tenant.vapi_assistant_id || null)
  s.setQMode(tenant.q_mode || 'jump_in')
  const confMins = tenant.booking_confirmation_window_mins ?? 120
  if (confMins % 1440 === 0 && confMins >= 1440) s.setBookingConfWindowUnit('days')
  else if (confMins % 60 === 0 && confMins >= 60) s.setBookingConfWindowUnit('hours')
  else s.setBookingConfWindowUnit('mins')
  s.setUrgentOutcomes(Array.isArray(tenant.urgent_outcomes) && tenant.urgent_outcomes.length > 0 ? tenant.urgent_outcomes : ['escalated'])
  if (tenant.emergency_keywords) {
    s.setKeywords(Array.isArray(tenant.emergency_keywords)
      ? tenant.emergency_keywords
      : tenant.emergency_keywords.split(',').map(k => k.trim()).filter(Boolean))
  }
  if (tenant.keep_alive_topics) {
    s.setKeepAliveTopics(Array.isArray(tenant.keep_alive_topics)
      ? tenant.keep_alive_topics
      : tenant.keep_alive_topics.split(',').map(k => k.trim()).filter(Boolean))
  }
  if (tenant.keep_alive_max_minutes) s.setKeepAliveMaxMins(tenant.keep_alive_max_minutes)
  s.setSpeechPace(tenant.speech_pace || 'natural')
  s.setSpeechStyle(tenant.speech_style || 'balanced')
  s.setResponseDelay(tenant.response_delay_seconds ?? 1.2)
  s.setQDisplayOnScreen(tenant.q_display_on_screen !== false)
  s.setCalendarTier(tenant.calendar_tier || 'none')
  s.setBookingCalendarSource(tenant.booking_calendar_source || 'qerxel')
}

const AIBehaviour = ({ onNavigate, qSessionHighlight = [], qDraft = null }) => {
  const { user } = useAuth()
  const preview = usePreview()
  const isPreview = !!preview?.isPreview
  const previewReadOnly = preview?.previewReadOnly ?? isPreview

  const [tenantId, setTenantId] = useState(null)
  const [vapiAssistantId, setVapiAssistantId] = useState(null)
  const [earTestState, setEarTestState] = useState('idle') // idle | connecting | active
  const earVapiRef = useRef(null)
  const [demoPhone, setDemoPhone] = useState('')
  const [demoState, setDemoState] = useState('idle') // idle | calling | success | error
  const [syncStatus, setSyncStatus] = useState('idle') // idle | syncing | synced | error
  const [tier, setTier] = useState('light')
  useEffect(() => { if (preview?.tierOverride !== null) setTier(preview?.tierOverride) }, [preview?.tierOverride])
  const [loading, setLoading] = useState(true)
  const [businessEmail, setBusinessEmail] = useState('')
  const [qMode, setQMode] = useState('jump_in')
  const [subTab, setSubTab] = useState('behaviour')

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

  // SMS follow-up (legacy single-toggle)
  const [smsFollowupEnabled, setSmsFollowupEnabled] = useState(false)
  const [smsFollowupMessage, setSmsFollowupMessage] = useState('')

  const [messagingConfig, setMessagingConfig] = useState(emptyMsgConfig())
  const [messagingSaving, setMessagingSaving] = useState(false)
  const [messagingSaved, setMessagingSaved] = useState(false)

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

  // Number blocking
  const [blockedNumbers, setBlockedNumbers] = useState([])
  const [numberDraft, setNumberDraft] = useState('')

  // Provisional booking
  const [provisionalBookingEnabled, setProvisionalBookingEnabled] = useState(false)
  const [provisionalBookingRule, setProvisionalBookingRule] = useState('')
  const [bookingSlotsToOffer, setBookingSlotsToOffer] = useState(2)
  const [bookingBufferMins, setBookingBufferMins] = useState(30)
  const [bookingConfirmationWindowMins, setBookingConfirmationWindowMins] = useState(120)
  const [bookingConfWindowUnit, setBookingConfWindowUnit] = useState('hours') // mins | hours | days
  const [bookingCalendarSource, setBookingCalendarSource] = useState('qerxel')
  const [calendarTier, setCalendarTier] = useState('none')

  // Overage voice preference
  const [overageVoicePref, setOverageVoicePref] = useState('premium')

  // Emergency keywords
  const [keywords, setKeywords] = useState([])
  const [keywordDraft, setKeywordDraft] = useState('')

  // Keep-alive topics
  const [keepAliveTopics, setKeepAliveTopics] = useState([])
  const [keepAliveDraft, setKeepAliveDraft] = useState('')
  const [keepAliveMaxMins, setKeepAliveMaxMins] = useState(5)

  // Voice & pace
  const [speechPace,         setSpeechPace]         = useState('natural')
  const [speechStyle,        setSpeechStyle]        = useState('balanced')
  const [responseDelay,      setResponseDelay]      = useState(1.2)
  const [qDisplayOnScreen,   setQDisplayOnScreen]   = useState(true)

  useEffect(() => {
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
          .select('triage_mode, escalation_preference, greeting_message, spam_filter_enabled, sales_call_handling, autodialler_detection, emergency_keywords, keep_alive_topics, keep_alive_max_minutes, subscription_tier, calendar_tier, booking_calendar_source, business_email, tone_register, business_outcome_type, custom_outcome_text, callback_preference_note, additional_instructions, business_name, lead_contact_name, booking_link, urgent_callback_mins, urgent_escalation_method, urgent_outcomes, provisional_booking_enabled, provisional_booking_rule, booking_slots_to_offer, booking_buffer_mins, booking_confirmation_window_mins, overage_voice_preference, sms_followup_enabled, sms_followup_message, blocked_phone_numbers, vapi_assistant_id, q_mode, speech_pace, speech_style, response_delay_seconds, q_display_on_screen')
          .eq('id', tid).maybeSingle()

        if (tenant) applyTenantData(tenant, {
          setTier, setBusinessEmail, setTriageMode, setEscalationPref, setGreetingMessage,
          setSpamFilter, setSalesHandling, setAutodialerDetection, setSmsFollowupEnabled, setSmsFollowupMessage,
          setToneRegister, setBusinessOutcomeType, setCustomOutcomeText, setCallbackPrefNote, setAdditionalInstructions,
          setBusinessName, setOwnerName, setBookingLink, setUrgentCallbackMins, setUrgentEscalationMethod,
          setProvisionalBookingEnabled, setProvisionalBookingRule, setBookingSlotsToOffer, setBookingBufferMins,
          setBookingConfirmationWindowMins, setOverageVoicePref, setBlockedNumbers, setVapiAssistantId,
          setQMode, setBookingConfWindowUnit, setUrgentOutcomes, setKeywords, setKeepAliveTopics,
          setKeepAliveMaxMins, setSpeechPace, setSpeechStyle, setResponseDelay, setQDisplayOnScreen,
          setCalendarTier, setBookingCalendarSource,
        })

        // Load messaging config
        const { data: msgInt } = await supabase
          .from('tenant_integrations')
          .select('settings')
          .eq('tenant_id', tid)
          .eq('integration_id', 'messaging')
          .maybeSingle()
        if (msgInt?.settings) {
          setMessagingConfig(prev => ({ ...prev, ...msgInt.settings }))
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

  // ── Ear test (Vapi Web SDK) ──────────────────────────────────────────────────

  // Q Live Session — Realtime: update voice/pace buttons live when Q writes during a support call
  useEffect(() => {
    if (!tenantId) return
    const sub = supabase
      .channel(`q-voice-${tenantId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tenants', filter: `id=eq.${tenantId}` }, (payload) => {
        const n = payload.new
        if (n.speech_pace      !== undefined) setSpeechPace(n.speech_pace)
        if (n.speech_style     !== undefined) setSpeechStyle(n.speech_style)
        if (n.response_delay_seconds !== undefined) setResponseDelay(n.response_delay_seconds)
        if (n.additional_instructions !== undefined) setAdditionalInstructions(n.additional_instructions || '')
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [tenantId])

  useEffect(() => {
    const key = import.meta.env.VITE_VAPI_PUBLIC_KEY
    if (!key) return
    let vapi
    import('@vapi-ai/web').then(({ default: Vapi }) => {
      vapi = new Vapi(key)
      earVapiRef.current = vapi
      vapi.on('call-start', () => setEarTestState('active'))
      vapi.on('call-end',   () => setEarTestState('idle'))
      vapi.on('error',      () => setEarTestState('idle'))
    }).catch(() => {})
    return () => { earVapiRef.current?.stop() }
  }, [])

  const startEarTest = async () => {
    if (!earVapiRef.current || !vapiAssistantId) return
    setEarTestState('connecting')
    await earVapiRef.current.start(vapiAssistantId)
  }

  const stopEarTest = () => {
    earVapiRef.current?.stop()
    setEarTestState('idle')
  }

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
    if (previewReadOnly || !tenantId) return
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
    if (!error) { syncVapi(tenantId); window.dispatchEvent(new Event('qscore-refresh')) }
  }

  const saveRules = async () => {
    if (previewReadOnly || !tenantId) return
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

  const syncVapi = async (tid) => {
    setSyncStatus('syncing')
    try {
      const r = await fetch('/api/vapi-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tid }),
      })
      setSyncStatus(r.ok ? 'synced' : 'error')
    } catch {
      setSyncStatus('error')
    }
    setTimeout(() => setSyncStatus('idle'), 4000)
  }

  const handleDemoCall = async () => {
    const raw = demoPhone.trim()
    if (!raw) return
    if (!vapiAssistantId) {
      setDemoState('no_assistant')
      setTimeout(() => setDemoState('idle'), 6000)
      return
    }
    const phone = raw.startsWith('+') ? raw : raw.startsWith('07') ? '+44' + raw.slice(1) : raw
    setDemoState('calling')
    try {
      const r = await fetch('/api/vapi-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'demo-call', phoneNumber: phone, assistantId: vapiAssistantId }),
      })
      if (r.ok) {
        setDemoState('success')
        setTimeout(() => setDemoState('idle'), 10000)
      } else {
        setDemoState('error')
        setTimeout(() => setDemoState('idle'), 6000)
      }
    } catch {
      setDemoState('error')
      setTimeout(() => setDemoState('idle'), 6000)
    }
  }

  const saveMessaging = async () => {
    if (previewReadOnly || !tenantId) return
    setMessagingSaving(true)
    await supabase.from('tenant_integrations').upsert(
      { tenant_id: tenantId, integration_id: 'messaging', enabled: true, settings: messagingConfig },
      { onConflict: 'tenant_id,integration_id' }
    )
    setMessagingSaving(false)
    setMessagingSaved(true)
    setTimeout(() => setMessagingSaved(false), 3000)
    window.dispatchEvent(new Event('qscore-refresh'))
  }

  const saveToggle = async (field, value) => {
    if (previewReadOnly || !tenantId) return
    await supabase.from('tenants').update({ [field]: value }).eq('id', tenantId)
    window.dispatchEvent(new Event('qscore-refresh'))
  }

  const updateRule = (callTypeKey, updated) => {
    setRules(prev => ({ ...prev, [callTypeKey]: updated }))
  }

  const addKeyword = async (word) => {
    if (previewReadOnly) return
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

  const addKeepAliveTopic = async (word) => {
    if (previewReadOnly) return
    const trimmed = word.trim()
    if (!trimmed || !tenantId) return
    const updated = [...keepAliveTopics, trimmed]
    setKeepAliveTopics(updated)
    setKeepAliveDraft('')
    await supabase.from('tenants').update({ keep_alive_topics: updated }).eq('id', tenantId)
  }

  const removeKeepAliveTopic = async (index) => {
    const updated = keepAliveTopics.filter((_, i) => i !== index)
    setKeepAliveTopics(updated)
    await supabase.from('tenants').update({ keep_alive_topics: updated.length ? updated : null }).eq('id', tenantId)
  }

  const saveKeepAliveMaxMins = async (val) => {
    if (previewReadOnly || !tenantId) return
    const n = Math.max(1, Math.min(30, parseInt(val) || 5))
    setKeepAliveMaxMins(n)
    await supabase.from('tenants').update({ keep_alive_max_minutes: n }).eq('id', tenantId)
  }

  const saveSpeechPace = async (val) => {
    if (previewReadOnly || !tenantId) return
    setSpeechPace(val)
    await supabase.from('tenants').update({ speech_pace: val }).eq('id', tenantId)
  }
  const saveSpeechStyle = async (val) => {
    if (previewReadOnly || !tenantId) return
    setSpeechStyle(val)
    await supabase.from('tenants').update({ speech_style: val }).eq('id', tenantId)
  }
  const saveResponseDelay = async (val) => {
    if (previewReadOnly || !tenantId) return
    setResponseDelay(val)
    await supabase.from('tenants').update({ response_delay_seconds: val }).eq('id', tenantId)
  }
  const saveQDisplayOnScreen = async (val) => {
    if (previewReadOnly || !tenantId) return
    setQDisplayOnScreen(val)
    await supabase.from('tenants').update({ q_display_on_screen: val }).eq('id', tenantId)
  }

  if (loading) {
    return <div style={{ padding: '2rem', color: '#aaa', fontSize: '0.875rem' }}>Loading settings…</div>
  }

  const isProfessional = ['professional', 'enterprise', 'bespoke'].includes(tier)

  // Q readiness score — greeting excluded (Qerxel owns the greeting; it is always set)
  const completionScore = (() => {
    let pts = 0
    if (additionalInstructions.trim()) pts += 25
    if (businessName.trim()) pts += 20
    if (callbackPrefNote.trim()) pts += 20
    if (keywords.length > 0) pts += 15
    if (Object.values(rules).some(r => r.instructions?.trim())) pts += 12
    if (Object.values(rules).some(r => r.email_address?.trim())) pts += 8
    return Math.min(100, pts)
  })()
  const qMoodState = completionScore >= 86 ? 'smile' : completionScore >= 61 ? 'content' : completionScore >= 31 ? 'sad' : 'crying'
  const qMoodCaption = completionScore >= 86
    ? "I'm ready — you can always fine-tune me later"
    : completionScore >= 61
    ? "I'm ready. You could make me better though."
    : completionScore >= 31
    ? "Nearly there — I'm missing a few things"
    : "I don't know what to say yet…"

  // Derive current state labels for status hero
  const modeInfo   = TRIAGE_COLOUR[triageMode] || TRIAGE_COLOUR.balanced
  const activeStyle = CONVERSATION_STYLES.find(s => s.triage === triageMode) || CONVERSATION_STYLES[1]
  const outcomeLabels = { booking: 'Books appointments', quote: 'Discusses & quotes', custom: 'Custom outcome' }
  const outcomeLabel  = outcomeLabels[businessOutcomeType] || 'Discusses & quotes'

  const hasSmsOrBooking = smsFollowupEnabled || bookingLink.trim().length > 0
  const configMood   = hasSmsOrBooking ? 'smile' : 'content'
  const configReason = hasSmsOrBooking ? '' : 'Callers aren\'t being offered a booking link or follow-up SMS.'
  const configTip    = hasSmsOrBooking ? '' : 'Add a booking link under Outcome Settings, or enable SMS follow-up.'

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes qPulse { 0%,100%{box-shadow:0 0 0 0 rgba(94,59,135,0.4)} 50%{box-shadow:0 0 0 8px rgba(94,59,135,0)} }`}</style>

      {/* Q Live Session — draft panel: appears when Q has drafted AI instructions during a support call */}
      {qDraft && (
        <div style={{ background: '#1e0a32', border: '2px solid #5e3b87', borderRadius: 12, padding: '16px 20px', marginBottom: 16, animation: 'qPulse 2s ease-in-out 3' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f0a500', flexShrink: 0 }} />
            <span style={{ color: '#f0a500', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Q is reviewing this with you on the call</span>
          </div>
          <div style={{ color: '#e2e0f0', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: "'DM Sans', sans-serif" }}>{qDraft}</div>
          <div style={{ color: '#4b5563', fontSize: 11, marginTop: 10 }}>Tell Q on the call to save this, adjust it, or start again.</div>
        </div>
      )}

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
          {/* Left — live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3db87a' }} />
                  <div style={{ position: 'absolute', inset: -2, borderRadius: '50%', border: '2px solid rgba(61,184,122,0.4)', animation: 'veraBob 2s ease-in-out infinite' }} />
                </div>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', color: 'white', lineHeight: 1 }}>Answer AI · Live</span>
              </div>
              {(qMode === 'very_helpful' || (qMode === 'jump_in' && qMoodState === 'crying')) && (
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.72)', fontFamily: "'DM Sans', sans-serif" }}>{qMoodCaption}</div>
              )}
            </div>
          </div>

          {/* Right — Q mood + style + outcome badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <MoodQ mood={configMood} reason={configReason} tip={configTip} size={40} />
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

      {/* ── Sub-tab bar + ear test ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: 2, background: '#f0ebf8', borderRadius: 9, padding: 3 }}>
          {[['behaviour', 'AI Settings'], ['foundation', 'Foundation']].map(([id, label]) => (
            <button key={id} onClick={() => setSubTab(id)}
              style={{ padding: '0.28rem 0.85rem', borderRadius: 7, border: 'none', background: subTab === id ? '#5e3b87' : 'transparent', color: subTab === id ? 'white' : '#5e3b87', fontSize: '0.78rem', fontWeight: subTab === id ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s', whiteSpace: 'nowrap' }}>
              {label}
            </button>
          ))}
        </div>
        {vapiAssistantId && import.meta.env.VITE_VAPI_PUBLIC_KEY && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {earTestState === 'idle' && (
              <button onClick={startEarTest} style={{ padding: '0.28rem 0.85rem', background: 'white', border: '1px solid rgba(94,59,135,0.25)', borderRadius: 7, fontSize: '0.78rem', color: '#5e3b87', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                Hear it live
              </button>
            )}
            {earTestState === 'connecting' && (
              <span style={{ fontSize: '0.75rem', color: '#888', fontFamily: "'DM Sans', sans-serif" }}>Connecting…</span>
            )}
            {earTestState === 'active' && (
              <>
                <span style={{ fontSize: '0.75rem', color: '#3db87a', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>● Live</span>
                <button onClick={stopEarTest} style={{ padding: '0.25rem 0.7rem', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 7, fontSize: '0.75rem', color: '#b91c1c', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  End
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Foundation view ──────────────────────────────────────────────────── */}
      {subTab === 'foundation' && (
        <AIFoundation
          businessName={businessName} ownerName={ownerName}
          toneRegister={toneRegister} businessOutcomeType={businessOutcomeType}
          customOutcomeText={customOutcomeText} callbackPrefNote={callbackPrefNote}
          greetingMessage={greetingMessage} additionalInstructions={additionalInstructions}
          keywords={keywords} rules={rules}
          spamFilter={spamFilter} salesHandling={salesHandling} autodialerDetection={autodialerDetection}
          blockedNumbers={blockedNumbers}
          provisionalBookingEnabled={provisionalBookingEnabled} provisionalBookingRule={provisionalBookingRule}
          bookingLink={bookingLink}
          onGoToSettings={() => setSubTab('behaviour')}
        />
      )}

      {subTab === 'behaviour' && <>

      <ConversationStyleSection triageMode={triageMode} setTriageMode={setTriageMode} setToneRegister={setToneRegister} businessOutcomeType={businessOutcomeType} setBusinessOutcomeType={setBusinessOutcomeType} customOutcomeText={customOutcomeText} setCustomOutcomeText={setCustomOutcomeText} bookingLink={bookingLink} onNavigate={onNavigate} escalationPref={escalationPref} setEscalationPref={setEscalationPref} />

      <ResponseUrgencySection urgentCallbackMins={urgentCallbackMins} setUrgentCallbackMins={setUrgentCallbackMins} urgentEscalationMethod={urgentEscalationMethod} setUrgentEscalationMethod={setUrgentEscalationMethod} callbackPrefNote={callbackPrefNote} setCallbackPrefNote={setCallbackPrefNote} urgentOutcomes={urgentOutcomes} setUrgentOutcomes={setUrgentOutcomes} tier={tier} overageVoicePref={overageVoicePref} setOverageVoicePref={setOverageVoicePref} />

      <CallTypeRulesSection rules={rules} updateRule={updateRule} businessEmail={businessEmail} additionalInstructions={additionalInstructions} setAdditionalInstructions={setAdditionalInstructions} rulesSaving={rulesSaving} saveRules={saveRules} rulesToast={rulesToast} />

      <EmergencyKeywordsSection keywords={keywords} keywordDraft={keywordDraft} setKeywordDraft={setKeywordDraft} addKeyword={addKeyword} removeKeyword={removeKeyword} />

      <KeepAliveSection keepAliveTopics={keepAliveTopics} keepAliveDraft={keepAliveDraft} setKeepAliveDraft={setKeepAliveDraft} addKeepAliveTopic={addKeepAliveTopic} removeKeepAliveTopic={removeKeepAliveTopic} keepAliveMaxMins={keepAliveMaxMins} setKeepAliveMaxMins={setKeepAliveMaxMins} saveKeepAliveMaxMins={saveKeepAliveMaxMins} />

      <GreetingAndSaveSection toneRegister={toneRegister} businessName={businessName} ownerName={ownerName} greetingMessage={greetingMessage} setGreetingMessage={setGreetingMessage} saving={saving} saveMainSettings={saveMainSettings} syncStatus={syncStatus} toast={toast} />

      <VoicePaceSection qSessionHighlight={qSessionHighlight} responseDelay={responseDelay} saveResponseDelay={saveResponseDelay} speechPace={speechPace} saveSpeechPace={saveSpeechPace} speechStyle={speechStyle} saveSpeechStyle={saveSpeechStyle} qDisplayOnScreen={qDisplayOnScreen} saveQDisplayOnScreen={saveQDisplayOnScreen} previewReadOnly={previewReadOnly} />

      <CallFilteringSection spamFilter={spamFilter} setSpamFilter={setSpamFilter} salesHandling={salesHandling} setSalesHandling={setSalesHandling} autodialerDetection={autodialerDetection} setAutodialerDetection={setAutodialerDetection} saveToggle={saveToggle} />

      <LeadFollowupSection smsFollowupEnabled={smsFollowupEnabled} setSmsFollowupEnabled={setSmsFollowupEnabled} smsFollowupMessage={smsFollowupMessage} setSmsFollowupMessage={setSmsFollowupMessage} saveToggle={saveToggle} />

      <AfterCallMessagingSection messagingConfig={messagingConfig} setMessagingConfig={setMessagingConfig} messagingSaving={messagingSaving} messagingSaved={messagingSaved} saveMessaging={saveMessaging} previewReadOnly={previewReadOnly} />

      <NumberBlockingSection tier={tier} blockedNumbers={blockedNumbers} setBlockedNumbers={setBlockedNumbers} numberDraft={numberDraft} setNumberDraft={setNumberDraft} />

      <ProvisionalBookingSection isProfessional={isProfessional} provisionalBookingEnabled={provisionalBookingEnabled} setProvisionalBookingEnabled={setProvisionalBookingEnabled} bookingLink={bookingLink} onNavigate={onNavigate} provisionalBookingRule={provisionalBookingRule} setProvisionalBookingRule={setProvisionalBookingRule} bookingSlotsToOffer={bookingSlotsToOffer} setBookingSlotsToOffer={setBookingSlotsToOffer} bookingBufferMins={bookingBufferMins} setBookingBufferMins={setBookingBufferMins} bookingConfirmationWindowMins={bookingConfirmationWindowMins} setBookingConfirmationWindowMins={setBookingConfirmationWindowMins} bookingConfWindowUnit={bookingConfWindowUnit} setBookingConfWindowUnit={setBookingConfWindowUnit} bookingCalendarSource={bookingCalendarSource} setBookingCalendarSource={setBookingCalendarSource} calendarTier={calendarTier} tenantId={tenantId} isPreview={isPreview} />


      <TestAISection demoPhone={demoPhone} setDemoPhone={setDemoPhone} demoState={demoState} handleDemoCall={handleDemoCall} vapiAssistantId={vapiAssistantId} />

      <NetworkCard onNavigate={onNavigate} />

      </>}

    </div>
  )
}

export default AIBehaviour
