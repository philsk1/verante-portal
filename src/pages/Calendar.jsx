import { useState, useEffect, useCallback } from 'react'
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import { format, parse, startOfWeek, getDay, addHours, startOfHour } from 'date-fns'
import { enGB } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
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

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO_STAFF = [
  { id: 'demo-staff-1', name: 'Sophie', role: 'Senior Stylist' },
  { id: 'demo-staff-2', name: 'Olivia', role: 'Stylist' },
]

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  wrapper: { maxWidth: 940, margin: '0 auto' },
  topBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem',
  },
  title: {
    fontFamily: "'Syne', sans-serif", fontSize: '1.3rem',
    fontWeight: 700, color: '#1a1a1a', margin: 0,
  },
  controls: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
  toggleBtn: (active) => ({
    padding: '0.4rem 0.9rem',
    borderRadius: '7px',
    border: active ? '1.5px solid #5e3b87' : '1px solid rgba(94,59,135,0.25)',
    background: active ? '#5e3b87' : 'white',
    color: active ? 'white' : '#5e3b87',
    fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  }),
  newBtn: {
    padding: '0.5rem 1.1rem', background: '#f0a500', color: '#1a0533',
    border: 'none', borderRadius: '8px', fontSize: '0.85rem',
    fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
  },
  calendarWrap: {
    background: 'white', borderRadius: '10px',
    border: '0.5px solid rgba(94,59,135,0.1)', padding: '1rem', minHeight: 600,
  },
  statusChip: (status) => ({
    display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '5px',
    fontSize: '0.75rem', fontWeight: 600,
    background: STATUS_COLOURS[status]?.bg || '#f5f5f5',
    color: STATUS_COLOURS[status]?.text || '#888',
    border: `1px solid ${STATUS_COLOURS[status]?.border || '#ccc'}`,
    marginRight: '0.35rem', marginBottom: '0.35rem',
  }),
  // Modal
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(26,5,51,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '1rem',
  },
  modal: {
    background: 'white', borderRadius: '12px', padding: '1.75rem',
    width: '100%', maxWidth: 500, maxHeight: '90vh',
    overflowY: 'auto', boxSizing: 'border-box',
  },
  modalTitle: {
    fontFamily: "'Syne', sans-serif", fontSize: '1.1rem',
    fontWeight: 700, color: '#1a1a1a', margin: '0 0 1.25rem',
  },
  fieldGroup: { marginBottom: '1rem' },
  label: {
    display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#555',
    marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.07em',
  },
  input: {
    width: '100%', padding: '0.55rem 0.75rem',
    border: '1px solid rgba(94,59,135,0.2)', borderRadius: '7px',
    fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif",
    color: '#1a1a1a', boxSizing: 'border-box', outline: 'none',
  },
  textarea: {
    width: '100%', padding: '0.55rem 0.75rem',
    border: '1px solid rgba(94,59,135,0.2)', borderRadius: '7px',
    fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif",
    color: '#1a1a1a', boxSizing: 'border-box', outline: 'none',
    resize: 'vertical', minHeight: 72,
  },
  select: {
    width: '100%', padding: '0.55rem 0.75rem',
    border: '1px solid rgba(94,59,135,0.2)', borderRadius: '7px',
    fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif",
    color: '#1a1a1a', background: 'white', boxSizing: 'border-box',
    outline: 'none', cursor: 'pointer',
  },
  row: { display: 'flex', gap: '0.75rem' },
  splitSection: {
    background: '#fef3d9', borderRadius: '8px', padding: '0.9rem',
    marginBottom: '1rem', border: '1px solid rgba(240,165,0,0.25)',
  },
  splitLabel: {
    fontSize: '0.78rem', fontWeight: 600, color: '#7a5c00', marginBottom: '0.6rem',
  },
  modalFooter: {
    display: 'flex', justifyContent: 'flex-end',
    gap: '0.75rem', marginTop: '1.5rem',
  },
  cancelBtn: {
    padding: '0.5rem 1rem', border: '1px solid rgba(94,59,135,0.25)',
    borderRadius: '7px', background: 'white', color: '#5e3b87',
    fontSize: '0.85rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
  },
  saveBtn: (disabled) => ({
    padding: '0.5rem 1.25rem', border: 'none', borderRadius: '7px',
    background: disabled ? '#f5d98a' : '#f0a500',
    color: disabled ? '#7a5c1a' : '#1a0533',
    fontSize: '0.85rem', fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  }),
  deleteBtn: {
    padding: '0.5rem 1rem', border: '1px solid rgba(224,82,82,0.3)',
    borderRadius: '7px', background: 'white', color: '#e05252',
    fontSize: '0.85rem', cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif", marginRight: 'auto',
  },
  warnBanner: {
    padding: '0.65rem 0.9rem', background: '#fef3d9',
    border: '1px solid rgba(240,165,0,0.35)', borderRadius: '7px',
    fontSize: '0.8rem', color: '#7a5c00', marginBottom: '1rem', lineHeight: 1.5,
  },
  checkRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' },
  checkLabel: { fontSize: '0.85rem', color: '#1a1a1a', fontWeight: 500 },
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

