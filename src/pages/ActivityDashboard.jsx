import { useState, useEffect, useRef } from 'react'
import ReactApexChart from 'react-apexcharts'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { usePreview } from '../context/PreviewContext'
import { useDemo } from '../context/DemoContext'

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

// ─── helpers ────────────────────────────────────────────────────────────────

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const startOfDaysAgo = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

const startOfMonth = () => {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

const formatDateLabel = (iso) => {
  const d = new Date(iso)
  if (d >= startOfToday()) return 'Today'
  const y = new Date(startOfToday())
  y.setDate(y.getDate() - 1)
  if (d >= y) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const formatDuration = (secs) => {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

const callerLabel = (call) =>
  call.callers?.full_name || call.callers?.phone_number || call.caller_phone || 'Unknown caller'

const timeSince = (iso) => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const isUrgentLead = (iso) => {
  const diff = Date.now() - new Date(iso).getTime()
  return diff < 2 * 60 * 60 * 1000 // less than 2 hours old
}

const OUTCOME_BADGES = {
  booked:         { label: 'Booked',       bg: '#f0ebf8', color: '#5e3b87' },
  lead_captured:  { label: 'Lead',         bg: '#e6f5ee', color: '#1e7a4a' },
  referred_out:   { label: 'Referred out', bg: '#eff6ff', color: '#1d4ed8' },
  filtered:       { label: 'Filtered',     bg: '#f8fafc', color: '#64748b' },
  escalated:      { label: 'Escalated',    bg: '#fdecea', color: '#b91c1c' },
  hard_close:     { label: 'Closed',       bg: '#f8fafc', color: '#64748b' },
  spam:           { label: 'Spam',         bg: '#f8fafc', color: '#64748b' },
}

const outcomeBadge = (outcome) =>
  OUTCOME_BADGES[outcome] || { label: outcome || 'Call', bg: '#f3f1f6', color: '#5e3b87' }

// ─── styles ──────────────────────────────────────────────────────────────────

const s = {
  section: {
    background: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    border: '0.5px solid rgba(94,59,135,0.08)',
    boxShadow: '0 2px 12px rgba(94,59,135,0.06)',
  },
  sectionTitle: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    color: '#aaaaaa',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '1rem',
  },
  statCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.25rem 1.25rem 1.1rem',
    border: '0.5px solid rgba(94,59,135,0.06)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.06)',
  },
  statLabel: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    color: '#aaaaaa',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '0.5rem',
  },
  statNumber: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '2rem',
    fontWeight: 700,
    color: '#5e3b87',
    lineHeight: 1,
    marginBottom: '0.4rem',
  },
  statTrend: {
    fontSize: '0.75rem',
    color: '#f0a500',
    fontWeight: '500',
  },
  recoCard: {
    background: '#f0ebf8',
    borderRadius: '16px',
    padding: '1.25rem 1.5rem',
    borderLeft: '4px solid #5e3b87',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  recoTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '0.2rem',
  },
  recoBody: {
    fontSize: '0.8rem',
    color: '#888',
    lineHeight: 1.5,
  },
  recoBtn: {
    flexShrink: 0,
    padding: '0.45rem 1rem',
    background: '#f0a500',
    color: '#1a0533',
    border: 'none',
    borderRadius: '7px',
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: 'nowrap',
  },
  callRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.85rem',
    padding: '0.85rem 0',
    borderBottom: '1px solid rgba(94,59,135,0.06)',
  },
  callDot: (outcome) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: outcome === 'booked' ? '#3db87a' : outcome === 'filtered' || outcome === 'spam' || outcome === 'hard_close' ? '#d1d5db' : '#5e3b87',
    marginTop: 6,
    flexShrink: 0,
  }),
  callMeta: {
    fontSize: '0.775rem',
    color: '#bbb',
    marginTop: '0.2rem',
  },
  callCaller: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#1a1a1a',
  },
  callNotes: {
    fontSize: '0.775rem',
    color: '#888',
    marginTop: '0.25rem',
    fontStyle: 'italic',
    lineHeight: 1.45,
  },
  badge: (bg, color) => ({
    display: 'inline-block',
    padding: '0.2rem 0.6rem',
    borderRadius: '999px',
    fontSize: '0.7rem',
    fontWeight: 600,
    background: bg,
    color,
    whiteSpace: 'nowrap',
    marginLeft: 'auto',
    alignSelf: 'flex-start',
    flexShrink: 0,
  }),
  leadRow: {
    padding: '0.75rem 0',
    borderBottom: '1px solid rgba(94,59,135,0.06)',
  },
  leadName: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: '0.15rem',
  },
  leadMeta: {
    fontSize: '0.775rem',
    color: '#bbb',
  },
  refRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 0',
    borderBottom: '1px solid rgba(94,59,135,0.06)',
    fontSize: '0.875rem',
    color: '#1a1a1a',
  },
  refTime: {
    fontSize: '0.775rem',
    color: '#bbb',
  },
  emptyState: {
    fontSize: '0.8rem',
    color: '#ccc',
    padding: '1rem 0',
  },
}

// ─── sub-components ──────────────────────────────────────────────────────────

const StatCard = ({ label, value, trend }) => (
  <div style={s.statCard}>
    <div style={s.statLabel}>{label}</div>
    <div style={s.statNumber}>{value}</div>
    {trend && <div style={s.statTrend}>{trend}</div>}
  </div>
)

const RecoCard = ({ title, body, actionLabel, onAction }) => (
  <div style={s.recoCard}>
    <div style={{ flex: 1 }}>
      <div style={s.recoTitle}>{title}</div>
      <div style={s.recoBody}>{body}</div>
    </div>
    {actionLabel && (
      <button style={s.recoBtn} onClick={onAction}>{actionLabel}</button>
    )}
  </div>
)

// ─── arc gauge ────────────────────────────────────────────────────────────────

const ArcGauge = ({ pct }) => {
  const clamped = Math.min(Math.max(pct, 0), 100)
  const totalLen = 62.8  // π × r (r = 20)
  const dashLen = (clamped / 100) * totalLen
  const color = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f0a500' : '#5e3b87'
  return (
    <div style={{ position: 'relative', width: 48, height: 30, flexShrink: 0 }}>
      <svg width="48" height="30" viewBox="0 0 48 30" style={{ display: 'block' }}>
        <path d="M 4 26 A 20 20 0 0 1 44 26" fill="none" stroke="#f0ebf8" strokeWidth="5" strokeLinecap="round" />
        <path d="M 4 26 A 20 20 0 0 1 44 26" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${dashLen} ${totalLen}`} />
      </svg>
      <div style={{ position: 'absolute', bottom: 2, left: 0, right: 0, textAlign: 'center', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.625rem', color, lineHeight: 1 }}>
        {pct}%
      </div>
    </div>
  )
}

// ─── outcome → accent colour map ─────────────────────────────────────────────

const OUTCOME_ACCENT = {
  booked:        { border: '#5e3b87', bg: '#ddd6fe' },
  lead_captured: { border: '#3db87a', bg: '#bbf7d0' },
  referred_out:  { border: '#1d4ed8', bg: '#bfdbfe' },
  escalated:     { border: '#ef4444', bg: '#fecaca' },
  filtered:      { border: '#cbd5e1', bg: '#f1f5f9' },
  spam:          { border: '#cbd5e1', bg: '#f1f5f9' },
  hard_close:    { border: '#cbd5e1', bg: '#f1f5f9' },
}

// ─── call card ────────────────────────────────────────────────────────────────

const CallCard = ({ call, onClick }) => {
  const [hovered, setHovered] = useState(false)
  const badge = outcomeBadge(call.call_outcome)
  const isUrgent = call.call_outcome === 'escalated'
  const isFiltered = ['filtered', 'spam', 'hard_close'].includes(call.call_outcome)
  const accent = OUTCOME_ACCENT[call.call_outcome] || { border: '#5e3b87', bg: 'white' }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: accent.bg,
        borderRadius: 16,
        border: '0.5px solid rgba(94,59,135,0.07)',
        borderLeft: `4px solid ${accent.border}`,
        boxShadow: hovered ? '0 8px 24px rgba(94,59,135,0.12)' : '0 2px 8px rgba(0,0,0,0.06)',
        padding: '13px 16px 13px 14px',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        opacity: isFiltered ? 0.55 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: call.ai_summary ? 8 : 0 }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {callerLabel(call)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: '0.75rem', color: '#aaaaaa', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
            {formatTime(call.created_at)}{call.duration_seconds ? ` · ${formatDuration(call.duration_seconds)}` : ''}
          </span>
          <span style={{ display: 'inline-block', padding: '0.18rem 0.5rem', borderRadius: 4, fontSize: '0.6875rem', fontWeight: 600, background: badge.bg, color: badge.color, whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>
            {badge.label}
          </span>
        </div>
      </div>
      {call.ai_summary && (
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8125rem', color: '#666666', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {call.ai_summary}
        </div>
      )}
    </div>
  )
}

// ─── count-up ────────────────────────────────────────────────────────────────

const CountUp = ({ to, duration = 900, suffix = '' }) => {
  const [val, setVal] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    if (to === prev.current) return
    const from = prev.current
    prev.current = to
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      setVal(Math.round(from + (to - from) * p))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [to])
  return `${val}${suffix}`
}

// ─── chart helpers ────────────────────────────────────────────────────────────

const getDayBuckets = (n, items) => {
  const now = new Date()
  return Array.from({ length: n }, (_, i) => {
    const day = new Date(now)
    day.setDate(now.getDate() - (n - 1 - i))
    day.setHours(0, 0, 0, 0)
    const next = new Date(day); next.setDate(day.getDate() + 1)
    const dayItems = items.filter(it => {
      const d = new Date(it.created_at)
      return d >= day && d < next
    })
    return {
      label: day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      count: dayItems.length,
      minutes: Math.round(dayItems.reduce((s, it) => s + (it.duration_seconds || 0), 0) / 60),
    }
  })
}

// ─── lead card ────────────────────────────────────────────────────────────────

const pulseStyle = `
@keyframes urgentPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.5); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0);    }
}
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.95) translateY(8px); }
  to   { opacity: 1; transform: scale(1)    translateY(0);   }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
