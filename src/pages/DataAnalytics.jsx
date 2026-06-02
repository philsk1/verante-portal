import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'

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
    gap: '1rem',
    marginBottom: '1.25rem',
  },
  headlineCard: {
    background: 'white',
    borderRadius: '10px',
    padding: '1.5rem 1.5rem 1.25rem',
    border: '0.5px solid rgba(94,59,135,0.1)',
  },
  headlineLabel: {
    fontSize: '0.7rem',
    fontWeight: '500',
    color: '#aaa',
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
    borderRadius: '10px',
    padding: '1.25rem 1.5rem',
    border: '0.5px solid rgba(94,59,135,0.1)',
    borderLeft: '3px solid #f0a500',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.25rem',
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
    gap: '1.25rem',
  },
  featureCard: {
    background: 'white',
    borderRadius: '10px',
    border: '0.5px solid rgba(94,59,135,0.1)',
    overflow: 'hidden',
    position: 'relative',
  },
  featureHeader: {
    padding: '1.25rem 1.25rem 0',
  },
  featureTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '0.2rem',
  },
  featureDesc: {
    fontSize: '0.775rem',
    color: '#999',
    lineHeight: 1.5,
    marginBottom: '1rem',
  },
  featureBody: {
    padding: '0 1.25rem 1.25rem',
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

const LockedCard = ({ title, desc, previewContent }) => (
  <div style={s.featureCard}>
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

const LiveCard = ({ title, desc, children }) => (
  <div style={s.featureCard}>
    <div style={s.featureHeader}>
      <div style={s.featureTitle}>{title}</div>
      <div style={s.featureDesc}>{desc}</div>
    </div>
    <div style={s.featureBody}>{children}</div>
  </div>
)

// ─── main component ───────────────────────────────────────────────────────────

const DataAnalytics = ({ onNavigate }) => {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [tier, setTier] = useState('light')

  const [totalCalls, setTotalCalls] = useState(0)
  const [totalLeads, setTotalLeads] = useState(0)
  const [avgDurationSecs, setAvgDurationSecs] = useState(0)
  const [outcomeBreakdown, setOutcomeBreakdown] = useState({})
  const [callsByDay, setCallsByDay] = useState([0, 0, 0, 0, 0, 0, 0])

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
          .select('subscription_tier')
          .eq('id', tid)
          .maybeSingle()

        if (tenant) setTier(tenant.subscription_tier || 'light')

        const [callRes, leadRes] = await Promise.all([
          supabase
            .from('call_logs')
            .select('id, created_at, duration, triage_outcome')
            .eq('tenant_id', tid)
            .limit(5000),

          supabase
            .from('leads')
            .select('id')
            .eq('tenant_id', tid),
        ])

        const calls = callRes.data || []
        const leads = leadRes.data || []

        setTotalCalls(calls.length)
        setTotalLeads(leads.length)

        const withDuration = calls.filter(c => c.duration > 0)
        const avgSecs = withDuration.length > 0
          ? Math.round(withDuration.reduce((s, c) => s + c.duration, 0) / withDuration.length)
          : 0
        setAvgDurationSecs(avgSecs)

        const outcomes = {}
        calls.forEach(c => {
          const k = c.triage_outcome || 'unknown'
          outcomes[k] = (outcomes[k] || 0) + 1
        })
        setOutcomeBreakdown(outcomes)

        const byDay = [0, 0, 0, 0, 0, 0, 0]
        calls.forEach(c => {
          const dow = new Date(c.created_at).getDay()
          byDay[dow]++
        })
        setCallsByDay(byDay)
      } catch (err) {
        console.error('Analytics load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const leadRate = pct(totalLeads, totalCalls)
  const isEnterprise = tier === 'enterprise' || tier === 'bespoke'

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
      title: `Your lead capture rate is ${leadRate}%`,
      body: 'A balanced or open triage mode typically increases lead capture. Review your AI Behaviour settings.',
      actionLabel: 'AI Behaviour',
      onAction: () => onNavigate && onNavigate('ai'),
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
    booked:        { label: 'Booked',       color: '#3db87a' },
    lead_captured: { label: 'Lead',         color: '#5e3b87' },
    referred_out:  { label: 'Referred out', color: '#f0a500' },
    filtered:      { label: 'Filtered',     color: '#d1d5db' },
    escalated:     { label: 'Escalated',    color: '#5e3b87' },
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
      <div style={s.headlineGrid}>
        <div style={s.headlineCard}>
          <div style={s.headlineLabel}>Total calls handled</div>
          <div style={s.headlineNumber}>{totalCalls.toLocaleString()}</div>
          <div style={s.headlineSub}>all time</div>
        </div>
        <div style={s.headlineCard}>
          <div style={s.headlineLabel}>Lead capture rate</div>
          <div style={s.headlineNumber}>{leadRate}%</div>
          <div style={s.headlineSub}>leads / total calls</div>
        </div>
        <div style={s.headlineCard}>
          <div style={s.headlineLabel}>Avg call duration</div>
          <div style={s.headlineNumber}>{fmtDuration(avgDurationSecs)}</div>
          <div style={s.headlineSub}>across handled calls</div>
        </div>
      </div>

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
          >
            <div style={s.comingSoon}>Data will populate from your call history.</div>
          </LiveCard>
        ) : (
          <LockedCard
            title="Pricing Intelligence"
            desc="Market rates mentioned by callers, cross-referenced with your win rate."
            previewContent={<PricingPreview />}
          />
        )}

        {/* 2 — Win Rate by Outcome */}
        {isEnterprise ? (
          <LiveCard
            title="Call Outcome Breakdown"
            desc="How your calls resolve — leads, bookings, referrals, and filtered calls."
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
          />
        )}

        {/* 3 — Caller Patterns */}
        {isEnterprise ? (
          <LiveCard
            title="Caller Patterns"
            desc="Which days drive the most call volume — plan your availability around peaks."
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
          />
        )}

        {/* 4 — Competitor Intelligence */}
        {isEnterprise ? (
          <LiveCard
            title="Competitor Intelligence"
            desc="Businesses mentioned by callers when comparing prices or explaining why they called."
          >
            <div style={s.comingSoon}>Data will populate from your call history.</div>
          </LiveCard>
        ) : (
          <LockedCard
            title="Competitor Intelligence"
            desc="Businesses mentioned by callers when comparing prices or explaining why they called."
            previewContent={<CompetitorPreview />}
          />
        )}

      </div>
    </div>
  )
}

export default DataAnalytics
