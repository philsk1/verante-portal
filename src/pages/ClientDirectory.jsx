import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { usePreview } from '../context/PreviewContext'

// Tier-gated limits for Answer campaigns
const CAMPAIGN_LIMIT = { free: 0, light: 100, standard: 500, professional: 2000, enterprise: Infinity, bespoke: Infinity }

// Search depth (months) by calendar_tier — how far back marketing intelligence queries look
const SEARCH_DEPTH_MONTHS = { entry: 3, multi: 12 }

const AVATAR_PAL = [
  { bg: '#f0ebf8', c: '#5e3b87' }, { bg: '#e6f5ee', c: '#1e7a4a' },
  { bg: '#eff6ff', c: '#1d4ed8' }, { bg: '#fef3d0', c: '#92610a' },
  { bg: '#fce7f3', c: '#9d174d' }, { bg: '#dcfce7', c: '#166534' },
]
const avatarCol = (s = '') => AVATAR_PAL[s.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_PAL.length]
const initials = (s = '') => s.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const weeksAgo = (iso) => Math.round((Date.now() - new Date(iso).getTime()) / (7 * 24 * 60 * 60 * 1000))

const OUTCOME_LABEL = {
  lead_captured: 'Lead captured', booked: 'Booked', callback_scheduled: 'Callback',
  escalated: 'Escalated', filtered: 'Spam filtered', referred_out: 'Referred',
}

const SEG_STYLE = {
  ritual:   { bg: '#eff6ff', c: '#1d4ed8', label: 'Ritual' },
  explorer: { bg: '#f0fdf4', c: '#166534', label: 'Explorer' },
  lapsed:   { bg: '#fef3c7', c: '#92400e', label: 'Lapsed' },
}

// Compute behavioral segment from a client's appointment history
// appts: array of { start_time, appointment_type } sorted desc by start_time
function computeSegment(appts) {
  const completed = appts.filter(a => a.status === 'completed' || a.status === 'confirmed' || a.status === 'provisional')
  if (completed.length < 2) return null

  const now = Date.now()
  const lastAppt = new Date(completed[0].start_time).getTime()
  const daysSinceLast = (now - lastAppt) / (24 * 60 * 60 * 1000)

  // Lapsed: ≥2 bookings and last completed was >42 days ago
  if (daysSinceLast > 42 && completed.length >= 2) return 'lapsed'

  // Explorer: ≥3 bookings with ≥2 different service types
  if (completed.length >= 3) {
    const types = new Set(completed.slice(0, 5).map(a => a.appointment_type).filter(Boolean))
    if (types.size >= 2) return 'explorer'
  }

  // Ritual: ≥3 bookings with consistent cadence (gap variance <50%)
  if (completed.length >= 3) {
    const times = completed.slice(0, 4).map(a => new Date(a.start_time).getTime()).reverse()
    const gaps = times.slice(1).map((t, i) => t - times[i])
    const avg = gaps.reduce((s, g) => s + g, 0) / gaps.length
    const maxDev = Math.max(...gaps.map(g => Math.abs(g - avg) / avg))
    if (maxDev < 0.5) return 'ritual'
  }

  return null
}

