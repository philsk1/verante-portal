import { useState, useEffect, useRef } from 'react'
import ReactApexChart from 'react-apexcharts'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { useDemo } from '../context/DemoContext'
import { usePreview } from '../context/PreviewContext'

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
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: '1rem',
  },
  statCard: {
    background: 'white',
    borderRadius: '10px',
    padding: '1.25rem 1.25rem 1.1rem',
    border: '0.5px solid rgba(94,59,135,0.1)',
  },
  statLabel: {
    fontSize: '0.7rem',
    fontWeight: '500',
    color: '#aaa',
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
    padding: '0.2rem 0.55rem',
    borderRadius: '4px',
    fontSize: '0.725rem',
    fontWeight: '500',
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
  const totalLen = 106.8  // π × r (r = 34)
  const dashLen = (clamped / 100) * totalLen
  const color = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f0a500' : '#5e3b87'
  return (
    <div style={{ position: 'relative', width: 80, height: 50, flexShrink: 0 }}>
      <svg width="80" height="50" viewBox="0 0 80 50" style={{ display: 'block' }}>
        <path d="M 6 44 A 34 34 0 0 1 74 44" fill="none" stroke="#f0ebf8" strokeWidth="7" strokeLinecap="round" />
        <path d="M 6 44 A 34 34 0 0 1 74 44" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${dashLen} ${totalLen}`} />
      </svg>
      <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.8125rem', color, lineHeight: 1 }}>
        {pct}%
      </div>
    </div>
  )
}

// ─── call card ────────────────────────────────────────────────────────────────

const CallCard = ({ call, onClick }) => {
  const [hovered, setHovered] = useState(false)
  const badge = outcomeBadge(call.call_outcome)
  const isUrgent = call.call_outcome === 'escalated'
  const isFiltered = ['filtered', 'spam', 'hard_close'].includes(call.call_outcome)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isUrgent ? '#fdecea' : isFiltered ? '#f8fafc' : 'white',
        borderRadius: 16,
        border: isUrgent ? '1px solid #ef4444' : '0.5px solid rgba(94,59,135,0.08)',
        borderLeft: isUrgent ? '3px solid #ef4444' : hovered && !isFiltered ? '3px solid #5e3b87' : '3px solid transparent',
        boxShadow: hovered && !isUrgent ? '0 8px 24px rgba(94,59,135,0.12)' : '0 2px 12px rgba(94,59,135,0.06)',
        padding: '14px 18px',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        transform: hovered && !isUrgent ? 'translateY(-2px)' : 'translateY(0)',
        opacity: isFiltered ? 0.6 : 1,
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

const LeadCard = ({ lead, onClick }) => {
  const [hovered, setHovered] = useState(false)
  const name = lead.lead_contact_name || lead.callers?.phone_number || 'Unknown'
  const urgent = isUrgentLead(lead.created_at)
  const phone = lead.callers?.phone_number

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: urgent ? '#fef9ec' : 'white',
        borderRadius: 16,
        border: urgent ? '1px solid rgba(240,165,0,0.35)' : '0.5px solid rgba(94,59,135,0.08)',
        borderLeft: urgent ? '3px solid #f0a500' : hovered ? '3px solid #5e3b87' : '3px solid transparent',
        boxShadow: hovered ? '0 8px 24px rgba(94,59,135,0.12)' : '0 2px 12px rgba(94,59,135,0.06)',
        padding: '14px 18px',
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
  const demo = useDemo()
  const isDemo = !!demo?.isDemo
  const preview = usePreview()
  const isPreview = !!preview?.isPreview
  const isMobile = useIsMobile()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)
  const [tenantId, setTenantId] = useState(null)
  const [businessName, setBusinessName] = useState('')
  const [includedMinutes, setIncludedMinutes] = useState(250)
  const [tier, setTier] = useState('standard')
  const [triageMode, setTriageMode] = useState('balanced')
  const [voicePref, setVoicePref] = useState('premium')
  const [selectedCall, setSelectedCall] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)
  const [leadNotes, setLeadNotes] = useState('')
  const [leadNotesSaving, setLeadNotesSaving] = useState(false)

  const [calls, setCalls] = useState([])
  const [leads, setLeads] = useState([])
  const [referrals, setReferrals] = useState([])

  // Demo mode: inject data from DemoContext
  useEffect(() => {
    if (!isDemo || demo?.loading) return
    setCalls(demo.calls)
    setLeads(demo.leads)
    setReferrals(demo.referrals)
    setBusinessName(demo.business?.business_name || '')
    setIncludedMinutes(demo.includedMinutes)
    setTier(demo.business?.tier || 'standard')
    setTriageMode(demo.business?.triage_mode || 'balanced')
    setVoicePref('premium')
    setLoading(false)
  }, [isDemo, demo?.loading])

  useEffect(() => {
    if (isDemo || (!user && !isPreview)) return
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
          .select('business_name, included_minutes, tier, triage_mode, overage_voice_preference')
          .eq('id', tid)
          .maybeSingle()

        if (tenant) {
          setBusinessName(tenant.business_name || '')
          setIncludedMinutes(tenant.included_minutes || 250)
          setTier(tenant.tier || 'standard')
          setTriageMode(tenant.triage_mode || 'balanced')
          setVoicePref(tenant.overage_voice_preference || 'premium')
        }

        const monthIso = startOfMonth().toISOString()

        const [callRes, leadRes, refRes] = await Promise.all([
          supabase
            .from('call_logs')
            .select('id, created_at, duration_seconds, ai_summary, call_outcome, caller_phone, callers(phone_number, full_name)')
            .eq('tenant_id', tid)
            .gte('created_at', monthIso)
            .order('created_at', { ascending: false })
            .limit(100),

          supabase
            .from('leads')
            .select('id, created_at, status, lead_contact_name, notes, ai_summary, callers(phone_number)')
            .eq('tenant_id', tid)
            .gte('created_at', startOfDaysAgo(30).toISOString())
            .order('created_at', { ascending: false })
            .limit(50),

          supabase
            .from('referral_log')
            .select('id, created_at, referral_partners(business_name)')
            .eq('tenant_id', tid)
            .gte('created_at', startOfDaysAgo(7).toISOString())
            .order('created_at', { ascending: false })
            .limit(50),
        ])

        setCalls(callRes.data || [])
        setLeads(leadRes.data || [])
        setReferrals(refRes.data || [])
      } catch (err) {
        console.error('Dashboard load error:', err)
        setError('Could not load your dashboard data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, isDemo, isPreview, retryKey])

  // ESC to close modals
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') { setSelectedCall(null); setSelectedLead(null) } }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Sync notes when lead modal opens
  useEffect(() => {
    setLeadNotes(selectedLead?.notes || '')
  }, [selectedLead?.id])

  const saveLeadNotes = async (value) => {
    if (isDemo || isPreview || !selectedLead?.id) return
    setLeadNotesSaving(true)
    try {
      await supabase.from('leads').update({ notes: value }).eq('id', selectedLead.id)
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, notes: value } : l))
    } finally {
      setLeadNotesSaving(false)
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
  const recentCalls = calls.slice(0, 8)

  // ── recommendation ──────────────────────────────────────────────────────────

  let reco
  if (actionableLeads.length > 0) {
    reco = {
      title: `${actionableLeads.length} lead${actionableLeads.length > 1 ? 's' : ''} waiting for follow-up`,
      body: 'Leads contacted within 24 hours convert at three times the rate of those left a week.',
      actionLabel: 'View leads',
      onAction: () => {},
    }
  } else if (minutesPct > 80 && minutesUsed > 0) {
    reco = {
      title: `${minutesPct}% of your monthly minutes used`,
      body: 'You are approaching your monthly limit. Upgrade now to avoid missed calls at month end.',
      actionLabel: 'Review plan',
      onAction: () => onNavigate && onNavigate('account'),
    }
  } else if (callsThisMonth === 0) {
    reco = {
      title: 'Your AI is ready to take its first call',
      body: 'Share your AI-powered number with customers to start capturing leads automatically.',
      actionLabel: 'View setup',
      onAction: () => onNavigate && onNavigate('account'),
    }
  } else {
    reco = {
      title: `Your AI handled ${callsThisMonth} call${callsThisMonth !== 1 ? 's' : ''} this month`,
      body: 'Everything is running smoothly. Grow your referral network to increase inbound leads.',
      actionLabel: 'Manage partners',
      onAction: () => onNavigate && onNavigate('referrals'),
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

  return (
    <div>

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
          strict:   { color: '#1d4ed8', bg: '#eff6ff' },
          balanced: { color: '#5e3b87', bg: '#f0ebf8' },
          open:     { color: '#1e7a4a', bg: '#e6f5ee' },
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
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 48, color: '#5e3b87', lineHeight: 1 }}><CountUp to={callsToday} /></div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6, fontFamily: "'DM Sans', sans-serif" }}>calls today</div>
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
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>Triage mode</div>
              <span style={{ display: 'inline-block', padding: '0.25rem 0.7rem', borderRadius: 6, fontSize: '0.8125rem', fontWeight: 600, background: triage.bg, color: triage.color, fontFamily: "'DM Sans', sans-serif" }}>
                {triage.label}
              </span>
            </div>

            {vDiv}

            {/* This month */}
            <div style={{ padding: '1.1rem 1.5rem', flexShrink: 0 }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>This month</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: '#1a1a1a', lineHeight: 1 }}>{callsThisMonth}</div>
              <div style={{ fontSize: '0.72rem', color: '#aaaaaa', marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>total calls</div>
            </div>

            <div style={{ flex: 1 }} />

            {/* Configure */}
            <div style={{ padding: '1.25rem 1.5rem', flexShrink: 0 }}>
              <button
                onClick={() => onNavigate && onNavigate('ai')}
                style={{ padding: '0.45rem 1rem', border: '1px solid rgba(94,59,135,0.22)', borderRadius: 8, background: 'transparent', color: '#5e3b87', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
              >
                Configure →
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── DIVIDER: Today's Activity ──────────────────────────────────────── */}
      <div style={{ margin: '1.75rem 0 1.25rem' }}>
        <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: "'DM Sans', sans-serif" }}>Today's Activity</span>
        <div style={{ height: 1, background: '#e0d8ed' }} />
      </div>

      {/* ── ZONE 2 — LIVE FEED ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.25rem' }}>

        {/* LEFT — Recent calls */}
        <div>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', fontFamily: "'DM Sans', sans-serif" }}
            data-help="Recent calls is a log of the last 8 conversations your AI handled. The coloured badge shows the outcome — what the AI did with the call.">
            Recent calls
          </div>
          {recentCalls.length === 0 ? (
            <div style={s.section}>
              <EmptyState icon="📞" title="No calls yet" body="Your AI number hasn't received any calls this month. Share it with customers to start capturing leads." />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recentCalls.map((call, i) => (
                <div key={call.id} style={{ animation: 'fadeInUp 0.3s cubic-bezier(0.16,1,0.3,1)', animationDelay: `${i * 0.05}s`, animationFillMode: 'both' }}>
                  <CallCard call={call} onClick={() => setSelectedCall(call)} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — Leads requiring action */}
        <div>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 8 }}
            data-help="Leads requiring action are people who called in and need a follow-up from you. The quicker you respond, the higher the conversion rate.">
            Leads requiring action
            {actionableLeads.length > 0 && (
              <span style={{ background: '#e6f5ee', color: '#1e7a4a', borderRadius: '10px', padding: '0.05rem 0.5rem', fontSize: '0.65rem', fontWeight: 700 }}>
                {actionableLeads.length}
              </span>
            )}
          </div>
          {actionableLeads.length === 0 ? (
            <div style={s.section}>
              <EmptyState icon="🙌" title="All caught up" body="No leads waiting for follow-up. New leads appear here as soon as your AI captures them." />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {actionableLeads.slice(0, 6).map((lead, i) => (
                <div key={lead.id} style={{ animation: 'fadeInUp 0.3s cubic-bezier(0.16,1,0.3,1)', animationDelay: `${i * 0.05}s`, animationFillMode: 'both' }}>
                  <LeadCard lead={lead} onClick={() => setSelectedLead(lead)} />
                </div>
              ))}
              {actionableLeads.length > 6 && (
                <div style={{ fontSize: '0.775rem', color: '#bbb', paddingLeft: '0.25rem' }}>
                  +{actionableLeads.length - 6} more
                </div>
              )}
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

        const sparkBarOptions = {
          chart: { type: 'bar', sparkline: { enabled: true }, animations: { enabled: true } },
          colors: ['#5e3b87'],
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

              {/* Lead capture rate — donut */}
              <div style={{ ...s.section, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                <div style={{ ...s.sectionTitle, alignSelf: 'flex-start', marginBottom: '0.5rem' }}>Lead capture</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '2rem', color: '#5e3b87', lineHeight: 1, marginBottom: 4 }}>
                  <CountUp to={captureRate} suffix="%" />
                </div>
                <div style={{ fontSize: '0.72rem', color: '#aaaaaa', fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}>of calls this month</div>
                <ReactApexChart options={donutOptions} series={donutSeries} type="donut" height={110} width="100%" />
              </div>

              {/* 7-day call volume — spark bar */}
              <div style={{ ...s.section, display: 'flex', flexDirection: 'column' }}>
                <div style={{ ...s.sectionTitle, marginBottom: '0.5rem' }}>7-day volume</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '2rem', color: '#5e3b87', lineHeight: 1, marginBottom: 4 }}>
                  <CountUp to={weekCounts.reduce((a, b) => a + b, 0)} />
                </div>
                <div style={{ fontSize: '0.72rem', color: '#aaaaaa', fontFamily: "'DM Sans', sans-serif", marginBottom: 'auto' }}>calls this week</div>
                <div style={{ marginTop: 16 }}>
                  <ReactApexChart options={sparkBarOptions} series={sparkBarSeries} type="bar" height={70} />
                </div>
              </div>

              {/* 30-day minutes — line chart */}
              <div style={{ ...s.section, display: 'flex', flexDirection: 'column' }}>
                <div style={{ ...s.sectionTitle, marginBottom: '0.5rem' }}>30-day minutes</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '2rem', color: '#5e3b87', lineHeight: 1, marginBottom: 4 }}>
                  <CountUp to={minutesUsed} />
                </div>
                <div style={{ fontSize: '0.72rem', color: '#aaaaaa', fontFamily: "'DM Sans', sans-serif", marginBottom: 'auto' }}>minutes used</div>
                <div style={{ marginTop: 16 }}>
                  <ReactApexChart options={lineOptions} series={lineSeries} type="area" height={70} />
                </div>
              </div>

            </div>

            {/* Recommendation */}
            <div style={{ marginBottom: '1.25rem' }}>
              <RecoCard
                title={reco.title}
                body={reco.body}
                actionLabel={reco.actionLabel}
                onAction={reco.onAction}
              />
            </div>

            {/* Referrals sent today */}
            <div style={s.section}>
              <div style={s.sectionTitle}>Referrals sent today</div>
              {referralsToday.length === 0 ? (
                <div style={s.emptyState}>No referrals sent today yet.</div>
              ) : (
                referralsToday.map((ref, i) => {
                  const isLast = i === referralsToday.length - 1
                  const partnerName = ref.referral_partners?.business_name || 'Partner'
                  return (
                    <div key={ref.id} style={{ ...s.refRow, borderBottom: isLast ? 'none' : s.refRow.borderBottom }}>
                      <span>{partnerName}</span>
                      <span style={s.refTime}>{formatTime(ref.created_at)}</span>
                    </div>
                  )
                })
              )}
              {referralsThisWeek > 0 && (
                <div style={{ fontSize: '0.775rem', color: '#aaa', marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(94,59,135,0.07)' }}>
                  {referralsThisWeek} referral{referralsThisWeek !== 1 ? 's' : ''} sent this week
                </div>
              )}
            </div>

          </div>
        )
      })()}

      {/* Pulse keyframe */}
      <style>{pulseStyle}</style>

      {/* ── CALL DETAIL MODAL ─────────────────────────────────────────────── */}
      {selectedCall && (() => {
        const call = selectedCall
        const badge = outcomeBadge(call.call_outcome)
        const phone = call.callers?.phone_number || call.caller_phone
        return (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(26,5,51,0.5)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 1200, padding: isMobile ? 0 : '1rem' }}
            onClick={e => { if (e.target === e.currentTarget) setSelectedCall(null) }}
          >
            <div style={{ background: 'white', borderRadius: isMobile ? '20px 20px 0 0' : 20, width: '100%', maxWidth: isMobile ? '100%' : 520, boxShadow: '0 24px 60px rgba(94,59,135,0.18)', overflow: 'hidden', animation: 'modalIn 0.18s ease' }}>
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
            </div>
          </div>
        )
      })()}

      {/* ── LEAD DETAIL MODAL ─────────────────────────────────────────────── */}
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
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(26,5,51,0.5)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 1200, padding: isMobile ? 0 : '1.5rem' }}
            onClick={e => { if (e.target === e.currentTarget) setSelectedLead(null) }}
          >
            <div style={{ background: 'white', borderRadius: isMobile ? '20px 20px 0 0' : 20, width: '100%', maxWidth: isMobile ? '100%' : 560, maxHeight: isMobile ? '92vh' : '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(94,59,135,0.18)', overflow: 'hidden', animation: 'modalIn 0.18s ease' }}>

              {/* Sticky header */}
              <div style={{ padding: '1.5rem 1.75rem 1.25rem', borderBottom: '1px solid rgba(94,59,135,0.08)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.125rem', color: '#1a1a1a', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
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
                    <div style={{ fontSize: '0.875rem', color: '#1a1a1a', lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", background: '#f7f6f9', borderRadius: 10, padding: '0.85rem 1rem' }}>
                      {lead.ai_summary}
                    </div>
                  </div>
                )}

                {/* Section 2 — Details */}
                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem', fontFamily: "'DM Sans', sans-serif" }}>Details</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {phone && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif" }}>
                        <span style={{ color: '#aaaaaa' }}>Phone</span>
                        <a href={`tel:${phone}`} style={{ color: '#5e3b87', fontWeight: 500, textDecoration: 'none' }}>{phone}</a>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif" }}>
                      <span style={{ color: '#aaaaaa' }}>Captured</span>
                      <span style={{ color: '#1a1a1a' }}>{formatDateLabel(lead.created_at)} at {formatTime(lead.created_at)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif" }}>
                      <span style={{ color: '#aaaaaa' }}>Status</span>
                      <span style={{ color: statusStyle.color, fontWeight: 600 }}>{STATUS_LABELS[lead.status] || 'New'}</span>
                    </div>
                  </div>
                </div>

                {/* Section 3 — Notes */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.6rem' }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'DM Sans', sans-serif" }}>Notes</div>
                    {leadNotesSaving && <span style={{ fontSize: '0.65rem', color: '#aaaaaa', fontFamily: "'DM Sans', sans-serif" }}>Saving…</span>}
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

              </div>

              {/* Sticky footer */}
              <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid rgba(94,59,135,0.08)', flexShrink: 0, display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {phone && (
                  <a href={`tel:${phone}`}
                    style={{ display: 'inline-flex', alignItems: 'center', padding: '0.5rem 1rem', background: '#f0a500', color: '#1a0533', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                    Call back
                  </a>
                )}
                <button
                  onClick={() => { setSelectedLead(null); onNavigate && onNavigate('calendar', { title: name, notes: phone ? `Lead · ${phone}` : 'Lead captured' }) }}
                  style={{ padding: '0.5rem 1rem', border: '1px solid rgba(94,59,135,0.22)', borderRadius: 8, background: 'white', color: '#5e3b87', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                  Book appointment
                </button>
                <FreeAgentInvoiceButton leadId={lead.id} tenantId={tenantId} />
                <XeroInvoiceButton leadId={lead.id} tenantId={tenantId} />
                <StripePaymentButton tenantId={tenantId} leadId={lead.id} leadName={name} />
                <button onClick={() => setSelectedLead(null)}
                  style={{ marginLeft: 'auto', padding: '0.5rem 1rem', border: '1px solid rgba(94,59,135,0.12)', borderRadius: 8, background: 'white', color: '#aaaaaa', fontSize: '0.8125rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  Close
                </button>
              </div>

            </div>
          </div>
        )
      })()}

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
