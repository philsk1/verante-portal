import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const TIER_STYLE = {
  light:        { label: 'Light',        color: '#666',    bg: '#f0f0f0' },
  standard:     { label: 'Standard',     color: '#5e3b87', bg: '#ede8f5' },
  professional: { label: 'Professional', color: '#b07a00', bg: '#fef3d9' },
  enterprise:   { label: 'Enterprise',   color: '#1e7a4a', bg: '#e6f5ee' },
}

const fmtDuration = (secs) => {
  if (!secs) return '0m'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

const StatCard = ({ label, value, sub, accent }) => (
  <div style={{ background: 'white', borderRadius: '10px', padding: '1.5rem 1.5rem 1.25rem', border: '0.5px solid rgba(94,59,135,0.1)' }}>
    <div style={{ fontSize: '0.7rem', fontWeight: '500', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.55rem' }}>{label}</div>
    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '2.25rem', fontWeight: 700, color: accent || '#5e3b87', lineHeight: 1, marginBottom: '0.35rem' }}>{value}</div>
    {sub && <div style={{ fontSize: '0.775rem', color: '#aaa' }}>{sub}</div>}
  </div>
)

const SalesPerformance = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [businesses, setBusinesses] = useState([])

  const session = JSON.parse(localStorage.getItem('demo_session') || '{}')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data: demoTenants } = await supabase.from('tenants').select('id, business_name, subscription_tier, included_minutes').eq('is_demo', true)
        const demoIds = (demoTenants || []).map(t => t.id)

        const [callRes, leadRes, refRes] = await Promise.all([
          supabase.from('call_logs').select('id, duration_seconds, call_outcome, created_at').in('tenant_id', demoIds),
          supabase.from('leads').select('id, lead_status, status').in('tenant_id', demoIds),
          supabase.from('referral_log').select('id').in('tenant_id', demoIds),
        ])

        const bizRes = { data: demoTenants || [] }

        const bizList = bizRes.data || []
        const calls   = callRes.data || []
        const leads   = leadRes.data || []
        const refs    = refRes.data || []

        const totalCalls    = calls.length
        const totalLeads    = leads.length
        const totalRefs     = refs.length
        const convertedLeads = leads.filter(l => l.lead_status === 'converted' || l.status === 'converted').length

        const withDuration  = calls.filter(c => c.duration_seconds > 0)
        const avgDuration   = withDuration.length
          ? Math.round(withDuration.reduce((s, c) => s + c.duration_seconds, 0) / withDuration.length)
          : 0

        const totalMins   = Math.round(calls.reduce((s, c) => s + (c.duration_seconds || 0), 0) / 60)

        // Lead capture rate
        const leadRate = totalCalls > 0 ? Math.round((totalLeads / totalCalls) * 100) : 0

        // Revenue protected: each captured lead worth ~£75 average job value
        const revenueProtected = totalLeads * 75

        // By tier
        const tierCounts = { light: 0, standard: 0, professional: 0, enterprise: 0 }
        bizList.forEach(b => { if (tierCounts[b.subscription_tier] !== undefined) tierCounts[b.subscription_tier]++ })

        setStats({ totalCalls, totalLeads, totalRefs, convertedLeads, avgDuration, totalMins, leadRate, revenueProtected, tierCounts })
        setBusinesses(bizList)
      } catch (err) {
        console.error('SalesPerformance load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const OUTCOME_ORDER = ['booked', 'lead_captured', 'referred_out', 'filtered', 'escalated', 'spam']
  const OUTCOME_META = {
    booked:        { label: 'Booked',       color: '#3db87a' },
    lead_captured: { label: 'Lead',         color: '#5e3b87' },
    referred_out:  { label: 'Referred out', color: '#f0a500' },
    filtered:      { label: 'Filtered',     color: '#d1d5db' },
    escalated:     { label: 'Escalated',    color: '#5e3b87' },
    spam:          { label: 'Spam',         color: '#d1d5db' },
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f9', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: '#5e3b87', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: 'white', fontSize: '1.125rem', letterSpacing: '-0.01em' }}>Qerxel</span>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f0a500', display: 'inline-block', marginLeft: 3, marginBottom: 8, flexShrink: 0 }} />
          </div>
          <span style={{ fontSize: '0.7rem', background: '#f0a500', color: '#1a0533', borderRadius: '4px', padding: '0.2rem 0.5rem', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Demo</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>{session.name || session.email}</span>
          <button
            onClick={() => navigate('/demo/select')}
            style={{ padding: '0.375rem 0.85rem', border: '1px solid rgba(255,255,255,0.22)', borderRadius: '6px', background: 'transparent', color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            ← Businesses
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 940, margin: '0 auto', padding: '2.5rem 2rem' }}>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: '#1a1a1a', margin: '0 0 0.4rem' }}>Platform performance</h1>
          <p style={{ color: '#888', fontSize: '0.875rem', margin: 0, lineHeight: 1.55 }}>
            Aggregate view across all Qerxel demo businesses — calls handled, leads captured, referrals sent.
          </p>
        </div>

        {loading ? (
          <div style={{ color: '#aaa', fontSize: '0.875rem' }}>Loading…</div>
        ) : stats && (
          <>
            {/* Headline stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
              <StatCard label="Calls handled" value={stats.totalCalls.toLocaleString()} sub="across all businesses" />
              <StatCard label="Leads captured" value={stats.totalLeads.toLocaleString()} sub={`${stats.leadRate}% capture rate`} accent="#f0a500" />
              <StatCard label="Referrals sent" value={stats.totalRefs.toLocaleString()} sub="partner network activity" accent="#3db87a" />
              <StatCard label="Revenue protected" value={`£${stats.revenueProtected.toLocaleString()}`} sub="at £75 avg job value" />
            </div>

            {/* Second row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <StatCard label="Avg call duration" value={fmtDuration(stats.avgDuration)} sub="per handled call" />
              <StatCard label="Total minutes" value={stats.totalMins.toLocaleString()} sub="AI talk time" />
              <StatCard label="Converted leads" value={stats.convertedLeads.toLocaleString()} sub={`of ${stats.totalLeads} captured`} accent="#3db87a" />
            </div>

            {/* Tier breakdown + businesses */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

              {/* Tier breakdown */}
              <div style={{ background: 'white', borderRadius: '10px', padding: '1.5rem', border: '0.5px solid rgba(94,59,135,0.1)' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1.25rem' }}>Businesses by tier</div>
                {Object.entries(stats.tierCounts).filter(([, n]) => n > 0).map(([tier, count]) => {
                  const t = TIER_STYLE[tier]
                  const max = Math.max(...Object.values(stats.tierCounts))
                  return (
                    <div key={tier} style={{ marginBottom: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#1a1a1a', marginBottom: '0.3rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: t.color }} />
                          {t.label}
                        </span>
                        <span style={{ fontWeight: '600', color: t.color }}>{count}</span>
                      </div>
                      <div style={{ height: 6, background: '#f3f1f6', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: t.color, borderRadius: 3 }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Business list */}
              <div style={{ background: 'white', borderRadius: '10px', padding: '1.5rem', border: '0.5px solid rgba(94,59,135,0.1)' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1.25rem' }}>Active businesses</div>
                {businesses.map((biz, i) => {
                  const t = TIER_STYLE[biz.tier] || TIER_STYLE.standard
                  const isLast = i === businesses.length - 1
                  return (
                    <div
                      key={biz.id}
                      onClick={() => navigate(`/demo/tier/${biz.id}`)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: isLast ? 'none' : '1px solid rgba(94,59,135,0.06)', cursor: 'pointer' }}
                    >
                      <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: '500', color: '#1a1a1a' }}>{biz.business_name}</div>
                        <div style={{ fontSize: '0.725rem', color: '#bbb' }}>{biz.business_type}</div>
                      </div>
                      <span style={{ display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '600', background: t.bg, color: t.color, letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0, marginLeft: '0.75rem' }}>
                        {t.label}
                      </span>
                    </div>
                  )
                })}
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default SalesPerformance