const ClientDirectory = () => {
  const { user } = useAuth()
  const preview = usePreview()
  const isPreview = !!preview?.isPreview
  const previewReadOnly = preview?.previewReadOnly ?? isPreview

  const [tenantId, setTenantId]       = useState(null)
  const [tier, setTier]               = useState('light')
  const [calendarTier, setCalendarTier] = useState('entry')
  const [loading, setLoading]         = useState(true)
  const [clients, setClients]         = useState([])
  const [search, setSearch]           = useState('')
  const [filterTab, setFilterTab]     = useState('all')
  const [expandedId, setExpandedId]   = useState(null)
  const [noteDrafts, setNoteDrafts]   = useState({})
  const [savingNote, setSavingNote]   = useState(null)
  const [campaignOpen, setCampaignOpen] = useState(false)
  const [campaignMsg, setCampaignMsg]   = useState('')
  const [aiDrafting, setAiDrafting]     = useState(false)
  const [campaignSending, setCampaignSending] = useState(false)
  const [campaignResult, setCampaignResult]   = useState(null)

  useEffect(() => {
    if (!user && !isPreview) return
    const load = async () => {
      setLoading(true)
      let tid
      if (isPreview) {
        tid = preview.previewTenantId
      } else {
        const { data: m } = await supabase.from('tenant_memberships').select('tenant_id').eq('user_id', user.id).maybeSingle()
        if (!m) { setLoading(false); return }
        tid = m.tenant_id
      }
      setTenantId(tid)

      const { data: tenant } = await supabase.from('tenants').select('subscription_tier, calendar_tier').eq('id', tid).maybeSingle()
      const subTier = tenant?.subscription_tier || 'light'
      const calTier = tenant?.calendar_tier || 'entry'
      setTier(subTier)
      setCalendarTier(calTier)

      // Search depth cutoff based on calendar tier
      const depthMonths = SEARCH_DEPTH_MONTHS[calTier] ?? 3
      const cutoff = new Date()
      cutoff.setMonth(cutoff.getMonth() - depthMonths)
      const cutoffISO = cutoff.toISOString()

      const [logsRes, relsRes, apptRes] = await Promise.all([
        supabase.from('call_logs')
          .select('caller_id, caller_phone, call_outcome, ai_summary, created_at, callers(id, full_name, phone_number)')
          .eq('tenant_id', tid)
          .gte('created_at', cutoffISO)
          .not('caller_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(3000),
        supabase.from('caller_tenant_relationships')
          .select('id, caller_id, notes, marketing_opted_out, opted_out_at, is_hot_prospect, deletion_requested')
          .eq('tenant_id', tid),
        // Booking clients — load within search depth
        supabase.from('appointments')
          .select('id, client_name, client_phone, appointment_type, start_time, status')
          .eq('tenant_id', tid)
          .gte('start_time', cutoffISO)
          .order('start_time', { ascending: false })
          .limit(5000),
      ])

      const relMap = {}
      for (const r of relsRes.data || []) relMap[r.caller_id] = r

      // Build caller map from call_logs
      const callerMap = {}
      for (const log of logsRes.data || []) {
        const cid = log.caller_id
        const phone = log.callers?.phone_number || log.caller_phone || null
        if (!callerMap[cid]) {
          callerMap[cid] = {
            id: cid,                        // caller_id
            name: log.callers?.full_name || null,
            phone,
            call_count: 0,
            booking_count: 0,
            last_call: log.created_at,
            last_outcome: log.call_outcome,
            last_summary: log.ai_summary,
            segment: null,
            source: 'caller',
            ...(relMap[cid] || { rel_id: null, notes: null, marketing_opted_out: false, opted_out_at: null, is_hot_prospect: false, deletion_requested: false }),
          }
        }
        callerMap[cid].call_count++
      }

      // Build booking client map from appointments, keyed by client_phone
      const bookingMap = {}
      const appts = apptRes.data || []
      for (const a of appts) {
        const phone = a.client_phone
        if (!phone) continue
        if (!bookingMap[phone]) {
          bookingMap[phone] = {
            name: a.client_name || null,
            phone,
            appts: [],
            last_booking: a.start_time,
          }
        }
        bookingMap[phone].appts.push(a)
      }

      // Compute segments for booking clients
      for (const k of Object.keys(bookingMap)) {
        bookingMap[k].segment = computeSegment(bookingMap[k].appts)
        bookingMap[k].booking_count = bookingMap[k].appts.length
      }

      // Merge: enrich callers with booking data, add booking-only contacts
      const phoneToCallerId = {}
      for (const [cid, c] of Object.entries(callerMap)) {
        if (c.phone) phoneToCallerId[c.phone] = cid
      }

      for (const [phone, b] of Object.entries(bookingMap)) {
        const cid = phoneToCallerId[phone]
        if (cid) {
          // Enrich existing caller contact
          callerMap[cid].booking_count = b.booking_count
          callerMap[cid].segment = b.segment
          callerMap[cid].last_booking = b.last_booking
          if (!callerMap[cid].name && b.name) callerMap[cid].name = b.name
          callerMap[cid].source = 'both'
        } else {
          // Booking-only contact (never called in)
          callerMap[`booking_${phone}`] = {
            id: `booking_${phone}`,
            caller_id: null,     // populated on first star/opt-out/note
            name: b.name,
            phone,
            call_count: 0,
            booking_count: b.booking_count,
            last_call: null,
            last_booking: b.last_booking,
            last_outcome: null,
            last_summary: null,
            segment: b.segment,
            source: 'booking',
            rel_id: null,
            notes: null,
            marketing_opted_out: false,
            opted_out_at: null,
            is_hot_prospect: false,
            deletion_requested: false,
          }
        }
      }

      const merged = Object.values(callerMap).filter(c => !c.deletion_requested)
      setClients(merged)
      setLoading(false)
    }
    load()
  }, [user, isPreview])

  const upsertRel = async (clientId, updates) => {
    if (previewReadOnly || !tenantId) return
    const c = clients.find(x => x.id === clientId)
    if (!c) return

    let callerId = c.source !== 'booking' ? clientId : (c.caller_id || null)

    // Booking-only contact: find or create a caller record so we can store the relationship
    if (!callerId && c.source === 'booking' && c.phone) {
      const { data: existing } = await supabase
        .from('callers').select('id').eq('phone_number', c.phone).maybeSingle()
      if (existing?.id) {
        callerId = existing.id
      } else {
        const { data: created } = await supabase
          .from('callers').insert({ full_name: c.name || null, phone_number: c.phone }).select('id').maybeSingle()
        callerId = created?.id || null
      }
      if (callerId) {
        setClients(prev => prev.map(x => x.id === clientId ? { ...x, caller_id: callerId } : x))
      }
    }

    if (!callerId) return

    if (c.rel_id) {
      await supabase.from('caller_tenant_relationships').update(updates).eq('id', c.rel_id)
    } else {
      const { data } = await supabase
        .from('caller_tenant_relationships')
        .insert({ tenant_id: tenantId, caller_id: callerId, ...updates })
        .select('id').maybeSingle()
      if (data?.id) setClients(prev => prev.map(x => x.id === clientId ? { ...x, rel_id: data.id } : x))
    }
    setClients(prev => prev.map(x => x.id === clientId ? { ...x, ...updates } : x))
  }

  const toggleHot    = (c) => upsertRel(c.id, { is_hot_prospect: !c.is_hot_prospect })
  const toggleOptOut = (c) => upsertRel(c.id, { marketing_opted_out: !c.marketing_opted_out, opted_out_at: !c.marketing_opted_out ? new Date().toISOString() : null })
  const deleteClient = async (c) => {
    if (previewReadOnly) return
    if (c.source !== 'booking') {
      await upsertRel(c.id, { deletion_requested: true, deletion_requested_at: new Date().toISOString() })
    }
    setClients(prev => prev.filter(x => x.id !== c.id))
  }
  const saveNote = async (c) => {
    setSavingNote(c.id)
    const note = noteDrafts[c.id] ?? c.notes ?? ''
    await upsertRel(c.id, { notes: note || null })
    setSavingNote(null)
  }

  const filtered = useMemo(() => {
    let list = clients
    if (filterTab === 'hot')      list = list.filter(c => c.is_hot_prospect)
    if (filterTab === 'optout')   list = list.filter(c => c.marketing_opted_out)
    if (filterTab === 'ritual')   list = list.filter(c => c.segment === 'ritual')
    if (filterTab === 'explorer') list = list.filter(c => c.segment === 'explorer')
    if (filterTab === 'lapsed')   list = list.filter(c => c.segment === 'lapsed')
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.last_summary || '').toLowerCase().includes(q) ||
      (OUTCOME_LABEL[c.last_outcome] || '').toLowerCase().includes(q)
    )
  }, [clients, search, filterTab])

  const campaignTargets = filtered.filter(c => !c.marketing_opted_out && c.phone)
  const optedOutInFilter = filtered.filter(c => c.marketing_opted_out).length
  const canCampaign = tier !== 'free'
  const recipientLimit = CAMPAIGN_LIMIT[tier] ?? 0

  const hasSchedule  = calendarTier && calendarTier !== 'none'
  const depthMonths  = SEARCH_DEPTH_MONTHS[calendarTier] ?? 3
  const depthLabel   = depthMonths >= 120 ? 'all time' : `${depthMonths} months`

  const segCounts = {
    ritual:   clients.filter(c => c.segment === 'ritual').length,
    explorer: clients.filter(c => c.segment === 'explorer').length,
    lapsed:   clients.filter(c => c.segment === 'lapsed').length,
  }
  const hotCount    = clients.filter(c => c.is_hot_prospect).length
  const optoutCount = clients.filter(c => c.marketing_opted_out).length

  const aiDraft = async () => {
    setAiDrafting(true)
    const intentSummary = filtered.slice(0, 5).map(c => c.last_summary).filter(Boolean).join('. ')
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'vera-chat',
          message: `Write a short, friendly SMS campaign message (max 130 characters) for a UK small business to send to past callers. Intent context: ${intentSummary || 'general enquiries'}. Be warm and direct. No emojis. End with a call to action.`,
          history: [],
        }),
      })
      const d = await r.json()
      const text = d.reply || d.message || ''
      if (text) setCampaignMsg(text.slice(0, 130))
    } catch { /* silent */ }
    setAiDrafting(false)
  }

  const sendCampaign = async () => {
    if (!canCampaign || campaignSending || !campaignMsg.trim()) return
    const recipients = campaignTargets.slice(0, recipientLimit)
    if (!recipients.length) return
    setCampaignSending(true)
    setCampaignResult(null)
    try {
      const fullMsg = campaignMsg.trim() + '\nReply STOP to opt out.'
      const r = await fetch('/api/notify?type=campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          message: fullMsg,
          recipients: recipients.map(c => ({ phone: c.phone, name: c.name || 'there', caller_id: c.source !== 'booking' ? c.id : null })),
        }),
      })
      const d = await r.json()
      if (d.ok) {
        setCampaignResult({ ok: true, sent: d.sent, failed: d.failed })
        await supabase.from('campaigns').insert({
          tenant_id: tenantId,
          message: fullMsg,
          recipient_count: recipients.length,
          sent_count: d.sent || 0,
          failed_count: d.failed || 0,
          status: 'sent',
          search_context: search || filterTab,
          sent_at: new Date().toISOString(),
        })
      } else {
        setCampaignResult({ ok: false, error: d.error || 'Send failed' })
      }
    } catch (e) {
      setCampaignResult({ ok: false, error: e.message })
    }
    setCampaignSending(false)
  }

  const filterTabs = [
    ['all',      `All (${clients.length})`],
    ['hot',      `Hot (${hotCount})`],
    ['optout',   `Opted Out (${optoutCount})`],
    ...(hasSchedule ? [
      ['ritual',   `Ritual (${segCounts.ritual})`],
      ['explorer', `Explorer (${segCounts.explorer})`],
      ['lapsed',   `Lapsed (${segCounts.lapsed})`],
    ] : []),
  ]

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.375rem', color: '#1a1a1a', margin: '0 0 0.2rem' }}>Clients</h1>
          <p style={{ color: '#888', fontSize: '0.78rem', margin: 0 }}>
            {clients.length} contacts · {hotCount} hot · {optoutCount} opted out
            {hasSchedule && <span style={{ color: '#5e3b87' }}> · {depthLabel} intelligence depth</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, intent…"
            style={{ padding: '0.5rem 0.85rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', fontFamily: "'DM Sans', sans-serif", width: 220, color: '#1a1a1a' }}
          />
          {canCampaign ? (
            <button
              onClick={() => { setCampaignOpen(true); setCampaignResult(null) }}
              disabled={campaignTargets.length === 0}
              style={{ padding: '0.5rem 1rem', background: campaignTargets.length ? '#5e3b87' : '#e8e2f1', color: campaignTargets.length ? 'white' : '#bbb', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: campaignTargets.length ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
            >
              Send Campaign → {filtered.length > 0 && `(${campaignTargets.length})`}
            </button>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#aaa', background: '#f7f6f9', border: '1px solid #eee', borderRadius: '8px', padding: '0.5rem 0.85rem' }}>
              Campaigns from Light tier
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {filterTabs.map(([id, label]) => (
          <button key={id} onClick={() => setFilterTab(id)} style={{ padding: '0.35rem 0.85rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: filterTab === id ? 600 : 400, background: filterTab === id ? (SEG_STYLE[id]?.bg || '#5e3b87') : 'white', color: filterTab === id ? (SEG_STYLE[id]?.c || 'white') : '#666', border: `1px solid ${filterTab === id ? (SEG_STYLE[id]?.c || '#5e3b87') : 'rgba(94,59,135,0.15)'}`, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Segment info bar */}
      {hasSchedule && ['ritual', 'explorer', 'lapsed'].includes(filterTab) && (
        <div style={{ marginBottom: '0.85rem', background: SEG_STYLE[filterTab].bg, border: `1px solid ${SEG_STYLE[filterTab].c}22`, borderRadius: '8px', padding: '0.6rem 0.9rem', fontSize: '0.78rem', color: SEG_STYLE[filterTab].c, lineHeight: 1.5 }}>
          {filterTab === 'ritual'   && 'Consistent bookers — same routine, predictable schedule. They value reliability. A gentle check-in or loyalty offer lands well.'}
          {filterTab === 'explorer' && 'Clients who try different services. High engagement, high curiosity. Ideal audience for new service announcements.'}
          {filterTab === 'lapsed'   && `Clients who haven\'t booked in 6+ weeks. They were regulars. A personal message — not a template — tends to bring them back.`}
        </div>
      )}

      {loading && <div style={{ color: '#aaa', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>Loading contacts…</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ color: '#bbb', fontSize: '0.875rem', textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '12px', border: '0.5px solid rgba(94,59,135,0.08)' }}>
          {clients.length === 0 ? 'No contacts yet — they appear here as your AI handles calls and customers book online.' : 'No contacts match your filter.'}
        </div>
      )}

      {/* Client list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {filtered.map(c => {
          const av = avatarCol(c.name || c.phone || '')
          const ini = initials(c.name || '')
          const expanded = expandedId === c.id
          const noteDraft = noteDrafts[c.id] ?? c.notes ?? ''
          const seg = SEG_STYLE[c.segment]
          return (
            <div key={c.id} style={{ background: 'white', border: `0.5px solid ${c.marketing_opted_out ? 'rgba(185,28,28,0.15)' : 'rgba(94,59,135,0.1)'}`, borderRadius: '10px', padding: '0.85rem 1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: av.bg, color: av.c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0, fontFamily: "'Syne', sans-serif" }}>
                  {ini || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a' }}>{c.name || 'Unknown'}</span>
                    <span style={{ fontSize: '0.775rem', color: '#999' }}>{c.phone}</span>
                    {c.is_hot_prospect && <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#92400e', borderRadius: '4px', padding: '0.1rem 0.4rem', fontWeight: 700 }}>★ HOT</span>}
                    {c.marketing_opted_out && <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '4px', padding: '0.1rem 0.4rem', fontWeight: 600 }}>OPTED OUT</span>}
                    {seg && <span style={{ fontSize: '0.63rem', background: seg.bg, color: seg.c, borderRadius: '4px', padding: '0.1rem 0.4rem', fontWeight: 700, letterSpacing: '0.03em' }}>{seg.label.toUpperCase()}</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.2rem', display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                    {c.call_count > 0 && <span>{c.call_count} call{c.call_count !== 1 ? 's' : ''} · Last: {fmtDate(c.last_call)}</span>}
                    {c.booking_count > 0 && <span style={{ color: '#5e3b87' }}>{c.booking_count} booking{c.booking_count !== 1 ? 's' : ''}{c.last_booking ? ` · Last: ${fmtDate(c.last_booking)}` : ''}</span>}
                    {c.last_outcome && c.call_count > 0 && <span style={{ color: '#5e3b87' }}>· {OUTCOME_LABEL[c.last_outcome] || c.last_outcome}</span>}
                    {c.segment === 'lapsed' && c.last_booking && <span style={{ color: '#92400e' }}>· {weeksAgo(c.last_booking)}w ago</span>}
                    {c.source === 'booking' && <span style={{ color: '#aaa', fontSize: '0.7rem' }}>Booking only</span>}
                  </div>
                  {c.last_summary && <div style={{ fontSize: '0.73rem', color: '#aaa', marginTop: '0.2rem', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500 }}>{c.last_summary}</div>}
                  {c.marketing_opted_out && (
                    <div style={{ fontSize: '0.7rem', color: '#b91c1c', marginTop: '0.3rem', background: '#fff5f5', borderRadius: '4px', padding: '0.2rem 0.5rem', display: 'inline-block' }}>
                      Opted out {c.opted_out_at ? fmtDate(c.opted_out_at) : ''} — excluded from all campaigns
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, alignItems: 'center' }}>
                  <button onClick={() => setExpandedId(expanded ? null : c.id)} style={{ background: expanded ? '#ede8f5' : 'transparent', border: '1px solid rgba(94,59,135,0.15)', borderRadius: '6px', padding: '0.3rem 0.5rem', cursor: 'pointer', fontSize: '0.7rem', color: '#5e3b87' }}>Notes</button>
                  {c.phone && <a href={`tel:${c.phone}`} style={{ fontSize: '0.7rem', background: '#f0ebf8', color: '#5e3b87', padding: '0.3rem 0.5rem', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}>Call</a>}
                  {c.phone && <a href={`sms:${c.phone}`} style={{ fontSize: '0.7rem', background: '#e6f5ee', color: '#1e7a4a', padding: '0.3rem 0.5rem', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}>Text</a>}
                  <button onClick={() => toggleHot(c)} title={c.is_hot_prospect ? 'Remove from hot prospects' : 'Mark as hot prospect'} style={{ background: c.is_hot_prospect ? '#fef3c7' : 'transparent', border: '1px solid rgba(240,165,0,0.3)', borderRadius: '6px', padding: '0.3rem 0.45rem', cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1 }}>★</button>
                  <button onClick={() => toggleOptOut(c)} style={{ background: c.marketing_opted_out ? '#fee2e2' : 'transparent', border: `1px solid ${c.marketing_opted_out ? 'rgba(185,28,28,0.3)' : 'rgba(94,59,135,0.15)'}`, borderRadius: '6px', padding: '0.3rem 0.45rem', cursor: 'pointer', fontSize: '0.8rem', color: c.marketing_opted_out ? '#b91c1c' : '#999', lineHeight: 1 }}>🚫</button>
                  {!isPreview && (
                    <button onClick={() => deleteClient(c)} style={{ background: 'transparent', border: '1px solid rgba(94,59,135,0.1)', borderRadius: '6px', padding: '0.3rem 0.45rem', cursor: 'pointer', fontSize: '0.8rem', color: '#ddd', lineHeight: 1 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#b91c1c'}
                      onMouseLeave={e => e.currentTarget.style.color = '#ddd'}>✕</button>
                  )}
                </div>
              </div>
              {expanded && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(94,59,135,0.06)' }}>
                  <textarea
                    value={noteDraft}
                    onChange={e => setNoteDrafts(p => ({ ...p, [c.id]: e.target.value }))}
                    placeholder="Private notes — not visible to the AI or caller…"
                    rows={3}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '8px', fontSize: '0.8rem', outline: 'none', fontFamily: "'DM Sans', sans-serif", resize: 'vertical', boxSizing: 'border-box', color: '#1a1a1a' }}
                  />
                  <button onClick={() => saveNote(c)} disabled={savingNote === c.id || previewReadOnly} style={{ marginTop: '0.4rem', padding: '0.35rem 0.85rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    {savingNote === c.id ? 'Saving…' : 'Save note'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Campaign composer */}
      {campaignOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '1.75rem', width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#1a1a1a' }}>Send Campaign</span>
              <button onClick={() => { setCampaignOpen(false); setCampaignResult(null) }} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#aaa', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem', background: '#f7f6f9', borderRadius: '8px', padding: '0.65rem 0.85rem', lineHeight: 1.5 }}>
              <strong style={{ color: '#1a1a1a' }}>{campaignTargets.length}</strong> recipients
              {optedOutInFilter > 0 && <span style={{ color: '#b91c1c' }}> · {optedOutInFilter} opted out — excluded</span>}
              {campaignTargets.length > recipientLimit && <span style={{ color: '#f0a500' }}> · capped at {recipientLimit} for your plan</span>}
              {filterTab !== 'all' && <span style={{ color: '#5e3b87' }}> · filtered: {filterTabs.find(f => f[0] === filterTab)?.[1]}</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Message</label>
              <button onClick={aiDraft} disabled={aiDrafting} style={{ fontSize: '0.72rem', color: '#5e3b87', background: '#ede8f5', border: 'none', borderRadius: '6px', padding: '0.25rem 0.65rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                {aiDrafting ? 'Drafting…' : '✦ AI Draft'}
              </button>
            </div>
            <textarea
              value={campaignMsg}
              onChange={e => setCampaignMsg(e.target.value.slice(0, 140))}
              placeholder="Hi [name], we wanted to reach out about…"
              rows={4}
              style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', fontFamily: "'DM Sans', sans-serif", resize: 'none', boxSizing: 'border-box', color: '#1a1a1a', marginBottom: '0.4rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.72rem', color: campaignMsg.length > 120 ? '#f0a500' : '#aaa' }}>{campaignMsg.length} / 140 chars</span>
              <span style={{ fontSize: '0.72rem', color: '#aaa' }}>{Math.ceil((campaignMsg.length + 22) / 160)} SMS segment{Math.ceil((campaignMsg.length + 22) / 160) !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#888', background: '#f7f6f9', borderRadius: '6px', padding: '0.5rem 0.75rem', marginBottom: '1rem', lineHeight: 1.5 }}>
              "Reply STOP to opt out." is appended automatically. Opt-out requests are actioned immediately.
            </div>
            {campaignResult && (
              <div style={{ marginBottom: '0.75rem', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 500, background: campaignResult.ok ? '#e6f5ee' : '#fee2e2', color: campaignResult.ok ? '#1e7a4a' : '#b91c1c' }}>
                {campaignResult.ok ? `✓ Sent to ${campaignResult.sent} contacts${campaignResult.failed ? ` · ${campaignResult.failed} failed` : ''}` : `Failed: ${campaignResult.error}`}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
              <button onClick={() => { setCampaignOpen(false); setCampaignResult(null) }} style={{ padding: '0.55rem 1.1rem', background: 'white', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '8px', fontSize: '0.85rem', color: '#666', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
              <button onClick={sendCampaign} disabled={campaignSending || !campaignMsg.trim() || campaignTargets.length === 0} style={{ padding: '0.55rem 1.25rem', background: campaignSending || !campaignMsg.trim() ? '#f5d98a' : '#f0a500', color: '#1a0533', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: campaignSending ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                {campaignSending ? 'Sending…' : `Send to ${Math.min(campaignTargets.length, recipientLimit)} contacts →`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientDirectory
