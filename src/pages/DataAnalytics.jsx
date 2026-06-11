import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { usePreview } from '../context/PreviewContext'

const useIsMobile = () => {
  const [m, setM] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const h = () => setM(window.innerWidth <= 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return m
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtDuration = (secs) => {
  if (!secs) return '0m'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0)

// ─── styles ───────────────────────────────────────────────────────────────────

const s = {
  headlineGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.75rem',
    marginBottom: '0.75rem',
  },
  headlineCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '1rem 1.25rem 0.85rem',
    border: '0.5px solid rgba(94,59,135,0.06)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.06)',
  },
  headlineLabel: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    color: '#aaaaaa',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '0.55rem',
  },
  headlineNumber: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '2.25rem',
    fontWeight: 700,
    color: '#5e3b87',
    lineHeight: 1,
    marginBottom: '0.4rem',
  },
  headlineSub: {
    fontSize: '0.775rem',
    color: '#aaa',
  },
  recoCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '1.25rem 1.5rem',
    border: '0.5px solid rgba(94,59,135,0.06)',
    borderLeft: '3px solid #f0a500',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.25rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.06)',
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
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
  },
  featureCard: {
    background: '#faf9fc',
    borderRadius: '16px',
    border: '0.5px solid rgba(94,59,135,0.12)',
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.06)',
  },
  featureHeader: {
    padding: '1rem 1.25rem 0',
  },
  featureTitle: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    color: '#aaaaaa',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '0.2rem',
  },
  featureDesc: {
    fontSize: '0.775rem',
    color: '#999',
    lineHeight: 1.5,
    marginBottom: '1rem',
  },
  featureBody: {
    padding: '0 1.25rem 1rem',
  },
  lockedOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  lockedBlur: {
    filter: 'blur(4px)',
    pointerEvents: 'none',
    userSelect: 'none',
    opacity: 0.4,
  },
  lockedBadge: {
    background: 'white',
    border: '1px solid rgba(94,59,135,0.15)',
    borderRadius: '10px',
    padding: '0.85rem 1.5rem',
    textAlign: 'center',
    boxShadow: '0 4px 16px rgba(94,59,135,0.12)',
    minWidth: '190px',
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
  // preview elements inside locked cards
  previewBar: (w, color) => ({
    height: 8,
    width: w,
    background: color || '#5e3b87',
    borderRadius: 4,
    marginBottom: 6,
    opacity: 0.7,
  }),
  previewRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    fontSize: '0.775rem',
    color: '#555',
  },
  previewDot: (color) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: color,
    display: 'inline-block',
    marginRight: 6,
  }),
  // live content elements
  liveRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.6rem 0',
    borderBottom: '1px solid rgba(94,59,135,0.06)',
    fontSize: '0.8125rem',
    color: '#1a1a1a',
  },
  liveLabel: {
    color: '#888',
    fontSize: '0.775rem',
  },
  patternCell: (intensity) => ({
    flex: 1,
    height: 20,
    borderRadius: 3,
    background: `rgba(94,59,135,${0.08 + intensity * 0.55})`,
    margin: '0 1px',
  }),
  sectionLabel: {
    fontSize: '0.7rem',
    fontWeight: '500',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: '0.6rem',
  },
  comingSoon: {
    fontSize: '0.8rem',
    color: '#ccc',
    padding: '1.5rem 0',
    textAlign: 'center',
  },
}

// ─── locked card wrapper ──────────────────────────────────────────────────────

const LockedCard = ({ title, desc, previewContent, helpText }) => (
  <div style={s.featureCard} data-help={helpText}>
    <div style={s.featureHeader}>
      <div style={s.featureTitle}>{title}</div>
      <div style={s.featureDesc}>{desc}</div>
    </div>
    <div style={{ ...s.featureBody, ...s.lockedBlur }}>
      {previewContent}
    </div>
    <div style={s.lockedOverlay}>
      <div style={s.lockedBadge}>
        <div style={s.lockedTier}>Enterprise</div>
        <div style={s.lockedTitle}>Unlock {title}</div>
        <div style={s.lockedText}>Upgrade your plan to access this feature.</div>
      </div>
    </div>
  </div>
)

// ─── preview content for locked cards ────────────────────────────────────────