@keyframes shimmer {
  from { background-position: -400px 0; }
  to   { background-position: calc(400px + 100%) 0; }
}
`

const shimmerStyle = {
  background: 'linear-gradient(90deg, #f0ebf8 25%, #e4d9f0 50%, #f0ebf8 75%)',
  backgroundSize: '400px 100%',
  animation: 'shimmer 1.5s infinite linear',
  borderRadius: 8,
}

const Skel = ({ h = 16, w = '100%', mb = 0, radius = 8 }) => (
  <div style={{ ...shimmerStyle, height: h, width: w, marginBottom: mb, borderRadius: radius, flexShrink: 0 }} />
)

const EmptyState = ({ icon, title, body }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', textAlign: 'center' }}>
    <div style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.25 }}>{icon}</div>
    <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.875rem', color: '#aaaaaa', marginBottom: 4 }}>{title}</div>
    {body && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', color: '#cccccc', lineHeight: 1.5 }}>{body}</div>}
  </div>
)

const LEAD_STATUS_ACCENT = {
  new:       { border: '#3db87a', bg: '#bbf7d0' },
  contacted: { border: '#1d4ed8', bg: '#bfdbfe' },
  converted: { border: '#5e3b87', bg: '#ddd6fe' },
  lost:      { border: '#cbd5e1', bg: '#f1f5f9' },
}

const LeadCard = ({ lead, onClick, onWon, onLost }) => {
  const [hovered, setHovered] = useState(false)
  const name = lead.lead_contact_name || lead.callers?.phone_number || 'Unknown'
  const urgent = isUrgentLead(lead.created_at) && (!lead.status || lead.status === 'new')
  const phone = lead.callers?.phone_number
  const accent = urgent
    ? { border: '#f0a500', bg: '#fde68a' }
    : LEAD_STATUS_ACCENT[lead.status] || LEAD_STATUS_ACCENT.new

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: accent.bg,
        borderRadius: 16,
        border: '0.5px solid rgba(94,59,135,0.07)',
        borderLeft: `4px solid ${accent.border}`,
        boxShadow: hovered ? '0 8px 24px rgba(94,59,135,0.12)' : '0 2px 8px rgba(0,0,0,0.06)',
        padding: '13px 16px 13px 14px',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {urgent && (
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f0a500', flexShrink: 0, animation: 'urgentPulse 1.6s ease-in-out infinite' }} />
          )}
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
            {name}
          </div>
        </div>
        <span style={{ fontSize: '0.75rem', color: urgent ? '#b07a00' : '#aaaaaa', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', fontWeight: urgent ? 600 : 400, flexShrink: 0 }}>
          {timeSince(lead.created_at)}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}
        onClick={e => e.stopPropagation()}>
        {phone && (
          <a href={`tel:${phone}`}
            style={{ display: 'inline-block', padding: '0.22rem 0.65rem', border: '1px solid rgba(94,59,135,0.22)', borderRadius: 5, background: 'white', color: '#5e3b87', fontSize: '0.72rem', fontWeight: 500, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
            Call back
          </a>
        )}
        {onWon && (
          <button onClick={e => { e.stopPropagation(); onWon(lead) }}
            style={{ padding: '0.22rem 0.65rem', border: '1px solid #3db87a', borderRadius: 5, background: '#e6f9ef', color: '#1a6640', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
            Won ✓
          </button>
        )}
        {onLost && (
          <button onClick={e => { e.stopPropagation(); onLost(lead) }}
            style={{ padding: '0.22rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: 5, background: '#f1f5f9', color: '#64748b', fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
            Lost
          </button>
        )}
        <button onClick={onClick}
          style={{ padding: '0.22rem 0.65rem', border: '1px solid rgba(94,59,135,0.22)', borderRadius: 5, background: 'white', color: '#5e3b87', fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
          View →
        </button>
      </div>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

const ActivityDashboard = ({ onNavigate }) => {
  const { user } = useAuth()
  const preview = usePreview()
  const demo = useDemo()
  const isDemo = !!demo?.isDemo || !!preview?.isDemo
  const isPreview = !!preview?.isPreview
  const isMobile = useIsMobile()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)
  const [tenantId, setTenantId] = useState(null)
  const [businessName, setBusinessName] = useState('')
  const [includedMinutes, setIncludedMinutes] = useState(250)
  const [tier, setTier] = useState('standard')
  useEffect(() => { if (preview?.tierOverride !== null) setTier(preview?.tierOverride) }, [preview?.tierOverride])
  const [triageMode, setTriageMode] = useState('balanced')
  const [voicePref, setVoicePref] = useState('premium')
  const [selectedCall, setSelectedCall] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)
  const [calledOutcome, setCalledOutcome] = useState(null) // null | 'picking'
  const [leadNotes, setLeadNotes] = useState('')
  const [leadNotesSaving, setLeadNotesSaving] = useState(false)
  const [connectedIntegrations, setConnectedIntegrations] = useState(new Set())
  const [notesSaved, setNotesSaved] = useState(false)
  const [tileStates, setTileStates] = useState({ status: 'half', calls: 'half', leads: 'half', charts: 'icon' })
  const setTile = (id, state) => setTileStates(prev => ({ ...prev, [id]: state }))
  const [holidayMode, setHolidayMode] = useState(false)
  const [pipelineView, setPipelineView] = useState(false)
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false)
  const [qcName, setQcName] = useState('')
  const [qcPhone, setQcPhone] = useState('')
  const [qcNotes, setQcNotes] = useState('')
  const [qcOutcome, setQcOutcome] = useState('lead_captured')
  const [qcSaving, setQcSaving] = useState(false)
  const [callTranscript, setCallTranscript] = useState(null)
  const [callTranscriptLoading, setCallTranscriptLoading] = useState(false)

  const [calls, setCalls] = useState([])
  const [leads, setLeads] = useState([])
  const [referrals, setReferrals] = useState([])
  const [partnerCount, setPartnerCount] = useState(-1)
  const [staffCount, setStaffCount]     = useState(-1)
  const [catalogueCount, setCatalogueCount] = useState(-1)
  const [listenTier, setListenTier]     = useState('none')
  const [calendarTier, setCalendarTier] = useState('entry')
  const [provisionalCount, setProvisionalCount] = useState(0)
  const [featureNoticeClosed, setFeatureNoticeClosed] = useState(false)

  // ── Demo mode: inject from DemoContext ────────────────────────────────────────
  useEffect(() => {
    if (!demo?.isDemo || demo.loading || !demo.business) return
    const biz = demo.business
    const demoTier = demo.tier || 'standard'
    setTier(demoTier)
    setBusinessName(biz.business_name || '')
    setIncludedMinutes(biz.included_minutes || 250)
    setTriageMode(biz.triage_mode || 'balanced')
    setCalls(demo.calls || [])
    setLeads(demo.leads || [])
    setReferrals(demo.referrals || [])
    // Hub strip: infer listen/calendar availability from tier
    const hasProfessional = ['professional', 'enterprise', 'bespoke'].includes(demoTier)
    setListenTier(hasProfessional ? 'standard' : 'none')
    setCalendarTier('entry')
    setLoading(false)
  }, [demo?.isDemo, demo?.business?.id, demo?.tier, demo?.loading])

  useEffect(() => {
    if (demo?.isDemo) return
    if (!user && !isPreview) return
    const load = async () => {
      setLoading(true)
      setError(null)
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
          .select('business_name, included_minutes, subscription_tier, triage_mode, overage_voice_preference, holiday_mode, listen_tier, calendar_tier')
          .eq('id', tid)
          .maybeSingle()

        if (tenant) {
          setBusinessName(tenant.business_name || '')
          setIncludedMinutes(tenant.included_minutes || 250)
          setTier(tenant.subscription_tier || 'standard')
          setTriageMode(tenant.triage_mode || 'balanced')
          setVoicePref(tenant.overage_voice_preference || 'premium')
          setHolidayMode(tenant.holiday_mode || false)
          setListenTier(tenant.listen_tier || 'none')
          setCalendarTier(tenant.calendar_tier || 'entry')
        }

        const monthIso = startOfMonth().toISOString()

        const [callRes, leadRes, refRes, pCountRes, sCountRes, cCountRes, apptRes] = await Promise.all([
          supabase
            .from('call_logs')
            .select('id, created_at, duration_seconds, ai_summary, call_outcome, caller_phone, callers(phone_number, full_name)')
            .eq('tenant_id', tid)
            .gte('created_at', monthIso)
            .order('created_at', { ascending: false })
            .limit(100),

          supabase
            .from('leads')
            .select('id, created_at, status, lead_contact_name, notes, ai_summary, call_log_id, callers(phone_number)')
            .eq('tenant_id', tid)
            .gte('created_at', startOfDaysAgo(30).toISOString())
            .order('created_at', { ascending: false })
            .limit(50),

          supabase
            .from('referral_log')
            .select('id, created_at, referral_partners(partner_name)')
            .eq('tenant_id', tid)
            .gte('created_at', startOfDaysAgo(7).toISOString())
            .order('created_at', { ascending: false })
            .limit(50),

          supabase.from('referral_partners').select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
          supabase.from('staff_profiles').select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
          supabase.from('catalogue_items').select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
          supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).eq('status', 'provisional').gte('start_time', new Date().toISOString()),
        ])

        setCalls(callRes.data || [])
        setLeads(leadRes.data || [])
        setReferrals(refRes.data || [])
        setPartnerCount(pCountRes.count ?? 0)
        setStaffCount(sCountRes.count ?? 0)
        setCatalogueCount(cCountRes.count ?? 0)
        setProvisionalCount(apptRes.count ?? 0)

        try {
          const { data: integrations } = await supabase
            .from('tenant_integrations')
            .select('integration_id')
            .eq('tenant_id', tid)
            .eq('enabled', true)
          if (integrations) setConnectedIntegrations(new Set(integrations.map(i => i.integration_id)))
        } catch {
          // table may not exist yet — leave as empty Set
        }
      } catch (err) {
        console.error('Dashboard load error:', err)
        setError('Could not load your dashboard data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, isPreview, retryKey])

  // ESC to close modals
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') { setSelectedCall(null); setSelectedLead(null) } }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Sync notes + fetch transcript when lead modal opens
  useEffect(() => {
    setLeadNotes(selectedLead?.notes || '')
    setCallTranscript(null)
    setCalledOutcome(null)
    if (!selectedLead?.call_log_id || isDemo || isPreview) return
    setCallTranscriptLoading(true)
    supabase
      .from('call_logs')
      .select('transcript')
      .eq('id', selectedLead.call_log_id)
      .maybeSingle()
      .then(({ data }) => {
        setCallTranscript(data?.transcript || null)
        setCallTranscriptLoading(false)
      })
      .catch(() => setCallTranscriptLoading(false))
  }, [selectedLead?.id])

  const saveLeadNotes = async (value) => {
    if (isDemo || isPreview || !selectedLead?.id) return
    setLeadNotesSaving(true)
    try {
      await supabase.from('leads').update({ notes: value }).eq('id', selectedLead.id)
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, notes: value } : l))
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    } finally {
      setLeadNotesSaving(false)
    }
  }

  const markContacted = async (lead) => {
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'contacted' } : l))
    setSelectedLead(null)
    if (isDemo || isPreview) return
    try {
      await supabase.from('leads').update({ status: 'contacted' }).eq('id', lead.id)
    } catch {
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'new' } : l))
    }
  }

  const updateLeadStatus = async (lead, status) => {
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status } : l))
    if (selectedLead?.id === lead.id) setSelectedLead(prev => ({ ...prev, status }))
    if (isDemo || isPreview) return
    try {
      await supabase.from('leads').update({ status }).eq('id', lead.id)
    } catch {
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: lead.status } : l))
    }
  }

  const submitQuickCapture = async () => {
    if (!qcName.trim() && !qcPhone.trim()) return
    if (isDemo || isPreview || !tenantId) return
    setQcSaving(true)
    try {
      let callerId = null
      if (qcPhone.trim()) {
        const { data: existing } = await supabase.from('callers').select('id').eq('phone_number', qcPhone.trim()).maybeSingle()
        if (existing) {
          callerId = existing.id
        } else {
          const { data: nc } = await supabase.from('callers').insert({ phone_number: qcPhone.trim() }).select().maybeSingle()
          callerId = nc?.id || null
        }
      }
      const { data: callLog } = await supabase.from('call_logs').insert({
        tenant_id:        tenantId,
        caller_id:        callerId,
        caller_phone:     qcPhone.trim() || null,
        call_outcome:     qcOutcome,
        ai_summary:       qcNotes.trim() ? `Manual entry: ${qcNotes.trim()}` : null,
        duration_seconds: 0,
      }).select().maybeSingle()

      if (qcOutcome === 'lead_captured' || qcOutcome === 'booked') {
        const { data: newLead } = await supabase.from('leads').insert({
          tenant_id:         tenantId,
          caller_id:         callerId,
          call_log_id:       callLog?.id || null,
          lead_contact_name: qcName.trim() || null,
          ai_summary:        qcNotes.trim() ? `Manual entry: ${qcNotes.trim()}` : null,
          status:            'new',
          notes:             qcNotes.trim() || null,
        }).select('id, created_at, status, lead_contact_name, notes, ai_summary, call_log_id, callers(phone_number)').maybeSingle()
        if (newLead) setLeads(prev => [newLead, ...prev])
      }

      if (callLog) setCalls(prev => [{
        ...callLog,
        callers: callerId ? { phone_number: qcPhone.trim() } : null,
      }, ...prev])

      setQcName(''); setQcPhone(''); setQcNotes(''); setQcOutcome('lead_captured')
      setQuickCaptureOpen(false)
    } catch (err) {
      console.error('Quick capture failed:', err)
    } finally {
      setQcSaving(false)
    }
  }

  // ── computed stats ──────────────────────────────────────────────────────────

  const today = startOfToday()
  const weekAgo = startOfDaysAgo(7)

  const callsToday = calls.filter(c => new Date(c.created_at) >= today).length
  const callsThisMonth = calls.length
  const leadsThisWeek = leads.filter(l => new Date(l.created_at) >= weekAgo).length
  const referralsThisWeek = referrals.filter(r => new Date(r.created_at) >= weekAgo).length
  const referralsToday = referrals.filter(r => new Date(r.created_at) >= today)

  const totalSeconds = calls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0)
  const minutesUsed = Math.round(totalSeconds / 60)
  const minutesPct = includedMinutes > 0 ? Math.round((minutesUsed / includedMinutes) * 100) : 0

  const actionableLeads = leads.filter(l => !l.status || l.status === 'new')
  const recentCalls = calls.slice(0, 5)

  // ── proactive alerts ─────────────────────────────────────────────────────────

  const DAY_MS = 24 * 60 * 60 * 1000
  const staleLeads = leads.filter(l => (!l.status || l.status === 'new') && (Date.now() - new Date(l.created_at).getTime()) > DAY_MS)

  const alerts = []

  if (holidayMode) {
    alerts.push({
      type: 'warning',
      icon: '🌙',
      title: 'AI is paused — holiday mode on',
      body: 'Calls are not being answered. Disable holiday mode to resume.',
      actionLabel: 'Disable',
      onAction: () => onNavigate && onNavigate('settings'),
      borderColor: '#f0a500', bg: '#fffbeb',
    })
  }
  if (staleLeads.length > 0) {
    alerts.push({
      type: 'urgent',
      icon: '⚡',
      title: `${staleLeads.length} lead${staleLeads.length !== 1 ? 's' : ''} unreturned for 24h+`,
      body: 'Response rate drops sharply after the first day. These callers may already be looking elsewhere.',
      actionLabel: 'View',
      onAction: () => setPipelineView(false),
      borderColor: '#ef4444', bg: '#fef2f2',
    })
  }
  if (!holidayMode && minutesPct > 80 && minutesUsed > 0) {
    alerts.push({
      type: 'info',
      icon: '📊',
      title: `${minutesPct}% of monthly minutes used`,
      body: minutesPct >= 100 ? 'Overage rates now apply to every call.' : 'You are approaching your monthly limit. Upgrade to avoid overage charges.',
      actionLabel: 'Review plan',
      onAction: () => onNavigate && onNavigate('settings'),
      borderColor: minutesPct >= 100 ? '#ef4444' : '#f0a500', bg: minutesPct >= 100 ? '#fef2f2' : '#fffbeb',
    })
  }
  if (alerts.length === 0) {
    if (callsThisMonth === 0) {
      alerts.push({
        type: 'tip',
        icon: '📞',
        title: 'Your AI is ready to take its first call',
        body: 'Share your AI-powered number with customers to start capturing leads automatically.',
        actionLabel: 'View setup',
        onAction: () => onNavigate && onNavigate('settings'),
        borderColor: '#5e3b87', bg: '#f0ebf8',
      })
    } else {
      alerts.push({
        type: 'tip',
        icon: '✅',
        title: `AI handled ${callsThisMonth} call${callsThisMonth !== 1 ? 's' : ''} this month — all clear`,
        body: 'Everything is running smoothly. Grow your referral network to drive more inbound leads.',
        actionLabel: 'Manage partners',
        onAction: () => onNavigate && onNavigate('referrals'),
        borderColor: '#3db87a', bg: '#f0fdf4',
      })
    }
  }

  // ── render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div>
        <style>{pulseStyle}</style>
        {/* Zone 1 skeleton */}
        <div style={{ background: 'white', borderRadius: 16, border: '0.5px solid rgba(94,59,135,0.08)', padding: '1.25rem 1.75rem', display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '1.75rem' }}>
          <div style={{ flexShrink: 0 }}><Skel h={48} w={48} radius={6} /></div>
          <Skel h={12} w={80} />
          <Skel h={10} w={60} />
          <Skel h={50} w={80} radius={25} />
          <Skel h={10} w={70} />
          <Skel h={24} w={50} />
        </div>
        {/* Zone 2 skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.25rem', marginBottom: '1.75rem' }}>
          {[0, 1].map(col => (
            <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Skel h={10} w={100} mb={4} />
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ background: 'white', borderRadius: 16, border: '0.5px solid rgba(94,59,135,0.08)', padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Skel h={12} w="55%" />
                    <Skel h={12} w="28%" />
                  </div>
                  <Skel h={10} w="80%" />
                </div>
              ))}
            </div>
          ))}
        </div>
        {/* Zone 3 skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '1.25rem' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ background: 'white', borderRadius: 16, border: '0.5px solid rgba(94,59,135,0.08)', padding: '1.5rem' }}>
              <Skel h={10} w={80} mb={8} />
              <Skel h={32} w={60} mb={4} radius={6} />
              <Skel h={10} w={100} mb={16} />
              <Skel h={70} w="100%" radius={6} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: 12, opacity: 0.3 }}>⚠</div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.9375rem', color: '#1a1a1a', marginBottom: 6 }}>Something went wrong</div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8125rem', color: '#aaaaaa', marginBottom: 20 }}>{error}</div>
        <button
          onClick={() => setRetryKey(k => k + 1)}
          style={{ padding: '0.5rem 1.25rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
        >
          Try again
        </button>
      </div>
    )
  }

  // ── Mobile tile render ────────────────────────────────────────────────────────
  if (isMobile) {
    const aiStatus = minutesPct >= 100
      ? { label: 'Paused', color: '#b91c1c', dot: '#ef4444' }
      : minutesPct >= 80
      ? { label: 'Near limit', color: '#b07a00', dot: '#f0a500' }
      : { label: 'Active', color: '#1e7a4a', dot: '#3db87a' }
    const triageColors = { strict: { color: '#6b2049', bg: '#f7cee3' }, balanced: { color: '#1e3a8a', bg: '#bfdbfe' }, open: { color: '#166534', bg: '#bbf7d0' } }
    const triageLabels = { strict: 'Strict', balanced: 'Balanced', open: 'Open' }
    const triage = { label: triageLabels[triageMode] || 'Balanced', ...(triageColors[triageMode] || triageColors.balanced) }
    const week7 = getDayBuckets(7, calls)
    const capturedCountM = calls.filter(c => c.call_outcome === 'lead_captured' || c.call_outcome === 'booked').length
    const weekCountsM = week7.map(d => d.count)
    const weekLabelsM = week7.map(d => d.label)
    const busiestIdxM = weekCountsM.indexOf(Math.max(...weekCountsM))
    const busiestLabelM = weekCountsM[busiestIdxM] > 0 ? weekLabelsM[busiestIdxM] : null

    const iconTiles = Object.entries(tileStates).filter(([, s]) => s === 'icon')
    const fullTileId = Object.entries(tileStates).find(([, s]) => s === 'full')?.[0] ?? null
    const TILE_ORDER = ['status', 'calls', 'leads', 'charts']

    const TILE_META = {
      status: { label: 'AI Status', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></svg> },
      calls:  { label: 'Calls',     icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 9.8a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 7.49 7.49l.93-.93a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> },
      leads:  { label: 'Leads',     icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
      charts: { label: 'Analytics', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg> },
    }

    const IcoChevUp   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5e3b87" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
    const IcoChevDown = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5e3b87" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>

    // Top-left expand/contract — 44px touch target, 32px white rounded-square
    const ExpandBtn = ({ id, isFull }) => (
      <button
        onClick={e => { e.stopPropagation(); setTile(id, isFull ? 'half' : 'full') }}
        style={{ position: 'absolute', top: 0, left: 0, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 5, WebkitTapHighlightColor: 'transparent' }}
        aria-label={isFull ? 'Collapse' : 'Expand'}
      >
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 6px rgba(94,59,135,0.18)' }}>
          {isFull ? <IcoChevDown /> : <IcoChevUp />}
        </div>
      </button>
    )

    // Top-right dismiss — 44px touch target (half state only, not status tile)
    const DismissBtn = ({ id }) => (
      <button
        onClick={e => { e.stopPropagation(); setTile(id, 'icon') }}
        style={{ position: 'absolute', top: 0, right: 0, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 5, WebkitTapHighlightColor: 'transparent' }}
        aria-label="Dismiss"
      >
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#888', fontSize: '1.1rem', lineHeight: 1, fontFamily: 'system-ui' }}>×</span>
        </div>
      </button>
    )

    const tileContent = {
      status: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 44, color: '#5e3b87', lineHeight: 1 }}><CountUp to={callsToday} /></div>
              <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>calls today</div>
              {callsThisMonth > 0 && <div style={{ fontSize: '0.72rem', color: '#3db87a', fontFamily: "'DM Sans', sans-serif", marginTop: 6, fontWeight: 500 }}>{callsThisMonth} this month</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: aiStatus.dot, flexShrink: 0 }} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.875rem', color: aiStatus.color }}>{aiStatus.label}</span>
              </div>
              <ArcGauge pct={minutesPct} />
              <div style={{ fontSize: '0.68rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>{minutesUsed} / {includedMinutes} min</div>
              <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, background: triage.bg, color: triage.color, fontFamily: "'DM Sans', sans-serif" }}>{triage.label}</span>
            </div>
          </div>
          {reco && (
            <div style={{ background: '#f0ebf8', borderRadius: 12, padding: '0.85rem 1rem', borderLeft: '4px solid #5e3b87' }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.8125rem', color: '#1a1a1a', marginBottom: 4 }}>{reco.title}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: '#666', lineHeight: 1.5 }}>{reco.body}</div>
            </div>
          )}
        </div>
      ),

      calls: (
        <div>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', fontFamily: "'DM Sans', sans-serif" }}>Recent calls</div>
          {recentCalls.length === 0
            ? <EmptyState icon="📞" title="No calls yet" body="Your AI number hasn't received any calls this month." />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recentCalls.map((call, i) => (
                  <motion.div key={call.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.04 }}>
                    <CallCard call={call} onClick={() => setSelectedCall(call)} />
                  </motion.div>
                ))}
              </div>
          }
        </div>
      ),

      leads: (
        <div>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 8 }}>
            Leads requiring action
            {actionableLeads.length > 0 && <span style={{ background: '#e6f5ee', color: '#1e7a4a', borderRadius: 10, padding: '0.05rem 0.5rem', fontSize: '0.65rem', fontWeight: 700 }}>{actionableLeads.length}</span>}
          </div>
          {actionableLeads.length === 0
            ? <EmptyState icon="🙌" title="All caught up" body="No leads waiting for follow-up." />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {actionableLeads.slice(0, 6).map((lead, i) => (
                  <motion.div key={lead.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.04 }}>
                    <LeadCard lead={lead} onClick={() => setSelectedLead(lead)} />
                  </motion.div>
                ))}
              </div>
          }
        </div>
      ),

      charts: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={s.section}>
            <div style={s.sectionTitle}>Calls turned into leads</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.75rem', color: '#3db87a', lineHeight: 1, marginBottom: 4 }}>{capturedCountM} <span style={{ fontSize: '1rem', color: '#aaa', fontWeight: 400 }}>of {callsThisMonth}</span></div>
            <div style={{ fontSize: '0.72rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>calls this month</div>
          </div>
          <div style={s.section}>
            <div style={s.sectionTitle}>7-day volume</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.75rem', color: '#5e3b87', lineHeight: 1, marginBottom: 4 }}>{weekCountsM.reduce((a, b) => a + b, 0)}</div>
            {busiestLabelM && <div style={{ fontSize: '0.72rem', color: '#5e3b87', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>Busiest: {busiestLabelM}</div>}
          </div>
          <div style={s.section}>
            <div style={s.sectionTitle}>Minutes used</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.75rem', color: '#5e3b87', lineHeight: 1, marginBottom: 4 }}>{minutesUsed} <span style={{ fontSize: '1rem', color: '#aaa', fontWeight: 400 }}>/ {includedMinutes}</span></div>
            <div style={{ fontSize: '0.72rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>this month</div>
          </div>
          {referralsToday.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionTitle}>Referrals today</div>
              {referralsToday.map((ref, i) => (
                <div key={ref.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', fontFamily: "'DM Sans', sans-serif", padding: '0.4rem 0', borderBottom: i < referralsToday.length - 1 ? '1px solid rgba(94,59,135,0.06)' : 'none', color: '#1a1a1a' }}>
                  <span>{ref.referral_partners?.partner_name || ref.referral_partners?.business_name || 'Partner'}</span>
                  <span style={{ color: '#aaa' }}>{formatTime(ref.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    }

    return (
      <div style={{ position: 'relative', paddingBottom: iconTiles.length > 0 ? 80 : 8 }}>
        <style>{pulseStyle}</style>

        {/* Full-screen tile */}
        <AnimatePresence>
          {fullTileId && (
            <motion.div key={`full-${fullTileId}`} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <ExpandBtn id={fullTileId} isFull />
              <div style={{ flex: 1, overflowY: 'auto', padding: '52px 1rem 1.5rem 1rem', WebkitOverflowScrolling: 'touch' }}>
                {tileContent[fullTileId]}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Half-screen tiles */}
        {TILE_ORDER.filter(id => tileStates[id] === 'half').map(id => (
          <div key={id} style={{ position: 'relative', background: 'white', borderRadius: 16, border: '0.5px solid rgba(94,59,135,0.08)', boxShadow: '0 2px 12px rgba(94,59,135,0.06)', marginBottom: '0.75rem', height: '50vh', minHeight: 240, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <ExpandBtn id={id} isFull={false} />
            {id !== 'status' && <DismissBtn id={id} />}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '52px 1rem 1rem 1rem', WebkitOverflowScrolling: 'touch' }}>
              {tileContent[id]}
            </div>
          </div>
        ))}

        {/* Bottom icon row — tiles dismissed to icon state */}
        <AnimatePresence>
          {iconTiles.length > 0 && (
            <motion.div key="icon-bar" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ duration: 0.22 }}
              style={{ position: 'fixed', bottom: 58, left: 0, right: 0, background: 'white', borderTop: '1px solid rgba(94,59,135,0.1)', display: 'flex', zIndex: 150, boxShadow: '0 -2px 12px rgba(94,59,135,0.06)' }}>
              {iconTiles.map(([id]) => (
                <button key={id} onClick={() => setTile(id, 'half')}
                  style={{ flex: 1, height: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, border: 'none', background: 'transparent', cursor: 'pointer', color: '#5e3b87', WebkitTapHighlightColor: 'transparent' }}
                  aria-label={`Show ${TILE_META[id].label}`}>
                  {TILE_META[id].icon}
                  <span style={{ fontSize: '0.6rem', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{TILE_META[id].label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modals shared with desktop */}
        <AnimatePresence>
          {selectedCall && (() => {
            const call = selectedCall
            const badge = outcomeBadge(call.call_outcome)
            const phone = call.callers?.phone_number || call.caller_phone
            return (
              <motion.div key="call-modal-m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                style={{ position: 'fixed', inset: 0, background: 'rgba(26,5,51,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1300 }}
                onClick={e => { if (e.target === e.currentTarget) setSelectedCall(null) }}>
                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', boxShadow: '0 24px 60px rgba(94,59,135,0.18)', overflow: 'hidden' }}>
                  <div style={{ padding: '1.5rem 1.75rem 1.25rem', borderBottom: '1px solid rgba(94,59,135,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                      <div>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.125rem', color: '#1a1a1a', marginBottom: 6 }}>{callerLabel(call)}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, background: badge.bg, color: badge.color, fontFamily: "'DM Sans', sans-serif" }}>{badge.label}</span>
                          <span style={{ fontSize: '0.8rem', color: '#aaaaaa', fontFamily: "'DM Sans', sans-serif" }}>{formatDateLabel(call.created_at)} · {formatTime(call.created_at)}{call.duration_seconds ? ` · ${formatDuration(call.duration_seconds)}` : ''}</span>
                        </div>
                      </div>
                      <button onClick={() => setSelectedCall(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaaaaa', fontSize: '1.25rem', lineHeight: 1, padding: '0.15rem 0.25rem', flexShrink: 0 }}>×</button>
                    </div>
                  </div>
                  <div style={{ padding: '1.5rem 1.75rem' }}>
                    {call.ai_summary && <div style={{ marginBottom: '1.25rem' }}><div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: "'DM Sans', sans-serif" }}>AI Summary</div><div style={{ fontSize: '0.875rem', color: '#1a1a1a', lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif" }}>{call.ai_summary}</div></div>}
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      {phone && <a href={`tel:${phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', background: '#f0a500', color: '#1a0533', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>Call back</a>}
                      <button onClick={() => setSelectedCall(null)} style={{ marginLeft: 'auto', padding: '0.5rem 1rem', border: '1px solid rgba(94,59,135,0.12)', borderRadius: 8, background: 'white', color: '#aaaaaa', fontSize: '0.8125rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Close</button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )
          })()}
        </AnimatePresence>

        <AnimatePresence>
          {selectedLead && (() => {
            const lead = selectedLead
            const name = lead.lead_contact_name || lead.callers?.phone_number || 'Unknown'
            const phone = lead.callers?.phone_number
            const urgent = isUrgentLead(lead.created_at)
            const STATUS_LABELS = { new: 'New', contacted: 'Contacted', converted: 'Converted', lost: 'Lost' }
            const STATUS_COLORS = { new: { bg: '#e6f5ee', color: '#1e7a4a' }, contacted: { bg: '#eff6ff', color: '#1d4ed8' }, converted: { bg: '#f0ebf8', color: '#5e3b87' }, lost: { bg: '#f8fafc', color: '#64748b' } }
            const statusStyle = STATUS_COLORS[lead.status] || STATUS_COLORS.new
            return (
              <motion.div key="lead-modal-m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                style={{ position: 'fixed', inset: 0, background: 'rgba(26,5,51,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1300 }}
                onClick={e => { if (e.target === e.currentTarget) setSelectedLead(null) }}>
                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(94,59,135,0.18)', overflow: 'hidden' }}>
                  <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid rgba(94,59,135,0.08)', flexShrink: 0, minHeight: 64, boxSizing: 'border-box', display: 'flex', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', width: '100%' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.125rem', color: '#1a1a1a', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-block', padding: '0.18rem 0.55rem', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, background: statusStyle.bg, color: statusStyle.color, fontFamily: "'DM Sans', sans-serif" }}>{STATUS_LABELS[lead.status] || 'New'}</span>
                          {urgent && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.18rem 0.55rem', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, background: '#fef3d9', color: '#b07a00', fontFamily: "'DM Sans', sans-serif" }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f0a500', display: 'inline-block', animation: 'urgentPulse 1.6s ease-in-out infinite' }} />New — act fast</span>}
                          <span style={{ fontSize: '0.78rem', color: '#aaaaaa', fontFamily: "'DM Sans', sans-serif" }}>{timeSince(lead.created_at)}</span>
                        </div>
                      </div>
                      <button onClick={() => setSelectedLead(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaaaaa', fontSize: '1.5rem', lineHeight: 1, padding: '0 0.2rem', flexShrink: 0 }}>×</button>
                    </div>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {lead.ai_summary && <div><div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: "'DM Sans', sans-serif" }}>AI Summary</div><div style={{ fontSize: '0.875rem', color: '#1a1a1a', lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", background: '#f0ebf8', borderRadius: 10, padding: '0.75rem 0.9rem' }}>{lead.ai_summary}</div></div>}
                    {phone && <div><div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem', fontFamily: "'DM Sans', sans-serif" }}>Phone</div><a href={`tel:${phone}`} style={{ fontSize: '0.875rem', color: '#5e3b87', fontWeight: 500, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>{phone}</a></div>}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.5rem' }}>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'DM Sans', sans-serif" }}>Notes</div>
                        {notesSaved && <span style={{ fontSize: '0.65rem', color: '#3db87a', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>Saved</span>}
                      </div>
                      <textarea value={leadNotes} onChange={e => setLeadNotes(e.target.value)} onBlur={e => saveLeadNotes(e.target.value)} placeholder="Add notes — auto-saves" rows={3}
                        style={{ width: '100%', padding: '0.65rem', border: '1px solid rgba(94,59,135,0.15)', borderRadius: 10, fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', lineHeight: 1.6, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid rgba(94,59,135,0.08)', flexShrink: 0, display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {(!lead.status || lead.status === 'new') && <button onClick={() => markContacted(lead)} style={{ padding: '0.5rem 1rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>Mark as Contacted</button>}
                    {phone && <a href={`tel:${phone}`} style={{ display: 'inline-flex', alignItems: 'center', padding: '0.5rem 1rem', border: '1px solid rgba(94,59,135,0.22)', borderRadius: 8, background: 'white', color: '#5e3b87', fontSize: '0.8125rem', fontWeight: 500, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>Call back</a>}
                    <button onClick={() => setSelectedLead(null)} style={{ marginLeft: 'auto', padding: '0.5rem 1rem', border: '1px solid rgba(94,59,135,0.12)', borderRadius: 8, background: 'white', color: '#aaaaaa', fontSize: '0.8125rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Dismiss</button>
                  </div>
                </motion.div>
              </motion.div>
            )
          })()}
        </AnimatePresence>

      </div>
    )
  }

  // ── Desktop render ────────────────────────────────────────────────────────────

  return (
    <div>

      {/* ── HUB STRIP — product status ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>

        {/* Answer */}
        <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.08)', borderLeft: '3px solid #f0a500', padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 2px 8px rgba(240,165,0,0.06)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'DM Sans', sans-serif", marginBottom: 3 }}>Answer</div>
            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>
              {callsToday > 0 ? `${callsToday} call${callsToday !== 1 ? 's' : ''} today` : 'No calls today'}
            </div>
            {actionableLeads.length > 0 ? (
              <div style={{ fontSize: '0.72rem', color: '#c0392b', fontFamily: "'DM Sans', sans-serif", marginTop: 2, fontWeight: 500 }}>
                {actionableLeads.length} lead{actionableLeads.length !== 1 ? 's' : ''} need follow-up
              </div>
            ) : callsThisMonth > 0 ? (
              <div style={{ fontSize: '0.72rem', color: '#3db87a', fontFamily: "'DM Sans', sans-serif", marginTop: 2, fontWeight: 500 }}>All leads handled</div>
            ) : null}
          </div>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: holidayMode ? '#f0a500' : '#3db87a', flexShrink: 0 }} title={holidayMode ? 'Holiday mode on' : 'Active'} />
        </div>

        {/* Calendar */}
        <div onClick={() => onNavigate?.('calendar')} style={{ background: 'white', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.08)', borderLeft: `3px solid ${calendarTier !== 'none' ? '#1d4ed8' : '#e0d8ed'}`, padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 2px 8px rgba(29,78,216,0.04)', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(29,78,216,0.16)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(29,78,216,0.04)'}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'DM Sans', sans-serif", marginBottom: 3 }}>Calendar</div>
            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>View appointments →</div>
            {provisionalCount > 0 ? (
              <div style={{ fontSize: '0.72rem', color: '#f0a500', fontFamily: "'DM Sans', sans-serif", marginTop: 2, fontWeight: 500 }}>
                {provisionalCount} provisional need{provisionalCount === 1 ? 's' : ''} confirmation
              </div>
            ) : (
              <div style={{ fontSize: '0.72rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>Bookings, schedules, rules</div>
            )}
          </div>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: provisionalCount > 0 ? '#f0a500' : '#3db87a', flexShrink: 0 }} />
        </div>

        {/* Listen */}
        <div onClick={() => listenTier !== 'none' ? onNavigate?.('listen') : null}
          style={{ background: listenTier !== 'none' ? 'white' : '#faf9fc', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.08)', borderLeft: `3px solid ${listenTier !== 'none' ? '#3db87a' : '#e0d8ed'}`, padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 2px 8px rgba(61,184,122,0.04)', cursor: listenTier !== 'none' ? 'pointer' : 'default', transition: 'box-shadow 0.15s' }}
          onMouseEnter={e => listenTier !== 'none' && (e.currentTarget.style.boxShadow = '0 4px 16px rgba(61,184,122,0.16)')}
          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(61,184,122,0.04)'}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'DM Sans', sans-serif", marginBottom: 3 }}>Listen</div>
            {listenTier !== 'none' ? (
              <>
                <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>View transcripts →</div>
                <div style={{ fontSize: '0.72rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>Full call transcripts</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#bbb', fontFamily: "'DM Sans', sans-serif" }}>Not enabled</div>
                <div style={{ fontSize: '0.72rem', color: '#ddd', fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>Upgrade to add Listen</div>
              </>
            )}
          </div>
          {listenTier !== 'none' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3db87a', flexShrink: 0 }} />}
        </div>

      </div>

      {/* ── ZONE 1 — ENGINE AND CONTROL ───────────────────────────────────── */}
      {(() => {
        const aiStatus = minutesPct >= 100
          ? { label: 'Paused', color: '#b91c1c', bg: '#fdecea', dot: '#ef4444' }
          : minutesPct >= 80
          ? { label: 'Near limit', color: '#b07a00', bg: '#fef3d9', dot: '#f0a500' }
          : { label: 'Active', color: '#1e7a4a', bg: '#e6f5ee', dot: '#3db87a' }

        const voiceLabel = tier === 'free' ? 'Standard voice' : voicePref === 'standard' ? 'Standard voice' : 'Premium voice'
        const voiceColor = (tier === 'free' || voicePref === 'standard') ? { color: '#64748b', bg: '#f8fafc' } : { color: '#5e3b87', bg: '#f0ebf8' }

        const triageLabels = { strict: 'Strict', balanced: 'Balanced', open: 'Open' }
        const triageColors = {
          strict:   { color: '#6b2049', bg: '#f7cee3' },
          balanced: { color: '#1e3a8a', bg: '#bfdbfe' },
          open:     { color: '#166534', bg: '#bbf7d0' },
        }
        const triage = { label: triageLabels[triageMode] || 'Balanced', ...((triageColors[triageMode]) || triageColors.balanced) }

        const vDiv = <div style={{ width: 1, alignSelf: 'stretch', margin: '1rem 0', background: '#e0d8ed', flexShrink: 0 }} />

        return (
          <div
            data-help="Your AI status panel — live status, voice tier, minutes used, triage mode, and quick access to AI configuration."
            style={{ display: 'flex', alignItems: 'center', background: 'white', borderRadius: 16, border: '0.5px solid rgba(94,59,135,0.08)', boxShadow: '0 2px 12px rgba(94,59,135,0.06)', overflowX: isMobile ? 'auto' : 'hidden', overflowY: 'hidden' }}
          >
            {/* North star */}
            <div style={{ padding: '1.25rem 1.75rem', flexShrink: 0 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 48, color: callsToday === 0 ? '#d1d5db' : '#3db87a', lineHeight: 1 }}><CountUp to={callsToday} /></div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6, fontFamily: "'DM Sans', sans-serif" }}>calls today</div>
              {callsThisMonth > 0 && (
                <div style={{ fontSize: '0.72rem', color: '#3db87a', fontFamily: "'DM Sans', sans-serif", marginTop: 6, fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {callsThisMonth} handled this month while you were on a job
                </div>
              )}
            </div>

            {vDiv}

            {/* AI status + voice tier */}
            <div style={{ padding: '1.1rem 1.5rem', flexShrink: 0 }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>AI Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: aiStatus.dot, flexShrink: 0 }} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.875rem', color: aiStatus.color }}>{aiStatus.label}</span>
              </div>
              <span style={{ display: 'inline-block', padding: '0.15rem 0.55rem', borderRadius: 4, fontSize: '0.6875rem', fontWeight: 600, background: voiceColor.bg, color: voiceColor.color, fontFamily: "'DM Sans', sans-serif" }}>
                {voiceLabel}
              </span>
            </div>

            {vDiv}

            {/* Arc gauge */}
            <div style={{ padding: '1.1rem 1.5rem', flexShrink: 0 }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>Minutes</div>
              <ArcGauge pct={minutesPct} />
              <div style={{ fontSize: '0.72rem', color: '#aaaaaa', marginTop: 4, fontFamily: "'DM Sans', sans-serif", textAlign: 'center' }}>{minutesUsed} / {includedMinutes}</div>
            </div>

            {vDiv}

            {/* Triage mode */}
            <div style={{ padding: '1.1rem 1.5rem', flexShrink: 0 }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>Call filter</div>
              <span style={{ display: 'inline-block', padding: '0.25rem 0.7rem', borderRadius: 6, fontSize: '0.8125rem', fontWeight: 600, background: triage.bg, color: triage.color, fontFamily: "'DM Sans', sans-serif" }}>
                {triage.label}
              </span>
            </div>

            {vDiv}

            {/* This month */}
            <div style={{ padding: '1.1rem 1.5rem', flexShrink: 0 }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>This month</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: callsThisMonth === 0 ? '#d1d5db' : '#5e3b87', lineHeight: 1 }}>{callsThisMonth}</div>
              <div style={{ fontSize: '0.72rem', color: '#aaaaaa', marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>total calls</div>
            </div>

            <div style={{ flex: 1 }} />
          </div>
        )
      })()}

      {/* ── DIVIDER: Today's Activity ──────────────────────────────────────── */}
      <div style={{ margin: '1.75rem 0 1.25rem' }}>
        <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: "'DM Sans', sans-serif" }}>Today's Activity</span>
        <div style={{ height: 1, background: '#e0d8ed' }} />
      </div>

      {/* ── ZONE 2 — LIVE FEED ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '1rem' }}>

        {/* COL 1 — Recent calls */}
        <div>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', fontFamily: "'DM Sans', sans-serif" }}
            data-help="Recent calls is a log of the last 5 conversations your AI handled. The coloured border shows the outcome.">
            Recent calls
          </div>
          {recentCalls.length === 0 ? (
            <div style={s.section}>
              <EmptyState icon="📞" title="No calls yet" body="Your AI number hasn't received any calls this month." />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {recentCalls.map((call, i) => (
                <motion.div key={call.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: i * 0.04 }}
                >
                  <CallCard call={call} onClick={() => setSelectedCall(call)} />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* COL 2 — Leads requiring action */}
        <div>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 8 }}
            data-help="Leads requiring action are people who called in and need a follow-up. The quicker you respond, the higher the conversion rate.">
            Leads requiring action
            {actionableLeads.length > 0 && (
              <span style={{ background: '#d1f5e4', color: '#1e7a4a', borderRadius: '10px', padding: '0.05rem 0.5rem', fontSize: '0.65rem', fontWeight: 700 }}>
                {actionableLeads.length}
              </span>
            )}
            <span style={{ marginLeft: 'auto', display: 'flex', gap: '0.35rem' }}>
              <button
                onClick={() => setPipelineView(v => !v)}
                title={pipelineView ? 'Card view' : 'Pipeline view'}
                style={{ padding: '0.15rem 0.5rem', borderRadius: 5, border: `1px solid ${pipelineView ? '#5e3b87' : 'rgba(94,59,135,0.2)'}`, background: pipelineView ? '#f0ebf8' : 'white', color: pipelineView ? '#5e3b87' : '#aaa', fontSize: '0.6rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textTransform: 'none', letterSpacing: 0 }}>
                {pipelineView ? '⊞ Cards' : '▦ Pipeline'}
              </button>
              <button
                onClick={() => setQuickCaptureOpen(true)}
                title="Log a call you took manually"
                style={{ padding: '0.15rem 0.5rem', borderRadius: 5, border: '1px solid rgba(94,59,135,0.2)', background: 'white', color: '#5e3b87', fontSize: '0.6rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textTransform: 'none', letterSpacing: 0 }}>
                + Log call
              </button>
            </span>
          </div>

          {pipelineView ? (
            (() => {
              const pipelineCols = [
                { key: 'new',       label: 'New',       color: '#3db87a', bg: '#e6f9ef' },
                { key: 'contacted', label: 'Contacted', color: '#1d4ed8', bg: '#eff6ff' },
                { key: 'converted', label: 'Won',       color: '#5e3b87', bg: '#f0ebf8' },
                { key: 'lost',      label: 'Lost',      color: '#64748b', bg: '#f1f5f9' },
              ]
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.4rem' }}>
                  {pipelineCols.map(col => {
                    const colLeads = leads.filter(l => col.key === 'new' ? (!l.status || l.status === 'new') : l.status === col.key)
                    return (
                      <div key={col.key} style={{ background: col.bg, borderRadius: 12, padding: '0.6rem 0.5rem', border: `1px solid ${col.color}22` }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: col.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>
                          {col.label}
                        </div>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: col.color, lineHeight: 1, marginBottom: 8 }}>
                          {colLeads.length}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {colLeads.slice(0, 3).map(l => (
                            <button key={l.id}
                              onClick={() => setSelectedLead(l)}
                              style={{ background: 'white', border: 'none', borderRadius: 6, padding: '0.3rem 0.4rem', cursor: 'pointer', textAlign: 'left', fontSize: '0.68rem', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                              {l.lead_contact_name || l.callers?.phone_number || '?'}
                            </button>
                          ))}
                          {colLeads.length > 3 && (
                            <span style={{ fontSize: '0.6rem', color: col.color, fontFamily: "'DM Sans', sans-serif", paddingLeft: 2 }}>
                              +{colLeads.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()
          ) : actionableLeads.length === 0 ? (
            <div style={s.section}>
              <EmptyState icon="🙌" title="All caught up" body="No leads waiting for follow-up. New leads appear as soon as your AI captures them." />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {actionableLeads.slice(0, 5).map((lead, i) => (
                <motion.div key={lead.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: i * 0.04 }}
                >
                  <LeadCard
                    lead={lead}
                    onClick={() => setSelectedLead(lead)}
                    onWon={() => updateLeadStatus(lead, 'converted')}
                    onLost={() => updateLeadStatus(lead, 'lost')}
                  />
                </motion.div>
              ))}
              {actionableLeads.length > 5 && (
                <div style={{ fontSize: '0.75rem', color: '#bbb', paddingLeft: '0.25rem' }}>
                  +{actionableLeads.length - 5} more
                </div>
              )}
            </div>
          )}
        </div>

        {/* COL 3 — Referrals today */}
        <div>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 8 }}
            data-help="Referrals sent today shows every caller your AI forwarded to a partner in your network today.">
            Referrals today
            {referralsThisWeek > 0 && (
              <span style={{ background: '#fef3d0', color: '#92610a', borderRadius: '10px', padding: '0.05rem 0.5rem', fontSize: '0.65rem', fontWeight: 700 }}>
                {referralsThisWeek} this wk
              </span>
            )}
          </div>
          {referralsToday.length === 0 ? (
            <div style={{ ...s.section, textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🤝</div>
              <div style={{ fontSize: '0.8rem', color: '#bbb', fontFamily: "'DM Sans', sans-serif" }}>No referrals sent today yet</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {referralsToday.map((ref, i) => {
                const partnerName = ref.referral_partners?.partner_name || ref.referral_partners?.business_name || 'Partner'
                return (
                  <motion.div key={ref.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: i * 0.04 }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.55rem 0.75rem',
                      background: '#fde68a', borderRadius: 10,
                      borderLeft: '3px solid #f0a500',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f0a500', display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.8125rem', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', fontWeight: 500 }}>{partnerName}</span>
                    </div>
                    <span style={{ fontSize: '0.73rem', color: '#b07a00', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{formatTime(ref.created_at)}</span>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {/* ── DIVIDER: Patterns ─────────────────────────────────────────────── */}
      <div style={{ margin: '1.75rem 0 1.25rem' }}>
        <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: "'DM Sans', sans-serif" }}>Patterns</span>
        <div style={{ height: 1, background: '#e0d8ed' }} />
      </div>

      {/* ── ZONE 3 — HISTORICAL SNAPSHOT ──────────────────────────────────── */}
      {(() => {
        const week7 = getDayBuckets(7, calls)
        const days30 = getDayBuckets(30, calls)

        const capturedCount = calls.filter(c => c.call_outcome === 'lead_captured' || c.call_outcome === 'booked').length
        const captureRate = callsThisMonth > 0 ? Math.round((capturedCount / callsThisMonth) * 100) : 0

        const weekCounts = week7.map(d => d.count)
        const weekLabels = week7.map(d => d.label)
        const monthMinutes = days30.map(d => d.minutes)
        const monthLabels = days30.map(d => d.label)

        const donutOptions = {
          chart: { type: 'donut', toolbar: { show: false }, animations: { enabled: true } },
          colors: ['#5e3b87', '#f0ebf8'],
          labels: ['Captured', 'Other'],
          legend: { show: false },
          dataLabels: { enabled: false },
          stroke: { width: 0 },
          plotOptions: { pie: { donut: { size: '72%', labels: { show: false } } } },
          tooltip: { enabled: false },
        }
        const donutSeries = callsThisMonth > 0 ? [capturedCount, Math.max(0, callsThisMonth - capturedCount)] : [0, 1]

        const busiestIdx = weekCounts.indexOf(Math.max(...weekCounts))
        const busiestLabel = weekCounts[busiestIdx] > 0 ? weekLabels[busiestIdx] : null

        const sparkBarOptions = {
          chart: { type: 'bar', sparkline: { enabled: true }, animations: { enabled: true } },
          colors: [({ dataPointIndex }) => dataPointIndex === week7.length - 1 ? '#5e3b87' : '#e0d8ed'],
          plotOptions: { bar: { borderRadius: 3, columnWidth: '60%' } },
          tooltip: { enabled: true, x: { show: true }, y: { formatter: v => `${v} call${v !== 1 ? 's' : ''}` } },
          xaxis: { categories: weekLabels },
        }
        const sparkBarSeries = [{ name: 'Calls', data: weekCounts }]

        const lineOptions = {
          chart: { type: 'area', sparkline: { enabled: true }, animations: { enabled: true } },
          colors: ['#5e3b87'],
          stroke: { curve: 'smooth', width: 2 },
          fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 100] } },
          tooltip: { enabled: true, x: { show: true }, y: { formatter: v => `${v} min` } },
          xaxis: { categories: monthLabels },
        }
        const lineSeries = [{ name: 'Minutes', data: monthMinutes }]

        return (
          <div>

            {/* 3-chart grid */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>

              {/* Calls turned into leads — donut */}
              <div style={{ ...s.section, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                <div style={{ ...s.sectionTitle, alignSelf: 'flex-start', marginBottom: '0.5rem' }}>Calls turned into leads</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '2rem', color: '#3db87a', lineHeight: 1, marginBottom: 4 }}>
                  <CountUp to={capturedCount} /> <span style={{ fontSize: '1.1rem', color: '#aaaaaa', fontWeight: 400 }}>of <CountUp to={callsThisMonth} /></span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#aaaaaa', fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}>calls this month</div>
                <ReactApexChart options={donutOptions} series={donutSeries} type="donut" height={110} width="100%" />
              </div>

              {/* 7-day call volume — spark bar */}
              <div style={{ ...s.section, display: 'flex', flexDirection: 'column' }}>
                <div style={{ ...s.sectionTitle, marginBottom: '0.5rem' }}>7-day volume</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '2rem', color: '#f0a500', lineHeight: 1, marginBottom: 4 }}>
                  <CountUp to={weekCounts.reduce((a, b) => a + b, 0)} />
                </div>
                <div style={{ fontSize: '0.72rem', color: '#aaaaaa', fontFamily: "'DM Sans', sans-serif" }}>calls this week</div>
                {busiestLabel && (
                  <div style={{ fontSize: '0.72rem', color: '#5e3b87', fontFamily: "'DM Sans', sans-serif", marginTop: 2, fontWeight: 500 }}>
                    Busiest: {busiestLabel}
                  </div>
                )}
                <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                  <ReactApexChart options={sparkBarOptions} series={sparkBarSeries} type="bar" height={70} />
                </div>
              </div>

              {/* 30-day minutes — line chart */}
              {(() => {
                const dayOfMonth = new Date().getDate()
                const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
                const projectedMinutes = dayOfMonth > 0 ? Math.round((minutesUsed / dayOfMonth) * daysInMonth) : 0
                const projColor = projectedMinutes > includedMinutes ? '#ef4444' : projectedMinutes > includedMinutes * 0.8 ? '#f0a500' : '#3db87a'
                return (
                  <div style={{ ...s.section, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ ...s.sectionTitle, marginBottom: '0.5rem' }}>30-day minutes</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '2rem', color: '#5e3b87', lineHeight: 1, marginBottom: 4 }}>
                      <CountUp to={minutesUsed} />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#aaaaaa', fontFamily: "'DM Sans', sans-serif" }}>minutes used</div>
                    {projectedMinutes > 0 && (
                      <div style={{ fontSize: '0.72rem', fontFamily: "'DM Sans', sans-serif", marginTop: 2, fontWeight: 500, color: projColor }}>
                        ~{projectedMinutes} projected this month
                      </div>
                    )}
                    <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                      <ReactApexChart options={lineOptions} series={lineSeries} type="area" height={70} />
                    </div>
                  </div>
                )
              })()}

            </div>

            {/* Proactive alerts */}
            <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {alerts.map((alert, i) => (
                <div key={i} style={{ background: alert.bg, borderRadius: 14, borderLeft: `4px solid ${alert.borderColor}`, padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{alert.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1a1a1a', marginBottom: '0.15rem', fontFamily: "'DM Sans', sans-serif" }}>{alert.title}</div>
                    <div style={{ fontSize: '0.78rem', color: '#666', lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>{alert.body}</div>
                  </div>
                  {alert.actionLabel && (
                    <button onClick={alert.onAction}
                      style={{ flexShrink: 0, padding: '0.4rem 0.85rem', background: alert.borderColor, color: alert.type === 'warning' || alert.type === 'info' ? '#1a0533' : 'white', border: 'none', borderRadius: 7, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                      {alert.actionLabel}
                    </button>
                  )}
                </div>
              ))}
            </div>

          </div>
        )
      })()}

      {/* ── FEATURE DISCOVERY NOTICE ─────────────────────────────────────────── */}
      {(() => {
        if (isDemo || isPreview || loading || calls.length === 0 || featureNoticeClosed) return null
        try {
          const stored = localStorage.getItem('qx_features_notice')
          if (stored) {
            const { dismissed, snoozedUntil } = JSON.parse(stored)
            if (dismissed) return null
            if (snoozedUntil && new Date(snoozedUntil) > new Date()) return null
          }
        } catch { /* ignore */ }

        const features = [
          partnerCount === 0   && { id: 'partners',  icon: '🤝', label: 'Referral partner network',   desc: 'Your AI can refer out-of-scope callers to trusted partners — and when they reciprocate, their AI sends callers back to you.',     tab: 'referrals' },
          staffCount === 0     && { id: 'team',       icon: '👥', label: 'Team & staff routing',       desc: 'Add your team so the AI routes calls to the right person and displays each specialist\'s skills.',                             tab: 'team'      },
          catalogueCount === 0 && { id: 'catalogue',  icon: '📋', label: 'Services catalogue',         desc: 'List your services and prices so the AI quotes accurately, upsells intelligently, and qualifies enquiries faster.',            tab: 'profile'   },
          listenTier === 'none' && { id: 'listen',    icon: '🎙️', label: 'Call transcripts',           desc: 'Review every conversation word-for-word — find missed opportunities, quality-check your AI, spot patterns.',                  tab: 'listen'    },
          calendarTier === 'entry' && { id: 'calendar', icon: '📅', label: 'Smart calendar booking',  desc: 'Let the AI book appointments directly into your diary and send automated reminders to callers.',                               tab: 'calendar'  },
        ].filter(Boolean)

        if (features.length < 2) return null

        return (
          <div style={{ background: 'white', borderRadius: 16, border: '0.5px solid rgba(94,59,135,0.08)', boxShadow: '0 2px 12px rgba(94,59,135,0.06)', marginBottom: '1.5rem', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #f0ebf8, #fef3d9)', padding: '1rem 1.25rem 0.85rem', borderBottom: '1px solid rgba(94,59,135,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#3a2057', marginBottom: '0.15rem' }}>
                    💡 Features you haven't explored yet
                  </div>
                  <div style={{ fontSize: '0.775rem', color: '#888', fontFamily: "'DM Sans', sans-serif" }}>
                    Qerxel has {features.length} active feature{features.length !== 1 ? 's' : ''} you're not using — each one adds value from day one.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {features.slice(0, 4).map((f, i) => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1.25rem', borderBottom: i < Math.min(features.length, 4) - 1 ? '1px solid rgba(94,59,135,0.04)' : 'none' }}>
                  <span style={{ fontSize: '1.25rem', flexShrink: 0, width: 28, textAlign: 'center' }}>{f.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8375rem', color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.15rem' }}>{f.label}</div>
                    <div style={{ fontSize: '0.775rem', color: '#888', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.45 }}>{f.desc}</div>
                  </div>
                  <button
                    onClick={() => onNavigate && onNavigate(f.tab)}
                    style={{ flexShrink: 0, padding: '0.38rem 0.85rem', background: '#f0ebf8', color: '#5e3b87', border: 'none', borderRadius: 8, fontSize: '0.775rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                    Show me →
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.75rem 1.25rem', borderTop: '1px solid rgba(94,59,135,0.05)', background: '#faf9fc' }}>
              <button
                onClick={() => {
                  const until = new Date(); until.setDate(until.getDate() + 7)
                  localStorage.setItem('qx_features_notice', JSON.stringify({ snoozedUntil: until.toISOString() }))
                  setFeatureNoticeClosed(true)
                }}
                style={{ padding: '0.35rem 0.85rem', background: 'none', border: '1px solid rgba(94,59,135,0.15)', borderRadius: 7, color: '#aaa', fontSize: '0.775rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Remind me next week
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('qx_features_notice', JSON.stringify({ dismissed: true }))
                  setFeatureNoticeClosed(true)
                }}
                style={{ padding: '0.35rem 0.85rem', background: '#f0ebf8', border: 'none', borderRadius: 7, color: '#5e3b87', fontSize: '0.775rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Got it, all noted
              </button>
            </div>
          </div>
        )
      })()}

      {/* Pulse keyframe */}
      <style>{pulseStyle}</style>

      {/* ── QUICK CAPTURE MODAL ───────────────────────────────────────────────── */}
      <AnimatePresence>
      {quickCaptureOpen && (
        <motion.div
          key="qc-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,5,51,0.5)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 1200, padding: isMobile ? 0 : '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setQuickCaptureOpen(false) }}
        >
          <motion.div
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: 'white', borderRadius: isMobile ? '20px 20px 0 0' : 20, width: '100%', maxWidth: 440, boxShadow: '0 24px 60px rgba(94,59,135,0.18)', overflow: 'hidden' }}
          >
            <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid rgba(94,59,135,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1a1a1a' }}>Log a call manually</div>
                <div style={{ fontSize: '0.75rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>Record a call you answered yourself</div>
              </div>
              <button onClick={() => setQuickCaptureOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '1.25rem', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '1.25rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, fontFamily: "'DM Sans', sans-serif" }}>Contact name</label>
                <input
                  value={qcName}
                  onChange={e => setQcName(e.target.value)}
                  placeholder="e.g. John Smith"
                  style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: 8, fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, fontFamily: "'DM Sans', sans-serif" }}>Phone number (optional)</label>
                <input
                  value={qcPhone}
                  onChange={e => setQcPhone(e.target.value)}
                  placeholder="e.g. 07700 900000"
                  style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: 8, fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, fontFamily: "'DM Sans', sans-serif" }}>Outcome</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[
                    { val: 'lead_captured', label: 'Lead' },
                    { val: 'booked',        label: 'Booked' },
                    { val: 'other',         label: 'Other' },
                  ].map(opt => (
                    <button key={opt.val} onClick={() => setQcOutcome(opt.val)}
                      style={{ flex: 1, padding: '0.45rem 0', borderRadius: 7, border: `1.5px solid ${qcOutcome === opt.val ? '#5e3b87' : 'rgba(94,59,135,0.18)'}`, background: qcOutcome === opt.val ? '#f0ebf8' : 'white', color: qcOutcome === opt.val ? '#5e3b87' : '#666', fontSize: '0.8rem', fontWeight: qcOutcome === opt.val ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, fontFamily: "'DM Sans', sans-serif" }}>Notes (optional)</label>
                <textarea
                  value={qcNotes}
                  onChange={e => setQcNotes(e.target.value)}
                  placeholder="What did they need? What was agreed?"
                  rows={3}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: 8, fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', lineHeight: 1.55, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid rgba(94,59,135,0.08)', display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setQuickCaptureOpen(false)}
                style={{ padding: '0.5rem 1rem', border: '1px solid rgba(94,59,135,0.15)', borderRadius: 8, background: 'white', color: '#aaa', fontSize: '0.8125rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Cancel
              </button>
              <button
                onClick={submitQuickCapture}
                disabled={qcSaving || (!qcName.trim() && !qcPhone.trim())}
                style={{ padding: '0.5rem 1.25rem', background: qcSaving || (!qcName.trim() && !qcPhone.trim()) ? '#f5d98a' : '#f0a500', color: '#1a0533', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: qcSaving ? 'wait' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                {qcSaving ? 'Saving…' : 'Log call'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ── CALL DETAIL MODAL ─────────────────────────────────────────────── */}
      <AnimatePresence>
      {selectedCall && (() => {
        const call = selectedCall
        const badge = outcomeBadge(call.call_outcome)
        const phone = call.callers?.phone_number || call.caller_phone
        return (
          <motion.div
            key="call-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(26,5,51,0.5)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 1200, padding: isMobile ? 0 : '1rem' }}
            onClick={e => { if (e.target === e.currentTarget) setSelectedCall(null) }}
          >
            <motion.div
              initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }}
              animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
              exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{ background: 'white', borderRadius: isMobile ? '20px 20px 0 0' : 20, width: '100%', maxWidth: isMobile ? '100%' : 520, boxShadow: '0 24px 60px rgba(94,59,135,0.18)', overflow: 'hidden' }}
            >
              {/* Header */}
              <div style={{ padding: '1.5rem 1.75rem 1.25rem', borderBottom: '1px solid rgba(94,59,135,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                  <div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.125rem', color: '#1a1a1a', marginBottom: 6 }}>{callerLabel(call)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, background: badge.bg, color: badge.color, fontFamily: "'DM Sans', sans-serif" }}>{badge.label}</span>
                      <span style={{ fontSize: '0.8rem', color: '#aaaaaa', fontFamily: "'DM Sans', sans-serif" }}>
                        {formatDateLabel(call.created_at)} · {formatTime(call.created_at)}
                        {call.duration_seconds ? ` · ${formatDuration(call.duration_seconds)}` : ''}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedCall(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaaaaa', fontSize: '1.25rem', lineHeight: 1, padding: '0.15rem 0.25rem', flexShrink: 0 }}>×</button>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '1.5rem 1.75rem' }}>
                {call.ai_summary && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: "'DM Sans', sans-serif" }}>AI Summary</div>
                    <div style={{ fontSize: '0.875rem', color: '#1a1a1a', lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif" }}>{call.ai_summary}</div>
                  </div>
                )}

                {/* Action row */}
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', background: '#f0a500', color: '#1a0533', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Call back
                    </a>
                  )}
                  <button
                    onClick={() => { setSelectedCall(null); onNavigate && onNavigate('calendar') }}
                    style={{ padding: '0.5rem 1rem', border: '1px solid rgba(94,59,135,0.22)', borderRadius: 8, background: 'white', color: '#5e3b87', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Book appointment
                  </button>
                  <button
                    onClick={() => setSelectedCall(null)}
                    style={{ marginLeft: 'auto', padding: '0.5rem 1rem', border: '1px solid rgba(94,59,135,0.12)', borderRadius: 8, background: 'white', color: '#aaaaaa', fontSize: '0.8125rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )
      })()}
      </AnimatePresence>

      {/* ── LEAD DETAIL MODAL ─────────────────────────────────────────────── */}
      <AnimatePresence>
      {selectedLead && (() => {
        const lead = selectedLead
        const name = lead.lead_contact_name || lead.callers?.phone_number || 'Unknown'
        const phone = lead.callers?.phone_number
        const urgent = isUrgentLead(lead.created_at)

        const STATUS_LABELS = { new: 'New', contacted: 'Contacted', converted: 'Converted', lost: 'Lost' }
        const STATUS_COLORS = {
          new:       { bg: '#e6f5ee', color: '#1e7a4a' },
          contacted: { bg: '#eff6ff', color: '#1d4ed8' },
          converted: { bg: '#f0ebf8', color: '#5e3b87' },
          lost:      { bg: '#f8fafc', color: '#64748b' },
        }
        const statusStyle = STATUS_COLORS[lead.status] || STATUS_COLORS.new

        return (
          <motion.div
            key="lead-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(26,5,51,0.5)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 1200, padding: isMobile ? 0 : '1.5rem' }}
            onClick={e => { if (e.target === e.currentTarget) setSelectedLead(null) }}
          >
            <motion.div
              initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }}
              animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
              exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{ background: 'white', borderRadius: isMobile ? '20px 20px 0 0' : 20, width: '100%', maxWidth: isMobile ? '100%' : 680, maxHeight: isMobile ? '92vh' : '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(94,59,135,0.18)', overflow: 'hidden' }}
            >

              {/* Sticky header */}
              <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid rgba(94,59,135,0.08)', flexShrink: 0, minHeight: 64, boxSizing: 'border-box', display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', width: '100%' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.125rem', color: '#1a1a1a', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-block', padding: '0.18rem 0.55rem', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, background: statusStyle.bg, color: statusStyle.color, fontFamily: "'DM Sans', sans-serif" }}>
                        {STATUS_LABELS[lead.status] || 'New'}
                      </span>
                      {urgent && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.18rem 0.55rem', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, background: '#fef3d9', color: '#b07a00', fontFamily: "'DM Sans', sans-serif" }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f0a500', display: 'inline-block', animation: 'urgentPulse 1.6s ease-in-out infinite' }} />
                          New — act fast
                        </span>
                      )}
                      <span style={{ fontSize: '0.78rem', color: '#aaaaaa', fontFamily: "'DM Sans', sans-serif" }}>
                        {timeSince(lead.created_at)}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedLead(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaaaaa', fontSize: '1.5rem', lineHeight: 1, padding: '0 0.2rem', flexShrink: 0 }}>×</button>
                </div>
              </div>

              {/* Scrollable body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Section 1 — Summary */}
                {lead.ai_summary && (
                  <div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem', fontFamily: "'DM Sans', sans-serif" }}>AI Summary</div>
                    <div style={{ fontSize: '0.875rem', color: '#1a1a1a', lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", background: '#f0ebf8', borderRadius: 10, padding: '0.85rem 1rem' }}>
                      {lead.ai_summary}
                    </div>
                  </div>
                )}

                {/* Section 2 — Details */}
                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem', fontFamily: "'DM Sans', sans-serif" }}>Details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem 1.5rem' }}>
                    {phone && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: '0.72rem', color: '#aaaaaa', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em' }}>Phone</span>
                        <a href={`tel:${phone}`} style={{ fontSize: '0.875rem', color: '#5e3b87', fontWeight: 500, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>{phone}</a>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: '0.72rem', color: '#aaaaaa', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em' }}>Captured</span>
                      <span style={{ fontSize: '0.875rem', color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{formatDateLabel(lead.created_at)} at {formatTime(lead.created_at)}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: '0.72rem', color: '#aaaaaa', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</span>
                      <span style={{ fontSize: '0.875rem', color: statusStyle.color, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{STATUS_LABELS[lead.status] || 'New'}</span>
                    </div>
                  </div>
                </div>

                {/* Section 3 — Notes */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.6rem' }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'DM Sans', sans-serif" }}>Notes</div>
                    {leadNotesSaving && <span style={{ fontSize: '0.65rem', color: '#aaaaaa', fontFamily: "'DM Sans', sans-serif" }}>Saving…</span>}
                    {notesSaved && !leadNotesSaving && <span style={{ fontSize: '0.65rem', color: '#3db87a', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>Saved</span>}
                  </div>
                  <textarea
                    value={leadNotes}
                    onChange={e => setLeadNotes(e.target.value)}
                    onBlur={e => saveLeadNotes(e.target.value)}
                    placeholder="Add notes about this lead — auto-saves when you click away"
                    rows={4}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid rgba(94,59,135,0.15)', borderRadius: 10, fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', lineHeight: 1.6, resize: 'vertical', outline: 'none', boxSizing: 'border-box', background: 'white' }}
                  />
                </div>

                {/* Section 4 — History */}
                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem', fontFamily: "'DM Sans', sans-serif" }}>History</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8125rem', fontFamily: "'DM Sans', sans-serif" }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e6f5ee', border: '2px solid #3db87a', flexShrink: 0 }} />
                      <span style={{ color: '#666' }}>Lead captured by AI</span>
                      <span style={{ color: '#aaaaaa', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{formatDateLabel(lead.created_at)} · {formatTime(lead.created_at)}</span>
                    </div>
                    {lead.status && lead.status !== 'new' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8125rem', fontFamily: "'DM Sans', sans-serif" }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusStyle.bg, border: `2px solid ${statusStyle.color}`, flexShrink: 0 }} />
                        <span style={{ color: '#666' }}>Status: {STATUS_LABELS[lead.status]}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 5 — Conversation transcript */}
                {(callTranscriptLoading || callTranscript) && (
                  <div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem', fontFamily: "'DM Sans', sans-serif" }}>Conversation</div>
                    {callTranscriptLoading ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#aaa', fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif" }}>
                        <Skel h={12} w={40} /> Loading transcript…
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8125rem', color: '#444', lineHeight: 1.75, whiteSpace: 'pre-wrap', background: '#f8f6fc', borderRadius: 10, padding: '0.85rem 1rem', maxHeight: 240, overflowY: 'auto', fontFamily: "'DM Sans', sans-serif", border: '0.5px solid rgba(94,59,135,0.08)' }}>
                        {callTranscript}
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Sticky footer */}
              <div style={{ borderTop: '1px solid rgba(94,59,135,0.08)', flexShrink: 0 }}>

                {/* Outcome picker — shown after "I have called" */}
                {calledOutcome === 'picking' && (
                  <div style={{ padding: '0.85rem 1.75rem', background: '#f4effe', borderBottom: '1px solid rgba(94,59,135,0.08)', display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>What happened?</span>
                    <button onClick={() => { updateLeadStatus(lead, 'converted'); setSelectedLead(null) }}
                      style={{ padding: '0.45rem 0.85rem', border: '1.5px solid #3db87a', borderRadius: 7, background: '#e6f9ef', color: '#1a6640', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                      Won ✓
                    </button>
                    <button onClick={() => setSelectedLead(null)}
                      style={{ padding: '0.45rem 0.85rem', border: '1.5px solid rgba(94,59,135,0.25)', borderRadius: 7, background: 'white', color: '#5e3b87', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                      No answer — still open
                    </button>
                    <button onClick={() => { updateLeadStatus(lead, 'lost'); setSelectedLead(null) }}
                      style={{ padding: '0.45rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: 7, background: '#f8fafc', color: '#64748b', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                      Not a fit
                    </button>
                  </div>
                )}

                {/* Main action row */}
                <div style={{ padding: '1rem 1.75rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* I have called — dials + asks outcome */}
                  {phone && (
                    <button
                      onClick={() => {
                        window.location.href = `tel:${phone}`
                        updateLeadStatus(lead, 'contacted')
                        setCalledOutcome('picking')
                      }}
                      style={{ padding: '0.5rem 1rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                      I have called
                    </button>
                  )}
                  {/* Mark as Contacted — for non-call contact (email, WhatsApp, etc.) */}
                  {(!lead.status || lead.status === 'new') && !phone && (
                    <button
                      onClick={() => markContacted(lead)}
                      style={{ padding: '0.5rem 1rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                      Mark as Contacted
                    </button>
                  )}
                  {/* Book appointment */}
                  <button
                    onClick={() => { setSelectedLead(null); onNavigate && onNavigate('calendar', { title: name, notes: phone ? `Lead · ${phone}` : 'Lead captured' }) }}
                    style={{ padding: '0.5rem 1rem', border: '1px solid rgba(94,59,135,0.22)', borderRadius: 8, background: 'white', color: '#5e3b87', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                    Book appointment
                  </button>
                  {/* Transcript */}
                  {lead.call_log_id && onNavigate && (
                    <button
                      onClick={() => { setSelectedLead(null); onNavigate('listen', { callId: lead.call_log_id }) }}
                      style={{ padding: '0.5rem 1rem', border: '1px solid rgba(61,184,122,0.35)', borderRadius: 8, background: '#f0fdf4', color: '#1e7a4a', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                      View transcript
                    </button>
                  )}
                  {/* Invoicing */}
                  {connectedIntegrations.has('freeagent') && <FreeAgentInvoiceButton leadId={lead.id} tenantId={tenantId} />}
                  {connectedIntegrations.has('xero') && <XeroInvoiceButton leadId={lead.id} tenantId={tenantId} />}
                  {connectedIntegrations.has('stripe') && <StripePaymentButton tenantId={tenantId} leadId={lead.id} leadName={name} />}
                  {connectedIntegrations.size === 0 && onNavigate && (
                    <button
                      onClick={() => { setSelectedLead(null); onNavigate('integrations') }}
                      style={{ padding: '0.45rem 0.85rem', border: '1px solid rgba(94,59,135,0.18)', borderRadius: 7, background: 'white', color: '#7c5ab8', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                      Connect invoicing →
                    </button>
                  )}
                  {/* Won / Lost */}
                  {(!lead.status || lead.status === 'new' || lead.status === 'contacted') && calledOutcome !== 'picking' && (
                    <button onClick={() => { updateLeadStatus(lead, 'converted'); setSelectedLead(null) }}
                      style={{ padding: '0.5rem 1rem', border: '1px solid #3db87a', borderRadius: 8, background: '#e6f9ef', color: '#1a6640', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                      Won ✓
                    </button>
                  )}
                  {lead.status !== 'lost' && calledOutcome !== 'picking' && (
                    <button onClick={() => { updateLeadStatus(lead, 'lost'); setSelectedLead(null) }}
                      style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: 8, background: '#f8fafc', color: '#64748b', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                      Lost
                    </button>
                  )}
                  <button onClick={() => setSelectedLead(null)}
                    style={{ marginLeft: 'auto', padding: '0.5rem 1rem', border: '1px solid rgba(94,59,135,0.12)', borderRadius: 8, background: 'white', color: '#aaaaaa', fontSize: '0.8125rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    Dismiss
                  </button>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )
      })()}
      </AnimatePresence>

    </div>
  )
}

export default ActivityDashboard

// ─── FreeAgent invoice button (shown on leads when integration is connected) ───
function FreeAgentInvoiceButton({ leadId, tenantId }) {
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [invoiceUrl, setInvoiceUrl] = useState(null)

  if (!leadId || !tenantId) return null

  const handleCreate = async () => {
    setStatus('loading')
    try {
      const res = await fetch('/api/freeagent-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, leadId }),
      })
      const data = await res.json()
      if (data.invoiceUrl) {
        setInvoiceUrl(data.invoiceUrl)
        setStatus('done')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done' && invoiceUrl) {
    return (
      <a href={invoiceUrl} target="_blank" rel="noopener noreferrer"
        style={{ padding: '0.25rem 0.65rem', border: '1px solid #3db87a', borderRadius: '5px', background: '#e6f9ef', color: '#1a6640', fontSize: '0.72rem', fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}>
        View invoice →
      </a>
    )
  }

  if (status === 'error') {
    return <span style={{ fontSize: '0.72rem', color: '#e05252' }}>Failed</span>
  }

  return (
    <button
      onClick={handleCreate}
      disabled={status === 'loading'}
      style={{ padding: '0.25rem 0.65rem', border: '1px solid rgba(94,59,135,0.25)', borderRadius: '5px', background: 'white', color: '#5e3b87', fontSize: '0.72rem', fontWeight: 500, cursor: status === 'loading' ? 'wait' : 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', opacity: status === 'loading' ? 0.6 : 1 }}
    >
      {status === 'loading' ? '…' : 'Invoice'}
    </button>
  )
}

// ─── Xero invoice button ──────────────────────────────────────────────────────
function XeroInvoiceButton({ leadId, tenantId }) {
  const [status, setStatus] = useState('idle')
  const [invoiceUrl, setInvoiceUrl] = useState(null)

  if (!leadId || !tenantId) return null

  const handleCreate = async () => {
    setStatus('loading')
    try {
      const res = await fetch('/api/xero-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, leadId }),
      })
      const data = await res.json()
      if (data.invoiceUrl) { setInvoiceUrl(data.invoiceUrl); setStatus('done') }
      else setStatus('error')
    } catch { setStatus('error') }
  }

  if (status === 'done' && invoiceUrl) {
    return (
      <a href={invoiceUrl} target="_blank" rel="noopener noreferrer"
        style={{ padding: '0.25rem 0.65rem', border: '1px solid #3db87a', borderRadius: '5px', background: '#e6f9ef', color: '#1a6640', fontSize: '0.72rem', fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}>
        Xero →
      </a>
    )
  }
  if (status === 'error') return <span style={{ fontSize: '0.72rem', color: '#e05252' }}>Xero failed</span>

  return (
    <button onClick={handleCreate} disabled={status === 'loading'}
      style={{ padding: '0.25rem 0.65rem', border: '1px solid rgba(94,59,135,0.25)', borderRadius: '5px', background: 'white', color: '#5e3b87', fontSize: '0.72rem', fontWeight: 500, cursor: status === 'loading' ? 'wait' : 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', opacity: status === 'loading' ? 0.6 : 1 }}>
      {status === 'loading' ? '…' : 'Xero'}
    </button>
  )
}

// ─── Stripe payment link button ───────────────────────────────────────────────
function StripePaymentButton({ tenantId, leadId, leadName }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState(leadName || '')
  const [status, setStatus] = useState('idle')
  const [payUrl, setPayUrl] = useState(null)

  if (!tenantId) return null

  const handleCreate = async () => {
    if (!amount || parseFloat(amount) <= 0) return
    setStatus('loading')
    try {
      const res = await fetch('/api/stripe-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, leadId, amountPounds: amount, description: desc }),
      })
      const data = await res.json()
      if (data.checkoutUrl) { setPayUrl(data.checkoutUrl); setStatus('done') }
      else setStatus('error')
    } catch { setStatus('error') }
  }

  if (status === 'done' && payUrl) {
    return (
      <a href={payUrl} target="_blank" rel="noopener noreferrer"
        style={{ padding: '0.25rem 0.65rem', border: '1px solid #3db87a', borderRadius: '5px', background: '#e6f9ef', color: '#1a6640', fontSize: '0.72rem', fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}>
        Payment link →
      </a>
    )
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{ padding: '0.25rem 0.65rem', border: '1px solid rgba(94,59,135,0.25)', borderRadius: '5px', background: 'white', color: '#5e3b87', fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
        £ Pay
      </button>
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,5,51,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: 360, boxSizing: 'border-box' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1a1a1a', marginBottom: '1rem' }}>Create payment link</div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#555', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount (£)</label>
            <input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 150.00" autoFocus
              style={{ width: '100%', padding: '0.5rem 0.65rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '6px', fontSize: '0.875rem', fontFamily: "'Syne', sans-serif", fontWeight: 700, boxSizing: 'border-box', outline: 'none', marginBottom: '0.75rem' }} />
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#555', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Services — call out fee"
              style={{ width: '100%', padding: '0.5rem 0.65rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '6px', fontSize: '0.85rem', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', outline: 'none', marginBottom: '1rem' }} />
            {status === 'error' && <p style={{ fontSize: '0.8rem', color: '#e05252', marginBottom: '0.75rem' }}>Failed — check Stripe is configured.</p>}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setOpen(false)} style={{ padding: '0.45rem 0.85rem', border: '1px solid rgba(94,59,135,0.25)', borderRadius: '6px', background: 'white', color: '#5e3b87', fontSize: '0.8rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
              <button onClick={handleCreate} disabled={status === 'loading' || !amount}
                style={{ padding: '0.45rem 1rem', border: 'none', borderRadius: '6px', background: (!amount || status === 'loading') ? '#f5d98a' : '#f0a500', color: '#1a0533', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                {status === 'loading' ? 'Creating…' : 'Create link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
