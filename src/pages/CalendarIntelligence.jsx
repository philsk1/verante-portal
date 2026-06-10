import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function recentAppts(events, days = 90) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const now = new Date()
  return events.filter(e => {
    const s = new Date(e.start)
    return s >= cutoff && s <= now && !['cancelled', 'no_show'].includes(e.resource?.status)
  })
}

function clientName(title) {
  if (!title) return 'Unknown'
  const parts = title.split(/\s*[—–-]\s*/)
  return parts[0].trim() || title.trim()
}

function fmtGbp(n) {
  if (n == null || n === '') return '—'
  return `£${Number(n).toFixed(0)}`
}

function fmtHours(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function timeSince(dateStr) {
  const days = Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

function pct(n, d) {
  if (!d) return 0
  return Math.round((n / d) * 100)
}

// Returns total available minutes for staffList over `days` days back from today.
// Deducts lunch break and pro-rated daily overhead from each staff member's day.
// Falls back to Mon–Fri 09:00–18:00 if no schedule configured.
function computeAvailMins(staffList, availMap, days) {
  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - days)
  let total = 0
  for (let cur = new Date(cutoff); cur <= now; cur.setDate(cur.getDate() + 1)) {
    const dow = cur.getDay() // 0=Sun … 6=Sat
    if (staffList.length === 0) {
      if (dow >= 1 && dow <= 5) total += 9 * 60
    } else {
      staffList.forEach(s => {
        const slot     = availMap[s.id]?.[dow]
        const isActive = slot ? slot.on : (dow >= 1 && dow <= 5)
        if (!isActive) return
        const [sh, sm] = (slot?.start || '09:00').split(':').map(Number)
        const [eh, em] = (slot?.end   || '18:00').split(':').map(Number)
        let mins = (eh * 60 + em) - (sh * 60 + sm)
        // Deduct lunch break
        mins -= (slot?.lunchMins || 0)
        // Deduct daily overhead (overhead_hours_per_week ÷ working days in map)
        const workingDays = availMap[s.id]
          ? Object.values(availMap[s.id]).filter(d => d.on).length || 5
          : 5
        mins -= ((s.overhead_hours_per_week || 0) * 60) / workingDays
        if (mins > 0) total += mins
      })
    }
  }
  return total
}

// ─── Q Briefing panel (collapsible) ──────────────────────────────────────────
function QBrief({ page, dataSummary }) {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const storageKey = `qbrief-collapsed-${page}`
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(storageKey) === '1' } catch { return false }
  })

  useEffect(() => {
    if (!dataSummary) { setLoading(false); return }
    setLoading(true)
    setMessage(null)
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'intel', page, dataSummary }),
    })
      .then(r => r.json())
      .then(d => { setMessage(d.message || null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [dataSummary])

  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    try { localStorage.setItem(storageKey, next ? '1' : '0') } catch {}
  }

  if (collapsed) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
        <button onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.3rem 0.85rem 0.3rem 0.6rem', background: 'linear-gradient(135deg, #3a2057 0%, #5e3b87 100%)', border: 'none', borderRadius: 20, cursor: 'pointer', boxShadow: '0 2px 8px rgba(94,59,135,0.2)' }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.78rem', color: 'white', lineHeight: 1 }}>Q</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>Show brief</span>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>▾</span>
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, #3a2057 0%, #5e3b87 100%)', borderRadius: 14, padding: '1.1rem 1.4rem', display: 'flex', gap: '1rem', marginBottom: '1.75rem', boxShadow: '0 4px 20px rgba(94,59,135,0.25)', alignItems: 'flex-start' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backdropFilter: 'blur(4px)' }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.15rem', color: 'white', lineHeight: 1 }}>Q</span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Q says</div>
        {loading
          ? <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif", fontStyle: 'italic' }}>Analysing your data…</div>
          : message
          ? <div style={{ fontSize: '0.9rem', color: 'white', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.65 }}>{message}</div>
          : <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif" }}>No data available yet — add some appointments and services to unlock insights.</div>
        }
      </div>
      <button onClick={toggle} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 6, padding: '0.2rem 0.5rem', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', fontFamily: "'DM Sans', sans-serif", flexShrink: 0, marginTop: '0.15rem' }} title="Collapse">
        ▲ hide
      </button>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.1)', padding: '1rem 1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>{label}</div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.6rem', color: accent || '#1a1a1a', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: '#888', marginTop: '0.3rem' }}>{sub}</div>}
    </div>
  )
}

// ─── Simple inline bar ────────────────────────────────────────────────────────
function Bar({ value, max, colour = '#5e3b87', height = 8 }) {
  const w = max > 0 ? pct(value, max) : 0
  return (
    <div style={{ background: 'rgba(94,59,135,0.08)', borderRadius: height, height, overflow: 'hidden' }}>
      <div style={{ width: `${w}%`, height: '100%', background: colour, borderRadius: height, transition: 'width 0.6s ease' }} />
    </div>
  )
}

