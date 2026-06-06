import { useState, useEffect, useCallback } from 'react'
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar'
import _withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
const withDragAndDrop = _withDragAndDrop.default || _withDragAndDrop
import { format, parse, startOfWeek, getDay, addHours, startOfHour } from 'date-fns'
import { enGB } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { useDemo } from '../context/DemoContext'
import { usePreview } from '../context/PreviewContext'

const locales = { 'en-GB': enGB }
const localizer = dateFnsLocalizer({
  format, parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay, locales,
})
const DnDCalendar = withDragAndDrop(BigCalendar)

// ─── Status colours ───────────────────────────────────────────────────────────
const STATUS_COLOURS = {
  provisional: { bg: '#fef3d9', border: '#f0a500', text: '#7a5c00' },
  confirmed:   { bg: '#ede8f5', border: '#5e3b87', text: '#3a2057' },
  completed:   { bg: '#e6f9ef', border: '#3db87a', text: '#1a6640' },
  cancelled:   { bg: '#f5f5f5', border: '#ccc',    text: '#888'    },
  no_show:     { bg: '#fde8e8', border: '#e05252', text: '#7a1a1a' },
}
const STATUS_LABELS = {
  provisional: 'Provisional', confirmed: 'Confirmed', completed: 'Completed',
  cancelled: 'Cancelled', no_show: 'No show',
}

const DEMO_STAFF = [
  { id: 'demo-staff-1', name: 'Sophie', role: 'Senior Stylist' },
  { id: 'demo-staff-2', name: 'Olivia', role: 'Stylist' },
]