const PricingPreview = () => (
  <div>
    {[['Boiler service', '£120–£180', '62%'], ['Emergency callout', '£200–£350', '81%'], ['Annual service', '£90–£130', '44%']].map(([svc, range, win]) => (
      <div key={svc} style={s.previewRow}>
        <span>{svc}</span>
        <span style={{ color: '#5e3b87', fontWeight: 600 }}>{range}</span>
        <span style={{ color: '#3db87a' }}>{win} win</span>
      </div>
    ))}
    <div style={{ marginTop: 12 }}>
      <div style={s.previewBar('78%', '#5e3b87')} />
      <div style={s.previewBar('55%', '#f0a500')} />
      <div style={s.previewBar('38%', '#3db87a')} />
    </div>
  </div>
)

const WinRatePreview = () => (
  <div>
    {[['Booked', '#3db87a', '68%'], ['Lead captured', '#5e3b87', '18%'], ['Referred out', '#f0a500', '9%'], ['Filtered', '#d1d5db', '5%']].map(([label, color, val]) => (
      <div key={label} style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', color: '#555', marginBottom: 4 }}>
          <span><span style={s.previewDot(color)} />{label}</span>
          <span style={{ fontWeight: 600 }}>{val}</span>
        </div>
        <div style={{ height: 6, background: '#f3f1f6', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: val, background: color, borderRadius: 3 }} />
        </div>
      </div>
    ))}
  </div>
)

const PatternPreview = () => {
  const intensities = [0.2, 0.4, 0.7, 0.9, 0.8, 0.5, 0.1]
  return (
    <div>
      <div style={{ fontSize: '0.725rem', color: '#bbb', marginBottom: 8 }}>Mon → Sun · peak highlighted</div>
      <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
        {intensities.map((v, i) => (
          <div key={i} style={s.patternCell(v)} />
        ))}
      </div>
      <div style={{ fontSize: '0.775rem', color: '#555' }}>Peak: Tue–Thu, 9am–12pm</div>
    </div>
  )
}

const CompetitorPreview = () => (
  <div>
    {[['AcePlumb Ltd', 4, '#b91c1c'], ['City Heat Co.', 2, '#f0a500'], ['FastFix 247', 1, '#888']].map(([name, count, color]) => (
      <div key={name} style={{ ...s.previewRow, marginBottom: 10 }}>
        <span>{name}</span>
        <span style={{ fontWeight: 600, color }}>{count} mention{count !== 1 ? 's' : ''}</span>
      </div>
    ))}
  </div>
)

// ─── live card content (Enterprise) ──────────────────────────────────────────

const LiveCard = ({ title, desc, children, helpText }) => (
  <div style={s.featureCard} data-help={helpText}>
    <div style={s.featureHeader}>
      <div style={s.featureTitle}>{title}</div>
      <div style={s.featureDesc}>{desc}</div>
    </div>
    <div style={s.featureBody}>{children}</div>
  </div>
)

// ─── drill-down panel ────────────────────────────────────────────────────────

const drillLabel = {
  fontSize: '0.6875rem', fontWeight: 700, color: '#aaa',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  marginBottom: '0.75rem', fontFamily: "'DM Sans', sans-serif",
}

const DrillPanel = ({ title, onClose, children }) => (
  <div
    onClick={e => e.target === e.currentTarget && onClose()}
    style={{ position: 'fixed', inset: 0, background: 'rgba(26,5,51,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', boxSizing: 'border-box' }}
  >
    <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '660px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.28)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.5rem', borderBottom: '1px solid rgba(94,59,135,0.08)', flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontSize: '1rem', fontWeight: 700, color: '#1a1a1a' }}>{title}</h2>
        <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: '#f3f1f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: '#5e3b87', fontWeight: 700, lineHeight: 1, flexShrink: 0 }}>×</button>
      </div>
      <div style={{ overflowY: 'auto', padding: '1.5rem', flex: 1 }}>
        {children}
      </div>
    </div>
  </div>
)

// ─── main component ───────────────────────────────────────────────────────────

