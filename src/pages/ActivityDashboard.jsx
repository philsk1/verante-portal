import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'

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
  call.callers?.name || call.callers?.phone_number || 'Unknown caller'

const OUTCOME_BADGES = {
  booked:         { label: 'Booked',       bg: '#e6f5ee', color: '#1e7a4a' },
  lead_captured:  { label: 'Lead',         bg: '#ede8f5', color: '#5e3b87' },
  referred_out:   { label: 'Referred out', bg: '#fef3d9', color: '#b07a00' },
  filtered:       { label: 'Filtered',     bg: '#f0f0f0', color: '#888'    },
  escalated:      { label: 'Escalated',    bg: '#ede8f5', color: '#5e3b87' },
  hard_close:     { label: 'Closed',       bg: '#f0f0f0', color: '#888'    },
  spam:           { label: 'Spam',         bg: '#f0f0f0', color: '#888'    },
}

const outcomeBadge = (outcome) =>
  OUTCOME_BADGES[outcome] || { label: outcome || 'Call', bg: '#f3f1f6', color: '#5e3b87' }

// ─── styles ──────────────────────────────────────────────────────────────────

const s = {
  section: {
    background: 'white',
    borderRadius: '10px',
    padding: '1.5rem',
    border: '0.5px solid rgba(94,59,135,0.1)',
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
    background: 'white',
    borderRadius: '10px',
    padding: '1.25rem 1.5rem',
    border: '0.5px solid rgba(94,59,135,0.1)',
    borderLeft: '3px solid #f0a500',
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

// ─── main component ───────────────────────────────────────────────────────────

const ActivityDashboard = ({ onNavigate }) => {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [businessName, setBusinessName] = useState('')
  const [includedMinutes, setIncludedMinutes] = useState(150)

  const [calls, setCalls] = useState([])
  const [leads, setLeads] = useState([])
  const [referrals, setReferrals] = useState([])

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      try {
        const { data: membership } = await supabase
          .from('tenant_memberships')
          .select('tenant_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!membership) return
        const tid = membership.tenant_id

        const { data: tenant } = await supabase
          .from('tenants')
          .select('business_name, included_minutes')
          .eq('id', tid)
          .maybeSingle()

        if (tenant) {
          setBusinessName(tenant.business_name || '')
          setIncludedMinutes(tenant.included_minutes || 150)
        }

        const monthIso = startOfMonth().toISOString()

        const [callRes, leadRes, refRes] = await Promise.all([
          supabase
            .from('call_logs')
            .select('id, created_at, duration, caller_notes, triage_outcome, callers(phone_number, name)')
            .eq('tenant_id', tid)
            .gte('created_at', monthIso)
            .order('created_at', { ascending: false })
            .limit(100),

          supabase
            .from('leads')
            .select('id, created_at, status, lead_contact_name, callers(phone_number)')
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
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  // ── computed stats ──────────────────────────────────────────────────────────

  const today = startOfToday()
  const weekAgo = startOfDaysAgo(7)

  const callsToday = calls.filter(c => new Date(c.created_at) >= today).length
  const callsThisMonth = calls.length
  const leadsThisWeek = leads.filter(l => new Date(l.created_at) >= weekAgo).length
  const referralsThisWeek = referrals.filter(r => new Date(r.created_at) >= weekAgo).length
  const referralsToday = referrals.filter(r => new Date(r.created_at) >= today)

  const totalSeconds = calls.reduce((sum, c) => sum + (c.duration || 0), 0)
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
    return <div style={{ padding: '2rem', color: '#aaa', fontSize: '0.875rem' }}>Loading dashboard…</div>
  }

  return (
    <div>

      {/* Greeting */}
      {businessName && (
        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.6rem', color: '#aaa', marginBottom: '1.25rem', margin: '0 0 1.25rem' }}>
          {businessName}
        </p>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        <div data-help="Calls today shows how many conversations your AI has had so far today. The smaller number below is the total for the whole month.">
          <StatCard label="Calls today" value={callsToday} trend={callsThisMonth > 0 ? `${callsThisMonth} this month` : null} />
        </div>
        <div data-help="New leads are people your AI spoke to in the last 7 days who expressed genuine interest — they gave their details or asked to be followed up. These are warm prospects.">
          <StatCard label="New leads" value={leadsThisWeek} trend="last 7 days" />
        </div>
        <div data-help="Referrals sent is how many callers your AI passed to a partner business this week because they needed something outside your scope. Every referral builds goodwill.">
          <StatCard label="Referrals sent" value={referralsThisWeek} trend="last 7 days" />
        </div>
        <div data-help="Minutes used shows how much of your monthly call allowance has been used. When this reaches 100%, your AI stops answering calls until the next billing cycle — so keep an eye on it.">
          <StatCard label="Minutes used" value={minutesUsed} trend={`of ${includedMinutes} this month`} />
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

      {/* Recent calls */}
      <div style={{ ...s.section, marginBottom: '1.25rem' }}>
        <div style={s.sectionTitle} data-help="Recent calls is a log of the last 8 conversations your AI handled. The coloured dot shows the outcome — green means booked, purple means a lead was captured, grey means the call was closed or filtered. The italicised text is the summary your AI wrote after the call.">Recent calls</div>
        {recentCalls.length === 0 ? (
          <div style={s.emptyState}>No calls recorded yet.</div>
        ) : (
          recentCalls.map((call, i) => {
            const badge = outcomeBadge(call.triage_outcome)
            const isLast = i === recentCalls.length - 1
            return (
              <div key={call.id} style={{ ...s.callRow, borderBottom: isLast ? 'none' : s.callRow.borderBottom }}>
                <span style={s.callDot(call.triage_outcome)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.callCaller}>{callerLabel(call)}</div>
                  <div style={s.callMeta}>
                    {formatDateLabel(call.created_at)} · {formatTime(call.created_at)}
                    {call.duration ? ` · ${formatDuration(call.duration)}` : ''}
                  </div>
                  {call.caller_notes && (
                    <div style={s.callNotes}>"{call.caller_notes}"</div>
                  )}
                </div>
                <span style={s.badge(badge.bg, badge.color)}>{badge.label}</span>
              </div>
            )
          })
        )}
      </div>

      {/* Leads + Referrals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

        {/* Leads requiring action */}
        <div style={s.section}>
          <div style={s.sectionTitle}>
            Leads requiring action
            {actionableLeads.length > 0 && (
              <span style={{ marginLeft: '0.5rem', background: '#ede8f5', color: '#5e3b87', borderRadius: '10px', padding: '0.1rem 0.5rem', fontSize: '0.7rem', fontWeight: 600 }}>
                {actionableLeads.length}
              </span>
            )}
          </div>
          {actionableLeads.length === 0 ? (
            <div style={s.emptyState}>No leads waiting for follow-up.</div>
          ) : (
            actionableLeads.slice(0, 6).map((lead, i) => {
              const isLast = i === Math.min(actionableLeads.length, 6) - 1
              const name = lead.lead_contact_name || lead.callers?.phone_number || 'Unknown'
              return (
                <div key={lead.id} style={{ ...s.leadRow, borderBottom: isLast ? 'none' : s.leadRow.borderBottom }}>
                  <div style={s.leadName}>{name}</div>
                  <div style={s.leadMeta}>
                    {formatDateLabel(lead.created_at)} · {formatTime(lead.created_at)}
                  </div>
                </div>
              )
            })
          )}
          {actionableLeads.length > 6 && (
            <div style={{ fontSize: '0.775rem', color: '#bbb', marginTop: '0.5rem' }}>
              +{actionableLeads.length - 6} more
            </div>
          )}
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
    </div>
  )
}

export default ActivityDashboard
