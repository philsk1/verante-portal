/*
 * AUTHOR: AI agent under direction of Philip Keating (Qerxel founder)
 * VISION: AI call-handling portal for UK sole traders. Every mutation is guarded.
 * FILE: src/pages/Calendar.jsx
 * TOPOLOGY RING: 2 — Contained (1 caller: Portal.jsx)
 * INTENT MAP: Appointment calendar — view/create/edit/delete bookings, staff schedules,
 *   calendar settings, drag-and-drop rescheduling, recurring series creation.
 * REGRESSION MAP:
 *   INPUTS: tenantId, staffId, previewReadOnly (from Portal.jsx)
 *   READS: appointments (with staff_profiles join), staff_profiles, tenants (calendar settings),
 *          leads (for contact lookup), clients
 *   MUTATIONS: appointments (create, update, delete, recurring batch insert),
 *              tenants (calendar settings save)
 *   OUTPUTS: none (self-contained tab)
 * NON-OBVIOUS: withDragAndDrop needs .default fallback for ESM/CJS interop. Recurring series
 *   inserts N appointment rows in a single batch — no server-side loop. previewReadOnly gates
 *   all mutations (save/delete/drag buttons disabled when true).
 * IN-FILE PRIME DIRECTIVES:
 *   1. Never create new files to house extracted logic. Keep it in this file.
 *   2. Run a regression map before every single future edit.
 *   3. No CSS, no CSS variables, inline styles only if layout is touched.
 *   4. Every database mutation must keep its save guard (if applicable).
 *   5. Clean Slate Rule: If complex nesting or multi-path drift occurs, rebuild from blank canvas.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import CalendarIntelligence from './CalendarIntelligence'
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar'
import _withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
const withDragAndDrop = _withDragAndDrop.default || _withDragAndDrop
import { format, parse, startOfWeek, getDay, addHours, startOfHour, addMinutes } from 'date-fns'
import { enGB } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
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

// ─── Category colour palette (service-type colouring) ────────────────────────
const CATEGORY_PALETTE = [
  { bg: '#ddd6fe', border: '#6d28d9', text: '#3b0764' },
  { bg: '#bbf7d0', border: '#15803d', text: '#14532d' },
  { bg: '#bfdbfe', border: '#1d4ed8', text: '#1e3a8a' },
  { bg: '#fed7aa', border: '#c2410c', text: '#7c2d12' },
  { bg: '#fbcfe8', border: '#be185d', text: '#831843' },
  { bg: '#bae6fd', border: '#0369a1', text: '#0c4a6e' },
  { bg: '#fde68a', border: '#b45309', text: '#78350f' },
  { bg: '#e9d5ff', border: '#9333ea', text: '#581c87' },
]
function getCategoryColour(category) {
  if (!category) return null
  let h = 0
  for (let i = 0; i < category.length; i++) h = (h * 31 + category.charCodeAt(i)) % CATEGORY_PALETTE.length
  return CATEGORY_PALETTE[Math.abs(h)]
}

// Full-column layout — appointments never shunt sideways, they stack over each other
function fullColumnLayout({ events, slotMetrics, accessors }) {
  return events.map(event => {
    const { top, height } = slotMetrics.getRange(
      accessors.start(event),
      accessors.end(event)
    )
    return { event, style: { top, height, width: 100, xOffset: 0 } }
  })
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const EMPTY_FORM = {
  title: '', description: '', start: '', end: '',
  status: 'confirmed', appointment_type: '', client_notes: '',
  client_name: '', client_phone: '', client_email: '',
  staff_profile_id: '',
  isSplit: false, processing_start: '', processing_end: '',
  service_id: '',
  repeat_type: 'none',
  repeat_count: 4,
  intake_answers: '',
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

// ─── Custom toolbar (carries all calendar controls) ──────────────────────────
const CalendarToolbar = ({
  label, onNavigate, onView, view,
  staff, staffFilter, setStaffFilter,
  teamMode, setTeamMode, smartView, setSmartView, hasAutoAdapted, setView,
  todayMode, setTodayMode, todayStaffIds,
  onNew, hasTeamMode,
  viewportMode, setViewportMode, currentStaffCount, onStaffCountChange,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
    {/* Nav */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
      <button onClick={() => onNavigate('PREV')} style={{ width: 30, height: 30, border: '1px solid rgba(94,59,135,0.18)', borderRadius: 6, background: 'white', color: '#5e3b87', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>‹</button>
      <button onClick={() => onNavigate('TODAY')} style={{ padding: '0 0.6rem', height: 30, border: '1px solid rgba(94,59,135,0.18)', borderRadius: 6, background: 'white', color: '#5e3b87', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>Today</button>
      <button onClick={() => onNavigate('NEXT')} style={{ width: 30, height: 30, border: '1px solid rgba(94,59,135,0.18)', borderRadius: 6, background: 'white', color: '#5e3b87', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>›</button>
    </div>

    {/* Date label */}
    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#1a1a1a', whiteSpace: 'nowrap', flex: '0 0 auto' }}>{label}</span>

    {/* View switcher */}
    <div style={{ display: 'flex', gap: 2, background: '#f0ebf8', borderRadius: 7, padding: 2, flexShrink: 0 }}>
      {[['month','Month'],['week','Week'],['work_week','5 Day'],['day','Day']].map(([v, lbl]) => (
        <button key={v} onClick={() => { onView(v); if (setSmartView) setSmartView(false) }}
          style={{ padding: '0.22rem 0.6rem', borderRadius: 5, border: 'none', background: view === v ? '#5e3b87' : 'transparent', color: view === v ? 'white' : '#5e3b87', fontSize: '0.75rem', fontWeight: view === v ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s' }}>
          {lbl}
        </button>
      ))}
    </div>

    {/* Spacer */}
    <div style={{ flex: 1 }} />

    {/* Team mode controls */}
    {hasTeamMode && (
      <>
        <div style={{ display: 'flex', gap: 2, background: '#f0ebf8', borderRadius: 7, padding: 2, flexShrink: 0 }}>
          <button onClick={() => { setTeamMode(false); setStaffFilter(''); setView('week'); setSmartView(false) }}
            style={{ padding: '0.22rem 0.6rem', borderRadius: 5, border: 'none', background: !teamMode && !staffFilter ? '#5e3b87' : 'transparent', color: !teamMode && !staffFilter ? 'white' : '#5e3b87', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            Solo
          </button>
          <button onClick={() => { setTeamMode(true); setStaffFilter(''); setView('day'); setSmartView(false) }}
            style={{ padding: '0.22rem 0.6rem', borderRadius: 5, border: 'none', background: teamMode && !staffFilter ? '#5e3b87' : 'transparent', color: teamMode && !staffFilter ? 'white' : '#5e3b87', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            Team
          </button>
          {/* eslint-disable-next-line react-hooks/immutability */}
          <button onClick={() => { if (hasAutoAdapted) hasAutoAdapted.current = false; setSmartView(true) }}
            style={{ padding: '0.22rem 0.6rem', borderRadius: 5, border: 'none', background: smartView ? '#f0a500' : 'transparent', color: smartView ? '#1a0533' : '#5e3b87', fontSize: '0.75rem', fontWeight: smartView ? 700 : 400, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            Smart
          </button>
          {todayStaffIds?.size > 0 && todayStaffIds.size < (staff || []).length && (
            <button onClick={() => { setTeamMode(true); setTodayMode(!todayMode); setStaffFilter(''); setView('day'); setSmartView(false) }}
              style={{ padding: '0.22rem 0.6rem', borderRadius: 5, border: 'none', background: todayMode ? '#3db87a' : 'transparent', color: todayMode ? 'white' : '#5e3b87', fontSize: '0.75rem', fontWeight: todayMode ? 700 : 400, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              In today
            </button>
          )}
        </div>
        <select value={staffFilter} onChange={e => { setStaffFilter(e.target.value); if (e.target.value) { setTeamMode(false); setView('week'); setSmartView(false) } }}
          style={{ padding: '0.25rem 0.5rem', border: '1px solid rgba(94,59,135,0.22)', borderRadius: 6, fontSize: '0.75rem', fontFamily: "'DM Sans', sans-serif", color: staffFilter ? '#5e3b87' : '#888', background: staffFilter ? '#f5f3ff' : 'white', cursor: 'pointer', fontWeight: staffFilter ? 600 : 400, maxWidth: 110 }}>
          <option value="">All staff</option>
          {(staff || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {/* Open / Compact viewport toggle */}
        {teamMode && !staffFilter && setViewportMode && (
          <>
            <div style={{ height: 16, width: 1, background: 'rgba(94,59,135,0.18)', flexShrink: 0 }} />
            <div style={{ display: 'flex', gap: 2, background: '#f0ebf8', borderRadius: 7, padding: 2, flexShrink: 0 }}>
              {[['open','Open'],['compact','Compact']].map(([m, lbl]) => (
                <button key={m} onClick={() => setViewportMode(m)}
                  style={{ padding: '0.22rem 0.6rem', borderRadius: 5, border: 'none', background: viewportMode === m ? '#3a2057' : 'transparent', color: viewportMode === m ? 'white' : '#5e3b87', fontSize: '0.75rem', fontWeight: viewportMode === m ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s' }}>
                  {lbl}
                </button>
              ))}
            </div>
            {/* Staff count stepper */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <button onClick={() => onStaffCountChange(-1)}
                style={{ width: 22, height: 22, border: '1px solid rgba(94,59,135,0.22)', borderRadius: 5, background: 'white', color: '#5e3b87', fontSize: '0.9rem', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>−</button>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.82rem', color: '#1a1a1a', minWidth: 18, textAlign: 'center' }}>{currentStaffCount}</span>
              <button onClick={() => onStaffCountChange(+1)}
                style={{ width: 22, height: 22, border: '1px solid rgba(94,59,135,0.22)', borderRadius: 5, background: 'white', color: '#5e3b87', fontSize: '0.9rem', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>+</button>
              <span style={{ fontSize: '0.68rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>staff</span>
            </div>
          </>
        )}
      </>
    )}

    {/* New appointment */}
    {onNew && (
      <button onClick={onNew} style={{ padding: '0.3rem 0.9rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: 7, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
        + Add booking
      </button>
    )}
  </div>
)

function hexBrightness(hex) {
  if (!hex) return 200
  const h = hex.length === 4 ? '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3] : hex
  if (h.length < 7) return 200
  const r = parseInt(h.slice(1, 3), 16)
  const g = parseInt(h.slice(3, 5), 16)
  const b = parseInt(h.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000
}

// ─── Appointment event card ───────────────────────────────────────────────────
function AppointmentCard({ event, title, catalogue }) {
  const appt = event.resource || {}
  const status = appt.status || 'confirmed'
  const statusC = STATUS_COLOURS[status] || STATUS_COLOURS.confirmed
  const catalogueItem = catalogue?.find(ci => ci.id === appt.service_id)
  const svcColour = catalogueItem?.colour
  const catC = svcColour
    ? { bg: svcColour + 'cc', border: svcColour, text: hexBrightness(svcColour) > 128 ? '#1a1a1a' : '#ffffff' }
    : catalogueItem ? getCategoryColour(catalogueItem.category) : null
  const c = catC || statusC

  const svcName = appt.appointment_type || catalogueItem?.name || (title || '').split(' — ')[0] || title
  const clientName = appt.client_name || ''

  const hasCatSplit = (catalogueItem?.processing_minutes || 0) > 0
  const hasStoredSplit = !!(appt.processing_start_time && appt.processing_end_time)
  const isSplit = hasCatSplit || hasStoredSplit

  if (isSplit) {
    let p1, p2, p3
    if (hasCatSplit) {
      p1 = catalogueItem.duration_minutes || 1
      p2 = catalogueItem.processing_minutes
      p3 = catalogueItem.completion_minutes || 1
    } else {
      p1 = Math.max(1, new Date(appt.processing_start_time) - event.start)
      p2 = Math.max(1, new Date(appt.processing_end_time) - new Date(appt.processing_start_time))
      p3 = Math.max(1, event.end - new Date(appt.processing_end_time))
    }
    return (
      <div style={{ position: 'relative', height: '100%', overflow: 'hidden', borderRadius: 5 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: c.border, zIndex: 2 }} />
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', paddingLeft: 3 }}>
          <div style={{ flex: p1, background: c.bg, padding: '2px 4px', overflow: 'hidden', minHeight: 12 }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.7rem', color: c.text, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', lineHeight: 1.2 }}>{svcName}</div>
            {clientName && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.62rem', color: c.text, opacity: 0.8, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', lineHeight: 1.2 }}>{clientName}</div>}
          </div>
          <div style={{ flex: p2, background: 'rgba(255,255,255,0.6)', minHeight: 8 }} />
          <div style={{ flex: p3, background: c.bg, padding: '2px 4px', overflow: 'hidden', minHeight: 8 }}>
            {clientName && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.62rem', color: c.text, opacity: 0.75, lineHeight: 1.2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{clientName}</div>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', height: '100%', padding: '2px 4px 2px 9px', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: c.border, borderRadius: '2px 0 0 2px' }} />
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.75rem', color: c.text, lineHeight: 1.25, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
        {svcName}
      </div>
      {clientName && (
        <div style={{ fontSize: '0.65rem', color: c.text, opacity: 0.8, marginTop: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {clientName}
        </div>
      )}
    </div>
  )
}

// ─── Field components ─────────────────────────────────────────────────────────
const Label = ({ children }) => (
  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.3rem', fontFamily: "'DM Sans', sans-serif" }}>
    {children}
  </div>
)
const FieldInput = ({ value, onChange, type = 'text', placeholder, autoFocus, disabled }) => (
  <input type={type} value={value} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus} disabled={disabled}
    style={{ width: '100%', padding: '0.5rem 0.65rem', border: '1px solid rgba(94,59,135,0.18)', borderRadius: 7, fontSize: '0.8125rem', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', boxSizing: 'border-box', outline: 'none', background: disabled ? '#f7f6f9' : 'white' }} />
)
const FieldSelect = ({ value, onChange, children, disabled }) => (
  <select value={value} onChange={onChange} disabled={disabled}
    style={{ width: '100%', padding: '0.5rem 0.65rem', border: '1px solid rgba(94,59,135,0.18)', borderRadius: 7, fontSize: '0.8125rem', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', background: disabled ? '#f7f6f9' : 'white', boxSizing: 'border-box', cursor: disabled ? 'not-allowed' : 'pointer', outline: 'none' }}>
    {children}
  </select>
)
const FieldTextarea = ({ value, onChange, placeholder, rows = 3 }) => (
  <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
    style={{ width: '100%', padding: '0.5rem 0.65rem', border: '1px solid rgba(94,59,135,0.18)', borderRadius: 7, fontSize: '0.8125rem', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', boxSizing: 'border-box', outline: 'none', resize: 'vertical', lineHeight: 1.55 }} />
)

// ─── Staff Schedule editor ────────────────────────────────────────────────────
function scheduleSummary(sch) {
  const on = [0,1,2,3,4,5,6].filter(d => sch[d]?.on)
  if (!on.length) return 'No working days set'
  const hours = sch[on[0]]
  const timeStr = hours ? `${hours.start}–${hours.end}` : ''
  const dayStr = on.map(d => DAYS[d]).join(', ')
  return `${dayStr} · ${timeStr}`
}

function StaffScheduleTab({ tenantId, staff, _isPreview, previewReadOnly, onPortalNavigate }) {
  const [schedules, setSchedules] = useState({}) // { staffId: { 0: {on,start,end}, ... } }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [saved, setSaved] = useState(null)
  const [expanded, setExpanded] = useState(null) // staffId of open card

  useEffect(() => {
    if (!tenantId) return
    const load = async () => {
      const { data } = await supabase.from('staff_availability')
        .select('staff_profile_id, day_of_week, start_time, end_time, active')
        .in('staff_profile_id', staff.map(s => s.id))
      const map = {}
      staff.forEach(s => {
        map[s.id] = {}
        for (let d = 0; d < 7; d++) {
          const row = data?.find(r => r.staff_profile_id === s.id && r.day_of_week === d)
          map[s.id][d] = row
            ? { on: row.active, start: row.start_time.slice(0, 5), end: row.end_time.slice(0, 5) }
            : { on: d >= 1 && d <= 5, start: '09:00', end: '18:00' }
        }
      })
      setSchedules(map)
      setLoading(false)
    }
    load()
  }, [tenantId, staff.length])

  const toggle = (staffId, day) => {
    setSchedules(prev => ({ ...prev, [staffId]: { ...prev[staffId], [day]: { ...prev[staffId][day], on: !prev[staffId][day].on } } }))
  }
  const setTime = (staffId, day, field, val) => {
    setSchedules(prev => ({ ...prev, [staffId]: { ...prev[staffId], [day]: { ...prev[staffId][day], [field]: val } } }))
  }

  const saveSchedule = async (staffId) => {
    if (previewReadOnly) return
    setSaving(staffId)
    const days = schedules[staffId] || {}
    const rows = [0, 1, 2, 3, 4, 5, 6].map(d => {
      const { on, start, end } = days[d] || { on: false, start: '09:00', end: '18:00' }
      return { staff_profile_id: staffId, day_of_week: d, start_time: start, end_time: end, active: on }
    })
    await supabase.from('staff_availability').upsert(rows, { onConflict: 'staff_profile_id,day_of_week' })
    setSaving(null)
    setSaved(staffId)
    setTimeout(() => setSaved(null), 2000)
  }

  if (loading) return <div style={{ color: '#aaa', fontSize: '0.875rem', padding: '2rem', fontFamily: "'DM Sans', sans-serif" }}>Loading schedules…</div>
  if (!staff.length) return (
    <div style={{ background: '#faf9fc', border: '1px solid rgba(94,59,135,0.1)', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👥</div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#1a1a1a', marginBottom: '0.3rem' }}>No staff added yet</div>
      <div style={{ fontSize: '0.8125rem', color: '#888', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.75rem' }}>Add staff members to set their working hours here.</div>
      {onPortalNavigate && (
        <button onClick={() => onPortalNavigate('team', { openAdd: true })}
          style={{ padding: '0.4rem 0.9rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: 7, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          + Add first team member →
        </button>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {staff.map(s => {
        const sch = schedules[s.id] || {}
        const isSav = saving === s.id
        const isSaved = saved === s.id
        const isOpen = expanded === s.id
        const summary = Object.keys(sch).length ? scheduleSummary(sch) : 'Not configured'
        return (
          <div key={s.id} style={{ background: 'white', borderRadius: 12, border: `0.5px solid ${isOpen ? 'rgba(94,59,135,0.22)' : 'rgba(94,59,135,0.1)'}`, overflow: 'hidden', transition: 'border-color 0.15s' }}>
            {/* Clickable header */}
            <button
              onClick={() => setExpanded(isOpen ? null : s.id)}
              style={{ width: '100%', padding: '0.85rem 1.25rem', background: isOpen ? '#f5f3ff' : 'white', border: 'none', borderBottom: isOpen ? '1px solid rgba(94,59,135,0.08)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'background 0.15s' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#3a2057' }}>{s.name}</div>
                <div style={{ fontSize: '0.72rem', color: isOpen ? '#5e3b87' : '#aaa', fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
                  {s.role ? `${s.role} · ` : ''}{summary}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                {isOpen && (
                  <button onClick={e => { e.stopPropagation(); saveSchedule(s.id) }} disabled={isSav || previewReadOnly}
                    style={{ padding: '0.32rem 0.8rem', background: isSaved ? '#3db87a' : '#f0a500', color: isSaved ? 'white' : '#1a0533', border: 'none', borderRadius: 7, fontSize: '0.72rem', fontWeight: 600, cursor: isSav ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    {isSav ? 'Saving…' : isSaved ? '✓ Saved' : 'Save'}
                  </button>
                )}
                <span style={{ fontSize: '0.85rem', color: '#aaa', lineHeight: 1 }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </button>

            {/* Expanded schedule grid */}
            {isOpen && (
              <div style={{ padding: '0.85rem 1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem' }}>
                  {[0,1,2,3,4,5,6].map(d => {
                    const day = sch[d] || { on: false, start: '09:00', end: '18:00' }
                    return (
                      <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#aaa', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>{DAYS[d]}</div>
                        <button onClick={() => toggle(s.id, d)}
                          style={{ width: 36, height: 22, borderRadius: 11, border: 'none', background: day.on ? '#5e3b87' : '#e8e0f0', cursor: 'pointer', position: 'relative', transition: 'background 0.18s', flexShrink: 0 }}>
                          <span style={{ position: 'absolute', top: 2, left: day.on ? 16 : 2, width: 18, height: 18, borderRadius: 9, background: 'white', transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                        </button>
                        {day.on && (
                          <>
                            <input type="time" value={day.start} onChange={e => setTime(s.id, d, 'start', e.target.value)}
                              style={{ width: '100%', padding: '0.2rem 0.25rem', border: '1px solid rgba(94,59,135,0.18)', borderRadius: 5, fontSize: '0.68rem', fontFamily: "'DM Sans', sans-serif", textAlign: 'center', boxSizing: 'border-box' }} />
                            <input type="time" value={day.end} onChange={e => setTime(s.id, d, 'end', e.target.value)}
                              style={{ width: '100%', padding: '0.2rem 0.25rem', border: '1px solid rgba(94,59,135,0.18)', borderRadius: 5, fontSize: '0.68rem', fontFamily: "'DM Sans', sans-serif", textAlign: 'center', boxSizing: 'border-box' }} />
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Drag-to-reorder staff list ───────────────────────────────────────────────
function StaffOrderList({ staff, staffOrder, onStaffOrder }) {
  const [dragIndex, setDragIndex] = useState(null)

  const ordered = [...staff].sort((a, b) => {
    const ai = staffOrder.indexOf(a.id)
    const bi = staffOrder.indexOf(b.id)
    if (ai === -1 && bi === -1) return 0
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const handleDragStart = (i) => setDragIndex(i)
  const handleDragOver = (e, i) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === i) return
    const next = [...ordered]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(i, 0, moved)
    onStaffOrder(next.map(s => s.id))
    setDragIndex(i)
  }
  const handleDrop = () => setDragIndex(null)

  return (
    <div>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#888', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Column order</div>
      <div style={{ fontSize: '0.72rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.6rem' }}>Drag to set the order staff columns appear in team view</div>
      {ordered.map((member, i) => (
        <div key={member.id}
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={handleDrop}
          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.6rem', background: dragIndex === i ? '#f0ebf8' : 'white', borderRadius: 7, border: '1px solid rgba(94,59,135,0.1)', marginBottom: '0.3rem', cursor: 'grab', userSelect: 'none', transition: 'background 0.1s' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.35, flexShrink: 0 }}>
            <circle cx="4" cy="3" r="1.2" fill="#5e3b87"/><circle cx="8" cy="3" r="1.2" fill="#5e3b87"/>
            <circle cx="4" cy="6" r="1.2" fill="#5e3b87"/><circle cx="8" cy="6" r="1.2" fill="#5e3b87"/>
            <circle cx="4" cy="9" r="1.2" fill="#5e3b87"/><circle cx="8" cy="9" r="1.2" fill="#5e3b87"/>
          </svg>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: member.colour || '#5e3b87', flexShrink: 0 }} />
          <span style={{ fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', fontWeight: 500 }}>{member.name}</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#ccc', fontFamily: "'DM Sans', sans-serif" }}>#{i + 1}</span>
        </div>
      ))}
    </div>
  )
}

function Toggle({ val, set }) {
  return (
    <button onClick={() => set(!val)} style={{ width: 42, height: 24, borderRadius: 12, border: 'none', background: val ? '#5e3b87' : '#e8e0f0', cursor: 'pointer', position: 'relative', transition: 'background 0.18s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 3, left: val ? 20 : 3, width: 18, height: 18, borderRadius: 9, background: 'white', transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
    </button>
  )
}

function Row({ label, desc, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', padding: '0.85rem 0', borderBottom: '1px solid rgba(94,59,135,0.06)' }}>
      <div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: '0.875rem', color: '#1a1a1a' }}>{label}</div>
        {desc && <div style={{ fontSize: '0.75rem', color: '#888', fontFamily: "'DM Sans', sans-serif", marginTop: 2, lineHeight: 1.4 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

// ─── Calendar settings tab ────────────────────────────────────────────────────
const SVC_PALETTE = [
  '#FF0000', // red
  '#FF00FF', // fuchsia
  '#800000', // maroon
  '#800080', // purple
  '#000080', // navy
  '#0000FF', // blue
  '#00FFFF', // aqua
  '#00FF00', // lime
  '#008000', // green
  '#808000', // olive
  '#FFFF00', // yellow (bright)
  '#008080', // teal
]

const OVERLAP_CHANNELS = [
  { key: 'customer', label: 'Customer (booking page)', desc: 'Client books themselves online — most conservative' },
  { key: 'stylist',  label: 'Stylist (manual)',        desc: 'Stylist creates a booking in the salon — most permissive' },
  { key: 'q_answer', label: 'Q Answer',                desc: 'Q takes a booking during an inbound call' },
  { key: 'q_listen', label: 'Q Listen',                desc: 'Q proactively slots a booking from a detected intent' },
]
const DEFAULT_OVERLAP = {
  customer: { max_mins: 60, max_pct: 50 },
  stylist:  { max_mins: 120, max_pct: 75 },
  q_answer: { max_mins: 60, max_pct: 50 },
  q_listen: { max_mins: 60, max_pct: 50 },
}

function CalendarSettingsTab({ tenantId, _isPreview, previewReadOnly, staff = [], vpOpen, vpCompact, onVpOpen, onVpCompact, staffOrder, onStaffOrder }) {
  const [bufferMins, setBufferMins] = useState(15)
  const [reminder48h, setReminder48h] = useState(true)
  const [reminder24h, setReminder24h] = useState(true)
  const [reminder1h, setReminder1h] = useState(false)
  const [noShowFeeType, setNoShowFeeType] = useState('fixed')
  const [noShowFee, setNoShowFee] = useState('')
  const [noShowFeePct, setNoShowFeePct] = useState('')
  const [cancelCutoffHrs, setCancelCutoffHrs] = useState(24)
  const [chargeLateCancel, setChargeLateCancel] = useState(false)
  const [clientCanReschedule, setClientCanReschedule] = useState(true)
  const [overlapSettings, setOverlapSettings] = useState(DEFAULT_OVERLAP)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!tenantId) return
    supabase.from('tenants')
      .select('booking_buffer_mins, reminder_48h, reminder_24h, reminder_1h, no_show_fee, no_show_fee_type, no_show_fee_pct, cancel_cutoff_hrs, charge_late_cancel, client_can_reschedule, overlap_settings')
      .eq('id', tenantId).maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setBufferMins(data.booking_buffer_mins ?? 15)
        setReminder48h(data.reminder_48h !== false)
        setReminder24h(data.reminder_24h !== false)
        setReminder1h(!!data.reminder_1h)
        setNoShowFeeType(data.no_show_fee_type || 'fixed')
        setNoShowFee(data.no_show_fee ?? '')
        setNoShowFeePct(data.no_show_fee_pct ?? '')
        setCancelCutoffHrs(data.cancel_cutoff_hrs ?? 24)
        setChargeLateCancel(!!data.charge_late_cancel)
        setClientCanReschedule(data.client_can_reschedule !== false)
        if (data.overlap_settings && Object.keys(data.overlap_settings).length > 0) {
          setOverlapSettings({ ...DEFAULT_OVERLAP, ...data.overlap_settings })
        }
      })
  }, [tenantId])

  const setOverlapField = (channel, field, val) => {
    setOverlapSettings(prev => ({
      ...prev,
      [channel]: { ...prev[channel], [field]: val === '' ? '' : Number(val) },
    }))
  }

  const save = async () => {
    if (previewReadOnly || !tenantId) return
    setSaving(true)
    await supabase.from('tenants').update({
      booking_buffer_mins:   bufferMins,
      reminder_48h:          reminder48h,
      reminder_24h:          reminder24h,
      reminder_1h:           reminder1h,
      no_show_fee_type:      noShowFeeType,
      no_show_fee:           noShowFeeType === 'fixed' && noShowFee ? parseFloat(noShowFee) : null,
      no_show_fee_pct:       noShowFeeType === 'percentage' && noShowFeePct ? parseFloat(noShowFeePct) : null,
      cancel_cutoff_hrs:     cancelCutoffHrs,
      charge_late_cancel:    chargeLateCancel,
      client_can_reschedule: clientCanReschedule,
      overlap_settings:      overlapSettings,
    }).eq('id', tenantId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }



  const inputSt = { padding: '0.35rem 0.55rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: 7, fontSize: '0.8125rem', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', background: 'white' }

  const [copied, setCopied] = useState(false)
  const bookingUrl = tenantId ? `${window.location.origin}/book/${tenantId}` : null
  const copyLink = () => {
    if (!bookingUrl) return
    navigator.clipboard.writeText(bookingUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 640 }}>

      {/* ── Customer booking link ──────────────────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.1)', padding: '1rem 1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.85rem', color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Customer booking link</div>
        <div style={{ fontSize: '0.78rem', color: '#888', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.85rem', lineHeight: 1.5 }}>
          Share this link — customers book directly with no login needed, and can manage or cancel their own appointments.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ flex: 1, padding: '0.5rem 0.75rem', background: '#faf9fc', border: '1px solid rgba(94,59,135,0.12)', borderRadius: 8, fontSize: '0.78rem', color: '#5e3b87', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {bookingUrl || '—'}
          </div>
          <button onClick={copyLink} style={{ padding: '0.5rem 1rem', background: copied ? '#3db87a' : '#5e3b87', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', flexShrink: 0, transition: 'background 0.15s' }}>
            {copied ? '✓ Copied' : 'Copy link'}
          </button>
          {bookingUrl && (
            <a href={bookingUrl} target="_blank" rel="noreferrer" style={{ padding: '0.5rem 0.75rem', background: 'white', border: '1px solid rgba(94,59,135,0.18)', borderRadius: 8, fontSize: '0.8rem', color: '#5e3b87', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', flexShrink: 0 }}>
              Preview ↗
            </a>
          )}
        </div>
      </div>

      {/* ── Booking behaviour ─────────────────────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.1)', padding: '1rem 1.25rem' }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.85rem', color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>Booking behaviour</div>
        <Row label="Gap between appointments" desc="Buffer time between bookings — prevents back-to-back without prep time">
          <select value={bufferMins} onChange={e => setBufferMins(Number(e.target.value))} style={inputSt}>
            {[0,5,10,15,20,30,45,60].map(m => <option key={m} value={m}>{m === 0 ? 'None' : `${m} min`}</option>)}
          </select>
        </Row>
        <Row label="Allow clients to reschedule" desc="Clients can pick a new slot via their booking link (subject to cutoff window)">
          <Toggle val={clientCanReschedule} set={setClientCanReschedule} />
        </Row>
      </div>

      {/* ── Cancellation policy ───────────────────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.1)', padding: '1rem 1.25rem' }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.85rem', color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>Cancellation policy</div>
        <Row label="Cancellation cutoff" desc="Clients cannot cancel free of charge within this window">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="number" min="0" max="168" value={cancelCutoffHrs} onChange={e => setCancelCutoffHrs(Number(e.target.value))}
              style={{ ...inputSt, width: 64, textAlign: 'right' }} />
            <span style={{ fontSize: '0.8rem', color: '#888', fontFamily: "'DM Sans', sans-serif" }}>hours</span>
          </div>
        </Row>
        <Row label="Apply fee to late cancellations" desc="Charge the no-show fee when a client cancels inside the cutoff window">
          <Toggle val={chargeLateCancel} set={setChargeLateCancel} />
        </Row>
        <Row label="No-show fee" desc="Charged when a client doesn't attend — set type and amount">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', background: '#f0ebf8', borderRadius: 7, padding: 2 }}>
              {[['fixed','£ Fixed'],['percentage','% of service']].map(([v,l]) => (
                <button key={v} onClick={() => setNoShowFeeType(v)}
                  style={{ padding: '0.22rem 0.6rem', borderRadius: 5, border: 'none', background: noShowFeeType === v ? '#5e3b87' : 'transparent', color: noShowFeeType === v ? 'white' : '#5e3b87', fontSize: '0.72rem', fontWeight: noShowFeeType === v ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.12s' }}>
                  {l}
                </button>
              ))}
            </div>
            {noShowFeeType === 'fixed' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: '0.85rem', color: '#555', fontFamily: "'DM Sans', sans-serif" }}>£</span>
                <input type="number" min="0" step="5" value={noShowFee} onChange={e => setNoShowFee(e.target.value)} placeholder="0"
                  style={{ ...inputSt, width: 72, textAlign: 'right' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="number" min="0" max="100" step="5" value={noShowFeePct} onChange={e => setNoShowFeePct(e.target.value)} placeholder="0"
                  style={{ ...inputSt, width: 64, textAlign: 'right' }} />
                <span style={{ fontSize: '0.85rem', color: '#555', fontFamily: "'DM Sans', sans-serif" }}>%</span>
              </div>
            )}
          </div>
        </Row>
      </div>

      {/* ── Reminder cadence ─────────────────────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.1)', padding: '1rem 1.25rem' }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.85rem', color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>Reminder cadence</div>
        <div style={{ fontSize: '0.75rem', color: '#888', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.5rem' }}>Automated SMS/email reminders sent to clients before their appointment</div>
        <Row label="48-hour reminder"><Toggle val={reminder48h} set={setReminder48h} /></Row>
        <Row label="24-hour reminder"><Toggle val={reminder24h} set={setReminder24h} /></Row>
        <Row label="1-hour reminder"><Toggle val={reminder1h} set={setReminder1h} /></Row>
      </div>

      {/* ── Booking overlap rules ─────────────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.1)', padding: '1rem 1.25rem' }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.85rem', color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Booking overlap rules</div>
        <div style={{ fontSize: '0.75rem', color: '#888', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.85rem', lineHeight: 1.55 }}>
          Controls how much one booking can overlap another, per booking route. Both limits apply simultaneously — whichever is more restrictive wins. Processing time is always exempt (stylist is genuinely free). Hard rule: no booking can sit 100% on top of another.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 0.75rem', alignItems: 'center', marginBottom: '0.3rem' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'DM Sans', sans-serif" }}>Booking route</div>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'DM Sans', sans-serif", textAlign: 'right', minWidth: 96 }}>Max overlap (mins)</div>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'DM Sans', sans-serif", textAlign: 'right', minWidth: 96 }}>Max overlap (%)</div>
        </div>
        {OVERLAP_CHANNELS.map(({ key, label, desc }) => (
          <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 0.75rem', alignItems: 'center', padding: '0.55rem 0', borderTop: '1px solid rgba(94,59,135,0.06)' }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
              <div style={{ fontSize: '0.7rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif", marginTop: 1 }}>{desc}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
              <input type="number" min="0" max="480" step="5"
                value={overlapSettings[key]?.max_mins ?? ''}
                onChange={e => setOverlapField(key, 'max_mins', e.target.value)}
                disabled={previewReadOnly}
                style={{ ...inputSt, width: 64, textAlign: 'right' }} />
              <span style={{ fontSize: '0.78rem', color: '#888', fontFamily: "'DM Sans', sans-serif" }}>min</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
              <input type="number" min="0" max="100" step="5"
                value={overlapSettings[key]?.max_pct ?? ''}
                onChange={e => setOverlapField(key, 'max_pct', e.target.value)}
                disabled={previewReadOnly}
                style={{ ...inputSt, width: 56, textAlign: 'right' }} />
              <span style={{ fontSize: '0.78rem', color: '#888', fontFamily: "'DM Sans', sans-serif" }}>%</span>
            </div>
          </div>
        ))}
        <div style={{ marginTop: '0.65rem', fontSize: '0.7rem', color: '#bbb', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
          Example: a 45-min booking at 50% max = 22 min overlap cap from the % rule. If the mins cap is 60 min, the % rule is more restrictive and applies.
        </div>
      </div>

      <button onClick={save} disabled={saving || previewReadOnly}
        style={{ alignSelf: 'flex-start', padding: '0.55rem 1.4rem', background: saved ? '#3db87a' : (saving ? '#f5d98a' : '#f0a500'), color: saved ? 'white' : '#1a0533', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save settings'}
      </button>

      {/* ── Viewport defaults ─────────────────────────────────────────────── */}
      {vpOpen && vpCompact && onVpOpen && onVpCompact && (
        <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.1)', padding: '1rem 1.25rem' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.85rem', color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Calendar viewport</div>
          <div style={{ fontSize: '0.75rem', color: '#888', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.9rem', lineHeight: 1.5 }}>
            Default staff count for Open and Compact modes in team view. Toggle between modes using the toolbar buttons.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            {[{ label: 'Open mode', cfg: vpOpen, set: onVpOpen }, { label: 'Compact mode', cfg: vpCompact, set: onVpCompact }].map(({ label, cfg, set }) => (
              <div key={label} style={{ background: '#faf9fc', borderRadius: 8, padding: '0.75rem', border: '1px solid rgba(94,59,135,0.1)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#5e3b87', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.6rem' }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#555', fontFamily: "'DM Sans', sans-serif" }}>Staff columns</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={() => set(prev => ({ ...prev, staffCount: Math.max(1, prev.staffCount - 1) }))}
                      style={{ width: 22, height: 22, border: '1px solid rgba(94,59,135,0.22)', borderRadius: 4, background: 'white', color: '#5e3b87', fontSize: '0.9rem', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.85rem', minWidth: 18, textAlign: 'center', color: '#1a1a1a' }}>{cfg.staffCount}</span>
                    <button onClick={() => set(prev => ({ ...prev, staffCount: Math.min(staff.length || 10, prev.staffCount + 1) }))}
                      style={{ width: 22, height: 22, border: '1px solid rgba(94,59,135,0.22)', borderRadius: 4, background: 'white', color: '#5e3b87', fontSize: '0.9rem', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Drag-to-reorder staff */}
          {staff.length > 1 && onStaffOrder && (
            <StaffOrderList staff={staff} staffOrder={staffOrder || []} onStaffOrder={onStaffOrder} />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Day column header (week / work_week view) ───────────────────────────────
function DayColumnHeader({ date }) {
  const isToday = new Date().toDateString() === date.toDateString()
  return (
    <div style={{ padding: '5px 4px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
      <span style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: "'Syne', sans-serif", color: isToday ? '#5e3b87' : '#555', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
        {format(date, 'EEE')}
      </span>
      {isToday
        ? <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: '#5e3b87', color: 'white', fontSize: '0.82rem', fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>{format(date, 'd')}</span>
        : <span style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: "'Syne', sans-serif", color: '#1a1a1a' }}>{format(date, 'd')}</span>
      }
    </div>
  )
}

// ─── Staff column header ─────────────────────────────────────────────────────
const STAFF_COLOURS = ['#5e3b87','#1d4ed8','#16a34a','#db2777','#d97706','#0284c7','#9333ea','#059669']
const staffColour = (id) => STAFF_COLOURS[(id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % STAFF_COLOURS.length]

function ResourceHeader({ label, resource, staffList, events }) {
  const member = staffList?.find(s => s.id === resource?.id)
  const colour = member ? (member.colour || staffColour(member.id)) : '#aaa'
  const todayCount = events?.filter(e => {
    const d = new Date(e.start)
    const now = new Date()
    return e.resourceId === resource?.id &&
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
  }).length ?? 0
  return (
    <div style={{ padding: '4px 6px', textAlign: 'center' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: colour + '22', border: `2px solid ${colour}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 3px', fontSize: '0.72rem', fontWeight: 700, color: colour, fontFamily: "'Syne', sans-serif" }}>
        {(label || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
      </div>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }}>{label}</div>
      {member?.role && <div style={{ fontSize: '0.62rem', color: '#999', fontFamily: "'DM Sans', sans-serif", marginTop: 1 }}>{member.role}</div>}
      {todayCount > 0 && <div style={{ fontSize: '0.6rem', color: colour, fontWeight: 600, marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>{todayCount} today</div>}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const EMPTY_SVC = { name: '', description: '', category: '', duration_minutes: '', processing_minutes: '', completion_minutes: '', price_from: '', price_to: '', cost_price: '', colour: '' }

async function buildAndInsertAppointments({ form, tenantId, basePayload, setEvents, setSaveError }) {
        const isRecurring = form.repeat_type !== 'none'
        const dayGap = form.repeat_type === 'daily' ? 1
          : form.repeat_type === 'weekly' ? 7
          : form.repeat_type === 'fortnightly' ? 14
          : form.repeat_type === '3weekly' ? 21
          : form.repeat_type === 'monthly' ? 28
          : form.repeat_type === '6weekly' ? 42
          : 7
        const count = isRecurring ? Math.max(1, parseInt(form.repeat_count) || 4) : 1
        const seriesId = isRecurring ? crypto.randomUUID() : null

        const payloads = Array.from({ length: count }, (_, i) => {
          const offset = i * dayGap * 24 * 60 * 60 * 1000
          return {
            ...basePayload,
            start_time: new Date(new Date(form.start).getTime() + offset).toISOString(),
            end_time: new Date(new Date(form.end).getTime() + offset).toISOString(),
            processing_start_time: basePayload.processing_start_time
              ? new Date(new Date(basePayload.processing_start_time).getTime() + offset).toISOString()
              : null,
            processing_end_time: basePayload.processing_end_time
              ? new Date(new Date(basePayload.processing_end_time).getTime() + offset).toISOString()
              : null,
            series_id: seriesId,
            series_index: i,
          }
        })

        const { data, error: insertErr } = await supabase.from('appointments').insert(payloads).select()
        if (insertErr) {
          const msg = insertErr.message || ''
          setSaveError(msg.includes('double_booking')
            ? `Too much overlap with an existing booking — ${msg.replace(/.*double_booking: /, '') || 'adjust the times or choose a different slot.'}`
            : 'Could not save — please try again.')
          return false
        }
        if (data) {
          setEvents(prev => [...prev, ...data.map(toEvent)])
          data.forEach(appt => {
            fetch('/api/integrations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'caldav-sync', tenantId, appointmentId: appt.id, caldavAction: 'upsert' }) }).catch(() => {})
          })
          // Send confirmation to client for non-recurring single bookings with contact details
          if (!isRecurring && data[0] && (form.client_email || form.client_phone)) {
            const appt = data[0]
            const ref = appt.id?.slice(0, 8).toUpperCase()
            fetch('/api/integrations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action:      'booking-confirm',
                tenantId,
                clientName:  form.client_name || null,
                clientPhone: form.client_phone || null,
                clientEmail: form.client_email || null,
                serviceName: form.appointment_type || form.title,
                startTime:   appt.start_time,
                bookingRef:  ref,
                cancelToken: appt.cancel_token || null,
              }),
            }).catch(() => {})
          }
        }
  return true
}

function QuickAccessDrawers({ quickPanel, setQuickPanel, setSvcEditing, svcModal, setSvcModal, svcDraft, setSvcDraft, svcError, setSvcError, svcAdding, previewReadOnly, addService, updateService, deleteService, catalogue, staff, onPortalNavigate }) {
  return (
      <AnimatePresence>
        {quickPanel && (
          <>
            <motion.div key="qa-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => { setQuickPanel(null); setSvcEditing(null) }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(26,5,51,0.3)', zIndex: 600 }}
            />
            <motion.div key="qa-drawer"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, background: 'white', zIndex: 700, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 40px rgba(94,59,135,0.18)' }}
            >
              {quickPanel === 'services' ? (
                /* ── Services panel — tile grid ─────────────────────────────── */
                <>
                  {/* Add/Edit modal — full overlay */}
                  {svcModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,5,51,0.55)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(94,59,135,0.25)', overflowY: 'hidden' }}>
                        {/* Modal header */}
                        <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid rgba(94,59,135,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1a1a1a' }}>
                            {svcModal.mode === 'add' ? 'New service' : 'Edit service'}
                          </div>
                          <button onClick={() => setSvcModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '1.5rem', padding: 0, lineHeight: 1 }}>×</button>
                        </div>
                        {/* Modal body */}
                        <div style={{ overflowY: 'auto', padding: '1.25rem 1.5rem', flex: 1 }}>
                          {/* Name */}
                          <div style={{ marginBottom: '0.9rem' }}>
                            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem', fontFamily: "'DM Sans', sans-serif" }}>Service name *</label>
                            <input value={svcDraft.name} onChange={e => setSvcDraft(d => ({ ...d, name: e.target.value }))}
                              placeholder="e.g. Consultation, Full treatment, 60min session"
                              style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem', border: '1.5px solid rgba(94,59,135,0.2)', borderRadius: 8, fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', color: '#1a1a1a' }} />
                          </div>
                          {/* Category + Price row */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.65rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem', fontFamily: "'DM Sans', sans-serif" }}>Category</label>
                              <input value={svcDraft.category} onChange={e => setSvcDraft(d => ({ ...d, category: e.target.value }))}
                                placeholder="e.g. Hair, Consult"
                                style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.65rem', border: '1px solid rgba(94,59,135,0.18)', borderRadius: 8, fontSize: '0.825rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' }} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem', fontFamily: "'DM Sans', sans-serif" }}>Price from £</label>
                              <input value={svcDraft.price_from} onChange={e => setSvcDraft(d => ({ ...d, price_from: e.target.value }))} type="number" min="0"
                                placeholder="0"
                                style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.65rem', border: '1px solid rgba(94,59,135,0.18)', borderRadius: 8, fontSize: '0.825rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' }} />
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.9rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem', fontFamily: "'DM Sans', sans-serif" }}>Price to £</label>
                              <input value={svcDraft.price_to} onChange={e => setSvcDraft(d => ({ ...d, price_to: e.target.value }))} type="number" min="0"
                                placeholder="0"
                                style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.65rem', border: '1px solid rgba(94,59,135,0.18)', borderRadius: 8, fontSize: '0.825rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' }} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#3db87a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem', fontFamily: "'DM Sans', sans-serif" }}>Cost price £</label>
                              <input value={svcDraft.cost_price} onChange={e => setSvcDraft(d => ({ ...d, cost_price: e.target.value }))} type="number" min="0"
                                placeholder="0"
                                style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.65rem', border: '1.5px solid rgba(61,184,122,0.3)', borderRadius: 8, fontSize: '0.825rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' }} />
                              <div style={{ fontSize: '0.65rem', color: '#3db87a', marginTop: '0.2rem', fontFamily: "'DM Sans', sans-serif" }}>Your cost — unlocks margin analysis</div>
                            </div>
                          </div>
                          {/* Description */}
                          <div style={{ marginBottom: '0.9rem' }}>
                            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem', fontFamily: "'DM Sans', sans-serif" }}>Description</label>
                            <textarea value={svcDraft.description} onChange={e => setSvcDraft(d => ({ ...d, description: e.target.value }))}
                              placeholder="Short description — helps the AI explain this service accurately"
                              style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem', border: '1px solid rgba(94,59,135,0.18)', borderRadius: 8, fontSize: '0.825rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', resize: 'vertical', minHeight: 60, lineHeight: 1.5 }} />
                          </div>

                          {/* Calendar colour */}
                          <div style={{ marginBottom: '0.9rem' }}>
                            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.45rem', fontFamily: "'DM Sans', sans-serif" }}>Calendar colour</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                              {SVC_PALETTE.map(pc => (
                                <button key={pc} type="button" onClick={() => setSvcDraft(d => ({ ...d, colour: pc }))}
                                  style={{ width: 26, height: 26, borderRadius: '50%', background: pc, border: svcDraft.colour === pc ? '3px solid #1a0533' : '2px solid rgba(0,0,0,0.1)', cursor: 'pointer', flexShrink: 0, outline: 'none', transition: 'border 0.1s' }} />
                              ))}
                            </div>
                          </div>

                          {/* Split appointment toggle */}
                          <div style={{ background: '#faf9fc', borderRadius: 10, border: '1px solid rgba(94,59,135,0.1)', padding: '0.9rem 1rem', marginBottom: '0.9rem' }}>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                              <input type="checkbox"
                                checked={!!(svcDraft.processing_minutes)}
                                onChange={e => setSvcDraft(d => ({ ...d, processing_minutes: e.target.checked ? '30' : '' }))}
                                style={{ marginTop: 3, accentColor: '#5e3b87', width: 16, height: 16, flexShrink: 0 }}
                              />
                              <div>
                                <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a', marginBottom: '0.2rem' }}>Split appointment</div>
                                <div style={{ fontSize: '0.75rem', color: '#888', lineHeight: 1.5 }}>Appointment has a gap — client waits while you're free to take another booking</div>
                              </div>
                            </label>
                          </div>

                          {/* Service time — always shown */}
                          <div style={{ marginBottom: '0.9rem' }}>
                            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem', fontFamily: "'DM Sans', sans-serif" }}>Service time (mins)</label>
                            <input value={svcDraft.duration_minutes} onChange={e => setSvcDraft(d => ({ ...d, duration_minutes: e.target.value }))} type="number" min="0"
                              placeholder="e.g. 60"
                              style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem', border: '1px solid rgba(94,59,135,0.18)', borderRadius: 8, fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' }} />
                          </div>

                          {/* Split extra fields — only when split checked */}
                          {!!svcDraft.processing_minutes && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.9rem' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#3db87a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem', fontFamily: "'DM Sans', sans-serif" }}>Waiting time (mins)</label>
                                <input value={svcDraft.processing_minutes} onChange={e => setSvcDraft(d => ({ ...d, processing_minutes: e.target.value }))} type="number" min="0"
                                  placeholder="e.g. 30"
                                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem', border: '1.5px solid rgba(61,184,122,0.35)', borderRadius: 8, fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' }} />
                                <div style={{ fontSize: '0.68rem', color: '#3db87a', marginTop: '0.25rem', fontFamily: "'DM Sans', sans-serif" }}>Client waits — you're free</div>
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem', fontFamily: "'DM Sans', sans-serif" }}>Appointment completion (mins)</label>
                                <input value={svcDraft.completion_minutes} onChange={e => setSvcDraft(d => ({ ...d, completion_minutes: e.target.value }))} type="number" min="0"
                                  placeholder="e.g. 20"
                                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem', border: '1px solid rgba(94,59,135,0.18)', borderRadius: 8, fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' }} />
                                <div style={{ fontSize: '0.68rem', color: '#aaa', marginTop: '0.25rem', fontFamily: "'DM Sans', sans-serif" }}>Final segment with client</div>
                              </div>
                            </div>
                          )}
                        </div>
                        {/* Error */}
                        {svcError && (
                          <div style={{ margin: '0 1.5rem', padding: '0.5rem 0.75rem', background: '#fde8e8', border: '1px solid rgba(224,82,82,0.3)', borderRadius: 8, fontSize: '0.78rem', color: '#7a1a1a', fontFamily: "'DM Sans', sans-serif" }}>
                            {svcError}
                          </div>
                        )}
                        {/* Modal footer */}
                        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(94,59,135,0.08)', display: 'flex', gap: '0.65rem', flexShrink: 0 }}>
                          <button
                            onClick={svcModal.mode === 'add' ? addService : () => updateService(svcModal.id)}
                            disabled={!svcDraft.name.trim() || svcAdding}
                            style={{ flex: 1, padding: '0.6rem', border: 'none', borderRadius: 8, background: !svcDraft.name.trim() || svcAdding ? '#f5d98a' : '#f0a500', color: !svcDraft.name.trim() || svcAdding ? '#7a5c1a' : '#1a0533', fontSize: '0.875rem', fontWeight: 700, cursor: !svcDraft.name.trim() || svcAdding ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                            {svcAdding ? 'Saving…' : svcModal.mode === 'add' ? '+ Add service' : 'Save changes'}
                          </button>
                          {svcModal.mode === 'edit' && !previewReadOnly && (
                            <button onClick={() => { deleteService(svcModal.id); setSvcModal(null) }}
                              style={{ padding: '0.6rem 1rem', border: '1px solid rgba(220,80,80,0.25)', borderRadius: 8, background: 'white', color: '#e05252', fontSize: '0.825rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                              Remove
                            </button>
                          )}
                          <button onClick={() => { setSvcModal(null); setSvcError(null) }}
                            style={{ padding: '0.6rem 1rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: 8, background: 'white', color: '#5e3b87', fontSize: '0.825rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Drawer header */}
                  <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid rgba(94,59,135,0.08)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: '#1a1a1a' }}>Services</div>
                      <div style={{ fontSize: '0.72rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>Click any tile to edit · click + to add a new service</div>
                    </div>
                    <button onClick={() => { setSvcDraft(EMPTY_SVC); setSvcError(null); setSvcModal({ mode: 'add' }) }}
                      style={{ padding: '0.3rem 0.75rem', background: '#f0a500', border: 'none', borderRadius: 7, fontSize: '0.78rem', fontWeight: 700, color: '#1a0533', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                      + New
                    </button>
                    <button onClick={() => { setQuickPanel(null); setSvcEditing(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '1.5rem', padding: 0, lineHeight: 1 }}>×</button>
                  </div>
                  {/* Tile grid */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
                    {catalogue.filter(c => !c.item_type || c.item_type === 'service').length === 0 && (
                      <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#aaa', fontSize: '0.85rem', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
                        No services yet.<br />Click <strong>+ New</strong> above to add your first.
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      {/* Service tiles */}
                      {catalogue.filter(c => !c.item_type || c.item_type === 'service').map(svc => {
                        const isSplit = (svc.processing_minutes || 0) > 0
                        const totalMins = (svc.duration_minutes || 0) + (svc.processing_minutes || 0) + (svc.completion_minutes || 0)
                        return (
                          <div key={svc.id}
                            onClick={() => { setSvcError(null); setSvcDraft({ name: svc.name || '', description: svc.description || '', category: svc.category || '', duration_minutes: svc.duration_minutes ?? '', processing_minutes: svc.processing_minutes ?? '', completion_minutes: svc.completion_minutes ?? '', price_from: svc.price_from ?? '', price_to: svc.price_to ?? '', cost_price: svc.cost_price ?? '', colour: svc.colour || '' }); setSvcModal({ mode: 'edit', id: svc.id }) }}
                            style={{ background: 'white', borderRadius: 10, border: '1px solid rgba(94,59,135,0.1)', padding: '0.85rem', cursor: 'pointer', transition: 'all 0.15s', minHeight: 90, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#5e3b87'; e.currentTarget.style.background = '#faf9fc' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(94,59,135,0.1)'; e.currentTarget.style.background = 'white' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                              {svc.colour && <span style={{ width: 10, height: 10, borderRadius: '50%', background: svc.colour, border: '1.5px solid rgba(0,0,0,0.15)', flexShrink: 0, display: 'inline-block' }} />}
                              <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.82rem', color: '#1a1a1a', lineHeight: 1.3 }}>{svc.name}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {totalMins > 0 && (
                                <span style={{ fontSize: '0.67rem', color: '#5e3b87', background: '#ede8f5', borderRadius: 4, padding: '0.12rem 0.35rem', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>⏱ {totalMins}min</span>
                              )}
                              {(svc.price_from || svc.price_to) && (
                                <span style={{ fontSize: '0.67rem', color: '#92610a', background: '#fef3d9', borderRadius: 4, padding: '0.12rem 0.35rem', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                                  £{svc.price_from ?? ''}{svc.price_to && svc.price_to !== svc.price_from ? `–${svc.price_to}` : ''}
                                </span>
                              )}
                              {isSplit && (
                                <span style={{ fontSize: '0.67rem', color: '#3db87a', background: '#e6fdf3', borderRadius: 4, padding: '0.12rem 0.35rem', fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>✓ Split</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              ) : (
                /* ── Staff panel ────────────────────────────────────────────── */
                <>
                  <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(94,59,135,0.08)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: '#1a1a1a' }}>Your Team</div>
                      <div style={{ fontSize: '0.72rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>Staff available for appointments</div>
                    </div>
                    <button onClick={() => setQuickPanel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '1.5rem', padding: 0, lineHeight: 1 }}>×</button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
                    {staff.length === 0 && (
                      <div
                        onClick={() => { setQuickPanel(null); onPortalNavigate?.('team') }}
                        style={{ background: 'white', borderRadius: 12, border: '1.5px dashed rgba(94,59,135,0.2)', padding: '2rem 1.25rem', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#5e3b87'; e.currentTarget.style.background = '#faf9fc' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(94,59,135,0.2)'; e.currentTarget.style.background = 'white' }}
                      >
                        <div style={{ fontSize: '1.75rem', marginBottom: '0.6rem' }}>👥</div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#1a1a1a', marginBottom: '0.35rem' }}>No team members yet</div>
                        <div style={{ fontSize: '0.78rem', color: '#888', lineHeight: 1.5, marginBottom: '0.9rem' }}>Add staff to enable routing and calendar column view</div>
                        <div style={{ display: 'inline-block', padding: '0.35rem 0.85rem', background: '#5e3b87', color: 'white', borderRadius: 7, fontSize: '0.78rem', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>+ Add team member →</div>
                      </div>
                    )}
                    {staff.map(member => {
                      const initials = (member.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                      const colour = member.colour || '#5e3b87'
                      return (
                        <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1rem', background: '#faf9fc', borderRadius: 10, border: '1px solid rgba(94,59,135,0.08)', marginBottom: '0.65rem' }}>
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: colour, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ color: 'white', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.875rem' }}>{initials}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a' }}>{member.name}</div>
                            {member.role && <div style={{ fontSize: '0.75rem', color: '#888', fontFamily: "'DM Sans', sans-serif" }}>{member.role}</div>}
                            {Array.isArray(member.specialist_services) && member.specialist_services.length > 0 && (
                              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                                {member.specialist_services.slice(0, 3).map((s, i) => (
                                  <span key={i} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', background: '#ede8f5', color: '#5e3b87', borderRadius: 4, fontFamily: "'DM Sans', sans-serif" }}>{s}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {onPortalNavigate && (
                    <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(94,59,135,0.08)', flexShrink: 0, display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => { setQuickPanel(null); onPortalNavigate('team', { openAdd: true }) }}
                        style={{ flex: 1, padding: '0.5rem', border: 'none', borderRadius: 8, background: '#f0a500', color: '#1a0533', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                        + Add member
                      </button>
                      <button onClick={() => { setQuickPanel(null); onPortalNavigate('team') }}
                        style={{ flex: 1, padding: '0.5rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: 8, background: 'white', color: '#5e3b87', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                        Manage team
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
  )
}

const REPEAT_LABELS = { daily: 'every day', weekly: 'weekly', fortnightly: 'every 2 weeks', '3weekly': 'every 3 weeks', monthly: 'every 4 weeks', '6weekly': 'every 6 weeks' }

function RecurringSeriesSection({ panelMode, repeatType, repeatCount, onRepeatTypeChange, onRepeatCountChange }) {
  if (panelMode !== 'create') return null
  return (
    <div style={{ background: '#f5f3ff', borderRadius: 8, padding: '0.85rem', border: '1px solid rgba(94,59,135,0.15)' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4a2d6e', marginBottom: '0.55rem', fontFamily: "'DM Sans', sans-serif" }}>🔁 Recurring series</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <div>
          <Label>Repeat</Label>
          <FieldSelect value={repeatType} onChange={onRepeatTypeChange}>
            <option value="none">No repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="fortnightly">Every 2 weeks</option>
            <option value="3weekly">Every 3 weeks</option>
            <option value="monthly">Monthly (4 weeks)</option>
            <option value="6weekly">Every 6 weeks</option>
          </FieldSelect>
        </div>
        {repeatType !== 'none' && (
          <div>
            <Label>Occurrences</Label>
            <FieldSelect value={repeatCount} onChange={onRepeatCountChange}>
              {[2,4,6,8,12,26,52].map(n => <option key={n} value={n}>{n} sessions</option>)}
            </FieldSelect>
          </div>
        )}
      </div>
      {repeatType !== 'none' && (
        <div style={{ fontSize: '0.72rem', color: '#666', fontFamily: "'DM Sans', sans-serif", marginTop: '0.5rem', lineHeight: 1.4 }}>
          Creates {repeatCount} appointments {REPEAT_LABELS[repeatType] ?? ''} from the start date.
        </div>
      )}
    </div>
  )
}

function FormPanelFooter({ panelMode, previewReadOnly, saving, repeatType, repeatCount, handleDelete, handleSave, setPanelMode, closePanel }) {
  return (
    <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(94,59,135,0.08)', flexShrink: 0, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      {panelMode === 'edit' && !previewReadOnly && (
        <button onClick={handleDelete} disabled={saving}
          style={{ padding: '0.45rem 0.85rem', border: '1px solid rgba(224,82,82,0.3)', borderRadius: 7, background: 'white', color: '#e05252', fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginRight: 'auto' }}>
          Delete
        </button>
      )}
      <button onClick={panelMode === 'edit' ? () => setPanelMode('view') : closePanel}
        style={{ padding: '0.45rem 0.85rem', border: '1px solid rgba(94,59,135,0.22)', borderRadius: 7, background: 'white', color: '#5e3b87', fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginLeft: panelMode === 'edit' ? 0 : 'auto' }}>
        Cancel
      </button>
      <button onClick={handleSave} disabled={saving}
        style={{ padding: '0.45rem 1rem', border: 'none', borderRadius: 7, background: '#f0a500', color: '#1a0533', fontSize: '0.78rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
        {saving ? 'Saving…' : repeatType !== 'none' ? `Book ${repeatCount} sessions` : 'Save'}
      </button>
    </div>
  )
}

export default function CalendarTab({ onNavigate: onPortalNavigate, prefill, onPrefillConsumed, calendarTier: calendarTierProp }) {
  const { user } = useAuth()
  const preview = usePreview()
  const isPreview = preview?.isPreview
  const previewReadOnly = preview?.previewReadOnly ?? isPreview
  const effectiveCalendarTier = calendarTierProp || 'entry'
  const isMobile = useIsMobile()

  // Inject overrides to collapse the empty all-day row and tighten header cells
  useEffect(() => {
    const id = 'rbc-compact-overrides'
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.textContent = `
      .rbc-allday-cell { display: none !important; }
      .rbc-time-header-content { border-bottom: none !important; }
      .rbc-header { padding: 0 !important; border-bottom: 1px solid rgba(94,59,135,0.08) !important; }
      .rbc-header + .rbc-header { border-left: 1px solid rgba(94,59,135,0.08) !important; }
      .rbc-time-header.rbc-overflowing { border-right: 1px solid rgba(94,59,135,0.08) !important; }
      .rbc-time-header-gutter { border-bottom: 1px solid rgba(94,59,135,0.08) !important; }
    `
    document.head.appendChild(el)
  }, [])

  const [tenantId, setTenantId] = useState(null)
  const [events, setEvents] = useState([])
  const [staff, setStaff] = useState([])
  const [catalogue, setCatalogue] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('week')
  const [teamMode, setTeamMode] = useState(false)
  const [todayMode, setTodayMode] = useState(false)
  const [todayStaffIds, setTodayStaffIds] = useState(new Set())
  const [staffFilter, setStaffFilter] = useState('') // '' = all, staffId = single staff
  const [statusFilter, setStatusFilter] = useState('') // '' = all, 'provisional' etc
  const [smartView, setSmartView] = useState(true) // auto-adapt based on staff count
  const hasAutoAdapted = useRef(false)
  const [activeSubTab, setActiveSubTab] = useState('appointments')
  const [historySearch, setHistorySearch] = useState('')

  // Viewport config
  const [viewportMode, setViewportMode] = useState('open')
  const [vpOpen, setVpOpen] = useState({ staffCount: 10 })
  const [vpCompact, setVpCompact] = useState({ staffCount: 3 })
  const [staffOrder, setStaffOrder] = useState([])

  // Right panel state
  const [panelMode, setPanelMode] = useState(null) // null | 'view' | 'edit' | 'create'
  const [panelEvent, setPanelEvent] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [bookingMode, setBookingMode] = useState('service') // 'service' | 'manual'
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [slotWarning, setSlotWarning] = useState(false)
  const [contactWarnDismissed, setContactWarnDismissed] = useState(false)
  const [pendingDrops, setPendingDrops] = useState(new Map()) // Map<eventId, drop>
  const pendingDropsRef = useRef(new Map())

  // Waitlist state

  const closePanel = () => { setPanelMode(null); setPanelEvent(null) }
  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  // Load viewport config from localStorage
  useEffect(() => {
    if (!tenantId) return
    try {
      const raw = localStorage.getItem(`qerxel_cal_vp_${tenantId}`)
      if (!raw) return
      const saved = JSON.parse(raw)
      if (saved.mode) setViewportMode(saved.mode)
      if (saved.open?.staffCount) setVpOpen(saved.open)
      if (saved.compact?.staffCount) setVpCompact(saved.compact)
      if (Array.isArray(saved.staffOrder)) setStaffOrder(saved.staffOrder)
    } catch { /* corrupt localStorage — ignore */ }
  }, [tenantId])

  // Save viewport config to localStorage
  useEffect(() => {
    if (!tenantId) return
    try {
      localStorage.setItem(`qerxel_cal_vp_${tenantId}`, JSON.stringify({ mode: viewportMode, open: vpOpen, compact: vpCompact, staffOrder }))
    } catch { /* quota exceeded — ignore */ }
  }, [tenantId, viewportMode, vpOpen, vpCompact, staffOrder])

  // Intelligence Hub state
  const [workHarderOpen, setWorkHarderOpen] = useState(false)
  const [intelPage, setIntelPage] = useState(null)

  // Quick-access panel state
  const [quickPanel, setQuickPanel] = useState(null) // null | 'services' | 'staff'
  const [svcModal, setSvcModal] = useState(null) // null | { mode: 'add' | 'edit', id?: string }
  const [svcDraft, setSvcDraft] = useState(EMPTY_SVC)
  const [svcAdding, setSvcAdding] = useState(false)
  const [svcError, setSvcError] = useState(null)
  const [, setSvcEditing] = useState(null)
  const [svcEditDraft] = useState({})

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

  // ESC closes panel; Arrow keys navigate calendar
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') { closePanel(); return }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const tag = document.activeElement?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        const delta = e.key === 'ArrowLeft' ? -1 : 1
        setCurrentDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + delta); return d })
      }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  // ─── Load tenant ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user && !isPreview) return
    const getTid = async () => {
      if (isPreview) { setTenantId(preview.previewTenantId); return }
      const { data } = await supabase.from('tenant_memberships').select('tenant_id').eq('user_id', user.id).maybeSingle()
      if (data) setTenantId(data.tenant_id)
    }
    getTid()
  }, [user, isPreview])

  // ─── Load appointments + staff + catalogue ──────────────────────────────────
  // Load a 15-month window (13 months back → 2 months ahead) to avoid row-limit truncation
  // on tenants with thousands of appointments. Re-fetch when navigating outside window.
  const apptWindowRef = useRef({ from: null, to: null })

  const loadApptWindow = async (tid, windowFrom, windowTo) => {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('tenant_id', tid)
      .gte('start_time', windowFrom.toISOString())
      .lte('start_time', windowTo.toISOString())
      .order('start_time')
    return data || []
  }

  useEffect(() => {
    if (!tenantId) return
    const load = async () => {
      setLoading(true)
      const now = new Date()
      const windowFrom = new Date(now); windowFrom.setMonth(windowFrom.getMonth() - 13)
      const windowTo   = new Date(now); windowTo.setMonth(windowTo.getMonth() + 2)
      apptWindowRef.current = { from: windowFrom, to: windowTo }
      try {
        const [apptData, staffRes, catRes] = await Promise.all([
          loadApptWindow(tenantId, windowFrom, windowTo),
          supabase.from('staff_profiles').select('id, name, role, colour, specialist_services, include_in_intel, overhead_hours_per_week').eq('tenant_id', tenantId).or('active.eq.true,active.is.null').order('name'),
          supabase.from('catalogue_items').select('id, name, category, description, duration_minutes, processing_minutes, completion_minutes, price_from, price_to, cost_price, apply_minutes, overlap_start_mins, overlap_end_mins, item_type, colour').eq('tenant_id', tenantId).eq('active', true).order('name'),
        ])
        const staffData = staffRes.data || []
        setEvents(apptData.map(toEvent))
        setStaff(staffData)
        setCatalogue(catRes.data || [])
        // Determine who is in today
        if (staffData.length > 0) {
          const { data: todayAvail } = await supabase
            .from('staff_availability')
            .select('staff_profile_id')
            .in('staff_profile_id', staffData.map(s => s.id))
            .eq('day_of_week', new Date().getDay())
            .eq('active', true)
          setTodayStaffIds(new Set((todayAvail || []).map(r => r.staff_profile_id)))
        }
      } catch (err) {
        console.error('Calendar load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tenantId])


  // ─── Extend appointment window when navigating outside loaded range ──────────
  useEffect(() => {
    if (!tenantId) return
    const { from, to } = apptWindowRef.current
    if (!from || !to) return
    if (currentDate >= from && currentDate <= to) return // within window, no reload needed
    // User navigated outside the loaded range — extend the window by 6 months in each direction
    const newFrom = new Date(Math.min(currentDate.getTime(), from.getTime()))
    newFrom.setMonth(newFrom.getMonth() - 3)
    const newTo = new Date(Math.max(currentDate.getTime(), to.getTime()))
    newTo.setMonth(newTo.getMonth() + 6)
    apptWindowRef.current = { from: newFrom, to: newTo }
    loadApptWindow(tenantId, newFrom, newTo).then(data => {
      setEvents(data.map(toEvent))
    }).catch(() => {})
  }, [currentDate, tenantId])

  // ─── Auto-adapt view based on staff count (fires once after first load) ────────
  useEffect(() => {
    if (staff.length === 0 || hasAutoAdapted.current || !smartView) return
    hasAutoAdapted.current = true
    if (effectiveCalendarTier === 'entry' || staff.length <= 1) {
      setView('week')
      setTeamMode(false)
    } else {
      setView('day')
      setTeamMode(true)
      // Land on a weekday — if today is Sat/Sun, jump back to Friday
      const d = new Date()
      const dow = d.getDay()
      if (dow === 0) d.setDate(d.getDate() - 2)
      else if (dow === 6) d.setDate(d.getDate() - 1)
      setCurrentDate(d)
    }
  }, [staff.length, smartView, effectiveCalendarTier])

  // ─── Service selection → auto-fill duration + processing ─────────────────────
  const handleServiceSelect = (serviceId) => {
    const svc = catalogue.find(c => c.id === serviceId)
    if (!svc) {
      setForm(prev => ({ ...prev, service_id: '', appointment_type: '' }))
      return
    }
    const startDt = form.start ? new Date(form.start) : startOfHour(addHours(new Date(), 1))
    const serviceMins = svc.duration_minutes || 60
    const waitMins = svc.processing_minutes || 0
    const completionMins = svc.completion_minutes || 0
    const totalMins = serviceMins + waitMins + completionMins
    const endDt = addMinutes(startDt, totalMins)
    const hasSplit = waitMins > 0
    let procStart = '', procEnd = ''
    if (hasSplit) {
      procStart = isoLocal(addMinutes(startDt, serviceMins))
      procEnd = isoLocal(addMinutes(startDt, serviceMins + waitMins))
    }
    setForm(prev => ({
      ...prev,
      service_id: serviceId,
      title: svc.name,
      appointment_type: svc.name,
      start: form.start || isoLocal(startDt),
      end: isoLocal(endDt),
      isSplit: hasSplit,
      processing_start: procStart,
      processing_end: procEnd,
    }))
  }

  // ─── Staff filtered by service skills ────────────────────────────────────────
  const filteredStaff = (serviceId) => {
    if (!serviceId) return staff
    const serviceName = catalogue.find(c => c.id === serviceId)?.name
    if (!serviceName) return staff
    const qualified = staff.filter(s => !s.specialist_services || s.specialist_services.length === 0 || s.specialist_services.includes(serviceName))
    return qualified.length > 0 ? qualified : staff
  }

  // ─── Staff sorted by viewport order ──────────────────────────────────────────
  const orderedStaff = useMemo(() => {
    if (staffOrder.length === 0) return staff
    return [...staff].sort((a, b) => {
      const ai = staffOrder.indexOf(a.id)
      const bi = staffOrder.indexOf(b.id)
      if (ai === -1 && bi === -1) return 0
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  }, [staff, staffOrder])

  // ─── Resources for team / column mode ────────────────────────────────────────
  const resources = useMemo(() => {
    if (!teamMode || orderedStaff.length === 0 || staffFilter) return undefined
    const currentVp = viewportMode === 'open' ? vpOpen : vpCompact
    const base = todayMode && todayStaffIds.size > 0
      ? orderedStaff.filter(s => todayStaffIds.has(s.id))
      : orderedStaff
    return base.slice(0, currentVp.staffCount).map(s => ({ id: s.id, title: s.name }))
  }, [teamMode, orderedStaff, staffFilter, todayMode, todayStaffIds, viewportMode, vpOpen, vpCompact])
  const visibleEvents = events
    .filter(e => !staffFilter || e.resourceId === staffFilter || e.resource?.staff_profile_id === staffFilter)
    .filter(e => !statusFilter || e.resource?.status === statusFilter)

  // Smart view label shown in legend
  const smartViewLabel = useMemo(() => {
    if (!smartView || staff.length === 0) return null
    if (staff.length <= 1) return `${staff.length === 0 ? 'No' : '1'} staff · week view`
    return `${staff.length} staff · column view`
  }, [smartView, staff.length])

  // ─── Event style ─────────────────────────────────────────────────────────────
  const eventPropGetter = useCallback((event) => {
    const appt = event.resource || {}
    const status = appt.status || 'confirmed'
    const statusC = STATUS_COLOURS[status] || STATUS_COLOURS.confirmed
    const catItem = catalogue.find(ci => ci.id === appt.service_id)
    const svcColour = catItem?.colour
    const catC = svcColour
      ? { bg: svcColour + 'cc', border: svcColour, text: hexBrightness(svcColour) > 128 ? '#1a1a1a' : '#ffffff' }
      : catItem ? getCategoryColour(catItem.category) : null
    const c = catC || statusC
    const isSplit = ((catItem?.processing_minutes || 0) > 0) || !!(appt.processing_start_time && appt.processing_end_time)
    return {
      style: {
        background: isSplit ? 'transparent' : c.bg,
        border: `2px solid ${c.border}`,
        borderLeft: 'none',
        color: c.text,
        borderRadius: 5,
        padding: isSplit ? 0 : undefined,
        overflow: 'hidden',
      },
    }
  }, [catalogue])

  // ─── Slot prop — hide 5-min lines, show only 30-min marks ───────────────────
  const slotPropGetter = useCallback((date) => {
    const mins = date.getMinutes()
    if (mins % 30 !== 0) return { style: { borderTop: 'none' } }
    return {}
  }, [])

  // ─── Slot select → create panel ──────────────────────────────────────────────
  const handleSelectSlot = useCallback(({ start, end, resourceId }) => {
    const durationMins = (end - start) / 60000
    setForm({ ...EMPTY_FORM, start: isoLocal(start), end: isoLocal(end), staff_profile_id: resourceId && resourceId !== 'unassigned' ? resourceId : '' })
    setSlotWarning(durationMins < 30)
    setContactWarnDismissed(false)
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
      client_name: appt.client_name || '',
      client_phone: appt.client_phone || '',
      client_email: appt.client_email || '',
      staff_profile_id: appt.staff_profile_id || '',
      isSplit: !!(appt.processing_start_time),
      processing_start: appt.processing_start_time ? isoLocal(appt.processing_start_time) : '',
      processing_end: appt.processing_end_time ? isoLocal(appt.processing_end_time) : '',
      service_id: appt.service_id || '',
      repeat_type: 'none',
      repeat_count: 4,
      intake_answers: appt.intake_answers || '',
    })
    setSlotWarning(false)
    setPanelMode('edit')
  }

  // ─── Drag/resize ─────────────────────────────────────────────────────────────
  const handleEventDrop = useCallback(({ event, start, end, resourceId }) => {
    if (previewReadOnly) return
    const originalDuration = event.end.getTime() - event.start.getTime()
    const snappedEnd = new Date(start.getTime() + originalDuration)
    const updates = { start_time: start.toISOString(), end_time: snappedEnd.toISOString() }
    if (resourceId !== undefined) updates.staff_profile_id = resourceId === 'unassigned' ? null : resourceId
    // Preserve the ORIGINAL pre-move position so Cancel always fully reverts, even if this event was already pending
    const existing = pendingDropsRef.current.get(event.id)
    const next = {
      eventId: event.id, start, end: snappedEnd, updates, title: event.title || '',
      prevStart: existing?.prevStart ?? event.start,
      prevEnd: existing?.prevEnd ?? event.end,
      prevResourceId: existing?.prevResourceId ?? event.resourceId,
      prevResource: existing?.prevResource ?? event.resource,
    }
    const updated = new Map(pendingDropsRef.current).set(event.id, next)
    pendingDropsRef.current = updated
    setPendingDrops(new Map(updated))
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, start, end: snappedEnd, resourceId: resourceId ?? e.resourceId, resource: { ...e.resource, ...updates } } : e))
  }, [previewReadOnly])

  const confirmAll = useCallback(async () => {
    if (!pendingDropsRef.current.size) return
    const drops = Array.from(pendingDropsRef.current.values())
    pendingDropsRef.current = new Map()
    setPendingDrops(new Map())
    await Promise.all(drops.map(d => supabase.from('appointments').update(d.updates).eq('id', d.eventId)))
  }, [])

  const cancelAll = useCallback(() => {
    if (!pendingDropsRef.current.size) return
    const drops = Array.from(pendingDropsRef.current.values())
    pendingDropsRef.current = new Map()
    setPendingDrops(new Map())
    setEvents(prev => prev.map(e => {
      const d = drops.find(dr => dr.eventId === e.id)
      return d ? { ...e, start: d.prevStart, end: d.prevEnd, resourceId: d.prevResourceId, resource: d.prevResource } : e
    }))
  }, [])

  // Resize is disabled (resizable={false} on DnDCalendar) — this handler is a safety net only
  const handleEventResize = useCallback(() => {}, [])

  // ─── Save (with recurring series support) ────────────────────────────────────
  const handleSave = async () => {
    if (previewReadOnly) { setSaveError('Switch to Edit mode in the preview banner to make changes.'); return }
    if (!tenantId) { setSaveError('No business loaded — please refresh.'); return }
    if (!form.title.trim()) { setSaveError('Add a booking title before saving.'); return }
    if (!form.start || !form.end) { setSaveError('Set a start and end time before saving.'); return }
    if (form.isSplit && (!form.processing_start || !form.processing_end)) { setSaveError('Set the processing window start and end times.'); return }
    setSaving(true)
    setSaveError(null)
    try {
      const basePayload = {
        tenant_id: tenantId,
        title: form.title.trim(),
        description: form.description || null,
        start_time: new Date(form.start).toISOString(),
        end_time: new Date(form.end).toISOString(),
        status: form.status,
        appointment_type: form.appointment_type || null,
        client_notes: form.client_notes || null,
        client_name: form.client_name || null,
        client_phone: form.client_phone || null,
        client_email: form.client_email || null,
        staff_profile_id: form.staff_profile_id || null,
        processing_start_time: form.isSplit && form.processing_start ? new Date(form.processing_start).toISOString() : null,
        processing_end_time: form.isSplit && form.processing_end ? new Date(form.processing_end).toISOString() : null,
        service_id: form.service_id || null,
        intake_answers: form.intake_answers ? form.intake_answers : null,
        created_from: 'manual',
      }

      if (panelMode === 'edit' && panelEvent) {
        const { data, error: updateErr } = await supabase.from('appointments').update(basePayload).eq('id', panelEvent.id).select().maybeSingle()
        if (updateErr) {
          const msg = updateErr.message || ''
          setSaveError(msg.includes('double_booking')
            ? `Too much overlap with an existing booking — ${msg.replace(/.*double_booking: /, '') || 'adjust the times and try again.'}`
            : 'Could not save — please try again.')
          return
        }
        if (data) setEvents(prev => prev.map(e => e.id === panelEvent.id ? toEvent(data) : e))
        fetch('/api/integrations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'caldav-sync', tenantId, appointmentId: panelEvent.id, caldavAction: 'upsert' }) }).catch(() => {})
      } else {
        const ok = await buildAndInsertAppointments({ form, tenantId, basePayload, setEvents, setSaveError })
        if (!ok) return
      }
      closePanel()
    } catch (err) {
      console.error('Save error:', err)
      setSaveError(err?.message || 'Save failed — please try again')
    } finally {
      setSaving(false)
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (previewReadOnly || !panelEvent) return
    setSaving(true)
    try {
      const appt = panelEvent.resource
      if (appt.series_id) {
        // Delete just this one; could extend with "delete all in series" later
      }
      await supabase.from('appointments').delete().eq('id', panelEvent.id)
      setEvents(prev => prev.filter(e => e.id !== panelEvent.id))
      fetch('/api/integrations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'caldav-sync', tenantId, appointmentId: panelEvent.id, caldavAction: 'delete' }) }).catch(() => {})
      closePanel()
    } catch (err) { console.error('Delete error:', err) }
    finally { setSaving(false) }
  }

  // ─── Mark completed ───────────────────────────────────────────────────────────
  const handleMarkCompleted = async () => {
    if (previewReadOnly || !panelEvent) return
    const updates = { status: 'completed' }
    setEvents(prev => prev.map(e => e.id === panelEvent.id ? { ...e, resource: { ...e.resource, status: 'completed' } } : e))
    setPanelEvent(prev => prev ? { ...prev, resource: { ...prev.resource, status: 'completed' } } : prev)
    await supabase.from('appointments').update(updates).eq('id', panelEvent.id)
  }

  const canSave = form.title.trim() && form.start && form.end && !saving
  const missingContact = !form.client_name.trim() && !form.client_phone.trim()

  const hasTeamMode = staff.length > 0 && effectiveCalendarTier !== 'entry'

  // ─── Link to lead/contact history ────────────────────────────────────────────
  const clientHistory = panelEvent ? events.filter(e =>
    e.id !== panelEvent.id &&
    e.resource?.title?.split('—')[0]?.trim() === panelEvent.title?.split('—')[0]?.trim()
  ).sort((a, b) => new Date(b.start) - new Date(a.start)).slice(0, 5) : []

  // ─── Right panel — view ───────────────────────────────────────────────────────
  const renderViewPanel = () => {
    if (!panelEvent) return null
    const appt = panelEvent.resource || {}
    const status = appt.status || 'confirmed'
    const c = STATUS_COLOURS[status] || STATUS_COLOURS.confirmed
    const staffMember = staff.find(s => s.id === appt.staff_profile_id)
    const catItem = catalogue.find(ci => ci.id === appt.service_id)
    const catC = catItem ? getCategoryColour(catItem.category) : null
    const isRecurring = !!appt.series_id

    return (
      <>
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
                {catItem && catC && (
                  <span style={{ display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, background: catC.bg, color: catC.text, border: `1px solid ${catC.border}`, fontFamily: "'DM Sans', sans-serif" }}>
                    {catItem.category}
                  </span>
                )}
                {isRecurring && (
                  <span style={{ display: 'inline-block', padding: '0.15rem 0.45rem', borderRadius: 4, fontSize: '0.72rem', fontWeight: 500, background: '#f0f4ff', color: '#1d4ed8', fontFamily: "'DM Sans', sans-serif" }}>
                    🔁 Recurring
                  </span>
                )}
                <span style={{ fontSize: '0.75rem', color: '#aaaaaa', fontFamily: "'DM Sans', sans-serif" }}>
                  {fmtDate(appt.start_time || panelEvent.start)}
                </span>
              </div>
            </div>
            <button onClick={closePanel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaaaaa', fontSize: '1.3rem', lineHeight: 1, padding: '0 0.15rem', flexShrink: 0 }}>×</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Customer info — always first */}
          {(appt.client_name || appt.client_phone || appt.client_email) && (
            <div style={{ background: '#f9f7fc', borderRadius: 10, padding: '0.75rem 0.9rem', border: '0.5px solid rgba(94,59,135,0.12)' }}>
              {appt.client_name && (
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#1a1a1a', marginBottom: appt.client_phone || appt.client_email ? 4 : 0 }}>
                  {appt.client_name}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {appt.client_phone && (
                  <a href={`tel:${appt.client_phone}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#3db87a', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, textDecoration: 'none' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 9.8a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 7.49 7.49l.93-.93a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    {appt.client_phone}
                  </a>
                )}
                {appt.client_email && (
                  <a href={`mailto:${appt.client_email}`}
                    style={{ fontSize: '0.78rem', color: '#5e3b87', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, textDecoration: 'none' }}>
                    {appt.client_email}
                  </a>
                )}
              </div>
            </div>
          )}

          <div>
            <Label>Time</Label>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem', color: '#1a1a1a', fontWeight: 500 }}>
              {fmtTime(appt.start_time || panelEvent.start)} – {fmtTime(appt.end_time || panelEvent.end)}
            </div>
          </div>

          {catItem && (
            <div>
              <Label>Service</Label>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem', color: '#1a1a1a' }}>
                {catItem.name}
                {catItem.duration_minutes && <span style={{ color: '#888', marginLeft: 6, fontSize: '0.8rem' }}>{catItem.duration_minutes} min</span>}
              </div>
            </div>
          )}
          {!catItem && appt.appointment_type && (
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

          {appt.intake_answers && (
            <div>
              <Label>Pre-appointment notes</Label>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8125rem', color: '#444', lineHeight: 1.6, background: '#f7f6f9', borderRadius: 8, padding: '0.65rem 0.75rem' }}>
                {appt.intake_answers}
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

          {/* Client history */}
          {clientHistory.length > 0 && (
            <div>
              <Label>Previous visits</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {clientHistory.map(e => (
                  <div key={e.id} onClick={() => { setPanelEvent(e); setPanelMode('view') }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.65rem', background: '#faf9fc', borderRadius: 7, cursor: 'pointer', fontSize: '0.78rem', fontFamily: "'DM Sans', sans-serif", color: '#444', border: '0.5px solid rgba(94,59,135,0.08)' }}>
                    <span>{fmtDate(e.start)}</span>
                    <span style={{ color: '#888' }}>{e.resource?.appointment_type || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review requests */}
          {status === 'completed' && !previewReadOnly && (
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
          {!previewReadOnly && (
            <button onClick={handleDelete} disabled={saving}
              style={{ padding: '0.45rem 0.85rem', border: '1px solid rgba(224,82,82,0.3)', borderRadius: 7, background: 'white', color: '#e05252', fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: saving ? 0.6 : 1 }}>
              Delete
            </button>
          )}
        </div>
      </>
    )
  }

  // ─── Right panel — form ───────────────────────────────────────────────────────
  const availableStaff = filteredStaff(form.service_id)

  const renderFormPanel = () => (
    <>
      {/* Header with mode toggle */}
      <div style={{ padding: '1rem 1.25rem 0', borderBottom: '1px solid rgba(94,59,135,0.08)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1a1a1a' }}>
            {panelMode === 'create' ? 'New appointment' : 'Edit appointment'}
          </div>
          <button onClick={closePanel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaaaaa', fontSize: '1.3rem', lineHeight: 1, padding: '0 0.15rem' }}>×</button>
        </div>
        {/* Service / Manual toggle */}
        {catalogue.length > 0 && (
          <div style={{ display: 'flex', gap: 2, background: '#f0ebf8', borderRadius: 7, padding: 2, marginBottom: '0.85rem' }}>
            {[{ id: 'service', label: 'From catalogue' }, { id: 'manual', label: 'Manual entry' }].map(m => (
              <button key={m.id} onClick={() => { setBookingMode(m.id); if (m.id === 'manual') setForm(prev => ({ ...prev, service_id: '', isSplit: false })) }}
                style={{ flex: 1, padding: '0.3rem 0', borderRadius: 5, border: 'none', background: bookingMode === m.id ? '#5e3b87' : 'transparent', color: bookingMode === m.id ? 'white' : '#5e3b87', fontSize: '0.75rem', fontWeight: bookingMode === m.id ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s' }}>
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {slotWarning && (
          <div style={{ padding: '0.6rem 0.8rem', background: '#fef3d9', border: '1px solid rgba(240,165,0,0.35)', borderRadius: 7, fontSize: '0.78rem', color: '#7a5c00', lineHeight: 1.5 }}>
            Slot may be shorter than usual — check the end time.
          </div>
        )}

        {/* ── SERVICE MODE ─────────────────────────────────────────────────── */}
        {bookingMode === 'service' && catalogue.length > 0 && (
          <div style={{ background: '#faf9fc', borderRadius: 10, padding: '0.85rem', border: '1px solid rgba(94,59,135,0.12)' }}>
            <Label>Select service</Label>
            <FieldSelect value={form.service_id} onChange={e => handleServiceSelect(e.target.value)}>
              <option value="">— Choose from your catalogue —</option>
              {catalogue.filter(c => c.item_type === 'service').map(c => {
                const total = (c.duration_minutes || 0) + (c.processing_minutes || 0) + (c.completion_minutes || 0)
                return <option key={c.id} value={c.id}>{c.name} · {total || c.duration_minutes} min</option>
              })}
            </FieldSelect>
            {form.service_id && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#5e3b87', fontFamily: "'DM Sans', sans-serif" }}>
                Duration and times auto-filled from catalogue ✓
              </div>
            )}
          </div>
        )}

        {/* Booking title — always visible */}
        <div>
          <Label>Booking title *</Label>
          <FieldInput value={form.title} onChange={f('title')}
            placeholder={bookingMode === 'service' && form.service_id ? form.appointment_type : 'e.g. Cut & Blow Dry'}
            autoFocus />
        </div>

        {/* Customer details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <div>
            <Label>Customer name</Label>
            <FieldInput value={form.client_name} onChange={f('client_name')} placeholder="e.g. Sarah Mitchell" />
          </div>
          <div>
            <Label>Phone</Label>
            <FieldInput value={form.client_phone} onChange={f('client_phone')} placeholder="07700 900 123" type="tel" />
          </div>
        </div>
        <div>
          <Label>Email</Label>
          <FieldInput value={form.client_email} onChange={f('client_email')} placeholder="customer@email.com" type="email" />
        </div>

        {/* Times — always visible, auto-filled in service mode */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <div><Label>Start *</Label><FieldInput type="datetime-local" value={form.start} onChange={f('start')} /></div>
          <div><Label>End *</Label><FieldInput type="datetime-local" value={form.end} onChange={f('end')} /></div>
        </div>

        {/* ── MANUAL MODE extras ───────────────────────────────────────────── */}
        {bookingMode === 'manual' && (
          <div style={{ background: '#faf9fc', borderRadius: 10, padding: '0.85rem', border: '1px solid rgba(94,59,135,0.1)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'DM Sans', sans-serif" }}>Manual details</div>
            <div>
              <Label>Service / appointment type</Label>
              <FieldInput value={form.appointment_type} onChange={f('appointment_type')} placeholder="e.g. Boiler service, Consultation" />
            </div>
          </div>
        )}

        {/* Status + Staff */}
        <div style={{ display: 'grid', gridTemplateColumns: staff.length > 0 ? '1fr 1fr' : '1fr', gap: '0.5rem' }}>
          <div>
            <Label>Status</Label>
            <FieldSelect value={form.status} onChange={f('status')}>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </FieldSelect>
          </div>
          {staff.length > 0 && (
            <div>
              <Label>Staff{form.service_id && availableStaff.length < staff.length ? ` (${availableStaff.length} qualified)` : ''}</Label>
              <FieldSelect value={form.staff_profile_id} onChange={f('staff_profile_id')}>
                <option value="">— Unassigned —</option>
                {availableStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </FieldSelect>
            </div>
          )}
        </div>

        {/* Intake + notes */}
        <div>
          <Label>Pre-appointment info</Label>
          <FieldTextarea value={form.intake_answers} onChange={f('intake_answers')} placeholder="Allergies, preferences, access requirements…" rows={2} />
        </div>
        <div>
          <Label>Client notes</Label>
          <FieldTextarea value={form.client_notes} onChange={f('client_notes')} placeholder="Visible when opening this appointment" rows={2} />
        </div>
        <div>
          <Label>Internal notes</Label>
          <FieldTextarea value={form.description} onChange={f('description')} placeholder="Internal use only" rows={2} />
        </div>

        <RecurringSeriesSection
          panelMode={panelMode}
          repeatType={form.repeat_type}
          repeatCount={form.repeat_count}
          onRepeatTypeChange={f('repeat_type')}
          onRepeatCountChange={f('repeat_count')}
        />
      </div>

      {missingContact && !contactWarnDismissed && (
        <div style={{ margin: '0 1.25rem', padding: '0.5rem 0.75rem', background: '#fef3d9', border: '1px solid rgba(240,165,0,0.35)', borderRadius: 8, fontSize: '0.78rem', color: '#7a5c00', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
          <span>No customer name or phone number — Q won't be able to follow up. Add them or dismiss to save anyway.</span>
          <button onClick={() => setContactWarnDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7a5c00', fontSize: '1rem', lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
        </div>
      )}
      {saveError && (
        <div style={{ margin: '0 1.25rem', padding: '0.5rem 0.75rem', background: '#fde8e8', border: '1px solid rgba(224,82,82,0.3)', borderRadius: 8, fontSize: '0.78rem', color: '#7a1a1a', fontFamily: "'DM Sans', sans-serif" }}>
          {saveError}
        </div>
      )}
      <FormPanelFooter
        panelMode={panelMode}
        previewReadOnly={previewReadOnly}
        saving={saving}
        repeatType={form.repeat_type}
        repeatCount={form.repeat_count}
        handleDelete={handleDelete}
        handleSave={handleSave}
        setPanelMode={setPanelMode}
        closePanel={closePanel}
      />
    </>
  )

  const panelOpen = !!panelMode

  // ─── Quick-panel: service CRUD ────────────────────────────────────────────────
  const addService = async () => {
    if (previewReadOnly || !tenantId || !svcDraft.name.trim()) return
    setSvcAdding(true)
    setSvcError(null)
    const { data, error } = await supabase.from('catalogue_items').insert({
      tenant_id: tenantId,
      item_type: 'service',
      name: svcDraft.name.trim(),
      description: svcDraft.description?.trim() || null,
      category: svcDraft.category?.trim() || null,
      colour: svcDraft.colour || SVC_PALETTE[catalogue.filter(c => !c.item_type || c.item_type === 'service').length % SVC_PALETTE.length],
      duration_minutes: svcDraft.duration_minutes ? parseInt(svcDraft.duration_minutes) : null,
      processing_minutes: svcDraft.processing_minutes ? parseInt(svcDraft.processing_minutes) : null,
      completion_minutes: svcDraft.completion_minutes ? parseInt(svcDraft.completion_minutes) : null,
      price_from: svcDraft.price_from ? parseFloat(svcDraft.price_from) : null,
      price_to: svcDraft.price_to ? parseFloat(svcDraft.price_to) : null,
      cost_price: svcDraft.cost_price ? parseFloat(svcDraft.cost_price) : null,
    }).select().maybeSingle()
    setSvcAdding(false)
    if (error) { setSvcError(error.message); return }
    if (data) {
      setCatalogue(prev => [...prev, data])
      setSvcDraft(EMPTY_SVC)
      setSvcModal(null)
    }
  }

  const updateService = async (id) => {
    if (previewReadOnly) return
    const draft = svcModal ? svcDraft : svcEditDraft
    const { data } = await supabase.from('catalogue_items').update({
      name: draft.name?.trim(),
      description: draft.description?.trim() || null,
      category: draft.category?.trim() || null,
      colour: draft.colour || null,
      duration_minutes: draft.duration_minutes ? parseInt(draft.duration_minutes) : null,
      processing_minutes: draft.processing_minutes ? parseInt(draft.processing_minutes) : null,
      completion_minutes: draft.completion_minutes ? parseInt(draft.completion_minutes) : null,
      price_from: draft.price_from ? parseFloat(draft.price_from) : null,
      price_to: draft.price_to ? parseFloat(draft.price_to) : null,
      cost_price: draft.cost_price ? parseFloat(draft.cost_price) : null,
    }).eq('id', id).select().maybeSingle()
    if (data) setCatalogue(prev => prev.map(s => s.id === id ? data : s))
    setSvcEditing(null)
    setSvcModal(null)
  }

  const deleteService = async (id) => {
    if (previewReadOnly) return
    await supabase.from('catalogue_items').delete().eq('id', id)
    setCatalogue(prev => prev.filter(s => s.id !== id))
  }

  const drawerVariants = {
    hidden: { y: '100%' },
    visible: { y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
    exit:   { y: '100%', transition: { duration: 0.2 } },
  }

  // ─── Attention bar data ───────────────────────────────────────────────────────
  const nowTime = new Date()
  const upcomingProvisional = events.filter(e => e.resource?.status === 'provisional' && new Date(e.start) >= nowTime)

  // ─── Sub-tab nav ──────────────────────────────────────────────────────────────
  const subTabs = [
    { id: 'appointments', label: 'Appointments' },
    { id: 'history', label: 'History' },
    { id: 'schedules', label: 'Staff' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div>
      {/* ── Single compact top bar ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}
        data-help="Qerxel Calendar — create appointments manually, drag to reschedule, or let your AI create them from captured calls. Split appointments show processing gaps so you can book other clients during colour/drying time.">

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: 0, background: '#f0ebf8', borderRadius: 9, padding: 3, flexShrink: 0 }}>
          {subTabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveSubTab(tab.id); closePanel(); setStatusFilter('') }}
              style={{ padding: '0.28rem 0.75rem', borderRadius: 7, border: 'none', background: activeSubTab === tab.id ? '#5e3b87' : 'transparent', color: activeSubTab === tab.id ? 'white' : '#5e3b87', fontSize: '0.75rem', fontWeight: activeSubTab === tab.id ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', transition: 'background 0.15s' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grow Profit button — always visible */}
        <button
          onClick={() => setWorkHarderOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.8rem', background: '#f0a500', border: 'none', borderRadius: 7, fontSize: '0.78rem', fontWeight: 700, color: '#1a0533', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", flexShrink: 0, boxShadow: '0 2px 8px rgba(240,165,0,0.35)', transition: 'transform 0.12s' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          ✦ Grow profit
        </button>

        {/* Quick-access + status legend — appointments tab only */}
        {activeSubTab === 'appointments' && (
          <>
            <div style={{ height: 16, width: 1, background: 'rgba(94,59,135,0.15)', flexShrink: 0 }} />
            <button onClick={() => { setQuickPanel(p => p === 'services' ? null : 'services'); setSvcModal(null) }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.6rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: 6, background: quickPanel === 'services' ? '#5e3b87' : 'white', color: quickPanel === 'services' ? 'white' : '#5e3b87', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', flexShrink: 0, transition: 'background 0.15s, color 0.15s' }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              Add services
            </button>
            <button onClick={() => { setActiveSubTab('schedules'); setQuickPanel(null) }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.6rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: 6, background: activeSubTab === 'schedules' ? '#5e3b87' : 'white', color: activeSubTab === 'schedules' ? 'white' : '#5e3b87', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', flexShrink: 0, transition: 'background 0.15s, color 0.15s' }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              Staff
            </button>
            {tenantId && (
              <a href={`/book/${tenantId}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.6rem', border: '1px solid rgba(61,184,122,0.35)', borderRadius: 6, background: 'white', color: '#1e7a4a', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', flexShrink: 0, textDecoration: 'none', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                Booking link
              </a>
            )}
            <div style={{ flex: 1 }} />
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <span key={status} style={{ display: 'inline-block', padding: '0.1rem 0.4rem', borderRadius: 4, fontSize: '0.67rem', fontWeight: 600, background: STATUS_COLOURS[status]?.bg, color: STATUS_COLOURS[status]?.text, border: `1px solid ${STATUS_COLOURS[status]?.border}`, fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                {label}
              </span>
            ))}
            {smartViewLabel && (
              <span style={{ fontSize: '0.67rem', color: '#f0a500', fontWeight: 600, fontFamily: "'DM Sans', sans-serif", background: '#fffbf0', border: '1px solid rgba(240,165,0,0.25)', borderRadius: 4, padding: '0.1rem 0.4rem', whiteSpace: 'nowrap' }}>
                ✦ {smartViewLabel}
              </span>
            )}
          </>
        )}
      </div>

      {/* ── Attention bar ─────────────────────────────────────────────────────── */}
      {activeSubTab === 'appointments' && upcomingProvisional.length > 0 && (
        <div
          onClick={() => setStatusFilter(statusFilter === 'provisional' ? '' : 'provisional')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.9rem', background: statusFilter === 'provisional' ? '#fef3d9' : '#fffbf0', border: `1px solid ${statusFilter === 'provisional' ? '#f0a500' : 'rgba(240,165,0,0.3)'}`, borderRadius: 8, marginBottom: '0.75rem', cursor: 'pointer', transition: 'all 0.15s' }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f0a500', flexShrink: 0 }} />
          <span style={{ fontSize: '0.8rem', color: '#7a5c00', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, flex: 1 }}>
            {upcomingProvisional.length} provisional {upcomingProvisional.length === 1 ? 'appointment needs' : 'appointments need'} confirmation
          </span>
          <span style={{ fontSize: '0.75rem', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: statusFilter === 'provisional' ? '#5e3b87' : '#f0a500', background: statusFilter === 'provisional' ? '#ede8f5' : 'rgba(240,165,0,0.12)', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
            {statusFilter === 'provisional' ? '✕ Clear filter' : 'Show only'}
          </span>
        </div>
      )}

      {/* ── Appointments sub-tab ─────────────────────────────────────────────── */}
      {activeSubTab === 'appointments' && (
        <>

          <div>
            {/* Calendar grid — always full width; panel is a fixed overlay */}
            <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.1)', padding: '1rem', boxSizing: 'border-box' }}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 500, color: '#aaa', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif" }}>
                  Loading calendar…
                </div>
              ) : (
                <DnDCalendar
                  localizer={localizer}
                  events={visibleEvents}
                  date={currentDate}
                  view={view}
                  onNavigate={setCurrentDate}
                  onView={setView}
                  views={['month', 'week', 'work_week', 'day']}
                  selectable
                  resizable={false}
                  resizableAccessor={() => false}
                  onSelectSlot={handleSelectSlot}
                  onSelectEvent={handleSelectEvent}
                  onEventDrop={handleEventDrop}
                  eventPropGetter={eventPropGetter}
                  components={{
                    header: DayColumnHeader,
                    toolbar: (props) => <CalendarToolbar {...props}
                      staff={staff} staffFilter={staffFilter} setStaffFilter={setStaffFilter}
                      teamMode={teamMode} setTeamMode={setTeamMode}
                      smartView={smartView} setSmartView={setSmartView}
                      hasAutoAdapted={hasAutoAdapted} setView={setView}
                      todayMode={todayMode} setTodayMode={setTodayMode} todayStaffIds={todayStaffIds}
                      hasTeamMode={hasTeamMode}
                      viewportMode={viewportMode} setViewportMode={setViewportMode}
                      currentStaffCount={(viewportMode === 'open' ? vpOpen : vpCompact).staffCount}
                      onStaffCountChange={(delta) => {
                        const setter = viewportMode === 'open' ? setVpOpen : setVpCompact
                        setter(prev => ({ ...prev, staffCount: Math.max(1, Math.min(orderedStaff.length || 10, prev.staffCount + delta)) }))
                      }}
                      onNew={() => {
                        const now = startOfHour(addHours(new Date(), 1))
                        setForm({ ...EMPTY_FORM, start: isoLocal(now), end: isoLocal(addHours(now, 1)), staff_profile_id: staffFilter || '' })
                        setBookingMode('service')
                        setSlotWarning(false)
                        setPanelEvent(null)
                        setPanelMode('create')
                      }}
                    />,
                    event: (props) => <AppointmentCard {...props} catalogue={catalogue} />,
                    resourceHeader: (props) => <ResourceHeader {...props} staffList={staff} events={visibleEvents} />,
                  }}
                  resources={resources}
                  resourceIdAccessor="id"
                  resourceTitleAccessor="title"
                  style={{ height: 680 }}
                  scrollToTime={new Date(0, 0, 0, 7, 0, 0)}
                  min={new Date(0, 0, 0, 7, 0, 0)}
                  max={new Date(0, 0, 0, 21, 0, 0)}
                  step={5}
                  timeslots={6}
                  slotPropGetter={slotPropGetter}
                  dayLayoutAlgorithm={fullColumnLayout}
                  formats={{
                    timeGutterFormat: 'HH:mm',
                    eventTimeRangeFormat: () => '',
                  }}
                  messages={{ today: 'Today', previous: '‹', next: '›' }}
                />
              )}
            </div>

          </div>

          {/* Right panel (desktop) — fixed overlay, doesn't affect calendar layout */}
          {!isMobile && (
            <AnimatePresence>
              {panelOpen && (
                <>
                  <motion.div key="panel-backdrop"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    onClick={closePanel}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(26,5,51,0.22)', zIndex: 1099 }}
                  />
                  <motion.div key="right-panel"
                    initial={{ x: 380 }} animate={{ x: 0 }} exit={{ x: 380 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 320, mass: 0.8 }}
                    style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: 380, zIndex: 1100, background: 'white', boxShadow: '-6px 0 32px rgba(94,59,135,0.14)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {panelMode === 'view' ? renderViewPanel() : renderFormPanel()}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          )}

          {/* Bottom drawer (mobile) */}
          {isMobile && (
            <AnimatePresence>
              {panelOpen && (
                <>
                  <motion.div key="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                    onClick={closePanel} style={{ position: 'fixed', inset: 0, background: 'rgba(26,5,51,0.45)', zIndex: 1100 }} />
                  <motion.div key="drawer" variants={drawerVariants} initial="hidden" animate="visible" exit="exit"
                    style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '20px 20px 0 0', zIndex: 1200, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e0d8ed', margin: '12px auto 0', flexShrink: 0 }} />
                    {panelMode === 'view' ? renderViewPanel() : renderFormPanel()}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          )}
        </>
      )}

      {/* ── History sub-tab ─────────────────────────────────────────────────── */}
      {activeSubTab === 'history' && (() => {
        const q = historySearch.toLowerCase().trim()
        const allPast = [...events]
          .sort((a, b) => new Date(b.start) - new Date(a.start))
        const filtered = q.length < 2 ? allPast : allPast.filter(ev => {
          const r = ev.resource || {}
          return (r.client_name || '').toLowerCase().includes(q)
            || (r.client_phone || '').toLowerCase().includes(q)
            || (r.service_name || ev.title || '').toLowerCase().includes(q)
            || (r.notes || '').toLowerCase().includes(q)
        })
        const STATUS_STYLE = {
          confirmed:  { bg: '#bbf7d0', color: '#166534' },
          provisional:{ bg: '#fde68a', color: '#78460a' },
          cancelled:  { bg: '#fecaca', color: '#b91c1c' },
          completed:  { bg: '#e0e7ff', color: '#3730a3' },
          noshow:     { bg: '#f3f4f6', color: '#6b7280' },
        }
        const fmtDt = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        return (
          <div>
            <div style={{ marginBottom: '1rem', position: 'relative' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(94,59,135,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="Search by client, phone, or service…"
                style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '2.25rem', paddingRight: '1rem', paddingTop: '0.55rem', paddingBottom: '0.55rem', border: '1.5px solid rgba(94,59,135,0.15)', borderRadius: 10, fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', outline: 'none', background: 'white' }}
              />
            </div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem', fontFamily: "'DM Sans', sans-serif" }}>
              {filtered.length} appointment{filtered.length !== 1 ? 's' : ''}{q.length >= 2 ? ` matching "${historySearch}"` : ''}
            </div>
            {filtered.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 12, padding: '2.5rem 1.5rem', textAlign: 'center', border: '0.5px solid rgba(94,59,135,0.08)' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📋</div>
                <div style={{ fontSize: '0.875rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>
                  {q.length >= 2 ? 'No appointments match that search.' : 'No appointments found.'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {filtered.slice(0, 100).map(ev => {
                  const r = ev.resource || {}
                  const st = STATUS_STYLE[r.status] || STATUS_STYLE.confirmed
                  const staffMember = staff.find(s => s.id === r.staff_profile_id)
                  return (
                    <div key={ev.id} style={{ background: 'white', borderRadius: 10, border: '0.5px solid rgba(94,59,135,0.08)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 130, flexShrink: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{fmtDt(ev.start)}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{r.client_name || 'Unknown client'}</div>
                        {r.client_phone && <div style={{ fontSize: '0.72rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>{r.client_phone}</div>}
                      </div>
                      <div style={{ flex: 1, minWidth: 100 }}>
                        <div style={{ fontSize: '0.8rem', color: '#5e3b87', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{r.service_name || ev.title || '—'}</div>
                        {staffMember && <div style={{ fontSize: '0.72rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>{staffMember.name}</div>}
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: 5, background: st.bg, color: st.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {r.status || 'confirmed'}
                      </span>
                    </div>
                  )
                })}
                {filtered.length > 100 && (
                  <div style={{ fontSize: '0.78rem', color: '#aaa', textAlign: 'center', padding: '0.75rem', fontFamily: "'DM Sans', sans-serif" }}>
                    Showing 100 of {filtered.length} — refine your search to narrow results
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Staff schedules sub-tab ──────────────────────────────────────────── */}
      {activeSubTab === 'schedules' && (
        <StaffScheduleTab tenantId={tenantId} staff={staff} isPreview={isPreview} previewReadOnly={previewReadOnly} onPortalNavigate={onPortalNavigate} />
      )}

      {/* ── Settings sub-tab ─────────────────────────────────────────────────── */}
      {activeSubTab === 'settings' && (
        <CalendarSettingsTab tenantId={tenantId} isPreview={isPreview} previewReadOnly={previewReadOnly}
          staff={staff} vpOpen={vpOpen} vpCompact={vpCompact}
          onVpOpen={setVpOpen} onVpCompact={setVpCompact}
          staffOrder={staffOrder} onStaffOrder={setStaffOrder}
        />
      )}

      {/* ── Quick-access drawers (fixed right) ───────────────────────────────── */}
      <QuickAccessDrawers quickPanel={quickPanel} setQuickPanel={setQuickPanel} setSvcEditing={setSvcEditing} svcModal={svcModal} setSvcModal={setSvcModal} svcDraft={svcDraft} setSvcDraft={setSvcDraft} svcError={svcError} setSvcError={setSvcError} svcAdding={svcAdding} previewReadOnly={previewReadOnly} addService={addService} updateService={updateService} deleteService={deleteService} catalogue={catalogue} staff={staff} onPortalNavigate={onPortalNavigate} />

      {/* ── Work Harder selector overlay ────────────────────────────────────── */}
      {workHarderOpen && !intelPage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,5,51,0.93)', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
          onClick={e => { if (e.target === e.currentTarget) setWorkHarderOpen(false) }}>
          {/* Header */}
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: 'white', marginBottom: '0.4rem' }}>Grow your profit</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)' }}>Choose what you want to understand about your business</div>
          </div>
          {/* 2×2 card grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', maxWidth: 820 }}>
            {[
              { page: 'time',    icon: '⏱', title: 'Is my time being used well?',     desc: 'What does each booking actually earn after costs? Margin per appointment, per staff member, per day. See where your hours go.' },
              { page: 'clients', icon: '👤', title: 'Who are my best clients?',         desc: 'Your clients ranked by lifetime value. Broken down by service type and spend. Who to keep. Who to recover.' },
              { page: 'team',    icon: '👥', title: 'How is my team performing?',       desc: 'Utilisation, average ticket, top services per person. Benchmarked across the team so you know where to focus.' },
              { page: 'money',   icon: '💡', title: 'Where is money being left on the table?', desc: 'Q\'s live feed. Empty slots, lapsed clients, margin gaps, services never booked. One click to see the full picture.' },
            ].map(card => (
              <button key={card.page}
                onClick={() => { setWorkHarderOpen(false); setIntelPage(card.page) }}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: '1.5rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.18s', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.borderColor = 'rgba(240,165,0,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div style={{ fontSize: '2rem' }}>{card.icon}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', color: 'white', lineHeight: 1.3 }}>{card.title}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{card.desc}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: '#f0a500', fontWeight: 600, marginTop: 'auto', paddingTop: '0.5rem' }}>Open →</div>
              </button>
            ))}
          </div>
          <button onClick={() => setWorkHarderOpen(false)} style={{ marginTop: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif" }}>
            Cancel
          </button>
        </div>
      )}

      {/* ── Calendar Intelligence full-page ─────────────────────────────────── */}
      {intelPage && (
        <CalendarIntelligence
          page={intelPage}
          events={events}
          staff={staff}
          catalogue={catalogue}
          tenantId={tenantId}
          onClose={() => { setIntelPage(null); setWorkHarderOpen(false) }}
          onBack={() => { setIntelPage(null); setWorkHarderOpen(true) }}
        />
      )}

      {/* ── Drag confirmation banner ─────────────────────────────────────────── */}
      {pendingDrops.size > 0 && (() => {
        const drops = Array.from(pendingDrops.values())
        const first = drops[0]
        return (
          <div style={{
            position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
            background: '#1a0533', color: 'white', borderRadius: 12,
            padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
            boxShadow: '0 8px 40px rgba(26,5,51,0.45)', zIndex: 9999,
            fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 400 }}>
              {drops.length === 1
                ? <>Move <strong style={{ fontWeight: 700 }}>{(first.title || '').split(' — ')[0]}</strong> to{' '}
                    <strong style={{ fontWeight: 700 }}>{format(first.start, 'EEE d MMM, h:mma').replace(':00', '')}</strong>?</>
                : <><strong style={{ fontWeight: 700 }}>{drops.length}</strong> appointments moved — confirm or cancel all</>
              }
            </div>
            <button onClick={confirmAll}
              style={{ padding: '0.38rem 0.95rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: 7, fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif" }}>
              {drops.length > 1 ? 'Confirm all' : 'Confirm'}
            </button>
            <button onClick={cancelAll}
              style={{ padding: '0.38rem 0.85rem', background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 7, cursor: 'pointer', fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif" }}>
              {drops.length > 1 ? 'Cancel all' : 'Cancel'}
            </button>
          </div>
        )
      })()}
    </div>
  )
}

// ─── Review request button ────────────────────────────────────────────────────
function ReviewRequestButton({ tenantId, appointmentId, integrationId = 'google_business', label = '⭐ Review' }) {
  const [status, setStatus] = useState('idle')
  const handleSend = async () => {
    setStatus('sending')
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-review', tenantId, appointmentId, integrationId }),
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