const DataAnalytics = ({ onNavigate }) => {
  const { user } = useAuth()
  const preview = usePreview()
  const isPreview = !!preview?.isPreview
  const isMobile = useIsMobile()

  const [loading, setLoading] = useState(true)
  const [tier, setTier] = useState('light')
  useEffect(() => { if (preview?.tierOverride !== null) setTier(preview?.tierOverride) }, [preview?.tierOverride])

  const [totalCalls, setTotalCalls] = useState(0)
  const [totalLeads, setTotalLeads] = useState(0)
  const [avgDurationSecs, setAvgDurationSecs] = useState(0)
  const [outcomeBreakdown, setOutcomeBreakdown] = useState({})
  const [callsByDay, setCallsByDay] = useState([0, 0, 0, 0, 0, 0, 0])
  const [demoPricing, setDemoPricing] = useState([])
  const [demoCompetitors, setDemoCompetitors] = useState([])

  const [drillOpen, setDrillOpen] = useState(null) // null | 'calls' | 'leads' | 'duration'
  const [leadsByStatus, setLeadsByStatus] = useState({ new: 0, contacted: 0, converted: 0, lost: 0 })
  const [durationBuckets, setDurationBuckets] = useState({ short: 0, medium: 0, long: 0 })

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

        const { data: tenant } = await supabase
          .from('tenants')
          .select('subscription_tier')
          .eq('id', tid)
          .maybeSingle()

        if (tenant) setTier(tenant.subscription_tier || 'light')

        const [callRes, leadRes] = await Promise.all([
          supabase
            .from('call_logs')
            .select('id, created_at, duration_seconds, call_outcome')
            .eq('tenant_id', tid)
            .limit(5000),

          supabase
            .from('leads')
            .select('id, status')
            .eq('tenant_id', tid),
        ])

        const calls = callRes.data || []
        const leads = leadRes.data || []

        setTotalCalls(calls.length)
        setTotalLeads(leads.length)

        const withDuration = calls.filter(c => c.duration_seconds > 0)
        const avgSecs = withDuration.length > 0
          ? Math.round(withDuration.reduce((s, c) => s + c.duration_seconds, 0) / withDuration.length)
          : 0
        setAvgDurationSecs(avgSecs)

        const outcomes = {}
        calls.forEach(c => {
          const k = c.call_outcome || 'unknown'
          outcomes[k] = (outcomes[k] || 0) + 1
        })
        setOutcomeBreakdown(outcomes)

        const byDay = [0, 0, 0, 0, 0, 0, 0]
        calls.forEach(c => {
          const dow = new Date(c.created_at).getDay()
          byDay[dow]++
        })
        setCallsByDay(byDay)

        const lbs = { new: 0, contacted: 0, converted: 0, lost: 0 }
        leads.forEach(l => { const k = l.status || 'new'; lbs[k] = (lbs[k] || 0) + 1 })
        setLeadsByStatus(lbs)

        const dbs = { short: 0, medium: 0, long: 0 }
        calls.forEach(c => {
          const d = c.duration_seconds || 0
          if (d < 30) dbs.short++; else if (d < 120) dbs.medium++; else dbs.long++
        })
        setDurationBuckets(dbs)
      } catch (err) {
        console.error('Analytics load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, isPreview])

  const leadCapturedCount = outcomeBreakdown.lead_captured || 0
  const leadRate = pct(leadCapturedCount, totalCalls)
  const isEnterprise = ['enterprise', 'bespoke'].includes(tier)

  // ── recommendation ────────────────────────────────────────────────────────

  let reco
  if (!isEnterprise) {
    reco = {
      title: 'Unlock deep analytics with Enterprise',
      body: 'See pricing intelligence, win rates by service, caller patterns, and competitor mentions — all generated automatically from your call data.',
      actionLabel: 'View plans',
      onAction: () => onNavigate && onNavigate('account'),
    }
  } else if (totalCalls === 0) {
    reco = {
      title: 'Analytics will populate as calls come in',
      body: 'Your AI is ready. Once it handles calls, patterns and insights will appear here automatically.',
      actionLabel: null,
    }
  } else if (leadRate < 30 && totalCalls > 10) {
    reco = {
      title: `Lead capture rate is ${leadRate}% across ${totalCalls} calls`,
      body: 'Your AI, your response speed, and your follow-up each play a role in the overall capture loop. Explore the data to identify where the gap is.',
      actionLabel: 'Explore capture data',
      onAction: () => setDrillOpen('leads'),
    }
  } else {
    reco = {
      title: `${leadRate}% lead capture rate across ${totalCalls} calls`,
      body: 'Strong performance. Expand your referral network to increase inbound call volume.',
      actionLabel: 'Manage partners',
      onAction: () => onNavigate && onNavigate('referrals'),
    }
  }

  // ── enterprise: caller patterns ───────────────────────────────────────────

  const maxDay = Math.max(...callsByDay, 1)
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // ── enterprise: outcome breakdown ─────────────────────────────────────────

  const OUTCOME_META = {
    booked:        { label: 'Booked',       color: '#5e3b87' },
    lead_captured: { label: 'Lead captured', color: '#3db87a' },
    referred_out:  { label: 'Referred out', color: '#1d4ed8' },
    filtered:      { label: 'Filtered',     color: '#d1d5db' },
    escalated:     { label: 'Escalated',    color: '#ef4444' },
    hard_close:    { label: 'Closed',       color: '#d1d5db' },
    spam:          { label: 'Spam',         color: '#d1d5db' },
    unknown:       { label: 'Other',        color: '#e5e7eb' },
  }

  if (loading) {
    return <div style={{ padding: '2rem', color: '#aaa', fontSize: '0.875rem' }}>Loading analytics…</div>
  }

  return (
    <div>

      {/* Headline numbers */}
      {(() => {
        const rateColor = leadRate >= 35 ? '#3db87a' : leadRate >= 15 ? '#f0a500' : '#ef4444'
        const rateBg    = leadRate >= 35 ? '#bbf7d0' : leadRate >= 15 ? '#fde68a' : '#fecaca'
        const rateLabel = leadRate >= 35 ? 'Strong performance' : leadRate >= 15 ? 'Room to improve' : 'Needs attention'

        const bookedCount       = outcomeBreakdown.booked || 0
        const referredOutCount  = outcomeBreakdown.referred_out || 0
        const filteredCount     = (outcomeBreakdown.filtered || 0) + (outcomeBreakdown.spam || 0) + (outcomeBreakdown.hard_close || 0)

        return (
          <>
            {/* Row 1 — volume · rate · duration */}
            <div style={{ ...s.headlineGrid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)' }}>
              <div onClick={() => setDrillOpen('calls')} style={{ ...s.headlineCard, background: '#ddd6fe', borderLeft: '4px solid #5e3b87', cursor: 'pointer', userSelect: 'none' }}
                data-help="Total calls handled is the cumulative number of calls your AI has answered since your account was activated.">
                <div style={s.headlineLabel}>Total calls handled</div>
                <div style={{ ...s.headlineNumber, color: '#5e3b87' }}>{totalCalls.toLocaleString()}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={s.headlineSub}>all time</div>
                  <div style={{ fontSize: '0.7rem', color: '#7c5ab8', fontWeight: 600 }}>Explore →</div>
                </div>
              </div>
              <div onClick={() => setDrillOpen('leads')} style={{ ...s.headlineCard, background: rateBg, borderLeft: `4px solid ${rateColor}`, cursor: 'pointer', userSelect: 'none' }}
                data-help="Lead capture rate is the percentage of all calls that resulted in a lead. A healthy rate is 30–50% for most service businesses.">
                <div style={s.headlineLabel}>Lead capture rate</div>
                <div style={{ ...s.headlineNumber, color: rateColor }}>{leadRate}%</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ ...s.headlineSub, color: rateColor, fontWeight: 500 }}>{totalCalls > 0 ? rateLabel : 'no calls yet'}</div>
                  <div style={{ fontSize: '0.7rem', color: rateColor, fontWeight: 600 }}>Explore →</div>
                </div>
              </div>
              <div onClick={() => setDrillOpen('duration')} style={{ ...s.headlineCard, background: '#bfdbfe', borderLeft: '4px solid #1d4ed8', cursor: 'pointer', userSelect: 'none' }}
                data-help="Average call duration tells you how long your AI spends on a typical call. Very short calls often mean the caller hung up early or was filtered as spam.">
                <div style={s.headlineLabel}>Avg call duration</div>
                <div style={{ ...s.headlineNumber, color: '#1d4ed8' }}>{fmtDuration(avgDurationSecs)}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={s.headlineSub}>across handled calls</div>
                  <div style={{ fontSize: '0.7rem', color: '#1d4ed8', fontWeight: 600 }}>Explore →</div>
                </div>
              </div>
            </div>

            {/* Row 2 — outcome breakdown tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {[
                { count: bookedCount,      label: 'Booked',         color: '#5e3b87', bg: '#ddd6fe', border: '#5e3b87' },
                { count: leadCapturedCount,label: 'Leads captured',  color: '#1e7a4a', bg: '#bbf7d0', border: '#3db87a' },
                { count: referredOutCount, label: 'Referred out',    color: '#1d4ed8', bg: '#bfdbfe', border: '#1d4ed8' },
                { count: filteredCount,    label: 'Filtered / spam', color: '#64748b', bg: '#f8fafc', border: '#cbd5e1' },
              ].map(tile => (
                <div key={tile.label}
                  onClick={() => setDrillOpen('calls')}
                  style={{ background: tile.bg, borderRadius: '12px', padding: '1rem', borderLeft: `3px solid ${tile.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer', transition: 'transform 0.1s', userSelect: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.75rem', fontWeight: 700, color: tile.color, lineHeight: 1, marginBottom: '0.2rem' }}>{tile.count}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: tile.color, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'DM Sans', sans-serif" }}>{tile.label}</div>
                </div>
              ))}
            </div>
          </>
        )
      })()}

      {/* Recommendation */}
      <div style={s.recoCard}>
        <div style={{ flex: 1 }}>
          <div style={s.recoTitle}>{reco.title}</div>
          <div style={s.recoBody}>{reco.body}</div>
        </div>
        {reco.actionLabel && (
          <button style={s.recoBtn} onClick={reco.onAction}>{reco.actionLabel}</button>
        )}
      </div>

      {/* Feature cards 2×2 */}
      <div style={s.featureGrid}>

        {/* 1 — Pricing Intelligence */}
        {isEnterprise ? (
          <LiveCard
            title="Pricing Intelligence"
            desc="Market rates mentioned by callers, cross-referenced with your win rate."
            helpText="Pricing Intelligence listens for price signals in your call transcripts — when callers mention a competitor's quote, a budget, or a price they've been given. Over time this builds a real picture of what the market charges and where you're winning or losing on price. Enterprise only."
          >
            {demoPricing.length === 0 ? (
              <div style={s.comingSoon}>Data will populate from your call history.</div>
            ) : demoPricing.map((item, i, arr) => (
              <div key={item.id || i} style={{ ...s.liveRow, flexDirection: 'column', alignItems: 'flex-start', gap: 4, borderBottom: i < arr.length - 1 ? s.liveRow.borderBottom : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '0.8125rem' }}>{item.service_name}</span>
                  {item.market_low && item.market_high && (
                    <span style={{ fontSize: '0.75rem', color: '#5e3b87', fontWeight: 600 }}>
                      {typeof item.market_low === 'number' && item.market_low > 100
                        ? `£${item.market_low.toLocaleString()}–£${item.market_high.toLocaleString()}`
                        : `${item.market_low}%–${item.market_high}%`}
                    </span>
                  )}
                </div>
                {item.insight && <div style={{ fontSize: '0.72rem', color: '#888', lineHeight: 1.45 }}>{item.insight}</div>}
              </div>
            ))}
          </LiveCard>
        ) : (
          <LockedCard
            title="Pricing Intelligence"
            desc="Market rates mentioned by callers, cross-referenced with your win rate."
            previewContent={<PricingPreview />}
            helpText="Pricing Intelligence listens for price signals in your call transcripts — when callers mention a competitor's quote, a budget, or a price they've been given. Over time this builds a real picture of what the market charges and where you're winning or losing on price. Enterprise only."
          />
        )}

        {/* 2 — Win Rate by Outcome */}
        {isEnterprise ? (
          <LiveCard
            title="Call Outcome Breakdown"
            desc="How your calls resolve — leads, bookings, referrals, and filtered calls."
            helpText="Call Outcome Breakdown shows how your calls are resolving — what percentage became leads, got booked, were referred out, or were filtered as sales calls. Use this to understand where your AI is doing well and where enquiries are being lost."
          >
            {Object.keys(outcomeBreakdown).length === 0 ? (
              <div style={s.comingSoon}>No call data yet.</div>
            ) : (
              Object.entries(outcomeBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([outcome, count], i, arr) => {
                  const meta = OUTCOME_META[outcome] || { label: outcome, color: '#d1d5db' }
                  const barPct = pct(count, totalCalls)
                  const isLast = i === arr.length - 1
                  return (
                    <div key={outcome} style={{ ...s.liveRow, borderBottom: isLast ? 'none' : s.liveRow.borderBottom }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, display: 'inline-block', flexShrink: 0 }} />
                        {meta.label}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.775rem', color: '#bbb' }}>{count}</span>
                        <span style={{ fontWeight: 600, color: '#5e3b87' }}>{barPct}%</span>
                      </span>
                    </div>
                  )
                })
            )}
          </LiveCard>
        ) : (
          <LockedCard
            title="Call Outcome Breakdown"
            desc="How your calls resolve — leads, bookings, referrals, and filtered calls."
            previewContent={<WinRatePreview />}
            helpText="Call Outcome Breakdown shows how your calls are resolving — what percentage became leads, got booked, were referred out, or were filtered as sales calls. Enterprise only."
          />
        )}

        {/* 3 — Caller Patterns */}
        {isEnterprise ? (
          <LiveCard
            title="Caller Patterns"
            desc="Which days drive the most call volume — plan your availability around peaks."
            helpText="Caller Patterns shows which days of the week your call volume peaks. If Monday and Tuesday dominate, you know when to be available for callbacks. If Friday is dead, don't schedule jobs that stop you taking calls on Thursdays. Enterprise only."
          >
            {totalCalls === 0 ? (
              <div style={s.comingSoon}>No call data yet.</div>
            ) : (
              <div>
                <div style={s.sectionLabel}>Calls by day of week</div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 64, marginBottom: 6 }}>
                  {callsByDay.map((count, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: '100%',
                        height: maxDay > 0 ? `${Math.round((count / maxDay) * 52)}px` : 4,
                        minHeight: 4,
                        background: count === maxDay ? '#5e3b87' : 'rgba(94,59,135,0.18)',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.3s',
                      }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {DAY_LABELS.map((d, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '0.65rem', color: callsByDay[i] === maxDay ? '#5e3b87' : '#bbb', fontWeight: callsByDay[i] === maxDay ? 600 : 400 }}>
                      {d}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </LiveCard>
        ) : (
          <LockedCard
            title="Caller Patterns"
            desc="Which days and times drive the most call volume — plan your availability around peaks."
            previewContent={<PatternPreview />}
            helpText="Caller Patterns shows which days of the week your call volume peaks so you can plan availability around them. Enterprise only."
          />
        )}

        {/* 4 — Competitor Intelligence */}
        {isEnterprise ? (
          <LiveCard
            title="Competitor Intelligence"
            desc="Businesses mentioned by callers when comparing prices or explaining why they called."
            helpText="Competitor Intelligence captures when callers name other businesses — 'I got a quote from X', 'I tried Y first'. Over time this builds a map of who you're competing against and how often. Useful for pricing and positioning decisions. Enterprise only."
          >
            {demoCompetitors.length === 0 ? (
              <div style={s.comingSoon}>Data will populate from your call history.</div>
            ) : demoCompetitors.map((comp, i, arr) => (
              <div key={comp.id || i} style={{ ...s.liveRow, flexDirection: 'column', alignItems: 'flex-start', gap: 4, borderBottom: i < arr.length - 1 ? s.liveRow.borderBottom : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontWeight: 500, color: '#1a1a1a', fontSize: '0.8125rem' }}>{comp.competitor_name}</span>
                  <span style={{ background: '#fde68a', color: '#78460a', borderRadius: 10, padding: '0.1rem 0.5rem', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                    {comp.mention_count} mention{comp.mention_count !== 1 ? 's' : ''}
                  </span>
                </div>
                {comp.context && <div style={{ fontSize: '0.72rem', color: '#888', lineHeight: 1.45 }}>{comp.context}</div>}
              </div>
            ))}
          </LiveCard>
        ) : (
          <LockedCard
            title="Competitor Intelligence"
            desc="Businesses mentioned by callers when comparing prices or explaining why they called."
            previewContent={<CompetitorPreview />}
            helpText="Competitor Intelligence captures when callers name other businesses — 'I got a quote from X', 'I tried Y first'. Over time this builds a map of who you're competing against and how often. Enterprise only."
          />
        )}

      </div>

      {/* ── Drill panels ─────────────────────────────────────────────────────── */}

      {drillOpen === 'calls' && (
        <DrillPanel title="Call volume breakdown" onClose={() => setDrillOpen(null)}>
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={drillLabel}>How calls resolved</div>
            {Object.keys(outcomeBreakdown).length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#aaa' }}>No call data yet.</p>
            ) : Object.entries(outcomeBreakdown).sort((a, b) => b[1] - a[1]).map(([outcome, count]) => {
              const meta = OUTCOME_META[outcome] || { label: outcome, color: '#d1d5db' }
              const barPct = pct(count, totalCalls)
              return (
                <div key={outcome} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#555', marginBottom: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, display: 'inline-block', flexShrink: 0 }} />
                      {meta.label}
                    </span>
                    <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{count} · {barPct}%</span>
                  </div>
                  <div style={{ height: 7, background: '#f3f1f6', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${barPct}%`, background: meta.color, borderRadius: 4 }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div>
            <div style={drillLabel}>Volume by day of week</div>
            {totalCalls === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#aaa' }}>No data yet.</p>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80, marginBottom: 6 }}>
                  {callsByDay.map((count, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '100%', height: Math.max(4, Math.round((count / Math.max(...callsByDay, 1)) * 72)), background: count === Math.max(...callsByDay) ? '#5e3b87' : 'rgba(94,59,135,0.18)', borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {DAY_LABELS.map((d, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '0.65rem', color: callsByDay[i] === Math.max(...callsByDay) ? '#5e3b87' : '#bbb', fontWeight: callsByDay[i] === Math.max(...callsByDay) ? 700 : 400 }}>{d}</div>
                  ))}
                </div>
              </>
            )}
          </div>
        </DrillPanel>
      )}

      {drillOpen === 'leads' && (
        <DrillPanel title="Lead capture — the full picture" onClose={() => setDrillOpen(null)}>
          {/* Section A — AI capture */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={drillLabel}>What your AI handled</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: '#f4effe', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.75rem', fontWeight: 700, color: '#5e3b87', lineHeight: 1, marginBottom: '0.25rem' }}>{totalCalls}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7c5ab8', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'DM Sans', sans-serif" }}>Calls handled</div>
              </div>
              <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.75rem', fontWeight: 700, color: '#1e7a4a', lineHeight: 1, marginBottom: '0.25rem' }}>{leadCapturedCount}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#3db87a', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'DM Sans', sans-serif" }}>Leads captured</div>
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#888', margin: 0, lineHeight: 1.6 }}>
              A lead is captured when your AI identifies enough intent to act on — a name, number, or clear request. Filtered calls, spam, referred enquiries, and hard closes don't count. The follow-up section below tracks the {totalLeads} leads in your CRM pipeline.
            </p>
          </div>

          <div style={{ borderTop: '1px solid rgba(94,59,135,0.08)', marginBottom: '1.5rem' }} />

          {/* Section B — Human chain */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={drillLabel}>What happened after capture</div>
            {totalLeads === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#aaa' }}>No leads captured yet.</p>
            ) : (
              [
                { key: 'new',       label: 'Not yet contacted', color: '#f59e0b', note: 'Captured — no action taken' },
                { key: 'contacted', label: 'Contacted',         color: '#1d4ed8', note: 'You reached out' },
                { key: 'converted', label: 'Converted',         color: '#3db87a', note: 'Marked as won' },
                { key: 'lost',      label: 'Lost',              color: '#94a3b8', note: 'Didn\'t proceed' },
              ].map(({ key, label, color, note }) => {
                const count = leadsByStatus[key] || 0
                const barPct = pct(count, totalLeads)
                return (
                  <div key={key} style={{ marginBottom: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <div>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1a1a1a' }}>{label}</span>
                        <span style={{ fontSize: '0.72rem', color: '#bbb', marginLeft: 8 }}>{note}</span>
                      </div>
                      <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '1rem', fontWeight: 700, color }}>
                        {count}<span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', fontWeight: 400, color: '#aaa', marginLeft: 4 }}>{barPct}%</span>
                      </span>
                    </div>
                    <div style={{ height: 8, background: '#f3f1f6', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barPct}%`, background: color, borderRadius: 4 }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div style={{ borderTop: '1px solid rgba(94,59,135,0.08)', marginBottom: '1.5rem' }} />

          {/* Section C — Neutral diagnosis */}
          {(() => {
            const uncontacted = leadsByStatus.new || 0
            const uncontactedPct = pct(uncontacted, totalLeads)
            let diagnosis, actions = []

            if (totalCalls < 5) {
              diagnosis = 'Not enough data yet — the picture will sharpen after a few more calls.'
            } else if (leadRate < 15) {
              diagnosis = `Your AI is converting ${leadRate}% of calls into lead records. This could reflect the mix of calls you're receiving, your current conversation style, or enquiries that are genuinely out of scope. It's worth reviewing what types of calls are coming in before adjusting anything.`
              actions = [{ label: 'Review conversation style', nav: 'ai' }]
            } else if (totalLeads > 3 && uncontactedPct > 40) {
              diagnosis = `Your AI is capturing leads. The gap is in follow-up — ${uncontacted} of ${totalLeads} captured leads (${uncontactedPct}%) haven't been contacted yet. The faster a lead is followed up, the higher the conversion rate.`
              actions = [{ label: 'View uncontacted leads', nav: 'dashboard' }, { label: 'Enable SMS follow-up', nav: 'ai' }]
            } else if (totalLeads > 0 && pct(leadsByStatus.converted || 0, totalLeads) < 15) {
              diagnosis = `Capture and follow-up look reasonable. The next lever is conversion — how the conversation develops once you make contact. This is a sales and fit question, not a technology one.`
            } else {
              diagnosis = `Capture, follow-up, and conversion all look healthy here. Expanding your referral network is typically the next move when the basics are working.`
              actions = [{ label: 'Manage referral partners', nav: 'referrals' }]
            }

            return (
              <div style={{ background: '#f4effe', borderRadius: 12, padding: '1rem 1.25rem' }}>
                <div style={{ ...drillLabel, color: '#7c5ab8', marginBottom: '0.5rem' }}>Where to look</div>
                <p style={{ fontSize: '0.8125rem', color: '#3a2057', lineHeight: 1.65, margin: actions.length ? '0 0 0.85rem' : 0 }}>{diagnosis}</p>
                {actions.map(({ label, nav }) => (
                  <button key={nav} onClick={() => { setDrillOpen(null); onNavigate && onNavigate(nav) }}
                    style={{ padding: '0.45rem 0.9rem', background: '#5e3b87', color: 'white', border: 'none', borderRadius: 7, fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                    {label}
                  </button>
                ))}
              </div>
            )
          })()}
        </DrillPanel>
      )}

      {drillOpen === 'duration' && (
        <DrillPanel title="Call duration breakdown" onClose={() => setDrillOpen(null)}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={drillLabel}>Calls by duration</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {[
                { key: 'short',  label: 'Under 30s', color: '#94a3b8', bg: '#f1f5f9', note: 'Filtered, spam, or hang-ups' },
                { key: 'medium', label: '30s – 2min', color: '#f0a500', bg: '#fef3c7', note: 'Standard enquiry' },
                { key: 'long',   label: 'Over 2min',  color: '#5e3b87', bg: '#f4effe', note: 'Complex or high-intent call' },
              ].map(({ key, label, color, bg, note }) => (
                <div key={key} style={{ background: bg, borderRadius: 12, padding: '0.85rem', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.75rem', fontWeight: 700, color, lineHeight: 1, marginBottom: '0.25rem' }}>{durationBuckets[key]}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.25rem' }}>{label}</div>
                  <div style={{ fontSize: '0.7rem', color: '#888', lineHeight: 1.4 }}>{note}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 64, marginBottom: 6 }}>
              {[
                { key: 'short', color: '#cbd5e1' },
                { key: 'medium', color: '#f0a500' },
                { key: 'long', color: '#5e3b87' },
              ].map(({ key, color }) => {
                const maxVal = Math.max(durationBuckets.short, durationBuckets.medium, durationBuckets.long, 1)
                return (
                  <div key={key} style={{ flex: 1, height: Math.max(4, Math.round((durationBuckets[key] / maxVal) * 56)), background: color, borderRadius: '4px 4px 0 0', alignSelf: 'flex-end' }} />
                )
              })}
            </div>
            <div style={{ display: 'flex' }}>
              {['Under 30s', '30s–2min', 'Over 2min'].map(l => (
                <div key={l} style={{ flex: 1, textAlign: 'center', fontSize: '0.65rem', color: '#aaa' }}>{l}</div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(94,59,135,0.08)', paddingTop: '1.25rem' }}>
            <div style={drillLabel}>What duration tells you</div>
            <div style={{ fontSize: '0.8125rem', color: '#555', lineHeight: 1.7 }}>
              <p style={{ margin: '0 0 0.6rem' }}><strong style={{ color: '#1a1a1a' }}>High short calls</strong> — callers are hanging up quickly, or your AI is filtering a lot. Check whether your spam and sales filters are set too broadly.</p>
              <p style={{ margin: '0 0 0.6rem' }}><strong style={{ color: '#1a1a1a' }}>Most calls medium</strong> — this is a healthy pattern. Your AI is handling standard enquiries efficiently.</p>
              <p style={{ margin: 0 }}><strong style={{ color: '#1a1a1a' }}>High long calls</strong> — complex or high-intent callers. These are your most valuable interactions and worth reviewing in Listen.</p>
            </div>
            {durationBuckets.long > 0 && (
              <button onClick={() => { setDrillOpen(null); onNavigate && onNavigate('listen') }}
                style={{ marginTop: '1rem', padding: '0.45rem 0.9rem', background: '#5e3b87', color: 'white', border: 'none', borderRadius: 7, fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                Review long calls in Listen →
              </button>
            )}
          </div>
        </DrillPanel>
      )}

    </div>
  )
}

export default DataAnalytics