const EMPTY_FORM = {
  title: '', description: '', start: '', end: '',
  status: 'confirmed', appointment_type: '', client_notes: '',
  staff_profile_id: '',
  isSplit: false, processing_start: '', processing_end: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toEvent(appt) {
  return {
    id: appt.id,
    title: appt.title,
    start: new Date(appt.start_time),
    end: new Date(appt.end_time),
    resourceId: appt.staff_profile_id || 'unassigned',
    resource: appt,
  }
}

function isoLocal(date) {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function fmtTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

const useIsMobile = () => {
  const [v, setV] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const h = () => setV(window.innerWidth <= 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

// ─── Custom toolbar ───────────────────────────────────────────────────────────
const CalendarToolbar = ({ label, onNavigate, onView, view }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
      <button onClick={() => onNavigate('PREV')}
        style={{ width: 32, height: 32, border: '1px solid rgba(94,59,135,0.18)', borderRadius: 7, background: 'white', color: '#5e3b87', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        ‹
      </button>
      <button onClick={() => onNavigate('TODAY')}
        style={{ padding: '0 0.75rem', height: 32, border: '1px solid rgba(94,59,135,0.18)', borderRadius: 7, background: 'white', color: '#5e3b87', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
        Today
      </button>
      <button onClick={() => onNavigate('NEXT')}
        style={{ width: 32, height: 32, border: '1px solid rgba(94,59,135,0.18)', borderRadius: 7, background: 'white', color: '#5e3b87', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        ›
      </button>
    </div>
    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1a1a1a', textAlign: 'center' }}>
      {label}
    </span>
    <div style={{ display: 'flex', gap: 2, background: '#f0ebf8', borderRadius: 8, padding: 3 }}>
      {['month', 'week', 'day'].map(v => (
        <button key={v} onClick={() => onView(v)}
          style={{ padding: '0.28rem 0.7rem', borderRadius: 6, border: 'none', background: view === v ? '#5e3b87' : 'transparent', color: view === v ? 'white' : '#5e3b87', fontSize: '0.78rem', fontWeight: view === v ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textTransform: 'capitalize', transition: 'background 0.15s' }}>
          {v}
        </button>
      ))}
    </div>
  </div>
)

// ─── Appointment event card ───────────────────────────────────────────────────
function AppointmentCard({ event, title }) {
  const appt = event.resource || {}
  const status = appt.status || 'confirmed'
  const c = STATUS_COLOURS[status] || STATUS_COLOURS.confirmed

  if (appt.processing_start_time && appt.processing_end_time) {
    const totalMs = event.end - event.start
    if (totalMs <= 0) return <div style={{ fontSize: '0.75rem', fontWeight: 500, padding: '2px 4px' }}>{title}</div>
    const processStart = new Date(appt.processing_start_time)
    const processEnd = new Date(appt.processing_end_time)
    const activePre = Math.max(0, processStart - event.start)
    const processing = Math.max(0, processEnd - processStart)
    const activePost = Math.max(0, event.end - processEnd)
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 4 }}>
        {activePre > 0 && (
          <div style={{ flex: activePre, background: c.bg, padding: '2px 4px 2px 8px', position: 'relative', minHeight: 10 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: c.border }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: c.text }}>{title}</span>
          </div>
        )}
        <div style={{ flex: processing, background: 'rgba(255,255,255,0.55)', borderTop: `1.5px dashed ${c.border}`, borderBottom: `1.5px dashed ${c.border}`, padding: '1px 6px', minHeight: 10, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '0.65rem', color: c.text, opacity: 0.7 }}>⏱ Processing</span>
        </div>
        {activePost > 0 && (
          <div style={{ flex: activePost, background: c.bg, padding: '2px 4px', minHeight: 10 }}>
            <span style={{ fontSize: '0.65rem', color: c.text }}>Finish</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', height: '100%', padding: '2px 4px 2px 9px', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: c.border, borderRadius: '2px 0 0 2px' }} />
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.75rem', color: c.text, lineHeight: 1.25, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
        {title}
      </div>
      {appt.appointment_type && (
        <div style={{ fontSize: '0.65rem', color: c.text, opacity: 0.72, marginTop: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {appt.appointment_type}
        </div>
      )}
    </div>
  )
}

// ─── Field components (used in right panel form) ─────────────────────────────
const Label = ({ children }) => (
  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.3rem', fontFamily: "'DM Sans', sans-serif" }}>
    {children}
  </div>
)

const FieldInput = ({ value, onChange, type = 'text', placeholder, autoFocus }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    autoFocus={autoFocus}
    style={{ width: '100%', padding: '0.5rem 0.65rem', border: '1px solid rgba(94,59,135,0.18)', borderRadius: 7, fontSize: '0.8125rem', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', boxSizing: 'border-box', outline: 'none', background: 'white' }}
  />
)

const FieldSelect = ({ value, onChange, children }) => (
  <select
    value={value}
    onChange={onChange}
    style={{ width: '100%', padding: '0.5rem 0.65rem', border: '1px solid rgba(94,59,135,0.18)', borderRadius: 7, fontSize: '0.8125rem', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', background: 'white', boxSizing: 'border-box', cursor: 'pointer', outline: 'none' }}
  >
    {children}
  </select>
)

const FieldTextarea = ({ value, onChange, placeholder, rows = 3 }) => (
  <textarea
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    rows={rows}
    style={{ width: '100%', padding: '0.5rem 0.65rem', border: '1px solid rgba(94,59,135,0.18)', borderRadius: 7, fontSize: '0.8125rem', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', boxSizing: 'border-box', outline: 'none', resize: 'vertical', lineHeight: 1.55 }}
  />
)

// ─── Main component ───────────────────────────────────────────────────────────
export default function CalendarTab({ onNavigate: onPortalNavigate, prefill, onPrefillConsumed }) {
  const { user } = useAuth()
  const demo = useDemo()
  const preview = usePreview()
  const isDemo = !!demo?.isDemo
  const isPreview = preview?.isPreview
  const isMobile = useIsMobile()

  const [tenantId, setTenantId] = useState(null)
  const [events, setEvents] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('week')
  const [teamMode, setTeamMode] = useState(false)

  // Right panel state
  const [panelMode, setPanelMode] = useState(null) // null | 'view' | 'edit' | 'create'
  const [panelEvent, setPanelEvent] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [slotWarning, setSlotWarning] = useState(false)

  const closePanel = () => { setPanelMode(null); setPanelEvent(null) }
  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  // ─── Consume prefill from Dashboard ────────────────────────────────────────
  useEffect(() => {
    if (!prefill) return
    const now = startOfHour(addHours(new Date(), 1))
    setForm({ ...EMPTY_FORM, title: prefill.title || '', start: isoLocal(now), end: isoLocal(addHours(now, 1)), client_notes: prefill.notes || '' })
    setSlotWarning(false)
    setPanelEvent(null)
    setPanelMode('create')
    onPrefillConsumed?.()
  }, [prefill])

  // ESC closes panel
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') closePanel() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  // ─── Load tenant ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemo || (!user && !isPreview)) return
    const getTid = async () => {
      if (isPreview) { setTenantId(preview.previewTenantId); return }
      const { data } = await supabase.from('tenant_memberships').select('tenant_id').eq('user_id', user.id).maybeSingle()
      if (data) setTenantId(data.tenant_id)
    }
    getTid()
  }, [user, isDemo, isPreview])

  // ─── Load appointments + staff ──────────────────────────────────────────────
  useEffect(() => {
    if (!tenantId) return
    const load = async () => {
      setLoading(true)
      try {
        const [apptRes, staffRes] = await Promise.all([
          supabase.from('appointments').select('*').eq('tenant_id', tenantId).order('start_time'),
          supabase.from('staff_profiles').select('id, name, role').eq('tenant_id', tenantId).eq('active', true).order('name'),
        ])
        setEvents((apptRes.data || []).map(toEvent))
        setStaff(staffRes.data || [])
      } catch (err) {
        console.error('Calendar load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tenantId])

  // ─── Demo mode ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isDemo) return
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const h = (hrs) => new Date(today.getTime() + hrs * 3600000)
    setStaff(DEMO_STAFF)
    setEvents([
      { id: 'demo-1', title: 'Sarah Mitchell — Cut & Colour', start: h(9), end: h(11.5), resourceId: 'demo-staff-1', resource: { status: 'confirmed', staff_profile_id: 'demo-staff-1', appointment_type: 'Cut & Colour' } },
      { id: 'demo-2', title: 'Emma Clark — Balayage', start: h(9.5), end: h(13), resourceId: 'demo-staff-1', resource: { status: 'confirmed', staff_profile_id: 'demo-staff-1', appointment_type: 'Balayage', processing_start_time: h(10.25).toISOString(), processing_end_time: h(12).toISOString() } },
      { id: 'demo-3', title: 'James Okafor — Consultation', start: h(10), end: h(10.75), resourceId: 'demo-staff-2', resource: { status: 'confirmed', staff_profile_id: 'demo-staff-2', appointment_type: 'Consultation' } },
      { id: 'demo-4', title: 'Lucy Barnes — Blow Dry', start: h(12), end: h(13), resourceId: 'demo-staff-2', resource: { status: 'provisional', staff_profile_id: 'demo-staff-2', appointment_type: 'Blow Dry' } },
      { id: 'demo-5', title: 'Tom Ellis — Gents Cut', start: h(25), end: h(25.75), resourceId: 'demo-staff-1', resource: { status: 'confirmed', staff_profile_id: 'demo-staff-1', appointment_type: 'Gents Cut' } },
    ])
    setLoading(false)
  }, [isDemo])

  // ─── Resources for team mode ─────────────────────────────────────────────────
  const resources = teamMode && staff.length > 0
    ? [{ id: 'unassigned', title: 'Unassigned' }, ...staff.map(s => ({ id: s.id, title: s.name }))]
    : undefined

  // ─── Event style ─────────────────────────────────────────────────────────────
  const eventPropGetter = useCallback((event) => {
    const status = event.resource?.status || 'confirmed'
    const c = STATUS_COLOURS[status] || STATUS_COLOURS.confirmed
    const isSplit = !!(event.resource?.processing_start_time)
    return {
      style: {
        background: isSplit ? 'transparent' : c.bg,
        border: `1px solid ${c.border}`,
        borderLeft: 'none',
        color: c.text,
        borderRadius: 5,
        padding: isSplit ? 0 : undefined,
        overflow: 'hidden',
      },
    }
  }, [])

  // ─── Slot select → create panel ──────────────────────────────────────────────
  const handleSelectSlot = useCallback(({ start, end, resourceId }) => {
    const durationMins = (end - start) / 60000
    setForm({ ...EMPTY_FORM, start: isoLocal(start), end: isoLocal(end), staff_profile_id: resourceId && resourceId !== 'unassigned' ? resourceId : '' })
    setSlotWarning(durationMins < 30)
    setPanelEvent(null)
    setPanelMode('create')
  }, [])

  // ─── Event click → view panel ────────────────────────────────────────────────
  const handleSelectEvent = useCallback((event) => {
    setPanelEvent(event)
    setPanelMode('view')
  }, [])

  const openEditMode = () => {
    if (!panelEvent) return
    const appt = panelEvent.resource
    setForm({
      title: appt.title || '',
      description: appt.description || '',
      start: isoLocal(appt.start_time || panelEvent.start),
      end: isoLocal(appt.end_time || panelEvent.end),
      status: appt.status || 'confirmed',
      appointment_type: appt.appointment_type || '',
      client_notes: appt.client_notes || '',
      staff_profile_id: appt.staff_profile_id || '',
      isSplit: !!(appt.processing_start_time),
      processing_start: appt.processing_start_time ? isoLocal(appt.processing_start_time) : '',
      processing_end: appt.processing_end_time ? isoLocal(appt.processing_end_time) : '',
    })
    setSlotWarning(false)
    setPanelMode('edit')
  }

  // ─── Drag/resize ─────────────────────────────────────────────────────────────
  const handleEventDrop = useCallback(async ({ event, start, end, resourceId }) => {
    if (isDemo || isPreview) return
    const updates = { start_time: start.toISOString(), end_time: end.toISOString() }
    if (resourceId !== undefined) updates.staff_profile_id = resourceId === 'unassigned' ? null : resourceId
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, start, end, resourceId: resourceId ?? e.resourceId, resource: { ...e.resource, ...updates } } : e))
    await supabase.from('appointments').update(updates).eq('id', event.id)
  }, [isDemo, isPreview])

  const handleEventResize = useCallback(async ({ event, start, end }) => {
    if (isDemo || isPreview) return
    const updates = { start_time: start.toISOString(), end_time: end.toISOString() }
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, start, end, resource: { ...e.resource, ...updates } } : e))
    await supabase.from('appointments').update(updates).eq('id', event.id)
  }, [isDemo, isPreview])

  // ─── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (isDemo || isPreview || !tenantId) return
    if (!form.title.trim() || !form.start || !form.end) return
    if (form.isSplit && (!form.processing_start || !form.processing_end)) return
    setSaving(true)
    try {
      const payload = {
        tenant_id: tenantId,
        title: form.title.trim(),
        description: form.description || null,
        start_time: new Date(form.start).toISOString(),
        end_time: new Date(form.end).toISOString(),
        status: form.status,
        appointment_type: form.appointment_type || null,
        client_notes: form.client_notes || null,
        staff_profile_id: form.staff_profile_id || null,
        processing_start_time: form.isSplit && form.processing_start ? new Date(form.processing_start).toISOString() : null,
        processing_end_time: form.isSplit && form.processing_end ? new Date(form.processing_end).toISOString() : null,
        created_from: 'manual',
      }
      let savedId
      if (panelMode === 'edit' && panelEvent) {
        const { data } = await supabase.from('appointments').update(payload).eq('id', panelEvent.id).select().maybeSingle()
        if (data) { setEvents(prev => prev.map(e => e.id === panelEvent.id ? toEvent(data) : e)); savedId = panelEvent.id }
      } else {
        const { data } = await supabase.from('appointments').insert(payload).select().maybeSingle()
        if (data) { setEvents(prev => [...prev, toEvent(data)]); savedId = data.id }
      }
      if (savedId) {
        fetch('/api/caldav-sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId, appointmentId: savedId, action: 'upsert' }) }).catch(() => {})
      }
      closePanel()
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (isDemo || isPreview || !panelEvent) return
    setSaving(true)
    try {
      await supabase.from('appointments').delete().eq('id', panelEvent.id)
      setEvents(prev => prev.filter(e => e.id !== panelEvent.id))
      fetch('/api/caldav-sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId, appointmentId: panelEvent.id, action: 'delete' }) }).catch(() => {})
      closePanel()
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setSaving(false)
    }
  }

  // ─── Mark completed ───────────────────────────────────────────────────────────
  const handleMarkCompleted = async () => {
    if (isDemo || isPreview || !panelEvent) return
    const updates = { status: 'completed' }
    setEvents(prev => prev.map(e => e.id === panelEvent.id ? { ...e, resource: { ...e.resource, status: 'completed' } } : e))
    setPanelEvent(prev => prev ? { ...prev, resource: { ...prev.resource, status: 'completed' } } : prev)
    if (!isDemo && !isPreview) {
      await supabase.from('appointments').update(updates).eq('id', panelEvent.id)
    }
  }

  const canSave = form.title.trim() && form.start && form.end && !saving
    && (!form.isSplit || (form.processing_start && form.processing_end))

  const hasTeamMode = staff.length > 0

  // ─── Right panel content ──────────────────────────────────────────────────────
  const renderViewPanel = () => {
    if (!panelEvent) return null
    const appt = panelEvent.resource || {}
    const status = appt.status || 'confirmed'
    const c = STATUS_COLOURS[status] || STATUS_COLOURS.confirmed
    const staffMember = staff.find(s => s.id === appt.staff_profile_id)

    return (
      <>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid rgba(94,59,135,0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1a1a1a', lineHeight: 1.3, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {panelEvent.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, background: c.bg, color: c.text, border: `1px solid ${c.border}`, fontFamily: "'DM Sans', sans-serif" }}>
                  {STATUS_LABELS[status] || status}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#aaaaaa', fontFamily: "'DM Sans', sans-serif" }}>
                  {fmtDate(appt.start_time || panelEvent.start)}
                </span>
              </div>
            </div>
            <button onClick={closePanel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaaaaa', fontSize: '1.3rem', lineHeight: 1, padding: '0 0.15rem', flexShrink: 0 }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Time */}
          <div>
            <Label>Time</Label>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem', color: '#1a1a1a', fontWeight: 500 }}>
              {fmtTime(appt.start_time || panelEvent.start)} – {fmtTime(appt.end_time || panelEvent.end)}
            </div>
            {appt.processing_start_time && (
              <div style={{ fontSize: '0.75rem', color: '#f0a500', fontFamily: "'DM Sans', sans-serif", marginTop: 3, fontWeight: 500 }}>
                ⏱ Processing {fmtTime(appt.processing_start_time)} – {fmtTime(appt.processing_end_time)}
              </div>
            )}
          </div>

          {appt.appointment_type && (
            <div>
              <Label>Service</Label>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem', color: '#1a1a1a' }}>{appt.appointment_type}</div>
            </div>
          )}

          {staffMember && (
            <div>
              <Label>Staff</Label>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem', color: '#1a1a1a' }}>
                {staffMember.name}{staffMember.role ? ` · ${staffMember.role}` : ''}
              </div>
            </div>
          )}

          {appt.client_notes && (
            <div>
              <Label>Client notes</Label>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8125rem', color: '#444', lineHeight: 1.6, background: '#f7f6f9', borderRadius: 8, padding: '0.65rem 0.75rem' }}>
                {appt.client_notes}
              </div>
            </div>
          )}

          {appt.description && (
            <div>
              <Label>Internal notes</Label>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8125rem', color: '#666', lineHeight: 1.6 }}>
                {appt.description}
              </div>
            </div>
          )}

          {/* Review requests (completed only) */}
          {status === 'completed' && !isDemo && !isPreview && (
            <div>
              <Label>Review requests</Label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: 4 }}>
                <ReviewRequestButton tenantId={tenantId} appointmentId={panelEvent.id} integrationId="google_business" label="Google" />
                <ReviewRequestButton tenantId={tenantId} appointmentId={panelEvent.id} integrationId="checkatrade" label="Checkatrade" />
                <ReviewRequestButton tenantId={tenantId} appointmentId={panelEvent.id} integrationId="rated_people" label="Rated People" />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(94,59,135,0.08)', flexShrink: 0, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {status !== 'completed' && (
            <button onClick={handleMarkCompleted}
              style={{ padding: '0.45rem 0.85rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: 7, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
              Mark completed
            </button>
          )}
          <button onClick={openEditMode}
            style={{ padding: '0.45rem 0.85rem', border: '1px solid rgba(94,59,135,0.22)', borderRadius: 7, background: 'white', color: '#5e3b87', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            Edit
          </button>
          {!isDemo && !isPreview && (
            <button onClick={handleDelete} disabled={saving}
              style={{ padding: '0.45rem 0.85rem', border: '1px solid rgba(224,82,82,0.3)', borderRadius: 7, background: 'white', color: '#e05252', fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: saving ? 0.6 : 1 }}>
              Delete
            </button>
          )}
        </div>
      </>
    )
  }

  const renderFormPanel = () => (
    <>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid rgba(94,59,135,0.08)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1a1a1a' }}>
            {panelMode === 'create' ? 'New appointment' : 'Edit appointment'}
          </div>
          <button onClick={closePanel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaaaaa', fontSize: '1.3rem', lineHeight: 1, padding: '0 0.15rem' }}>×</button>
        </div>
      </div>

      {/* Form body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

        {slotWarning && (
          <div style={{ padding: '0.6rem 0.8rem', background: '#fef3d9', border: '1px solid rgba(240,165,0,0.35)', borderRadius: 7, fontSize: '0.78rem', color: '#7a5c00', lineHeight: 1.5 }}>
            This slot may be shorter than usual. Adjust the end time below.
          </div>
        )}

        <div>
          <Label>Title *</Label>
          <FieldInput value={form.title} onChange={f('title')} placeholder="e.g. Sarah Mitchell — Cut & Colour" autoFocus />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <div>
            <Label>Start *</Label>
            <FieldInput type="datetime-local" value={form.start} onChange={f('start')} />
          </div>
          <div>
            <Label>End *</Label>
            <FieldInput type="datetime-local" value={form.end} onChange={f('end')} />
          </div>
        </div>

        {/* Split toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.isSplit}
            onChange={e => setForm(prev => ({ ...prev, isSplit: e.target.checked, processing_start: '', processing_end: '' }))}
            style={{ width: 15, height: 15, accentColor: '#f0a500', cursor: 'pointer' }} />
          <span style={{ fontSize: '0.8125rem', color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>
            Split appointment — has processing time
          </span>
        </label>

        {form.isSplit && (
          <div style={{ background: '#fef3d9', borderRadius: 8, padding: '0.85rem', border: '1px solid rgba(240,165,0,0.25)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#7a5c00', marginBottom: '0.5rem', fontFamily: "'DM Sans', sans-serif" }}>
              Processing window
            </div>
            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.65rem', lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>
              When is the client under heat and you're free for another booking?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <Label>Starts</Label>
                <FieldInput type="datetime-local" value={form.processing_start} onChange={f('processing_start')} />
              </div>
              <div>
                <Label>Ends</Label>
                <FieldInput type="datetime-local" value={form.processing_end} onChange={f('processing_end')} />
              </div>
            </div>
          </div>
        )}

        <div>
          <Label>Status</Label>
          <FieldSelect value={form.status} onChange={f('status')}>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </FieldSelect>
        </div>

        {staff.length > 0 && (
          <div>
            <Label>Staff member</Label>
            <FieldSelect value={form.staff_profile_id} onChange={f('staff_profile_id')}>
              <option value="">— Unassigned —</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}{s.role ? ` — ${s.role}` : ''}</option>)}
            </FieldSelect>
          </div>
        )}

        <div>
          <Label>Service type</Label>
          <FieldInput value={form.appointment_type} onChange={f('appointment_type')} placeholder="e.g. Cut & Colour, Boiler service" />
        </div>

        <div>
          <Label>Client notes</Label>
          <FieldTextarea value={form.client_notes} onChange={f('client_notes')} placeholder="Notes visible when opening this appointment" />
        </div>

        <div>
          <Label>Internal notes</Label>
          <FieldTextarea value={form.description} onChange={f('description')} placeholder="Internal instructions" />
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(94,59,135,0.08)', flexShrink: 0, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {panelMode === 'edit' && !isDemo && !isPreview && (
          <button onClick={handleDelete} disabled={saving}
            style={{ padding: '0.45rem 0.85rem', border: '1px solid rgba(224,82,82,0.3)', borderRadius: 7, background: 'white', color: '#e05252', fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginRight: 'auto' }}>
            Delete
          </button>
        )}
        <button onClick={panelMode === 'edit' ? () => setPanelMode('view') : closePanel}
          style={{ padding: '0.45rem 0.85rem', border: '1px solid rgba(94,59,135,0.22)', borderRadius: 7, background: 'white', color: '#5e3b87', fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginLeft: panelMode === 'edit' ? 0 : 'auto' }}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={!canSave || isDemo || isPreview}
          style={{ padding: '0.45rem 1rem', border: 'none', borderRadius: 7, background: (!canSave || isDemo || isPreview) ? '#f5d98a' : '#f0a500', color: (!canSave || isDemo || isPreview) ? '#7a5c1a' : '#1a0533', fontSize: '0.78rem', fontWeight: 600, cursor: (!canSave || isDemo || isPreview) ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </>
  )

  const panelOpen = !!panelMode

  // ─── Desktop: right panel layout vars ────────────────────────────────────────
  const panelVariants = {
    hidden: { x: 32, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
    exit:   { x: 32, opacity: 0, transition: { duration: 0.16 } },
  }

  const drawerVariants = {
    hidden: { y: '100%' },
    visible: { y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
    exit:   { y: '100%', transition: { duration: 0.2 } },
  }

  return (
    <div>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}
        data-help="Qerxel Calendar — create appointments manually, drag to reschedule, or let your AI create them from captured calls. Split appointments show processing gaps so you can book other clients during colour/drying time.">
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.25rem', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
          Calendar
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {hasTeamMode && (
            <>
              <button
                onClick={() => { setTeamMode(false); setView('week') }}
                style={{ padding: '0.38rem 0.85rem', borderRadius: 7, border: !teamMode ? '1.5px solid #5e3b87' : '1px solid rgba(94,59,135,0.25)', background: !teamMode ? '#5e3b87' : 'white', color: !teamMode ? 'white' : '#5e3b87', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Solo
              </button>
              <button
                onClick={() => { setTeamMode(true); setView('day') }}
                style={{ padding: '0.38rem 0.85rem', borderRadius: 7, border: teamMode ? '1.5px solid #5e3b87' : '1px solid rgba(94,59,135,0.25)', background: teamMode ? '#5e3b87' : 'white', color: teamMode ? 'white' : '#5e3b87', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Team
              </button>
            </>
          )}
          <button
            onClick={() => {
              const now = startOfHour(addHours(new Date(), 1))
              setForm({ ...EMPTY_FORM, start: isoLocal(now), end: isoLocal(addHours(now, 1)) })
              setSlotWarning(false)
              setPanelEvent(null)
              setPanelMode('create')
            }}
            style={{ padding: '0.5rem 1.1rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif' }}>
            + New
          </button>
        </div>
      </div>

      {/* ── Status legend ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.85rem', alignItems: 'center' }}>
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <span key={status} style={{ display: 'inline-block', padding: '0.18rem 0.55rem', borderRadius: 5, fontSize: '0.72rem', fontWeight: 600, background: STATUS_COLOURS[status]?.bg, color: STATUS_COLOURS[status]?.text, border: `1px solid ${STATUS_COLOURS[status]?.border}`, fontFamily: "'DM Sans', sans-serif" }}>
            {label}
          </span>
        ))}
        {hasTeamMode && (
          <span style={{ fontSize: '0.72rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif", marginLeft: 4 }}>
            {teamMode ? `Team · ${staff.length} staff` : 'Solo'}
          </span>
        )}
      </div>

      {/* ── Main layout: calendar + right panel ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>

        {/* Calendar grid */}
        <div style={{ flex: 1, minWidth: 0, background: 'white', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.1)', padding: '1rem', boxSizing: 'border-box' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 500, color: '#aaa', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif" }}>
              Loading calendar…
            </div>
          ) : (
            <DnDCalendar
              localizer={localizer}
              events={events}
              date={currentDate}
              view={view}
              onNavigate={setCurrentDate}
              onView={setView}
              views={['month', 'week', 'day']}
              selectable
              resizable
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              eventPropGetter={eventPropGetter}
              components={{ toolbar: CalendarToolbar, event: AppointmentCard }}
              resources={resources}
              resourceIdAccessor="id"
              resourceTitleAccessor="title"
              style={{ height: panelOpen && !isMobile ? 580 : 620 }}
              min={new Date(0, 0, 0, 7, 0, 0)}
              max={new Date(0, 0, 0, 20, 0, 0)}
              formats={{
                timeGutterFormat: 'HH:mm',
                eventTimeRangeFormat: ({ start, end }) => `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`,
              }}
              messages={{ today: 'Today', previous: '‹', next: '›' }}
            />
          )}
        </div>

        {/* Right panel (desktop) */}
        {!isMobile && (
          <AnimatePresence>
            {panelOpen && (
              <motion.div
                key="right-panel"
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                style={{ width: 320, flexShrink: 0, background: 'white', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.1)', boxShadow: '0 4px 24px rgba(94,59,135,0.1)', display: 'flex', flexDirection: 'column', maxHeight: 640, overflow: 'hidden' }}
              >
                {panelMode === 'view' ? renderViewPanel() : renderFormPanel()}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Bottom drawer (mobile) */}
      {isMobile && (
        <AnimatePresence>
          {panelOpen && (
            <>
              <motion.div
                key="drawer-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={closePanel}
                style={{ position: 'fixed', inset: 0, background: 'rgba(26,5,51,0.45)', zIndex: 1100 }}
              />
              <motion.div
                key="drawer"
                variants={drawerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '20px 20px 0 0', zIndex: 1200, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              >
                <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e0d8ed', margin: '12px auto 0', flexShrink: 0 }} />
                {panelMode === 'view' ? renderViewPanel() : renderFormPanel()}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}

    </div>
  )
}

// ─── Review request button ────────────────────────────────────────────────────
function ReviewRequestButton({ tenantId, appointmentId, integrationId = 'google_business', label = '⭐ Review' }) {
  const [status, setStatus] = useState('idle')

  const handleSend = async () => {
    setStatus('sending')
    try {
      const res = await fetch('/api/send-review-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, appointmentId, integrationId }),
      })
      setStatus(res.ok ? 'sent' : 'error')
    } catch { setStatus('error') }
  }

  if (status === 'sent') return <span style={{ fontSize: '0.75rem', color: '#3db87a', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>{label} ✓</span>
  if (status === 'error') return null

  return (
    <button onClick={handleSend} disabled={status === 'sending'}
      style={{ padding: '0.35rem 0.7rem', border: '1px solid rgba(94,59,135,0.22)', borderRadius: 6, background: 'white', color: '#5e3b87', fontSize: '0.72rem', fontWeight: 500, cursor: status === 'sending' ? 'wait' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: status === 'sending' ? 0.6 : 1 }}>
      {status === 'sending' ? '…' : `⭐ ${label}`}
    </button>
  )
}
