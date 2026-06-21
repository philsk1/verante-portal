/*
 * AUTHOR: AI agent under direction of Philip Keating (Qerxel founder)
 * VISION: AI call-handling portal for UK sole traders. Every mutation is guarded.
 *
 * FILE: src/pages/DataAnalytics.jsx
 * TOPOLOGY RING: 2 — Contained (1 caller: Portal.jsx)
 *
 * INTENT MAP:
 *   Analytics hub — 3 sub-tabs gated by tenant tier and calendar presence.
 *   Tab "performance": headline KPIs (total calls, lead capture %, avg duration),
 *     outcome breakdown tiles, recommendation card, 4 enterprise feature cards
 *     (Pricing Intelligence, Call Outcome, Caller Patterns, Competitor Intelligence).
 *     Feature cards show live data at enterprise tier; locked preview otherwise.
 *   Tab "intelligence": Q's automatic business analysis from appointment data —
 *     Revenue Evaporation (cancellations + unconverted leads), At-Risk Clients
 *     (fragility index: 2+ cancels in 90 days), Client Segments (Ritual/Explorer/Lapsed),
 *     Staff Intelligence (90-day rebook rate per team member). Requires calendar data.
 *   Tab "outreach": segmented contact lists for targeted re-engagement —
 *     Callback Overdue, Called Never Booked, Lapsed 90+ days, No-shows, Loyal clients.
 *     Requires Solo+ tier.
 *   Drill panels: modal breakdowns for Calls, Leads, Duration. Lead drill includes
 *     a neutral AI-written diagnosis with nav actions.
 *
 * REGRESSION MAP
 *   INPUTS/PARAMS:
 *     onNavigate(tab) — Portal tab-switch callback (used in reco buttons and drill actions)
 *
 *   EXTERNAL READS (Supabase):
 *     tenant_memberships → tenant_id for current user (non-preview)
 *     tenants            → subscription_tier, calendar_tier
 *     call_logs          → id, created_at, duration_seconds, call_outcome (limit 5000)
 *     leads              → id, status (all-time)
 *     appointments       → intelligence tab: id, client_name, client_phone,
 *                          appointment_type, start_time, status, staff_profile_id (365-day window)
 *     staff_profiles     → intelligence tab: id, name, colour (active only)
 *     call_logs          → outreach tab: caller_phone, caller_name, callback_flagged,
 *                          created_at (limit 2000)
 *     appointments       → outreach tab: client_phone, client_name, status, start_time (limit 3000)
 *
 *   MUTATIONS / DB: NONE — this page is entirely read-only.
 *
 *   OUTPUTS / EMITS:
 *     onNavigate(tab)    — called from reco buttons and drill panel action buttons
 *     document.dispatchEvent('q-open-dialogue') — dispatched by openEvaporationQ and
 *       openFragilityQ to open the Q bot dialogue (HelpMascot listener). Non-obvious
 *       coupling: no direct import, fires on document as a CustomEvent.
 *
 * NON-OBVIOUS:
 *   demoPricing and demoCompetitors are permanently useState([]) with no setter exposed
 *   to any load path — enterprise Pricing Intelligence and Competitor Intelligence cards
 *   will always show "Data will populate from your call history." until this is wired.
 *
 *   PerformanceTab contains an IIFE at its top that redeclares rateColor, rateBg,
 *   rateLabel, bookedCount, referredOutCount, filteredCount — these shadow identical
 *   declarations at the PerformanceTab function scope. The outer declarations are dead.
 *
 *   activeTab is force-set to 'intelligence' when subscription_tier === 'schedule_only':
 *   schedule-only tenants have no answer product, so the performance tab would be empty.
 *
 *   calendar_tier === 'none' hides the Q Intelligence and Outreach tabs entirely
 *   (hasSchedule gate).
 *
 * IN-FILE PRIME DIRECTIVES:
 *   1. Never create new files to house extracted logic. Keep it in this file.
 *   2. Run a regression map before every single future edit.
 *   3. No CSS, no CSS variables, inline styles only if layout is touched.
 *   4. Every database mutation must keep its save guard (if applicable).
 *   5. Clean Slate Rule: If complex nesting or multi-path drift occurs, the engineer
 *      must rebuild this module from a blank canvas. No patching.
 */

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

// â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const fmtDuration = (secs) => {
  if (!secs) return '0m'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0)

const fmtAgo = (iso) => {
  if (!iso) return 'â€”'
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 7) return `${d} days ago`
  if (d < 30) return `${Math.round(d / 7)} weeks ago`
  if (d < 365) return `${Math.round(d / 30)} months ago`
  return `${Math.round(d / 365)}yr ago`
}

// â”€â”€â”€ styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ locked card wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ preview content for locked cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PricingPreview = () => (
  <div>
    {[['Boiler service', 'Â£120â€“Â£180', '62%'], ['Emergency callout', 'Â£200â€“Â£350', '81%'], ['Annual service', 'Â£90â€“Â£130', '44%']].map(([svc, range, win]) => (
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
      <div style={{ fontSize: '0.725rem', color: '#bbb', marginBottom: 8 }}>Mon â†’ Sun Â· peak highlighted</div>
      <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
        {intensities.map((v, i) => (
          <div key={i} style={s.patternCell(v)} />
        ))}
      </div>
      <div style={{ fontSize: '0.775rem', color: '#555' }}>Peak: Tueâ€“Thu, 9amâ€“12pm</div>
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

// â”€â”€â”€ live card content (Enterprise) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const LiveCard = ({ title, desc, children, helpText }) => (
  <div style={s.featureCard} data-help={helpText}>
    <div style={s.featureHeader}>
      <div style={s.featureTitle}>{title}</div>
      <div style={s.featureDesc}>{desc}</div>
    </div>
    <div style={s.featureBody}>{children}</div>
  </div>
)

// â”€â”€â”€ outreach contact row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ContactRow = ({ contact, signal, isLast }) => {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(contact.phone)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.7rem 1.25rem', borderBottom: isLast ? 'none' : '1px solid rgba(94,59,135,0.05)' }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1a1a1a', marginBottom: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contact.name}</div>
        <div style={{ fontSize: '0.72rem', color: '#999' }}>{signal}</div>
      </div>
      {contact.phone && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: '0.75rem' }}>
          <span style={{ fontSize: '0.78rem', color: '#5e3b87', fontFamily: 'monospace', letterSpacing: '0.02em' }}>{contact.phone}</span>
          <button
            onClick={copy}
            style={{ background: copied ? '#3db87a' : '#f3f1f6', border: 'none', borderRadius: 6, padding: '0.28rem 0.55rem', fontSize: '0.7rem', color: copied ? 'white' : '#5e3b87', cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s', whiteSpace: 'nowrap' }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  )
}

// â”€â”€â”€ drill-down panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: '#f3f1f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: '#5e3b87', fontWeight: 700, lineHeight: 1, flexShrink: 0 }}>Ã—</button>
      </div>
      <div style={{ overflowY: 'auto', padding: '1.5rem', flex: 1 }}>
        {children}
      </div>
    </div>
  </div>
)

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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




function OutreachSection({ outreachLoading, isLightTier, OUTREACH_SEGS, outreachSegment, setOutreachSegment, onNavigate }) {
  return (
    <div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1a1a1a', marginBottom: '0.3rem' }}>
        Outreach
      </div>
      <div style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6, marginBottom: '1.25rem' }}>
        Your contacts sorted by who most needs to hear from you. Pick a segment and start working through it.
      </div>
  
      {outreachLoading ? (
        <div style={{ color: '#aaa', fontSize: '0.875rem', padding: '2rem 0' }}>Loading contactsâ€¦</div>
      ) : isLightTier ? (
        <div style={{ background: '#faf9fc', borderRadius: 16, padding: '2rem', textAlign: 'center', border: '1px solid rgba(94,59,135,0.1)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f0a500', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>Solo+</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.9375rem', color: '#1a1a1a', marginBottom: '0.4rem' }}>Outreach requires a paid plan</div>
          <div style={{ fontSize: '0.8125rem', color: '#888' }}>Upgrade to Solo or above to see your segmented contact lists.</div>
        </div>
      ) : (
        <>
          {/* Segment pills */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {OUTREACH_SEGS.map(seg => (
              <button
                key={seg.id}
                onClick={() => setOutreachSegment(seg.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.8rem', borderRadius: 20, border: outreachSegment === seg.id ? `1.5px solid ${seg.color}` : '1.5px solid rgba(0,0,0,0.1)', background: outreachSegment === seg.id ? seg.bg : 'white', color: outreachSegment === seg.id ? seg.color : '#888', fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', fontWeight: outreachSegment === seg.id ? 700 : 400, cursor: 'pointer' }}
              >
                {seg.label}
                <span style={{ background: outreachSegment === seg.id ? seg.color : '#e5e7eb', color: outreachSegment === seg.id ? 'white' : '#666', borderRadius: 10, padding: '0.05rem 0.45rem', fontSize: '0.7rem', fontWeight: 700, lineHeight: 1.6 }}>
                  {seg.contacts.length}
                </span>
              </button>
            ))}
          </div>
  
          {/* Contact list */}
          {(() => {
            const seg = OUTREACH_SEGS.find(s => s.id === outreachSegment)
            if (!seg) return null
  
            if (seg.contacts.length === 0) {
              return (
                <div style={{ background: '#f9f8fc', borderRadius: 16, padding: '2rem', textAlign: 'center', border: '1px solid rgba(94,59,135,0.08)' }}>
                  <div style={{ fontSize: '0.875rem', color: '#888' }}>No contacts in this segment right now.</div>
                </div>
              )
            }
  
            return (
              <div style={{ background: 'white', borderRadius: 16, border: '0.5px solid rgba(94,59,135,0.1)', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.25rem', borderBottom: '1px solid rgba(94,59,135,0.06)', background: '#faf9fc' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1a1a1a' }}>{seg.label}</div>
                  <div style={{ fontSize: '0.72rem', color: '#aaa' }}>{seg.contacts.length} contact{seg.contacts.length !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ maxHeight: 440, overflowY: 'auto' }}>
                  {seg.contacts.map((c, i) => (
                    <ContactRow
                      key={`${seg.id}-${c.phone}-${i}`}
                      contact={c}
                      signal={seg.signal(c)}
                      isLast={i === seg.contacts.length - 1}
                    />
                  ))}
                </div>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}

function openEvaporationQ(cancelledThisMonth, fragilityClients, e) {
  const n = cancelledThisMonth.length
  const atRisk = fragilityClients.length
  document.dispatchEvent(new CustomEvent('q-open-dialogue', { detail: {
    zoneText: `Revenue Evaporation: ${n} appointment${n !== 1 ? 's' : ''} cancelled this month. ${atRisk > 0 ? `${atRisk} client${atRisk !== 1 ? 's' : ''} have cancelled 2+ times in 90 days: ${fragilityClients.map(c => `${c.name} (${c.cancels} cancellations)`).join(', ')}.` : 'No repeat-cancellation clients flagged.'} Look at patterns, root causes, and what the portal offers to reduce this.`,
    zoneName: `${n} cancelled this month`,
    tabName: 'Analytics',
    rect: e.currentTarget.getBoundingClientRect(),
    initialBotMessage: `I can see ${n} appointment${n !== 1 ? 's were' : ' was'} cancelled this month${atRisk > 0 ? `, and ${atRisk} client${atRisk !== 1 ? 's are' : ' is'} showing repeat cancellations` : ''}. Shall I look at what might be driving this and what you can do about it?`,
  }}))
}

function openFragilityQ(fragilityClients, e) {
  const n = fragilityClients.length
  document.dispatchEvent(new CustomEvent('q-open-dialogue', { detail: {
    zoneText: `At-Risk Clients (Fragility Index): ${n} client${n !== 1 ? 's have' : ' has'} cancelled 2 or more times in the last 90 days: ${fragilityClients.map(c => `${c.name} (${c.cancels} cancellations)`).join(', ')}. Repeated cancellations are an early warning sign before a client stops booking entirely. Advise on specific retention options available in the portal.`,
    zoneName: `${n} at-risk client${n !== 1 ? 's' : ''}`,
    tabName: 'Analytics',
    rect: e.currentTarget.getBoundingClientRect(),
    initialBotMessage: `${n} client${n !== 1 ? 's are' : ' is'} showing repeat cancellations — this is often the first sign of a drifting relationship. Shall I look at what might help retain them?`,
  }}))
}

function EvaporationCard({ cancelledThisMonth, fragilityClients, hasAnswerProduct, unconvertedLeads }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: '1.25rem 1.25rem 1rem', border: '0.5px solid rgba(94,59,135,0.1)', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.9375rem', color: '#1a1a1a', marginBottom: '0.15rem' }}>Revenue Evaporation</div>
        <div style={{ fontSize: '0.75rem', color: '#aaa' }}>Where bookings slipped away this month</div>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <div
          style={{ flex: 1, background: '#fff5f5', borderRadius: 10, padding: '0.75rem', textAlign: 'center', cursor: cancelledThisMonth.length > 0 ? 'pointer' : 'default', transition: 'box-shadow 0.15s' }}
          onClick={cancelledThisMonth.length > 0 ? e => openEvaporationQ(cancelledThisMonth, fragilityClients, e) : undefined}
          onMouseEnter={cancelledThisMonth.length > 0 ? e => { e.currentTarget.style.boxShadow = '0 0 0 2px #ef444440' } : undefined}
          onMouseLeave={cancelledThisMonth.length > 0 ? e => { e.currentTarget.style.boxShadow = 'none' } : undefined}
        >
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: '#ef4444' }}>{cancelledThisMonth.length}</div>
          <div style={{ fontSize: '0.7rem', color: '#aaa', marginTop: 2 }}>cancelled this month</div>
          {cancelledThisMonth.length > 0 && <div style={{ fontSize: '0.6rem', color: '#ef4444', marginTop: 4, fontWeight: 600 }}>Ask Q &rarr;</div>}
        </div>
        {hasAnswerProduct && (
          <div data-tenant-context="answer-product-only" style={{ flex: 1, background: '#fff8f0', borderRadius: 10, padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: '#f0a500' }}>{unconvertedLeads}</div>
            <div style={{ fontSize: '0.7rem', color: '#aaa', marginTop: 2 }}>leads not converted</div>
          </div>
        )}
      </div>
      {cancelledThisMonth.length === 0 && (!hasAnswerProduct || unconvertedLeads === 0) ? (
        <div style={{ fontSize: '0.8125rem', color: '#3db87a', fontWeight: 500 }}>No evaporation to report this month. Good work.</div>
      ) : (
        <div style={{ fontSize: '0.8125rem', color: '#555', lineHeight: 1.6 }}>
          {cancelledThisMonth.length > 0 && (
            <span>
              {cancelledThisMonth.length} appointment{cancelledThisMonth.length !== 1 ? 's' : ''} cancelled this month.
              {"That's time in your diary that didn't earn."}{' '}
            </span>
          )}
          {hasAnswerProduct && unconvertedLeads > 0 && (
            <span>
              {unconvertedLeads} lead{unconvertedLeads !== 1 ? 's' : ''} came in and {"didn't"} convert to a booking.
              Worth reviewing those caller notes.
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function FragilityCard({ fragilityClients }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: '1.25rem 1.25rem 1rem', border: '0.5px solid rgba(94,59,135,0.1)', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div
        style={{ cursor: fragilityClients.length > 0 ? 'pointer' : 'default' }}
        onClick={fragilityClients.length > 0 ? e => openFragilityQ(fragilityClients, e) : undefined}
      >
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.9375rem', color: '#1a1a1a', marginBottom: '0.15rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          At-Risk Clients
          {fragilityClients.length > 0 && <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#f0a500', cursor: 'pointer' }}>Ask Q &rarr;</span>}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#aaa' }}>{"Clients who've cancelled 2+ times in 90 days"}</div>
      </div>
      {fragilityClients.length === 0 ? (
        <div style={{ fontSize: '0.8125rem', color: '#3db87a', fontWeight: 500, paddingTop: '0.25rem' }}>
          No clients showing repeat cancellations right now.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {fragilityClients.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.6rem', background: '#fef9f0', borderRadius: 8 }}>
                <span style={{ fontSize: '0.8125rem', color: '#1a1a1a', fontWeight: 500 }}>{c.name}</span>
                <span style={{ fontSize: '0.72rem', color: '#f0a500', fontWeight: 700, background: '#fde68a', borderRadius: 8, padding: '0.1rem 0.45rem' }}>
                  {c.cancels} cancel{c.cancels !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#555', lineHeight: 1.6 }}>
            Repeated rescheduling is the earliest sign of a drifting relationship &mdash; often before a client stops booking altogether.
            A personal message to each of these clients costs nothing.
          </div>
        </>
      )}
    </div>
  )
}

function SegmentsCard({ ritualCount, explorerCount, lapsedCount }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: '1.25rem 1.25rem 1rem', border: '0.5px solid rgba(94,59,135,0.1)', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.9375rem', color: '#1a1a1a', marginBottom: '0.15rem' }}>Client Segments</div>
        <div style={{ fontSize: '0.75rem', color: '#aaa' }}>Your clients grouped by how they actually behave</div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {[
          { label: 'Ritual', count: ritualCount, bg: '#f0f4ff', col: '#1d4ed8' },
          { label: 'Explorer', count: explorerCount, bg: '#f0fdf4', col: '#16a34a' },
          { label: 'Lapsed', count: lapsedCount, bg: '#fff8f0', col: '#f0a500' },
        ].map(seg => (
          <div key={seg.label} style={{ flex: 1, background: seg.bg, borderRadius: 10, padding: '0.75rem 0.6rem', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.4rem', color: seg.col }}>{seg.count}</div>
            <div style={{ fontSize: '0.7rem', color: seg.col, fontWeight: 600, marginTop: 2 }}>{seg.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {ritualCount > 0 && <div style={{ fontSize: '0.8rem', color: '#555', lineHeight: 1.5 }}><span style={{ fontWeight: 600, color: '#1d4ed8' }}>Ritual</span> &mdash; loyal and schedule-sensitive. Avoid changing their usual slot without warning.</div>}
        {explorerCount > 0 && <div style={{ fontSize: '0.8rem', color: '#555', lineHeight: 1.5 }}><span style={{ fontWeight: 600, color: '#16a34a' }}>Explorer</span> &mdash; trying different services. Good candidates for new offerings.</div>}
        {lapsedCount > 0 && <div style={{ fontSize: '0.8rem', color: '#555', lineHeight: 1.5 }}><span style={{ fontWeight: 600, color: '#f0a500' }}>Lapsed</span> &mdash; gone quiet but not gone. A message referencing their last visit often works.</div>}
        {ritualCount === 0 && explorerCount === 0 && lapsedCount === 0 && <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Not enough repeat bookings yet to identify patterns. Check back when clients have visited 3+ times.</div>}
      </div>
    </div>
  )
}

function StaffIntelCard({ staffIntel }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: '1.25rem 1.25rem 1rem', border: '0.5px solid rgba(94,59,135,0.1)', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.9375rem', color: '#1a1a1a', marginBottom: '0.15rem' }}>Staff Intelligence</div>
        <div style={{ fontSize: '0.75rem', color: '#aaa' }}>Who keeps clients coming back within 90 days</div>
      </div>
      {staffIntel.length === 0 ? (
        <div style={{ fontSize: '0.8125rem', color: '#aaa', lineHeight: 1.6 }}>
          Q needs at least 5 completed appointments per team member to calculate re-booking rates.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {staffIntel.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.colour || '#5e3b87', flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: '0.8125rem', color: '#1a1a1a', fontWeight: 500 }}>{s.name}</div>
                <div style={{ width: `${s.rate}%`, maxWidth: '40%', height: 6, background: i === 0 ? '#5e3b87' : 'rgba(94,59,135,0.25)', borderRadius: 4, minWidth: 4 }} />
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: i === 0 ? '#5e3b87' : '#555', minWidth: 36, textAlign: 'right' }}>{s.rate}%</div>
              </div>
            ))}
          </div>
          {staffIntel.length >= 2 && (
            <div style={{ fontSize: '0.8125rem', color: '#555', lineHeight: 1.6 }}>
              {staffIntel[0].name} brings clients back at a {staffIntel[0].rate}% rate &mdash; the highest in the team.
              {staffIntel[staffIntel.length - 1].rate < staffIntel[0].rate - 20 && (
                <span> {staffIntel[staffIntel.length - 1].name}&apos;s rate is {staffIntel[staffIntel.length - 1].rate}% &mdash; worth understanding {"what's"} different.</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function QIntelligenceSection({ qLoading, appointments, cancelledThisMonth, fragilityClients, ritualCount, explorerCount, lapsedCount, staffIntel, hasAnswerProduct, unconvertedLeads }) {
  return (
    <div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1a1a1a', marginBottom: '0.3rem' }}>
        {"Q's read on your business"}
      </div>
      <div style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        The analysis tools big business uses &mdash; now working on yours. Q runs these checks automatically from your booking data.
      </div>

      {qLoading ? (
        <div style={{ color: '#aaa', fontSize: '0.875rem', padding: '2rem 0' }}>Q is reading your data&hellip;</div>
      ) : appointments.length < 5 ? (
        <div style={{ background: '#f9f8fc', borderRadius: 16, padding: '2rem', textAlign: 'center', border: '1px solid rgba(94,59,135,0.08)' }}>
          <div style={{ fontSize: '0.875rem', color: '#888', lineHeight: 1.7 }}>
            Q Intelligence needs a few weeks of appointment data to find patterns.<br />
            <span style={{ color: '#5e3b87', fontWeight: 500 }}>Come back as your calendar fills up.</span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 640 ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
          <EvaporationCard cancelledThisMonth={cancelledThisMonth} fragilityClients={fragilityClients} hasAnswerProduct={hasAnswerProduct} unconvertedLeads={unconvertedLeads} />
          <FragilityCard fragilityClients={fragilityClients} />
          <SegmentsCard ritualCount={ritualCount} explorerCount={explorerCount} lapsedCount={lapsedCount} />
          <StaffIntelCard staffIntel={staffIntel} />
        </div>
      )}
    </div>
  )
}

function PerformanceTab({ isMobile, leadRate, totalCalls, outcomeBreakdown, avgDurationSecs, leadCapturedCount, setDrillOpen, reco, isEnterprise, demoPricing, demoCompetitors, callsByDay, maxDay }) {
  const rateColor = leadRate >= 35 ? '#3db87a' : leadRate >= 15 ? '#f0a500' : '#ef4444'
  const rateBg    = leadRate >= 35 ? '#bbf7d0' : leadRate >= 15 ? '#fde68a' : '#fecaca'
  const rateLabel = leadRate >= 35 ? 'Strong performance' : leadRate >= 15 ? 'Room to improve' : 'Needs attention'
  const bookedCount      = outcomeBreakdown.booked || 0
  const referredOutCount = outcomeBreakdown.referred_out || 0
  const filteredCount    = (outcomeBreakdown.filtered || 0) + (outcomeBreakdown.spam || 0) + (outcomeBreakdown.hard_close || 0)
  return (
    <>
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
          {/* Row 1 â€” volume Â· rate Â· duration */}
          <div style={{ ...s.headlineGrid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)' }}>
            <div onClick={() => setDrillOpen('calls')} style={{ ...s.headlineCard, background: '#ddd6fe', borderLeft: '4px solid #5e3b87', cursor: 'pointer', userSelect: 'none' }}
              data-help="Total calls handled is the cumulative number of calls your AI has answered since your account was activated.">
              <div style={s.headlineLabel}>Total calls handled</div>
              <div style={{ ...s.headlineNumber, color: '#5e3b87' }}>{totalCalls.toLocaleString()}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={s.headlineSub}>all time</div>
                <div style={{ fontSize: '0.7rem', color: '#7c5ab8', fontWeight: 600 }}>Explore â†’</div>
              </div>
            </div>
            <div onClick={() => setDrillOpen('leads')} style={{ ...s.headlineCard, background: rateBg, borderLeft: `4px solid ${rateColor}`, cursor: 'pointer', userSelect: 'none' }}
              data-help="Lead capture rate is the percentage of all calls that resulted in a lead. A healthy rate is 30â€“50% for most service businesses.">
              <div style={s.headlineLabel}>Lead capture rate</div>
              <div style={{ ...s.headlineNumber, color: rateColor }}>{leadRate}%</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ ...s.headlineSub, color: rateColor, fontWeight: 500 }}>{totalCalls > 0 ? rateLabel : 'no calls yet'}</div>
                <div style={{ fontSize: '0.7rem', color: rateColor, fontWeight: 600 }}>Explore â†’</div>
              </div>
            </div>
            <div onClick={() => setDrillOpen('duration')} style={{ ...s.headlineCard, background: '#bfdbfe', borderLeft: '4px solid #1d4ed8', cursor: 'pointer', userSelect: 'none' }}
              data-help="Average call duration tells you how long your AI spends on a typical call. Very short calls often mean the caller hung up early or was filtered as spam.">
              <div style={s.headlineLabel}>Avg call duration</div>
              <div style={{ ...s.headlineNumber, color: '#1d4ed8' }}>{fmtDuration(avgDurationSecs)}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={s.headlineSub}>across handled calls</div>
                <div style={{ fontSize: '0.7rem', color: '#1d4ed8', fontWeight: 600 }}>Explore â†’</div>
              </div>
            </div>
          </div>
    
          {/* Row 2 â€” outcome breakdown tiles */}
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
    
    {/* Feature cards 2Ã—2 */}
    <div style={s.featureGrid}>
    
      {/* 1 â€” Pricing Intelligence */}
      {isEnterprise ? (
        <LiveCard
          title="Pricing Intelligence"
          desc="Market rates mentioned by callers, cross-referenced with your win rate."
          helpText="Pricing Intelligence listens for price signals in your call transcripts â€” when callers mention a competitor's quote, a budget, or a price they've been given. Over time this builds a real picture of what the market charges and where you're winning or losing on price. Enterprise only."
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
                      ? `Â£${item.market_low.toLocaleString()}â€“Â£${item.market_high.toLocaleString()}`
                      : `${item.market_low}%â€“${item.market_high}%`}
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
          helpText="Pricing Intelligence listens for price signals in your call transcripts â€” when callers mention a competitor's quote, a budget, or a price they've been given. Over time this builds a real picture of what the market charges and where you're winning or losing on price. Enterprise only."
        />
      )}
    
      {/* 2 â€” Win Rate by Outcome */}
      {isEnterprise ? (
        <LiveCard
          title="Call Outcome Breakdown"
          desc="How your calls resolve â€” leads, bookings, referrals, and filtered calls."
          helpText="Call Outcome Breakdown shows how your calls are resolving â€” what percentage became leads, got booked, were referred out, or were filtered as sales calls. Use this to understand where your AI is doing well and where enquiries are being lost."
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
          desc="How your calls resolve â€” leads, bookings, referrals, and filtered calls."
          previewContent={<WinRatePreview />}
          helpText="Call Outcome Breakdown shows how your calls are resolving â€” what percentage became leads, got booked, were referred out, or were filtered as sales calls. Enterprise only."
        />
      )}
    
      {/* 3 â€” Caller Patterns */}
      {isEnterprise ? (
        <LiveCard
          title="Caller Patterns"
          desc="Which days drive the most call volume â€” plan your availability around peaks."
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
          desc="Which days and times drive the most call volume â€” plan your availability around peaks."
          previewContent={<PatternPreview />}
          helpText="Caller Patterns shows which days of the week your call volume peaks so you can plan availability around them. Enterprise only."
        />
      )}
    
      {/* 4 â€” Competitor Intelligence */}
      {isEnterprise ? (
        <LiveCard
          title="Competitor Intelligence"
          desc="Businesses mentioned by callers when comparing prices or explaining why they called."
          helpText="Competitor Intelligence captures when callers name other businesses â€” 'I got a quote from X', 'I tried Y first'. Over time this builds a map of who you're competing against and how often. Useful for pricing and positioning decisions. Enterprise only."
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
          helpText="Competitor Intelligence captures when callers name other businesses â€” 'I got a quote from X', 'I tried Y first'. Over time this builds a map of who you're competing against and how often. Enterprise only."
        />
      )}
    
    </div>
    </>
  )
}

// â”€â”€â”€ main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  const [demoPricing] = useState([])
  const [demoCompetitors] = useState([])

  const [drillOpen, setDrillOpen] = useState(null) // null | 'calls' | 'leads' | 'duration'
  const [leadsByStatus, setLeadsByStatus] = useState({ new: 0, contacted: 0, converted: 0, lost: 0 })
  const [durationBuckets, setDurationBuckets] = useState({ short: 0, medium: 0, long: 0 })

  const [tenantId, setTenantId] = useState(null)
  const [activeTab, setActiveTab] = useState('performance')
  const [hasSchedule, setHasSchedule] = useState(false)
  const [qLoading, setQLoading] = useState(false)
  const [appointments, setAppointments] = useState([])
  const [staffList, setStaffList] = useState([])
  const [qDrillOpen, setQDrillOpen] = useState(null)

  const [outreachLoading, setOutreachLoading] = useState(false)
  const [outreachCallLogs, setOutreachCallLogs] = useState([])
  const [outreachAppts, setOutreachAppts] = useState([])
  const [outreachSegment, setOutreachSegment] = useState('callback')

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
          .select('subscription_tier, calendar_tier')
          .eq('id', tid)
          .maybeSingle()

        if (tenant) {
          setTier(tenant.subscription_tier || 'light')
          setTenantId(tid)
          setHasSchedule((tenant.calendar_tier || 'none') !== 'none')
          if (tenant.subscription_tier === 'schedule_only') setActiveTab('intelligence')
        }

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

  useEffect(() => {
    if (activeTab !== 'intelligence' || !tenantId) return
    const loadQ = async () => {
      setQLoading(true)
      const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
      const [apptRes, staffRes] = await Promise.all([
        supabase.from('appointments')
          .select('id,client_name,client_phone,appointment_type,start_time,status,staff_profile_id')
          .eq('tenant_id', tenantId)
          .gte('start_time', cutoff)
          .order('start_time'),
        supabase.from('staff_profiles')
          .select('id,name,colour')
          .eq('tenant_id', tenantId)
          .or('active.eq.true,active.is.null'),
      ])
      setAppointments(apptRes.data || [])
      setStaffList(staffRes.data || [])
      setQLoading(false)
    }
    loadQ()
  }, [activeTab, tenantId])

  useEffect(() => {
    if (activeTab !== 'outreach' || !tenantId) return
    const load = async () => {
      setOutreachLoading(true)
      const [callRes, apptRes] = await Promise.all([
        supabase.from('call_logs')
          .select('id,caller_phone,caller_name,callback_flagged,created_at')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(2000),
        supabase.from('appointments')
          .select('id,client_phone,client_name,status,start_time')
          .eq('tenant_id', tenantId)
          .order('start_time', { ascending: false })
          .limit(3000),
      ])
      setOutreachCallLogs(callRes.data || [])
      setOutreachAppts(apptRes.data || [])
      setOutreachLoading(false)
    }
    load()
  }, [activeTab, tenantId])

  const leadCapturedCount = outcomeBreakdown.lead_captured || 0
  const leadRate = pct(leadCapturedCount, totalCalls)
  const isEnterprise = ['enterprise', 'bespoke'].includes(tier)
  const hasAnswerProduct = tier && tier !== 'schedule_only'

  // Q Intelligence derived values â€” computed on each render from appointments state
  const qNow = Date.now()
  const qThirtyAgo = qNow - 30 * 24 * 60 * 60 * 1000
  const qNinetyAgo = qNow - 90 * 24 * 60 * 60 * 1000
  const qFortyFiveAgo = qNow - 45 * 24 * 60 * 60 * 1000
  const qSixMonthsAgo = qNow - 180 * 24 * 60 * 60 * 1000

  const clientMap = {}
  appointments.forEach(a => {
    if (!a.client_phone) return
    if (!clientMap[a.client_phone]) clientMap[a.client_phone] = { name: a.client_name || 'Unknown', phone: a.client_phone, appts: [] }
    clientMap[a.client_phone].appts.push(a)
  })
  const clientGroups = Object.values(clientMap)

  const fragilityClients = clientGroups
    .filter(c => c.appts.filter(a => a.status === 'cancelled' && new Date(a.start_time).getTime() > qNinetyAgo).length >= 2)
    .map(c => ({ ...c, cancels: c.appts.filter(a => a.status === 'cancelled' && new Date(a.start_time).getTime() > qNinetyAgo).length }))
    .sort((a, b) => b.cancels - a.cancels)
    .slice(0, 6)

  let ritualCount = 0, explorerCount = 0, lapsedCount = 0
  clientGroups.forEach(c => {
    const done = c.appts.filter(a => a.status !== 'cancelled').sort((x, y) => new Date(x.start_time) - new Date(y.start_time))
    if (done.length < 2) return
    const lastT = new Date(done[done.length - 1].start_time).getTime()
    if (lastT < qFortyFiveAgo && lastT > qSixMonthsAgo) { lapsedCount++; return }
    if (done.length >= 3) {
      const days = done.map(a => new Date(a.start_time).getDay())
      const svcs = done.map(a => a.appointment_type || 'general')
      const dayMode = days.reduce((a, b) => days.filter(v => v === a).length >= days.filter(v => v === b).length ? a : b)
      const svcMode = svcs.reduce((a, b) => svcs.filter(v => v === a).length >= svcs.filter(v => v === b).length ? a : b)
      if (days.filter(d => d === dayMode).length / days.length >= 0.65 && svcs.filter(s => s === svcMode).length / svcs.length >= 0.65) { ritualCount++; return }
      if (new Set(svcs).size >= 3) explorerCount++
    }
  })

  const cancelledThisMonth = appointments.filter(a => a.status === 'cancelled' && new Date(a.start_time).getTime() > qThirtyAgo)
  const unconvertedLeads = totalLeads - (leadsByStatus.converted || 0)

  const staffStats = {}
  staffList.forEach(s => { staffStats[s.id] = { id: s.id, name: s.name, colour: s.colour, total: 0, rebooks: 0 } })
  appointments
    .filter(a => a.status !== 'cancelled' && a.staff_profile_id && staffStats[a.staff_profile_id])
    .forEach(a => {
      staffStats[a.staff_profile_id].total++
      const t = new Date(a.start_time).getTime()
      const ninetyMs = 90 * 24 * 60 * 60 * 1000
      if (appointments.some(b => b.client_phone && b.client_phone === a.client_phone && b.id !== a.id && b.status !== 'cancelled' && new Date(b.start_time).getTime() > t && new Date(b.start_time).getTime() < t + ninetyMs)) {
        staffStats[a.staff_profile_id].rebooks++
      }
    })
  const staffIntel = Object.values(staffStats)
    .filter(s => s.total >= 5)
    .map(s => ({ ...s, rate: Math.round((s.rebooks / s.total) * 100) }))
    .sort((a, b) => b.rate - a.rate)

  // â”€â”€ Outreach segments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const isLightTier = !tier || tier === 'light' || tier === 'free'

  const callByPhone = {}
  outreachCallLogs.forEach(c => {
    if (!c.caller_phone) return
    const p = c.caller_phone
    if (!callByPhone[p]) callByPhone[p] = { name: c.caller_name || 'Unknown', phone: p, count: 0, latest: c.created_at, callbackFlagged: false }
    callByPhone[p].count++
    if (c.callback_flagged) callByPhone[p].callbackFlagged = true
    if (c.created_at > callByPhone[p].latest) callByPhone[p].latest = c.created_at
  })

  const apptByPhone = {}
  outreachAppts.forEach(a => {
    if (!a.client_phone) return
    if (!apptByPhone[a.client_phone]) apptByPhone[a.client_phone] = { name: a.client_name || 'Unknown', phone: a.client_phone, appts: [] }
    apptByPhone[a.client_phone].appts.push(a)
  })

  const orNow = Date.now()
  const ninetyMs = 90 * 24 * 60 * 60 * 1000
  const sixtyMs  = 60 * 24 * 60 * 60 * 1000
  const yearMs   = 365 * 24 * 60 * 60 * 1000

  const callbackOverdue = Object.values(callByPhone)
    .filter(c => c.callbackFlagged)
    .sort((a, b) => a.latest < b.latest ? 1 : -1)
    .slice(0, 50)

  const neverBooked = Object.values(callByPhone)
    .filter(c => !apptByPhone[c.phone])
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)

  const lapsedContacts = Object.values(apptByPhone).map(p => {
    const done = p.appts.filter(a => a.status === 'completed')
    if (!done.length) return null
    const last = done.reduce((l, a) => a.start_time > l.start_time ? a : l)
    const ms = orNow - new Date(last.start_time).getTime()
    if (ms < ninetyMs) return null
    return { ...p, lastVisit: last.start_time, visitCount: done.length, ms }
  }).filter(Boolean).sort((a, b) => b.ms - a.ms).slice(0, 50)

  const noShows = Object.values(apptByPhone).map(p => {
    const recent = p.appts.filter(a => a.status === 'no_show' && orNow - new Date(a.start_time).getTime() < sixtyMs)
    if (!recent.length) return null
    return { ...p, lastNoShow: recent[0].start_time, noShowCount: recent.length }
  }).filter(Boolean).sort((a, b) => a.lastNoShow < b.lastNoShow ? 1 : -1).slice(0, 50)

  const loyalContacts = Object.values(apptByPhone).map(p => {
    const done = p.appts.filter(a => a.status === 'completed')
    if (done.length < 3) return null
    const last = done.reduce((l, a) => a.start_time > l.start_time ? a : l)
    if (orNow - new Date(last.start_time).getTime() > yearMs) return null
    return { ...p, visitCount: done.length, lastVisit: last.start_time }
  }).filter(Boolean).sort((a, b) => b.visitCount - a.visitCount).slice(0, 50)

  const OUTREACH_SEGS = [
    { id: 'callback',     label: 'Callback overdue',     color: '#ef4444', bg: '#fef2f2', contacts: callbackOverdue,  signal: c => `Called ${fmtAgo(c.latest)} â€” flagged for callback` },
    { id: 'never_booked', label: 'Called, never booked', color: '#f0a500', bg: '#fff8f0', contacts: neverBooked,      signal: c => `${c.count} call${c.count > 1 ? 's' : ''} Â· last ${fmtAgo(c.latest)}` },
    { id: 'lapsed',       label: 'Lapsed 90+ days',      color: '#1d4ed8', bg: '#eff6ff', contacts: lapsedContacts,   signal: c => `Last visit ${fmtAgo(c.lastVisit)} Â· ${c.visitCount} visits` },
    { id: 'no_show',      label: 'No-shows',              color: '#7c3aed', bg: '#f5f3ff', contacts: noShows,          signal: c => `No-showed ${fmtAgo(c.lastNoShow)}` },
    { id: 'loyal',        label: 'Loyal clients',         color: '#16a34a', bg: '#f0fdf4', contacts: loyalContacts,    signal: c => `${c.visitCount} visits Â· last ${fmtAgo(c.lastVisit)}` },
  ]

  // â”€â”€ recommendation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  let reco
  if (!isEnterprise) {
    reco = {
      title: 'Unlock deep analytics with Enterprise',
      body: 'See pricing intelligence, win rates by service, caller patterns, and competitor mentions â€” all generated automatically from your call data.',
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

  // â”€â”€ enterprise: caller patterns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const maxDay = Math.max(...callsByDay, 1)

  if (loading) {
    return <div style={{ padding: '2rem', color: '#aaa', fontSize: '0.875rem' }}>Loading analyticsâ€¦</div>
  }

  return (
    <div>

      {/* Sub-tab switcher */}
      {hasAnswerProduct && hasSchedule && (
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.5rem', background: '#f3f1f6', borderRadius: 10, padding: '0.3rem' }}>
          <button
            onClick={() => setActiveTab('performance')}
            style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: 7, border: 'none', background: activeTab === 'performance' ? 'white' : 'transparent', color: activeTab === 'performance' ? '#1a1a1a' : '#888', fontWeight: activeTab === 'performance' ? 600 : 400, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s', boxShadow: activeTab === 'performance' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}
          >
            Call Performance
          </button>
          <button
            onClick={() => setActiveTab('intelligence')}
            style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: 7, border: 'none', background: activeTab === 'intelligence' ? 'white' : 'transparent', color: activeTab === 'intelligence' ? '#1a1a1a' : '#888', fontWeight: activeTab === 'intelligence' ? 600 : 400, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s', boxShadow: activeTab === 'intelligence' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}
          >
            Q Intelligence
          </button>
          <button
            onClick={() => setActiveTab('outreach')}
            style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: 7, border: 'none', background: activeTab === 'outreach' ? 'white' : 'transparent', color: activeTab === 'outreach' ? '#1a1a1a' : '#888', fontWeight: activeTab === 'outreach' ? 600 : 400, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s', boxShadow: activeTab === 'outreach' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}
          >
            Outreach
          </button>
        </div>
      )}

      {activeTab === 'performance' && <PerformanceTab isMobile={isMobile} leadRate={leadRate} totalCalls={totalCalls} outcomeBreakdown={outcomeBreakdown} avgDurationSecs={avgDurationSecs} leadCapturedCount={leadCapturedCount} setDrillOpen={setDrillOpen} reco={reco} isEnterprise={isEnterprise} demoPricing={demoPricing} demoCompetitors={demoCompetitors} callsByDay={callsByDay} maxDay={maxDay} />}

      {activeTab === 'intelligence' && <QIntelligenceSection qLoading={qLoading} appointments={appointments} cancelledThisMonth={cancelledThisMonth} fragilityClients={fragilityClients} ritualCount={ritualCount} explorerCount={explorerCount} lapsedCount={lapsedCount} staffIntel={staffIntel} hasAnswerProduct={hasAnswerProduct} unconvertedLeads={unconvertedLeads} />}

      {activeTab === 'outreach' && <OutreachSection outreachLoading={outreachLoading} isLightTier={isLightTier} OUTREACH_SEGS={OUTREACH_SEGS} outreachSegment={outreachSegment} setOutreachSegment={setOutreachSegment} onNavigate={onNavigate} />}

      {/* â”€â”€ Drill panels â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}

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
                    <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{count} Â· {barPct}%</span>
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
        <DrillPanel title="Lead capture â€” the full picture" onClose={() => setDrillOpen(null)}>
          {/* Section A â€” AI capture */}
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
              A lead is captured when your AI identifies enough intent to act on â€” a name, number, or clear request. Filtered calls, spam, referred enquiries, and hard closes don't count. The follow-up section below tracks the {totalLeads} leads in your CRM pipeline.
            </p>
          </div>

          <div style={{ borderTop: '1px solid rgba(94,59,135,0.08)', marginBottom: '1.5rem' }} />

          {/* Section B â€” Human chain */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={drillLabel}>What happened after capture</div>
            {totalLeads === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#aaa' }}>No leads captured yet.</p>
            ) : (
              [
                { key: 'new',       label: 'Not yet contacted', color: '#f59e0b', note: 'Captured â€” no action taken' },
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

          {/* Section C â€” Neutral diagnosis */}
          {(() => {
            const uncontacted = leadsByStatus.new || 0
            const uncontactedPct = pct(uncontacted, totalLeads)
            let diagnosis, actions = []

            if (totalCalls < 5) {
              diagnosis = 'Not enough data yet â€” the picture will sharpen after a few more calls.'
            } else if (leadRate < 15) {
              diagnosis = `Your AI is converting ${leadRate}% of calls into lead records. This could reflect the mix of calls you're receiving, your current conversation style, or enquiries that are genuinely out of scope. It's worth reviewing what types of calls are coming in before adjusting anything.`
              actions = [{ label: 'Review conversation style', nav: 'ai' }]
            } else if (totalLeads > 3 && uncontactedPct > 40) {
              diagnosis = `Your AI is capturing leads. The gap is in follow-up â€” ${uncontacted} of ${totalLeads} captured leads (${uncontactedPct}%) haven't been contacted yet. The faster a lead is followed up, the higher the conversion rate.`
              actions = [{ label: 'View uncontacted leads', nav: 'dashboard' }, { label: 'Enable SMS follow-up', nav: 'ai' }]
            } else if (totalLeads > 0 && pct(leadsByStatus.converted || 0, totalLeads) < 15) {
              diagnosis = `Capture and follow-up look reasonable. The next lever is conversion â€” how the conversation develops once you make contact. This is a sales and fit question, not a technology one.`
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
                { key: 'medium', label: '30s â€“ 2min', color: '#f0a500', bg: '#fef3c7', note: 'Standard enquiry' },
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
              {['Under 30s', '30sâ€“2min', 'Over 2min'].map(l => (
                <div key={l} style={{ flex: 1, textAlign: 'center', fontSize: '0.65rem', color: '#aaa' }}>{l}</div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(94,59,135,0.08)', paddingTop: '1.25rem' }}>
            <div style={drillLabel}>What duration tells you</div>
            <div style={{ fontSize: '0.8125rem', color: '#555', lineHeight: 1.7 }}>
              <p style={{ margin: '0 0 0.6rem' }}><strong style={{ color: '#1a1a1a' }}>High short calls</strong> â€” callers are hanging up quickly, or your AI is filtering a lot. Check whether your spam and sales filters are set too broadly.</p>
              <p style={{ margin: '0 0 0.6rem' }}><strong style={{ color: '#1a1a1a' }}>Most calls medium</strong> â€” this is a healthy pattern. Your AI is handling standard enquiries efficiently.</p>
              <p style={{ margin: 0 }}><strong style={{ color: '#1a1a1a' }}>High long calls</strong> â€” complex or high-intent callers. These are your most valuable interactions and worth reviewing in Listen.</p>
            </div>
            {durationBuckets.long > 0 && (
              <button onClick={() => { setDrillOpen(null); onNavigate && onNavigate('listen') }}
                style={{ marginTop: '1rem', padding: '0.45rem 0.9rem', background: '#5e3b87', color: 'white', border: 'none', borderRadius: 7, fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                Review long calls in Listen â†’
              </button>
            )}
          </div>
        </DrillPanel>
      )}

    </div>
  )
}

export default DataAnalytics
