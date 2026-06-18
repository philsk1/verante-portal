import { useState, useEffect, useMemo } from 'react'
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

const RANGE_OPTIONS = [
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '6 months', days: 182 },
]

const STATUS_COLOUR = {
  completed:   '#3db87a',
  confirmed:   '#5e3b87',
  provisional: '#f0a500',
  cancelled:   '#aaa',
  no_show:     '#e05252',
}

export default function ScheduleAnalytics() {
  const { user } = useAuth()
  const preview = usePreview()
  const isMobile = useIsMobile()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [rangeDays, setRangeDays] = useState(30)
  const [tenantId, setTenantId] = useState(null)

  useEffect(() => {
    if (preview.isPreview && preview.previewTenantId) {
      setTenantId(preview.previewTenantId)
      return
    }
    if (!user) return
    supabase.from('tenant_memberships').select('tenant_id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data) setTenantId(data.tenant_id) })
  }, [user, preview.isPreview, preview.previewTenantId])

  useEffect(() => {
    if (!tenantId) return
    setLoading(true)
    const from = new Date(Date.now() - rangeDays * 86400000).toISOString()
    supabase
      .from('appointments')
      .select('id, start_time, end_time, status, appointment_type, staff_profile_id, service_id, created_from, client_name, staff_profiles(name)')
      .eq('tenant_id', tenantId)
      .gte('start_time', from)
      .order('start_time')
      .then(({ data }) => {
        setAppointments(data || [])
        setLoading(false)
      })
  }, [tenantId, rangeDays])

  const stats = useMemo(() => {
    const total      = appointments.length
    const completed  = appointments.filter(a => a.status === 'completed').length
    const cancelled  = appointments.filter(a => a.status === 'cancelled').length
    const no_show    = appointments.filter(a => a.status === 'no_show').length
    const online     = appointments.filter(a => a.created_from === 'customer_booking').length
    return { total, completed, cancelled, no_show, online }
  }, [appointments])

  const weeklyTrend = useMemo(() => {
    const weeks = 8
    const now = Date.now()
    return Array.from({ length: weeks }, (_, i) => {
      const weekStart = new Date(now - (weeks - 1 - i) * 7 * 86400000)
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart.getTime() + 7 * 86400000)
      const label = weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      const count = appointments.filter(a => {
        const d = new Date(a.start_time)
        return d >= weekStart && d < weekEnd
      }).length
      return { label, count }
    })
  }, [appointments])

  const maxWeek = Math.max(...weeklyTrend.map(w => w.count), 1)

  const byService = useMemo(() => {
    const map = {}
    for (const a of appointments) {
      const key = a.appointment_type || 'Unspecified'
      map[key] = (map[key] || 0) + 1
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [appointments])

  const maxService = Math.max(...byService.map(([, n]) => n), 1)

  const byStaff = useMemo(() => {
    const map = {}
    for (const a of appointments) {
      if (!a.staff_profile_id) continue
      const sp = a.staff_profiles
      const name = sp?.name || a.staff_profile_id.slice(0, 8)
      map[name] = (map[name] || 0) + 1
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [appointments])

  const maxStaff = Math.max(...byStaff.map(([, n]) => n), 1)

  const byStatus = useMemo(() => {
    const order = ['confirmed', 'provisional', 'completed', 'cancelled', 'no_show']
    const labels = { confirmed: 'Confirmed', provisional: 'Provisional', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No show' }
    return order.map(s => ({
      status: s,
      label: labels[s],
      count: appointments.filter(a => a.status === s).length,
    })).filter(r => r.count > 0)
  }, [appointments])

  const card = {
    background: 'white',
    borderRadius: 16,
    padding: '1rem 1.25rem 0.85rem',
    border: '0.5px solid rgba(94,59,135,0.06)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.06)',
  }
  const sectionTitle = {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: '0.875rem',
    color: '#1a1a1a',
    marginBottom: '1rem',
  }
  const label = {
    fontSize: '0.6875rem',
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    color: '#aaaaaa',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '0.55rem',
  }
  const bigNum = {
    fontFamily: "'Syne', sans-serif",
    fontSize: '2.25rem',
    fontWeight: 700,
    color: '#5e3b87',
    lineHeight: 1,
    marginBottom: '0.4rem',
  }
  const sub = { fontSize: '0.775rem', color: '#aaa' }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <span style={{ color: '#aaa', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif" }}>Loading analytics…</span>
    </div>
  )

  return (
    <div
      data-help-score={stats.total === 0 ? 65 : stats.completed / stats.total >= 0.9 ? 95 : (stats.cancelled + stats.no_show) / stats.total > 0.25 ? 20 : (stats.cancelled + stats.no_show) / stats.total > 0.1 ? 50 : 80}
      style={{ padding: isMobile ? '1rem' : '1.5rem', fontFamily: "'DM Sans', sans-serif", maxWidth: 900 }}>

      {/* Header + range picker */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.25rem', color: '#1a1a1a', margin: 0 }}>Booking Analytics</h2>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.days}
              onClick={() => setRangeDays(opt.days)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 8,
                border: rangeDays === opt.days ? '1.5px solid #5e3b87' : '1px solid rgba(94,59,135,0.15)',
                background: rangeDays === opt.days ? '#f0ebf9' : 'white',
                color: rangeDays === opt.days ? '#5e3b87' : '#888',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      {/* Headline stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          { lbl: 'Total bookings', val: stats.total, s: 'All time in range' },
          { lbl: 'Completed', val: stats.completed, s: stats.total > 0 ? `${Math.round(stats.completed / stats.total * 100)}% completion rate` : '—' },
          { lbl: 'Cancelled', val: stats.cancelled, s: stats.total > 0 ? `${Math.round(stats.cancelled / stats.total * 100)}% cancellation rate` : '—' },
          { lbl: 'No shows', val: stats.no_show, s: stats.total > 0 ? `${Math.round(stats.no_show / stats.total * 100)}% no-show rate` : '—' },
        ].map(({ lbl, val, s: sub_ }) => {
          const isClickable = (lbl === 'Cancelled' || lbl === 'No shows') && val > 0
          return (
            <div
              key={lbl}
              style={{ ...card, cursor: isClickable ? 'pointer' : 'default', position: 'relative' }}
              onClick={isClickable ? (e) => {
                const pct = stats.total > 0 ? Math.round(val / stats.total * 100) : 0
                document.dispatchEvent(new CustomEvent('q-open-dialogue', { detail: {
                  zoneText: `Schedule Analytics: ${val} appointment${val !== 1 ? 's' : ''} ${lbl === 'Cancelled' ? 'cancelled' : 'no-shows'} in this period, representing ${pct}% of ${stats.total} total bookings. Advise on what might be driving this and what the portal offers to address it.`,
                  zoneName: `${val} ${lbl.toLowerCase()}`,
                  tabName: 'Schedule',
                  rect: e.currentTarget.getBoundingClientRect(),
                  initialBotMessage: `${val} ${lbl === 'Cancelled' ? `cancellation${val !== 1 ? 's' : ''}` : `no-show${val !== 1 ? 's' : ''}`} in this period — that's ${pct}% of bookings. Shall I look at what might be driving this and what you can do about it?`,
                }}))
              } : undefined}
            >
              <div style={label}>{lbl}</div>
              <div style={bigNum}>{val}</div>
              <div style={sub}>{sub_}</div>
              {isClickable && <div style={{ position: 'absolute', top: '0.5rem', right: '0.6rem', fontSize: '0.6rem', fontWeight: 700, color: '#f0a500' }}>Ask Q →</div>}
            </div>
          )
        })}
      </div>

      {/* Completion praise */}
      {stats.total >= 5 && stats.completed / stats.total >= 0.9 && (
        <div style={{ ...card, marginBottom: '1rem', background: '#f0faf5', border: '1px solid rgba(61,184,122,0.25)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>✓</span>
          <div>
            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#1a6640', marginBottom: '0.1rem' }}>
              Strong completion rate — {Math.round(stats.completed / stats.total * 100)}% of bookings completed
            </div>
            <div style={{ fontSize: '0.775rem', color: '#3a7a5a', lineHeight: 1.45 }}>
              Sector average is typically 75–80%. Your clients are showing up — that's a sign of good communication and a trusted brand.
            </div>
          </div>
          <button
            onClick={() => document.dispatchEvent(new CustomEvent('q-open-dialogue', { detail: {
              zoneText: `The business has a ${Math.round(stats.completed / stats.total * 100)}% completion rate on ${stats.total} appointments — above sector average. Acknowledge this strength and suggest how they can sustain or build on it.`,
              zoneName: 'Completion rate',
              tabName: 'Schedule',
              rect: { left: window.innerWidth / 2 - 170, top: 80, width: 0, height: 0 },
              initialBotMessage: `Your completion rate is ${Math.round(stats.completed / stats.total * 100)}% — that's genuinely good. Most service businesses sit between 75–80%, so you're ahead. Want to know what typically drives this and how to keep it there?`,
            }}))}
            style={{ flexShrink: 0, marginLeft: 'auto', fontSize: '0.72rem', color: '#1a6640', background: 'none', border: '1px solid rgba(61,184,122,0.35)', borderRadius: 7, padding: '0.3rem 0.65rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
          >
            Ask Q →
          </button>
        </div>
      )}

      {/* Online vs manual */}
      {stats.total > 0 && (
        <div style={{ ...card, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <div style={label}>Online bookings</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: '#3db87a', lineHeight: 1 }}>{stats.online}</div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: '#f3f4f6' }}>
              <div style={{ width: `${Math.round(stats.online / stats.total * 100)}%`, background: '#3db87a', transition: 'width 0.4s' }} />
            </div>
            <div style={{ ...sub, marginTop: 4 }}>{stats.total > 0 ? `${Math.round(stats.online / stats.total * 100)}% of bookings made online` : '—'}</div>
          </div>
          <div>
            <div style={label}>Manual bookings</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: '#5e3b87', lineHeight: 1 }}>{stats.total - stats.online}</div>
          </div>
        </div>
      )}

      {/* Weekly trend */}
      <div style={{ ...card, marginBottom: '1rem' }}>
        <div style={sectionTitle}>Weekly bookings — last 8 weeks</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: isMobile ? 6 : 10, height: 120 }}>
          {weeklyTrend.map((w, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ fontSize: '0.65rem', color: '#5e3b87', fontWeight: 600, visibility: w.count > 0 ? 'visible' : 'hidden' }}>{w.count}</div>
              <div style={{
                width: '100%',
                height: `${Math.max(4, Math.round((w.count / maxWeek) * 90))}px`,
                background: i === weeklyTrend.length - 1 ? '#5e3b87' : '#e8e0f5',
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.3s',
              }} />
              <div style={{ fontSize: '0.6rem', color: '#aaa', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{w.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

        {/* By service */}
        <div style={card}>
          <div style={sectionTitle}>Top services</div>
          {byService.length === 0 ? (
            <div style={{ color: '#aaa', fontSize: '0.8rem' }}>No service data yet</div>
          ) : byService.map(([name, count]) => (
            <div key={name} style={{ marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.82rem', color: '#1a1a1a', fontWeight: 500 }}>{name}</span>
                <span style={{ fontSize: '0.82rem', color: '#5e3b87', fontWeight: 700 }}>{count}</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: '#f3f4f6', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round(count / maxService * 100)}%`, background: '#5e3b87', borderRadius: 3, transition: 'width 0.3s' }} />
              </div>
            </div>
          ))}
        </div>

        {/* By staff */}
        <div style={card}>
          <div style={sectionTitle}>Bookings by team member</div>
          {byStaff.length === 0 ? (
            <div style={{ color: '#aaa', fontSize: '0.8rem' }}>No staff assignment data yet</div>
          ) : byStaff.map(([name, count]) => (
            <div key={name} style={{ marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.82rem', color: '#1a1a1a', fontWeight: 500 }}>{name}</span>
                <span style={{ fontSize: '0.82rem', color: '#3db87a', fontWeight: 700 }}>{count}</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: '#f3f4f6', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round(count / maxStaff * 100)}%`, background: '#3db87a', borderRadius: 3, transition: 'width 0.3s' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status breakdown */}
      {byStatus.length > 0 && (
        <div style={card}>
          <div style={sectionTitle}>Booking status breakdown</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {byStatus.map(({ status, label: lbl, count }) => (
              <div key={status} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0.5rem 0.875rem',
                borderRadius: 10,
                background: '#f9f8fe',
                border: `1px solid ${STATUS_COLOUR[status]}33`,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOUR[status], flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', color: '#1a1a1a', fontWeight: 500 }}>{lbl}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: STATUS_COLOUR[status], fontFamily: "'Syne', sans-serif" }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