// ─── PAGE 1: Time ─────────────────────────────────────────────────────────────
function TimePage({ events, staff, catalogue, availability, capacityTarget = 85 }) {
  const appts = useMemo(() => recentAppts(events, 30), [events])

  const capacityMins30 = useMemo(() => computeAvailMins(staff, availability, 30), [staff, availability])

  const stats = useMemo(() => {
    const totalAppts = appts.length
    const totalMins = appts.reduce((sum, e) => {
      const mins = (new Date(e.end) - new Date(e.start)) / 60000
      return sum + mins
    }, 0)
    const totalHours = totalMins / 60

    const capacityHours = Math.round(capacityMins30 / 60)
    const utilPct = pct(totalHours, capacityHours || 1)

    // Revenue estimate
    const revEstimate = appts.reduce((sum, e) => {
      const cat = catalogue.find(c => c.id === e.resource?.service_id)
      return sum + (cat?.price_from || 0)
    }, 0)
    const revenuePerHour = totalHours > 0 ? revEstimate / totalHours : 0

    // Margin estimate
    const marginEstimate = appts.reduce((sum, e) => {
      const cat = catalogue.find(c => c.id === e.resource?.service_id)
      if (!cat || cat.cost_price == null) return sum
      return sum + ((cat.price_from || 0) - cat.cost_price)
    }, 0)

    // By day of week (0=Sun…6=Sat)
    const byDay = Array(7).fill(0)
    appts.forEach(e => { byDay[new Date(e.start).getDay()]++ })

    // By hour (7–21)
    const byHour = Array(15).fill(0) // index 0 = 7am
    appts.forEach(e => {
      const h = new Date(e.start).getHours()
      if (h >= 7 && h <= 21) byHour[h - 7]++
    })

    // By service
    const bySvc = {}
    appts.forEach(e => {
      const cat = catalogue.find(c => c.id === e.resource?.service_id)
      const name = cat?.name || e.resource?.appointment_type || 'Unclassified'
      if (!bySvc[name]) bySvc[name] = { count: 0, mins: 0, revenue: 0, margin: null }
      const mins = (new Date(e.end) - new Date(e.start)) / 60000
      bySvc[name].count++
      bySvc[name].mins += mins
      bySvc[name].revenue += cat?.price_from || 0
      if (cat?.cost_price != null) {
        const m = (cat.price_from || 0) - cat.cost_price
        bySvc[name].margin = (bySvc[name].margin || 0) + m
      }
    })

    return { totalAppts, totalHours: Math.round(totalHours), totalMins, utilPct, revEstimate, revenuePerHour, marginEstimate, byDay, byHour, bySvc }
  }, [appts, catalogue])

  const dataSummary = useMemo(() => {
    const top = Object.entries(stats.bySvc).sort((a,b) => b[1].count - a[1].count).slice(0, 3).map(([n, s]) => `${n} (${s.count} appts)`).join(', ')
    const capacityHours = Math.round(capacityMins30 / 60)
    return `Last 30 days: ${stats.totalAppts} appointments, ${stats.totalHours}h booked out of ${capacityHours}h available capacity (${stats.utilPct}% utilisation). Estimated revenue: £${Math.round(stats.revEstimate)}. Revenue per hour: £${Math.round(stats.revenuePerHour)}. Top services: ${top || 'none recorded'}.`
  }, [stats, capacityMins30])

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const maxDay = Math.max(...stats.byDay, 1)
  const maxHour = Math.max(...stats.byHour, 1)
  const svcList = Object.entries(stats.bySvc).sort((a, b) => b[1].count - a[1].count)
  const maxSvc = Math.max(...svcList.map(([, s]) => s.count), 1)

  return (
    <div>
      <QBrief page="time" dataSummary={dataSummary} />

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem', marginBottom: '1.75rem' }}>
        <StatCard label="Appointments" value={stats.totalAppts} sub="last 30 days" />
        <StatCard label="Hours booked" value={`${stats.totalHours}h`} sub={`of ${Math.round(capacityMins30/60)}h available`} />
        <StatCard label="Utilisation" value={`${stats.utilPct}%`} sub={`target ${capacityTarget}%`} accent={stats.utilPct >= capacityTarget ? '#3db87a' : stats.utilPct >= capacityTarget * 0.85 ? '#f0a500' : '#e05252'} />
        <StatCard label="Est. revenue" value={fmtGbp(stats.revEstimate)} sub={stats.revenuePerHour > 0 ? `${fmtGbp(Math.round(stats.revenuePerHour))}/hr` : 'add prices to services'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Appointments by day */}
        <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.1)', padding: '1.1rem 1.25rem' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.82rem', color: '#1a1a1a', marginBottom: '1rem' }}>Appointments by day</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {DAYS.map((d, i) => (
              <div key={d} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: '#888', width: 28, flexShrink: 0 }}>{d}</span>
                <div style={{ flex: 1 }}>
                  <Bar value={stats.byDay[i]} max={maxDay} colour={[1,2,3,4,5].includes(i) ? '#5e3b87' : 'rgba(94,59,135,0.3)'} />
                </div>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.78rem', color: '#1a1a1a', width: 18, textAlign: 'right' }}>{stats.byDay[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Busiest hours */}
        <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.1)', padding: '1.1rem 1.25rem' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.82rem', color: '#1a1a1a', marginBottom: '1rem' }}>Busiest hours</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map((h, i) => stats.byHour[i] > 0 && (
              <div key={h} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: '#888', width: 36, flexShrink: 0 }}>{h}:00</span>
                <div style={{ flex: 1 }}>
                  <Bar value={stats.byHour[i]} max={maxHour} colour='#f0a500' />
                </div>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.78rem', color: '#1a1a1a', width: 18, textAlign: 'right' }}>{stats.byHour[i]}</span>
              </div>
            ))}
            {stats.byHour.every(v => v === 0) && (
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', color: '#aaa', textAlign: 'center', padding: '1rem 0' }}>No appointment data yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Services breakdown */}
      {svcList.length > 0 && (
        <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.1)', padding: '1.1rem 1.25rem' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.82rem', color: '#1a1a1a', marginBottom: '1rem' }}>Time by service</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {svcList.map(([name, s]) => {
              const marginPerHour = s.margin != null && s.mins > 0 ? Math.round(s.margin / (s.mins / 60)) : null
              return (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: '0.82rem', color: '#1a1a1a', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                    <Bar value={s.count} max={maxSvc} />
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', flexShrink: 0, textAlign: 'right' }}>
                    <div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.88rem', color: '#1a1a1a' }}>{s.count}</div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.65rem', color: '#aaa' }}>bookings</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.88rem', color: '#1a1a1a' }}>{fmtHours(Math.round(s.mins))}</div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.65rem', color: '#aaa' }}>time used</div>
                    </div>
                    {s.revenue > 0 && (
                      <div>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.88rem', color: '#1a1a1a' }}>{fmtGbp(s.revenue)}</div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.65rem', color: '#aaa' }}>revenue</div>
                      </div>
                    )}
                    {marginPerHour != null && (
                      <div>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.88rem', color: marginPerHour >= 50 ? '#3db87a' : '#e05252' }}>{fmtGbp(marginPerHour)}/h</div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.65rem', color: '#aaa' }}>margin/hr</div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PAGE 2: Clients ──────────────────────────────────────────────────────────
function ClientsPage({ events, catalogue }) {
  const appts = useMemo(() => recentAppts(events, 365), [events])

  const clients = useMemo(() => {
    const map = {}
    appts.forEach(e => {
      const name = clientName(e.title)
      if (!map[name]) map[name] = { name, count: 0, revenue: 0, lastSeen: null, services: new Set() }
      map[name].count++
      const cat = catalogue.find(c => c.id === e.resource?.service_id)
      map[name].revenue += cat?.price_from || 0
      const lastStart = new Date(e.start)
      if (!map[name].lastSeen || lastStart > map[name].lastSeen) map[name].lastSeen = lastStart
      const svcName = cat?.name || e.resource?.appointment_type
      if (svcName) map[name].services.add(svcName)
    })
    return Object.values(map).map(c => ({ ...c, services: Array.from(c.services) }))
  }, [appts, catalogue])

  const byRevenue = [...clients].sort((a, b) => b.revenue - a.revenue)
  const byVisits  = [...clients].sort((a, b) => b.count - a.count)
  const lapsed    = clients.filter(c => {
    const daysSince = (new Date() - c.lastSeen) / (1000 * 60 * 60 * 24)
    return daysSince > 60
  }).sort((a, b) => b.count - a.count)

  const avgTicket = clients.length > 0
    ? Math.round(clients.reduce((s, c) => s + c.revenue, 0) / clients.reduce((s, c) => s + c.count, 0)) || 0
    : 0

  const top5 = byRevenue.slice(0, 5)
  const maxRevenue = Math.max(...byRevenue.map(c => c.revenue), 1)

  const dataSummary = useMemo(() => {
    const topClients = byRevenue.slice(0, 3).map(c => `${c.name} (${c.count} visits, £${c.revenue} est.)`).join(', ')
    return `Last 12 months: ${clients.length} unique clients, avg ticket £${avgTicket}, ${lapsed.length} clients not seen in 60+ days. Top clients: ${topClients || 'none yet'}. ${lapsed.length > 0 ? `Lapsed clients could represent ~£${lapsed.reduce((s, c) => s + c.count, 0) * avgTicket} in recoverable revenue.` : ''}`
  }, [clients, avgTicket, lapsed, byRevenue])

  return (
    <div>
      <QBrief page="clients" dataSummary={dataSummary} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem', marginBottom: '1.75rem' }}>
        <StatCard label="Unique clients" value={clients.length} sub="last 12 months" />
        <StatCard label="Avg. visits" value={clients.length > 0 ? (clients.reduce((s, c) => s + c.count, 0) / clients.length).toFixed(1) : '—'} sub="per client" />
        <StatCard label="Avg. ticket" value={avgTicket > 0 ? fmtGbp(avgTicket) : '—'} sub="per appointment" />
        <StatCard label="Lapsed" value={lapsed.length} sub="not seen 60+ days" accent={lapsed.length > 0 ? '#e05252' : '#3db87a'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Top clients by value */}
        <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.1)', padding: '1.1rem 1.25rem' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.82rem', color: '#1a1a1a', marginBottom: '1rem' }}>Top clients — by value</div>
          {top5.length === 0
            ? <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', color: '#aaa', textAlign: 'center', padding: '1.5rem 0' }}>No client data yet</div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {top5.map((c, i) => (
                <div key={c.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.25rem' }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: i === 0 ? 700 : 500, fontSize: '0.82rem', color: '#1a1a1a' }}>
                      {i === 0 && <span style={{ fontSize: '0.72rem', marginRight: '0.35rem' }}>⭐</span>}
                      {c.name}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: '#888' }}>{c.count} visits</span>
                      <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.82rem', color: '#5e3b87' }}>{fmtGbp(c.revenue)}</span>
                    </div>
                  </div>
                  <Bar value={c.revenue} max={maxRevenue} colour={i === 0 ? '#f0a500' : '#5e3b87'} />
                </div>
              ))}
            </div>
          }
        </div>

        {/* Top by visits */}
        <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.1)', padding: '1.1rem 1.25rem' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.82rem', color: '#1a1a1a', marginBottom: '1rem' }}>Most loyal — by visits</div>
          {byVisits.length === 0
            ? <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', color: '#aaa', textAlign: 'center', padding: '1.5rem 0' }}>No client data yet</div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {byVisits.slice(0, 5).map(c => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: '0.82rem', color: '#1a1a1a', marginBottom: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize: '0.68rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>Last: {c.lastSeen ? timeSince(c.lastSeen) : '—'}</div>
                  </div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#5e3b87', flexShrink: 0 }}>{c.count}</div>
                </div>
              ))}
            </div>
          }
        </div>
      </div>

      {/* Lapsed clients */}
      {lapsed.length > 0 && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid rgba(224,82,82,0.2)', padding: '1.1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.82rem', color: '#e05252' }}>Lapsed clients ({lapsed.length})</div>
            <div style={{ fontSize: '0.72rem', color: '#888', fontFamily: "'DM Sans', sans-serif" }}>— not seen in 60+ days</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 220, overflowY: 'auto' }}>
            {lapsed.map(c => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: '#fdf5f5', borderRadius: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: '0.82rem', color: '#1a1a1a' }}>{c.name}</span>
                  <span style={{ fontSize: '0.72rem', color: '#aaa', marginLeft: '0.5rem', fontFamily: "'DM Sans', sans-serif" }}>Last seen {timeSince(c.lastSeen)}</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#888', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>{c.count} prev visits</span>
                {avgTicket > 0 && (
                  <span style={{ fontSize: '0.72rem', color: '#3db87a', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>{fmtGbp(c.count * avgTicket)} potential</span>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.9rem', background: '#fef3d9', borderRadius: 8, border: '1px solid rgba(240,165,0,0.25)', fontSize: '0.78rem', color: '#7a5c00', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
            <strong>Tip:</strong> Use Qerxel SMS to reach lapsed clients — a short "We miss you" message with a booking link can recover 15–25% of inactive clients. Set this up in AI → SMS follow-up.
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PAGE 3: Team ─────────────────────────────────────────────────────────────
function TeamPage({ events, staff, catalogue, availability, capacityTarget = 85 }) {
  const appts = useMemo(() => recentAppts(events, 30), [events])

  const teamStats = useMemo(() => {
    return staff.map(member => {
      const memberAppts = appts.filter(e => e.resource?.staff_profile_id === member.id)
      const totalMins = memberAppts.reduce((sum, e) => sum + (new Date(e.end) - new Date(e.start)) / 60000, 0)
      const revenue = memberAppts.reduce((sum, e) => {
        const cat = catalogue.find(c => c.id === e.resource?.service_id)
        return sum + (cat?.price_from || 0)
      }, 0)
      const avgTicket = memberAppts.length > 0 ? revenue / memberAppts.length : 0
      const capacityMins = computeAvailMins([member], availability, 30)
      const utilPct = capacityMins > 0 ? pct(totalMins, capacityMins) : 0

      const svcCounts = {}
      memberAppts.forEach(e => {
        const cat = catalogue.find(c => c.id === e.resource?.service_id)
        const name = cat?.name || e.resource?.appointment_type || 'Other'
        svcCounts[name] = (svcCounts[name] || 0) + 1
      })
      const topService = Object.entries(svcCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

      return { ...member, apptCount: memberAppts.length, totalMins, revenue, avgTicket, utilPct, topService, capacityMins }
    })
  }, [appts, staff, catalogue, availability])

  const unassigned = appts.filter(e => !e.resource?.staff_profile_id)
  const maxRevenue = Math.max(...teamStats.map(m => m.revenue), 1)

  const dataSummary = useMemo(() => {
    if (!teamStats.length) return 'No team members configured. Running as a solo operation.'
    const lines = teamStats.map(m => `${m.name}: ${m.apptCount} appts, ${m.utilPct}% utilisation, avg ticket £${Math.round(m.avgTicket)}`).join('; ')
    return `Team performance last 30 days. ${lines}. ${unassigned.length > 0 ? `${unassigned.length} appointments have no staff assigned.` : ''}`
  }, [teamStats, unassigned])

  return (
    <div>
      <QBrief page="team" dataSummary={dataSummary} />

      {staff.length === 0 && (
        <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.1)', padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>👤</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.9rem', color: '#1a1a1a', marginBottom: '0.35rem' }}>Solo operation</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', color: '#888', lineHeight: 1.6 }}>You're running without named staff. Add team members in the Team tab to see individual performance breakdowns.</div>
        </div>
      )}

      {teamStats.map(member => {
        const colour = member.colour || '#5e3b87'
        const initials = (member.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        return (
          <div key={member.id} style={{ background: 'white', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.1)', padding: '1.1rem 1.25rem', marginBottom: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: colour, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: 'white', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.9rem' }}>{initials}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#1a1a1a' }}>{member.name}</div>
                {member.role && <div style={{ fontSize: '0.75rem', color: '#888', fontFamily: "'DM Sans', sans-serif" }}>{member.role}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.3rem', color: member.utilPct >= capacityTarget ? '#3db87a' : member.utilPct >= capacityTarget * 0.85 ? '#f0a500' : '#e05252' }}>{member.utilPct}%</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.68rem', color: '#aaa' }}>utilisation</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem', marginBottom: '0.85rem' }}>
              {[
                { label: 'Appointments', value: member.apptCount },
                { label: 'Hours booked', value: fmtHours(Math.round(member.totalMins)) },
                { label: 'Est. revenue', value: member.revenue > 0 ? fmtGbp(member.revenue) : '—' },
                { label: 'Avg. ticket', value: member.avgTicket > 0 ? fmtGbp(Math.round(member.avgTicket)) : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#faf9fc', borderRadius: 8, padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1a1a1a' }}>{value}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.65rem', color: '#aaa', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: '#888', flexShrink: 0 }}>Utilisation</span>
              <div style={{ flex: 1 }}>
                <Bar value={member.totalMins} max={member.capacityMins || 9 * 60 * 22} colour={member.utilPct >= capacityTarget ? '#3db87a' : member.utilPct >= capacityTarget * 0.85 ? '#f0a500' : '#e05252'} height={6} />
              </div>
            </div>
            {member.revenue > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: '#888', flexShrink: 0 }}>Revenue</span>
                <div style={{ flex: 1 }}>
                  <Bar value={member.revenue} max={maxRevenue} colour='#5e3b87' height={6} />
                </div>
              </div>
            )}
            {member.topService !== '—' && (
              <div style={{ marginTop: '0.65rem', fontSize: '0.72rem', color: '#888', fontFamily: "'DM Sans', sans-serif" }}>
                Top service: <strong style={{ color: '#5e3b87' }}>{member.topService}</strong>
              </div>
            )}
          </div>
        )
      })}

      {unassigned.length > 0 && (
        <div style={{ background: '#fffbf0', borderRadius: 10, border: '1px solid rgba(240,165,0,0.25)', padding: '0.85rem 1.1rem', fontSize: '0.78rem', color: '#7a5c00', fontFamily: "'DM Sans', sans-serif" }}>
          ⚠ {unassigned.length} appointment{unassigned.length > 1 ? 's are' : ' is'} not assigned to a staff member — assign them in the Appointments calendar for accurate reporting.
        </div>
      )}
    </div>
  )
}

// ─── PAGE 4: Money ────────────────────────────────────────────────────────────
function MoneyPage({ events, staff, catalogue }) {
  const appts30 = useMemo(() => recentAppts(events, 30), [events])
  const appts90 = useMemo(() => recentAppts(events, 90), [events])

  const analysis = useMemo(() => {
    // Services without cost_price
    const noCost = catalogue.filter(c => c.cost_price == null && c.price_from > 0)

    // Services with margin < 40%
    const lowMargin = catalogue.filter(c => {
      if (c.cost_price == null || c.price_from == null || c.price_from === 0) return false
      return c.cost_price / c.price_from > 0.6
    })

    // High margin services (margin >= 70%)
    const highMargin = catalogue.filter(c => {
      if (c.cost_price == null || c.price_from == null || c.price_from === 0) return false
      return (c.price_from - c.cost_price) / c.price_from >= 0.7
    })

    // Services never booked in last 90 days
    const bookedSvcIds = new Set(appts90.map(e => e.resource?.service_id).filter(Boolean))
    const neverBooked = catalogue.filter(c => c.active && !bookedSvcIds.has(c.id))

    // Quiet days (working days with 0 appointments in last 30 days)
    // Count appointments per day over last 30 days
    const dayCount = {}
    appts30.forEach(e => {
      const dayStr = new Date(e.start).toISOString().slice(0, 10)
      dayCount[dayStr] = (dayCount[dayStr] || 0) + 1
    })
    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const byDow = Array(7).fill(0) // Mon=0
    appts30.forEach(e => {
      const dow = (new Date(e.start).getDay() + 6) % 7 // 0=Mon
      byDow[dow]++
    })
    const maxDow = Math.max(...byDow, 1)
    const quietestDow = byDow.indexOf(Math.min(...byDow.slice(0, 5))) // Mon–Fri only

    // Lapsed clients
    const clientMap = {}
    appts90.forEach(e => {
      const name = clientName(e.title)
      const lastSeen = new Date(e.start)
      if (!clientMap[name] || lastSeen > clientMap[name]) clientMap[name] = lastSeen
    })
    const allClients90 = Object.keys(clientMap).length
    const lapsed = Object.entries(clientMap).filter(([, d]) => (new Date() - d) / (1000 * 60 * 60 * 24) > 60).length

    // Avg ticket
    const totalRevenue = appts30.reduce((s, e) => {
      const cat = catalogue.find(c => c.id === e.resource?.service_id)
      return s + (cat?.price_from || 0)
    }, 0)
    const avgTicket = appts30.length > 0 ? totalRevenue / appts30.length : 0

    return { noCost, lowMargin, highMargin, neverBooked, byDow, maxDow, quietestDow, lapsed, allClients90, avgTicket }
  }, [appts30, appts90, catalogue])

  const dataSummary = useMemo(() => {
    const parts = []
    if (analysis.noCost.length > 0) parts.push(`${analysis.noCost.length} services have no cost price set — can't calculate margin`)
    if (analysis.lowMargin.length > 0) parts.push(`${analysis.lowMargin.length} services have margin below 40%: ${analysis.lowMargin.map(c => c.name).join(', ')}`)
    if (analysis.highMargin.length > 0) parts.push(`High margin services to promote: ${analysis.highMargin.map(c => c.name).join(', ')}`)
    if (analysis.neverBooked.length > 0) parts.push(`${analysis.neverBooked.length} services never booked in 90 days: ${analysis.neverBooked.slice(0, 3).map(c => c.name).join(', ')}`)
    const quietDay = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][analysis.quietestDow]
    parts.push(`Quietest weekday: ${quietDay} with ${analysis.byDow[analysis.quietestDow]} appointments`)
    if (analysis.lapsed > 0) parts.push(`${analysis.lapsed} clients lapsed (not seen 60+ days) — at avg ticket £${Math.round(analysis.avgTicket)} that's ~£${Math.round(analysis.lapsed * analysis.avgTicket)} recoverable`)
    return parts.join('. ') || 'Not enough data to identify specific opportunities yet.'
  }, [analysis])

  const DAYS_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div>
      <QBrief page="money" dataSummary={dataSummary} />

      {/* Opportunity cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.5rem' }}>
        {analysis.noCost.length > 0 && (
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid rgba(224,82,82,0.18)', padding: '1.1rem 1.25rem' }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.82rem', color: '#e05252', marginBottom: '0.4rem' }}>⚡ Blind margins</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: '#1a1a1a', marginBottom: '0.3rem' }}>{analysis.noCost.length} services</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', color: '#888', lineHeight: 1.5 }}>No cost price set — you don't know which services make money. Add cost prices in the Service modal to unlock margin analysis.</div>
            <div style={{ marginTop: '0.65rem', fontSize: '0.72rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>{analysis.noCost.slice(0, 3).map(c => c.name).join(' · ')}</div>
          </div>
        )}

        {analysis.lapsed > 0 && analysis.avgTicket > 0 && (
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid rgba(61,184,122,0.18)', padding: '1.1rem 1.25rem' }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.82rem', color: '#3db87a', marginBottom: '0.4rem' }}>💰 Recoverable revenue</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: '#1a1a1a', marginBottom: '0.3rem' }}>{fmtGbp(Math.round(analysis.lapsed * analysis.avgTicket))}</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', color: '#888', lineHeight: 1.5 }}>{analysis.lapsed} clients haven't booked in 60+ days at an avg ticket of {fmtGbp(Math.round(analysis.avgTicket))}. A re-engagement campaign could recover this.</div>
          </div>
        )}

        {analysis.neverBooked.length > 0 && (
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid rgba(94,59,135,0.15)', padding: '1.1rem 1.25rem' }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.82rem', color: '#5e3b87', marginBottom: '0.4rem' }}>📋 Unboooked services</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: '#1a1a1a', marginBottom: '0.3rem' }}>{analysis.neverBooked.length} services</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', color: '#888', lineHeight: 1.5 }}>In your catalogue but not booked once in 90 days. Consider removing them, repricing, or actively promoting them.</div>
            <div style={{ marginTop: '0.65rem', fontSize: '0.72rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>{analysis.neverBooked.slice(0, 3).map(c => c.name).join(' · ')}</div>
          </div>
        )}

        {analysis.lowMargin.length > 0 && (
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid rgba(240,165,0,0.25)', padding: '1.1rem 1.25rem' }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.82rem', color: '#d97706', marginBottom: '0.4rem' }}>⚠ Low-margin services</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: '#1a1a1a', marginBottom: '0.3rem' }}>{analysis.lowMargin.length} services</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', color: '#888', lineHeight: 1.5 }}>Margin below 40% — costs eating into revenue. Consider reviewing pricing or reducing cost of delivery.</div>
            <div style={{ marginTop: '0.65rem', fontSize: '0.72rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif' "}}>{analysis.lowMargin.slice(0, 3).map(c => `${c.name} (£${c.price_from - c.cost_price} margin)`).join(' · ')}</div>
          </div>
        )}
      </div>

      {/* Appointments by day of week */}
      <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.1)', padding: '1.1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.82rem', color: '#1a1a1a', marginBottom: '0.35rem' }}>Demand by day — last 30 days</div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: '#888', marginBottom: '1rem' }}>
          Quietest day: <strong style={{ color: '#5e3b87' }}>{DAYS_MON[analysis.quietestDow]}</strong> — promote this day with a discount or a specific offer
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', height: 70 }}>
          {DAYS_MON.map((d, i) => {
            const h = analysis.maxDow > 0 ? (analysis.byDow[i] / analysis.maxDow) * 60 : 4
            const isQuiet = i === analysis.quietestDow
            return (
              <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                <div style={{ width: '100%', height: h || 4, background: isQuiet ? '#fef3d9' : (i < 5 ? '#5e3b87' : 'rgba(94,59,135,0.3)'), borderRadius: '4px 4px 0 0', border: isQuiet ? '1px solid #f0a500' : 'none', position: 'relative', transition: 'height 0.5s ease' }}>
                  {isQuiet && <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', fontSize: '0.6rem', color: '#f0a500', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>↑ promote</div>}
                </div>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.65rem', color: isQuiet ? '#f0a500' : '#888', fontWeight: isQuiet ? 700 : 400 }}>{d}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* High margin services to promote */}
      {analysis.highMargin.length > 0 && (
        <div style={{ background: '#f0fdf4', borderRadius: 12, border: '1px solid rgba(61,184,122,0.2)', padding: '1.1rem 1.25rem' }}>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.82rem', color: '#3db87a', marginBottom: '0.75rem' }}>✓ Your highest-margin services — promote these</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {analysis.highMargin.map(c => {
              const margin = ((c.price_from - c.cost_price) / c.price_from * 100).toFixed(0)
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'white', borderRadius: 8 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: '0.82rem', color: '#1a1a1a', flex: 1 }}>{c.name}</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: '#888' }}>{fmtGbp(c.price_from)} sell</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: '#888' }}>{fmtGbp(c.cost_price)} cost</span>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.82rem', color: '#3db87a', background: '#e6fdf3', padding: '0.1rem 0.4rem', borderRadius: 4 }}>{margin}% margin</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main: CalendarIntelligence ───────────────────────────────────────────────
const PAGES = {
  time:    { label: 'Is my time being used well?',         icon: '⏱', colour: '#5e3b87' },
  clients: { label: 'Who are my best clients?',            icon: '👤', colour: '#2563eb' },
  team:    { label: 'How is my team performing?',          icon: '👥', colour: '#16a34a' },
  money:   { label: 'Where is money being left on the table?', icon: '💡', colour: '#d97706' },
}

export default function CalendarIntelligence({ page, events, staff, catalogue, tenantId, onClose, onBack }) {
  const meta = PAGES[page] || PAGES.time

  const [availability, setAvailability] = useState({})
  const staffIds = useMemo(() => staff.map(s => s.id).join(','), [staff])

  // Config panel state
  const [configOpen, setConfigOpen]     = useState(false)
  const [configTarget, setConfigTarget] = useState(85)
  const [configStaff, setConfigStaff]   = useState({}) // staffId → { include, lunchMins, overheadHrs }
  const [configSaving, setConfigSaving] = useState(false)

  // Load availability
  useEffect(() => {
    if (!staff.length) return
    if (!tenantId) {
      const map = {}
      staff.forEach(s => {
        map[s.id] = {}
        for (let d = 0; d < 7; d++) map[s.id][d] = { on: d >= 1 && d <= 5, start: '09:00', end: '18:00', lunchMins: 0, lunchStart: '12:00' }
      })
      setAvailability(map)
      return
    }
    supabase
      .from('staff_availability')
      .select('staff_profile_id, day_of_week, start_time, end_time, active, lunch_start, lunch_mins')
      .in('staff_profile_id', staff.map(s => s.id))
      .then(({ data }) => {
        const map = {}
        staff.forEach(s => {
          map[s.id] = {}
          for (let d = 0; d < 7; d++) {
            const row = data?.find(r => r.staff_profile_id === s.id && r.day_of_week === d)
            map[s.id][d] = row
              ? { on: row.active, start: row.start_time.slice(0, 5), end: row.end_time.slice(0, 5), lunchMins: row.lunch_mins || 0, lunchStart: row.lunch_start?.slice(0, 5) || '12:00' }
              : { on: d >= 1 && d <= 5, start: '09:00', end: '18:00', lunchMins: 0, lunchStart: '12:00' }
          }
        })
        setAvailability(map)
      })
  }, [tenantId, staffIds])

  // Load tenant capacity target
  useEffect(() => {
    if (!tenantId) return
    supabase.from('tenants').select('capacity_target_pct').eq('id', tenantId).maybeSingle()
      .then(({ data }) => { if (data?.capacity_target_pct) setConfigTarget(data.capacity_target_pct) })
  }, [tenantId])

  // Sync configStaff from staff + availability once both are ready
  useEffect(() => {
    if (!staff.length) return
    const init = {}
    staff.forEach(s => {
      const firstActiveDay = availability[s.id]
        ? Object.entries(availability[s.id]).find(([, v]) => v.on)
        : null
      init[s.id] = {
        include:     s.include_in_intel !== false,
        lunchMins:   firstActiveDay ? (firstActiveDay[1].lunchMins || 0) : 0,
        lunchStart:  firstActiveDay ? (firstActiveDay[1].lunchStart || '12:00') : '12:00',
        overheadHrs: s.overhead_hours_per_week || 0,
      }
    })
    setConfigStaff(init)
  }, [staffIds, availability])

  const saveConfig = async () => {
    if (!tenantId) return
    setConfigSaving(true)
    // Update tenant target
    await supabase.from('tenants').update({ capacity_target_pct: Number(configTarget) }).eq('id', tenantId)
    // Update each staff member
    for (const s of staff) {
      const cfg = configStaff[s.id]
      if (!cfg) continue
      await supabase.from('staff_profiles').update({
        include_in_intel: cfg.include,
        overhead_hours_per_week: Number(cfg.overheadHrs) || 0,
      }).eq('id', s.id)
      // Apply lunch to all active days
      if (availability[s.id]) {
        for (const [dow, slot] of Object.entries(availability[s.id])) {
          if (!slot.on) continue
          await supabase.from('staff_availability').update({
            lunch_mins:  Number(cfg.lunchMins) || 0,
            lunch_start: cfg.lunchStart || '12:00',
          }).eq('staff_profile_id', s.id).eq('day_of_week', Number(dow))
        }
        // Refresh local availability with new lunch values
        setAvailability(prev => {
          const map = { ...prev, [s.id]: {} }
          for (const [dow, slot] of Object.entries(prev[s.id] || {})) {
            map[s.id][dow] = { ...slot, lunchMins: Number(cfg.lunchMins) || 0, lunchStart: cfg.lunchStart || '12:00' }
          }
          return map
        })
      }
    }
    setConfigSaving(false)
    setConfigOpen(false)
  }

  // Only include staff flagged for intel in calculations
  const intelStaff = useMemo(() => staff.filter(s => configStaff[s.id]?.include !== false), [staff, configStaff])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#f7f6f9', zIndex: 3000, display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid rgba(94,59,135,0.1)', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.85rem', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.7rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: 7, background: 'white', color: '#5e3b87', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
          ← Back
        </button>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: meta.colour + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
          {meta.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.label}</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: '#aaa', marginTop: 1 }}>Calendar Intelligence · last 30 days</div>
        </div>
        {tenantId && (
          <button onClick={() => setConfigOpen(true)} title="Efficiency settings" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.7rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: 7, background: 'white', color: '#5e3b87', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
            ⚙ Configure
          </button>
        )}
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '1.5rem', padding: '0 0.15rem', flexShrink: 0, lineHeight: 1 }}>×</button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', maxWidth: 960, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {page === 'time'    && <TimePage    events={events} staff={intelStaff} catalogue={catalogue} availability={availability} capacityTarget={configTarget} />}
        {page === 'clients' && <ClientsPage events={events} catalogue={catalogue} />}
        {page === 'team'    && <TeamPage    events={events} staff={intelStaff} catalogue={catalogue} availability={availability} capacityTarget={configTarget} />}
        {page === 'money'   && <MoneyPage   events={events} staff={intelStaff} catalogue={catalogue} />}
      </div>

      {/* ── Config panel ──────────────────────────────────────────────────────── */}
      {configOpen && (
        <>
          <div onClick={() => setConfigOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 4000 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, background: 'white', zIndex: 4001, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)' }}>
            {/* Panel header */}
            <div style={{ padding: '1.1rem 1.4rem', borderBottom: '1px solid rgba(94,59,135,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#1a1a1a' }}>Efficiency settings</div>
              <button onClick={() => setConfigOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '1.4rem', lineHeight: 1 }}>×</button>
            </div>

            {/* Panel body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.4rem' }}>

              {/* Capacity target */}
              <div style={{ marginBottom: '1.75rem' }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.78rem', color: '#1a1a1a', marginBottom: '0.25rem' }}>Capacity target</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: '#888', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                  Utilisation colour changes based on this. Green above, amber within 15%, red below.
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <input
                    type="number" min={10} max={100}
                    value={configTarget}
                    onChange={e => setConfigTarget(Math.min(100, Math.max(10, Number(e.target.value))))}
                    style={{ width: 64, padding: '0.45rem 0.6rem', border: '1.5px solid rgba(94,59,135,0.2)', borderRadius: 7, fontSize: '0.9rem', fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#5e3b87', textAlign: 'center' }}
                  />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', color: '#888' }}>% target utilisation</span>
                </div>
              </div>

              {/* Staff */}
              {staff.length > 0 && (
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.78rem', color: '#1a1a1a', marginBottom: '0.25rem' }}>Staff</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: '#888', marginBottom: '0.85rem', lineHeight: 1.5 }}>
                    Q tracks everyone in the calendar. Toggle off anyone you don't want in efficiency calculations.
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {staff.map(s => {
                      const cfg = configStaff[s.id] || { include: true, lunchMins: 0, lunchStart: '12:00', overheadHrs: 0 }
                      const initials = (s.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                      const colour = s.colour || '#5e3b87'
                      return (
                        <div key={s.id} style={{ background: '#faf9fc', borderRadius: 10, padding: '0.85rem 1rem', border: cfg.include ? '1px solid rgba(94,59,135,0.15)' : '1px solid #eee', opacity: cfg.include ? 1 : 0.55 }}>
                          {/* Staff row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: cfg.include ? '0.85rem' : 0 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: colour, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ color: 'white', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.72rem' }}>{initials}</span>
                            </div>
                            <div style={{ flex: 1, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.85rem', color: '#1a1a1a' }}>{s.name}</div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', flexShrink: 0 }}>
                              <div
                                onClick={() => setConfigStaff(prev => ({ ...prev, [s.id]: { ...cfg, include: !cfg.include } }))}
                                style={{ width: 36, height: 20, borderRadius: 10, background: cfg.include ? '#5e3b87' : '#ddd', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
                              >
                                <div style={{ position: 'absolute', top: 3, left: cfg.include ? 18 : 3, width: 14, height: 14, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                              </div>
                              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: '#888' }}>Include</span>
                            </label>
                          </div>

                          {cfg.include && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                              {/* Lunch */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: '#666', width: 110, flexShrink: 0 }}>Lunch break</span>
                                <input
                                  type="number" min={0} max={120} placeholder="0"
                                  value={cfg.lunchMins || ''}
                                  onChange={e => setConfigStaff(prev => ({ ...prev, [s.id]: { ...cfg, lunchMins: e.target.value } }))}
                                  style={{ width: 52, padding: '0.3rem 0.45rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: 6, fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif", textAlign: 'center' }}
                                />
                                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: '#aaa' }}>min</span>
                                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: '#aaa' }}>at</span>
                                <input
                                  type="time"
                                  value={cfg.lunchStart || '12:00'}
                                  onChange={e => setConfigStaff(prev => ({ ...prev, [s.id]: { ...cfg, lunchStart: e.target.value } }))}
                                  style={{ padding: '0.3rem 0.45rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: 6, fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif" }}
                                />
                              </div>
                              {/* Overhead */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: '#666', width: 110, flexShrink: 0 }}>Other duties</span>
                                <input
                                  type="number" min={0} max={40} placeholder="0" step={0.5}
                                  value={cfg.overheadHrs || ''}
                                  onChange={e => setConfigStaff(prev => ({ ...prev, [s.id]: { ...cfg, overheadHrs: e.target.value } }))}
                                  style={{ width: 52, padding: '0.3rem 0.45rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: 6, fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif", textAlign: 'center' }}
                                />
                                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: '#aaa', lineHeight: 1.35 }}>hrs/week — stock, admin, cleaning, etc.</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Solo mode (no staff) */}
              {staff.length === 0 && (
                <div style={{ marginBottom: '1.75rem' }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.78rem', color: '#1a1a1a', marginBottom: '0.25rem' }}>Other duties</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: '#888', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                    Hours per week that go to jobs that can't be billed — stock taking, cleaning, accounts, etc.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <input
                      type="number" min={0} max={40} placeholder="0" step={0.5}
                      value={configStaff['__solo__']?.overheadHrs || ''}
                      onChange={e => setConfigStaff(prev => ({ ...prev, '__solo__': { ...(prev['__solo__'] || {}), overheadHrs: e.target.value } }))}
                      style={{ width: 60, padding: '0.45rem 0.6rem', border: '1.5px solid rgba(94,59,135,0.2)', borderRadius: 7, fontSize: '0.9rem', fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#5e3b87', textAlign: 'center' }}
                    />
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', color: '#888' }}>hours per week</span>
                  </div>
                </div>
              )}
            </div>

            {/* Save */}
            <div style={{ padding: '1rem 1.4rem', borderTop: '1px solid rgba(94,59,135,0.1)', flexShrink: 0 }}>
              <button
                onClick={saveConfig}
                disabled={configSaving}
                style={{ width: '100%', padding: '0.7rem', background: configSaving ? '#f5d98a' : '#f0a500', color: '#1a0533', border: 'none', borderRadius: 8, fontSize: '0.9rem', fontWeight: 700, cursor: configSaving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}
              >
                {configSaving ? 'Saving…' : 'Save settings'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