const EMPTY_FORM = {
  title: '', description: '', start: '', end: '',
  status: 'confirmed', appointment_type: '', client_notes: '',
  staff_profile_id: '',
  isSplit: false, processing_start: '', processing_end: '',
}

// ─── Split appointment event renderer ────────────────────────────────────────
function SplitEventComponent({ event, title }) {
  const appt = event.resource
  const status = appt?.status || 'confirmed'
  const c = STATUS_COLOURS[status] || STATUS_COLOURS.confirmed

  if (!appt?.processing_start_time || !appt?.processing_end_time) {
    return (
      <div style={{ fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.3, padding: '1px 2px', overflow: 'hidden' }}>
        {title}
      </div>
    )
  }

  const totalMs = event.end - event.start
  if (totalMs <= 0) return <div>{title}</div>

  const processStart = new Date(appt.processing_start_time)
  const processEnd = new Date(appt.processing_end_time)
  const activePre = Math.max(0, processStart - event.start)
  const processing = Math.max(0, processEnd - processStart)
  const activePost = Math.max(0, event.end - processEnd)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '4px' }}>
      {activePre > 0 && (
        <div style={{ flex: activePre, background: c.bg, padding: '2px 4px', minHeight: 10 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: c.text }}>{title}</span>
        </div>
      )}
      <div style={{
        flex: processing, background: 'rgba(255,255,255,0.55)',
        borderTop: `1.5px dashed ${c.border}`, borderBottom: `1.5px dashed ${c.border}`,
        padding: '1px 4px', minHeight: 10, display: 'flex', alignItems: 'center',
      }}>
        <span style={{ fontSize: '0.68rem', color: c.text, opacity: 0.7 }}>⏱ Processing</span>
      </div>
      {activePost > 0 && (
        <div style={{ flex: activePost, background: c.bg, padding: '2px 4px', minHeight: 10 }}>
          <span style={{ fontSize: '0.68rem', color: c.text }}>Finish</span>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CalendarTab({ onNavigate, prefill, onPrefillConsumed }) {
  const { user } = useAuth()
  const demo = useDemo()
  const preview = usePreview()
  const isDemo = !!demo?.isDemo
  const isPreview = preview?.isPreview

  const [tenantId, setTenantId] = useState(null)
  const [events, setEvents] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('week')
  const [teamMode, setTeamMode] = useState(false)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [slotWarning, setSlotWarning] = useState(false)

  // ─── Consume prefill from Dashboard lead ────────────────────────────────────
  useEffect(() => {
    if (!prefill) return
    const now = startOfHour(addHours(new Date(), 1))
    setForm({
      ...EMPTY_FORM,
      title: prefill.title || '',
      start: isoLocal(now),
      end: isoLocal(addHours(now, 1)),
      client_notes: prefill.notes || '',
    })
    setSlotWarning(false)
    setEditing(null)
    setModalOpen(true)
    onPrefillConsumed?.()
  }, [prefill])

  // ─── Load tenant ID ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemo || (!user && !isPreview)) return
    const getTid = async () => {
      if (isPreview) { setTenantId(preview.previewTenantId); return }
      const { data } = await supabase
        .from('tenant_memberships').select('tenant_id').eq('user_id', user.id).maybeSingle()
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

  // ─── Demo mode ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isDemo) return
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const h = (hrs) => new Date(today.getTime() + hrs * 3600000)
    setStaff(DEMO_STAFF)
    setEvents([
      {
        id: 'demo-1',
        title: 'Sarah Mitchell — Cut & Colour',
        start: h(9), end: h(11.5),
        resourceId: 'demo-staff-1',
        resource: { status: 'confirmed', staff_profile_id: 'demo-staff-1' },
      },
      {
        id: 'demo-2',
        title: 'Emma Clark — Balayage',
        start: h(9.5), end: h(13),
        resourceId: 'demo-staff-1',
        resource: {
          status: 'confirmed', staff_profile_id: 'demo-staff-1',
          processing_start_time: h(10.25).toISOString(),
          processing_end_time: h(12).toISOString(),
        },
      },
      {
        id: 'demo-3',
        title: 'James Okafor — Consultation',
        start: h(10), end: h(10.75),
        resourceId: 'demo-staff-2',
        resource: { status: 'confirmed', staff_profile_id: 'demo-staff-2' },
      },
      {
        id: 'demo-4',
        title: 'Lucy Barnes — Blow Dry',
        start: h(12), end: h(13),
        resourceId: 'demo-staff-2',
        resource: { status: 'provisional', staff_profile_id: 'demo-staff-2' },
      },
      {
        id: 'demo-5',
        title: 'Tom Ellis — Gents Cut',
        start: h(25), end: h(25.75),
        resourceId: 'demo-staff-1',
        resource: { status: 'confirmed', staff_profile_id: 'demo-staff-1' },
      },
    ])
    setLoading(false)
  }, [isDemo])

  // ─── Resources for team mode ──────────────────────────────────────────────
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
        border: `1.5px solid ${c.border}`,
        color: c.text,
        borderRadius: '5px',
        fontSize: '0.775rem',
        fontWeight: 500,
        padding: isSplit ? 0 : '2px 5px',
        overflow: 'hidden',
      },
    }
  }, [])

  // ─── Slot select ──────────────────────────────────────────────────────────────
  const handleSelectSlot = useCallback(({ start, end, resourceId }) => {
    const durationMins = (end - start) / 60000
    setForm({
      ...EMPTY_FORM,
      start: isoLocal(start),
      end: isoLocal(end),
      staff_profile_id: resourceId && resourceId !== 'unassigned' ? resourceId : '',
    })
    setSlotWarning(durationMins < 30)
    setEditing(null)
    setModalOpen(true)
  }, [])

  // ─── Event click ──────────────────────────────────────────────────────────────
  const handleSelectEvent = useCallback((event) => {
    const appt = event.resource
    setForm({
      title: appt.title || '',
      description: appt.description || '',
      start: isoLocal(appt.start_time || event.start),
      end: isoLocal(appt.end_time || event.end),
      status: appt.status || 'confirmed',
      appointment_type: appt.appointment_type || '',
      client_notes: appt.client_notes || '',
      staff_profile_id: appt.staff_profile_id || '',
      isSplit: !!(appt.processing_start_time),
      processing_start: appt.processing_start_time ? isoLocal(appt.processing_start_time) : '',
      processing_end: appt.processing_end_time ? isoLocal(appt.processing_end_time) : '',
    })
    setSlotWarning(false)
    setEditing(event)
    setModalOpen(true)
  }, [])

  // ─── Drag / drop / resize ──────────────────────────────────────────────────
  const handleEventDrop = useCallback(async ({ event, start, end, resourceId }) => {
    if (isDemo || isPreview) return
    const updates = { start_time: start.toISOString(), end_time: end.toISOString() }
    if (resourceId !== undefined) updates.staff_profile_id = resourceId === 'unassigned' ? null : resourceId
    const updated = {
      ...event, start, end,
      resourceId: resourceId ?? event.resourceId,
      resource: { ...event.resource, ...updates },
    }
    setEvents(prev => prev.map(e => e.id === event.id ? updated : e))
    await supabase.from('appointments').update(updates).eq('id', event.id)
  }, [isDemo, isPreview])

  const handleEventResize = useCallback(async ({ event, start, end }) => {
    if (isDemo || isPreview) return
    const updates = { start_time: start.toISOString(), end_time: end.toISOString() }
    setEvents(prev => prev.map(e => e.id === event.id
      ? { ...e, start, end, resource: { ...e.resource, ...updates } }
      : e
    ))
    await supabase.from('appointments').update(updates).eq('id', event.id)
  }, [isDemo, isPreview])

  // ─── Save ──────────────────────────────────────────────────────────────────
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
      if (editing) {
        const { data } = await supabase.from('appointments').update(payload).eq('id', editing.id).select().maybeSingle()
        if (data) setEvents(prev => prev.map(e => e.id === editing.id ? toEvent(data) : e))
      } else {
        const { data } = await supabase.from('appointments').insert(payload).select().maybeSingle()
        if (data) setEvents(prev => [...prev, toEvent(data)])
      }
      setModalOpen(false)
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (isDemo || isPreview || !editing) return
    setSaving(true)
    try {
      await supabase.from('appointments').delete().eq('id', editing.id)
      setEvents(prev => prev.filter(e => e.id !== editing.id))
      setModalOpen(false)
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setSaving(false)
    }
  }

  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))
  const canSave = form.title.trim() && form.start && form.end && !saving
    && (!form.isSplit || (form.processing_start && form.processing_end))

  const hasTeamMode = staff.length > 0

  return (
    <div style={s.wrapper}>
      <div style={s.topBar} data-help="Qerxel Calendar — a standalone product. Create appointments manually, drag to reschedule, or let your AI create them from captured calls. Split appointments show processing time so you can book other clients during colour processing gaps.">
        <h2 style={s.title}>Calendar</h2>
        <div style={s.controls}>
          {hasTeamMode && (
            <>
              <button style={s.toggleBtn(!teamMode)} onClick={() => { setTeamMode(false); setView('week') }}>Solo</button>
              <button style={s.toggleBtn(teamMode)} onClick={() => { setTeamMode(true); setView('day') }}>Team</button>
            </>
          )}
          <button style={s.newBtn} onClick={() => {
            const now = startOfHour(addHours(new Date(), 1))
            setForm({ ...EMPTY_FORM, start: isoLocal(now), end: isoLocal(addHours(now, 1)) })
            setSlotWarning(false)
            setEditing(null)
            setModalOpen(true)
          }}>
            + New appointment
          </button>
        </div>
      </div>

      {/* Status legend */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <span key={status} style={s.statusChip(status)}>{label}</span>
        ))}
        {hasTeamMode && (
          <span style={{ fontSize: '0.75rem', color: '#aaa', alignSelf: 'center', marginLeft: '0.25rem' }}>
            {teamMode ? `Team view — ${staff.length} staff` : 'Solo view'}
          </span>
        )}
      </div>

      <div style={s.calendarWrap}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: '#aaa', fontSize: '0.875rem' }}>
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
            components={{ event: SplitEventComponent }}
            resources={resources}
            resourceIdAccessor="id"
            resourceTitleAccessor="title"
            style={{ height: 620 }}
            formats={{
              timeGutterFormat: 'HH:mm',
              eventTimeRangeFormat: ({ start, end }) => `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`,
            }}
            messages={{ today: 'Today', previous: '‹', next: '›' }}
          />
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>{editing ? 'Edit appointment' : 'New appointment'}</h3>

            {slotWarning && (
              <div style={s.warnBanner}>
                This slot may be shorter than usual for this service. Adjust the end time below or continue as-is.
              </div>
            )}

            <div style={s.fieldGroup}>
              <label style={s.label}>Title *</label>
              <input style={s.input} placeholder="e.g. Sarah Mitchell — Cut & Colour" value={form.title} onChange={f('title')} autoFocus />
            </div>

            <div style={s.row}>
              <div style={{ ...s.fieldGroup, flex: 1 }}>
                <label style={s.label}>Start *</label>
                <input style={s.input} type="datetime-local" value={form.start} onChange={f('start')} />
              </div>
              <div style={{ ...s.fieldGroup, flex: 1 }}>
                <label style={s.label}>End *</label>
                <input style={s.input} type="datetime-local" value={form.end} onChange={f('end')} />
              </div>
            </div>

            {/* Split appointment toggle */}
            <div style={s.checkRow}>
              <input
                type="checkbox"
                id="isSplit"
                checked={form.isSplit}
                onChange={e => setForm(prev => ({ ...prev, isSplit: e.target.checked, processing_start: '', processing_end: '' }))}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#f0a500' }}
              />
              <label htmlFor="isSplit" style={s.checkLabel}>Split appointment — has processing time</label>
            </div>

            {form.isSplit && (
              <div style={s.splitSection}>
                <div style={s.splitLabel}>Processing window</div>
                <p style={{ fontSize: '0.78rem', color: '#888', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
                  When is the client under the heat and you're free to take another booking?
                </p>
                <div style={s.row}>
                  <div style={{ ...s.fieldGroup, flex: 1, marginBottom: 0 }}>
                    <label style={s.label}>Processing starts</label>
                    <input style={s.input} type="datetime-local" value={form.processing_start} onChange={f('processing_start')} />
                  </div>
                  <div style={{ ...s.fieldGroup, flex: 1, marginBottom: 0 }}>
                    <label style={s.label}>Processing ends</label>
                    <input style={s.input} type="datetime-local" value={form.processing_end} onChange={f('processing_end')} />
                  </div>
                </div>
              </div>
            )}

            <div style={s.fieldGroup}>
              <label style={s.label}>Status</label>
              <select style={s.select} value={form.status} onChange={f('status')}>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            {staff.length > 0 && (
              <div style={s.fieldGroup}>
                <label style={s.label}>Staff member</label>
                <select style={s.select} value={form.staff_profile_id} onChange={f('staff_profile_id')}>
                  <option value="">— Unassigned —</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name}{s.role ? ` — ${s.role}` : ''}</option>)}
                </select>
              </div>
            )}

            <div style={s.fieldGroup}>
              <label style={s.label}>Service type</label>
              <input style={s.input} placeholder="e.g. Cut & Colour, Boiler service, Consultation" value={form.appointment_type} onChange={f('appointment_type')} />
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Client notes</label>
              <textarea style={s.textarea} placeholder="Notes visible when opening this appointment" value={form.client_notes} onChange={f('client_notes')} />
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Internal description</label>
              <textarea style={s.textarea} placeholder="Internal instructions" value={form.description} onChange={f('description')} />
            </div>

            <div style={s.modalFooter}>
              {editing && !isDemo && !isPreview && (
                <button style={s.deleteBtn} onClick={handleDelete} disabled={saving}>Delete</button>
              )}
              <button style={s.cancelBtn} onClick={() => setModalOpen(false)}>Cancel</button>
              <button
                style={s.saveBtn(!canSave || isDemo || isPreview)}
                onClick={handleSave}
                disabled={!canSave || isDemo || isPreview}
              >
                {saving ? 'Saving…' : 'Save appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
