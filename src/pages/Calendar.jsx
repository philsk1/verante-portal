import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar'
import _withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
const withDragAndDrop = _withDragAndDrop.default || _withDragAndDrop
import { format, parse, startOfWeek, getDay, addHours, startOfHour, addMinutes, addWeeks } from 'date-fns'
import { enGB } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { usePreview } from '../context/PreviewContext'
import { useDemo } from '../context/DemoContext'

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
  { bg: '#ede9fe', border: '#7c3aed', text: '#4c1d95' },
  { bg: '#dcfce7', border: '#16a34a', text: '#14532d' },
  { bg: '#dbeafe', border: '#2563eb', text: '#1e3a8a' },
  { bg: '#fef3c7', border: '#d97706', text: '#92400e' },
  { bg: '#fce7f3', border: '#db2777', text: '#831843' },
  { bg: '#e0f2fe', border: '#0284c7', text: '#075985' },
  { bg: '#fef9c3', border: '#ca8a04', text: '#713f12' },
  { bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8' },
]
function getCategoryColour(category) {
  if (!category) return null
  let h = 0
  for (let i = 0; i < category.length; i++) h = (h * 31 + category.charCodeAt(i)) % CATEGORY_PALETTE.length
  return CATEGORY_PALETTE[Math.abs(h)]
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const DEMO_STAFF = [
  { id: 'demo-staff-1', name: 'Sophie', role: 'Senior Stylist', colour: '#7c3aed' },
  { id: 'demo-staff-2', name: 'Olivia', role: 'Stylist', colour: '#16a34a' },
]

const EMPTY_FORM = {
  title: '', description: '', start: '', end: '',
  status: 'confirmed', appointment_type: '', client_notes: '',
  staff_profile_id: '',
  isSplit: false, processing_start: '', processing_end: '',
  service_id: '',
  repeat_type: 'none',   // none | weekly | fortnightly
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
function minsToTime(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, '0')
  const m = String(mins % 60).padStart(2, '0')
  return `${h}:${m}`
}
function timeToMins(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
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
  // extra controls passed via closure
  staff, staffFilter, setStaffFilter,
  teamMode, setTeamMode, smartView, setSmartView, hasAutoAdapted, setView,
  onNew, hasTeamMode,
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
          <button onClick={() => { if (hasAutoAdapted) hasAutoAdapted.current = false; setSmartView(true) }}
            style={{ padding: '0.22rem 0.6rem', borderRadius: 5, border: 'none', background: smartView ? '#f0a500' : 'transparent', color: smartView ? '#1a0533' : '#5e3b87', fontSize: '0.75rem', fontWeight: smartView ? 700 : 400, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            Smart
          </button>
        </div>
        <select value={staffFilter} onChange={e => { setStaffFilter(e.target.value); if (e.target.value) { setTeamMode(false); setView('week'); setSmartView(false) } }}
          style={{ padding: '0.25rem 0.5rem', border: '1px solid rgba(94,59,135,0.22)', borderRadius: 6, fontSize: '0.75rem', fontFamily: "'DM Sans', sans-serif", color: staffFilter ? '#5e3b87' : '#888', background: staffFilter ? '#f5f3ff' : 'white', cursor: 'pointer', fontWeight: staffFilter ? 600 : 400, maxWidth: 110 }}>
          <option value="">All staff</option>
          {(staff || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </>
    )}

    {/* New appointment */}
    {onNew && (
      <button onClick={onNew} style={{ padding: '0.3rem 0.9rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: 7, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
        + New
      </button>
    )}
  </div>
)

// ─── Appointment event card ───────────────────────────────────────────────────
function AppointmentCard({ event, title, catalogue }) {
  const appt = event.resource || {}
  const status = appt.status || 'confirmed'
  const statusC = STATUS_COLOURS[status] || STATUS_COLOURS.confirmed

  // Use service category colour when available, fall back to status colour
  const catalogueItem = catalogue?.find(ci => ci.id === appt.service_id)
  const catC = catalogueItem ? getCategoryColour(catalogueItem.category) : null
  const c = catC || statusC

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

function StaffScheduleTab({ tenantId, staff, isDemo, isPreview }) {
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
  }, [tenantId, isDemo, staff.length])

  const toggle = (staffId, day) => {
    setSchedules(prev => ({ ...prev, [staffId]: { ...prev[staffId], [day]: { ...prev[staffId][day], on: !prev[staffId][day].on } } }))
  }
  const setTime = (staffId, day, field, val) => {
    setSchedules(prev => ({ ...prev, [staffId]: { ...prev[staffId], [day]: { ...prev[staffId][day], [field]: val } } }))
  }

  const saveSchedule = async (staffId) => {
    if (isDemo || isPreview) return
    setSaving(staffId)
    const days = schedules[staffId] || {}
    for (let d = 0; d < 7; d++) {
      const { on, start, end } = days[d] || { on: false, start: '09:00', end: '18:00' }
      await supabase.from('staff_availability').upsert(
        { staff_profile_id: staffId, day_of_week: d, start_time: start, end_time: end, active: on },
        { onConflict: 'staff_profile_id,day_of_week' }
      )
    }
    setSaving(null)
    setSaved(staffId)
    setTimeout(() => setSaved(null), 2000)
  }

  if (loading) return <div style={{ color: '#aaa', fontSize: '0.875rem', padding: '2rem', fontFamily: "'DM Sans', sans-serif" }}>Loading schedules…</div>
  if (!staff.length) return (
    <div style={{ background: '#faf9fc', border: '1px solid rgba(94,59,135,0.1)', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👥</div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#1a1a1a', marginBottom: '0.3rem' }}>No staff added yet</div>
      <div style={{ fontSize: '0.8125rem', color: '#888', fontFamily: "'DM Sans', sans-serif" }}>Add staff members in Business Profile → Staff</div>
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
                  <button onClick={e => { e.stopPropagation(); saveSchedule(s.id) }} disabled={isSav || isDemo || isPreview}
                    style={{ padding: '0.32rem 0.8rem', background: isSaved ? '#3db87a' : '#f0a500', color: isSaved ? 'white' : '#1a0533', border: 'none', borderRadius: 7, fontSize: '0.72rem', fontWeight: 600, cursor: (isSav || isDemo) ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
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

// ─── Calendar settings tab ────────────────────────────────────────────────────
function CalendarSettingsTab({ tenantId, isDemo, isPreview }) {
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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!tenantId) return
    supabase.from('tenants')
      .select('booking_buffer_mins, reminder_48h, reminder_24h, reminder_1h, no_show_fee, no_show_fee_type, no_show_fee_pct, cancel_cutoff_hrs, charge_late_cancel, client_can_reschedule')
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
      })
  }, [tenantId])

  const save = async () => {
    if (isDemo || isPreview || !tenantId) return
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
    }).eq('id', tenantId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const Toggle = ({ val, set }) => (
    <button onClick={() => set(!val)} style={{ width: 42, height: 24, borderRadius: 12, border: 'none', background: val ? '#5e3b87' : '#e8e0f0', cursor: 'pointer', position: 'relative', transition: 'background 0.18s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 3, left: val ? 20 : 3, width: 18, height: 18, borderRadius: 9, background: 'white', transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
    </button>
  )

  const Row = ({ label, desc, children }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', padding: '0.85rem 0', borderBottom: '1px solid rgba(94,59,135,0.06)' }}>
      <div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: '0.875rem', color: '#1a1a1a' }}>{label}</div>
        {desc && <div style={{ fontSize: '0.75rem', color: '#888', fontFamily: "'DM Sans', sans-serif", marginTop: 2, lineHeight: 1.4 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )

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

      <button onClick={save} disabled={saving || isDemo || isPreview}
        style={{ alignSelf: 'flex-start', padding: '0.55rem 1.4rem', background: saved ? '#3db87a' : (saving || isDemo ? '#f5d98a' : '#f0a500'), color: saved ? 'white' : '#1a0533', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: (saving || isDemo) ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save settings'}
      </button>
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
export default function CalendarTab({ onNavigate: onPortalNavigate, prefill, onPrefillConsumed }) {
  const { user } = useAuth()
  const preview = usePreview()
  const demo = useDemo()
  const isDemo = !!demo?.isDemo || !!preview?.isDemo
  const isPreview = preview?.isPreview
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
  const [staffFilter, setStaffFilter] = useState('') // '' = all, staffId = single staff
  const [smartView, setSmartView] = useState(true) // auto-adapt based on staff count
  const hasAutoAdapted = useRef(false)
  const [activeSubTab, setActiveSubTab] = useState('appointments')

  // Right panel state
  const [panelMode, setPanelMode] = useState(null) // null | 'view' | 'edit' | 'create'
  const [panelEvent, setPanelEvent] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [bookingMode, setBookingMode] = useState('service') // 'service' | 'manual'
  const [saving, setSaving] = useState(false)
  const [slotWarning, setSlotWarning] = useState(false)

  // Waitlist state
  const [waitlists, setWaitlists] = useState({}) // { appointmentId: count }

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

  // ─── Demo data injection ────────────────────────────────────────────────────
  useEffect(() => {
    if (!demo?.isDemo) return
    setStaff(demo.staff || [])
    setEvents((demo.appointments || []).map(toEvent))
    setCatalogue([])
    setLoading(false)
  }, [demo?.isDemo, demo?.business?.id, demo?.appointments])

  // ─── Load tenant ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (demo?.isDemo || (!user && !isPreview)) return
    const getTid = async () => {
      if (isPreview) { setTenantId(preview.previewTenantId); return }
      const { data } = await supabase.from('tenant_memberships').select('tenant_id').eq('user_id', user.id).maybeSingle()
      if (data) setTenantId(data.tenant_id)
    }
    getTid()
  }, [user, isPreview, demo?.isDemo])

  // ─── Load appointments + staff + catalogue ──────────────────────────────────
  useEffect(() => {
    if (demo?.isDemo || !tenantId) return
    const load = async () => {
      setLoading(true)
      try {
        const [apptRes, staffRes, catRes] = await Promise.all([
          supabase.from('appointments').select('*').eq('tenant_id', tenantId).order('start_time'),
          supabase.from('staff_profiles').select('id, name, role, colour, skills').eq('tenant_id', tenantId).eq('active', true).order('name'),
          supabase.from('catalogue_items').select('id, name, category, duration_minutes, processing_minutes, item_type').eq('tenant_id', tenantId).eq('active', true).order('name'),
        ])
        setEvents((apptRes.data || []).map(toEvent))
        setStaff(staffRes.data || [])
        setCatalogue(catRes.data || [])
      } catch (err) {
        console.error('Calendar load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tenantId])


  // ─── Auto-adapt view based on staff count (fires once after first load) ────────
  useEffect(() => {
    if (staff.length === 0 || hasAutoAdapted.current || !smartView) return
    hasAutoAdapted.current = true
    if (staff.length <= 1) {
      setView('week')
      setTeamMode(false)
    } else if (staff.length === 2) {
      setView('work_week')
      setTeamMode(false)
    } else {
      setView('day')
      setTeamMode(true)
    }
  }, [staff.length, smartView])

  // ─── Service selection → auto-fill duration + processing ─────────────────────
  const handleServiceSelect = (serviceId) => {
    const svc = catalogue.find(c => c.id === serviceId)
    if (!svc) {
      setForm(prev => ({ ...prev, service_id: '', appointment_type: '' }))
      return
    }
    const startDt = form.start ? new Date(form.start) : startOfHour(addHours(new Date(), 1))
    const endDt = addMinutes(startDt, svc.duration_minutes || 60)
    const hasProcesing = svc.processing_minutes > 0
    let procStart = '', procEnd = ''
    if (hasProcesing) {
      const activeFirst = Math.max(15, Math.floor((svc.duration_minutes - svc.processing_minutes) / 2))
      procStart = isoLocal(addMinutes(startDt, activeFirst))
      procEnd = isoLocal(addMinutes(startDt, activeFirst + svc.processing_minutes))
    }
    setForm(prev => ({
      ...prev,
      service_id: serviceId,
      appointment_type: svc.name,
      start: form.start || isoLocal(startDt),
      end: isoLocal(endDt),
      isSplit: hasProcesing,
      processing_start: procStart,
      processing_end: procEnd,
    }))
  }

  // ─── Staff filtered by service skills ────────────────────────────────────────
  const filteredStaff = (serviceId) => {
    if (!serviceId) return staff
    const qualified = staff.filter(s => !s.skills || s.skills.length === 0 || (s.skills && s.skills.includes(serviceId)))
    return qualified.length > 0 ? qualified : staff
  }

  // ─── Resources for team / column mode ────────────────────────────────────────
  const visibleStaff = staffFilter ? staff.filter(s => s.id === staffFilter) : staff
  const resources = useMemo(() => {
    if (!teamMode || staff.length === 0 || staffFilter) return undefined
    return [
      { id: 'unassigned', title: 'Unassigned' },
      ...staff.map(s => ({ id: s.id, title: s.name })),
    ]
  }, [teamMode, staff, staffFilter])
  const visibleEvents = staffFilter
    ? events.filter(e => e.resourceId === staffFilter || e.resource?.staff_profile_id === staffFilter)
    : events

  // Smart view label shown in legend
  const smartViewLabel = useMemo(() => {
    if (!smartView || staff.length === 0) return null
    if (staff.length <= 1) return `${staff.length === 0 ? 'No' : '1'} staff · week view`
    if (staff.length === 2) return `2 staff · 5-day view`
    return `${staff.length} staff · column view`
  }, [smartView, staff.length])

  // ─── Event style ─────────────────────────────────────────────────────────────
  const eventPropGetter = useCallback((event) => {
    const appt = event.resource || {}
    const status = appt.status || 'confirmed'
    const statusC = STATUS_COLOURS[status] || STATUS_COLOURS.confirmed
    const catItem = catalogue.find(ci => ci.id === appt.service_id)
    const catC = catItem ? getCategoryColour(catItem.category) : null
    const c = catC || statusC
    const isSplit = !!(appt.processing_start_time)
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
  }, [catalogue])

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
      service_id: appt.service_id || '',
      repeat_type: 'none',
      repeat_count: 4,
      intake_answers: appt.intake_answers || '',
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

  // ─── Save (with recurring series support) ────────────────────────────────────
  const handleSave = async () => {
    if (isDemo || isPreview || !tenantId) return
    if (!form.title.trim() || !form.start || !form.end) return
    if (form.isSplit && (!form.processing_start || !form.processing_end)) return
    setSaving(true)
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
        staff_profile_id: form.staff_profile_id || null,
        processing_start_time: form.isSplit && form.processing_start ? new Date(form.processing_start).toISOString() : null,
        processing_end_time: form.isSplit && form.processing_end ? new Date(form.processing_end).toISOString() : null,
        service_id: form.service_id || null,
        intake_answers: form.intake_answers ? form.intake_answers : null,
        created_from: 'manual',
      }

      if (panelMode === 'edit' && panelEvent) {
        const { data } = await supabase.from('appointments').update(basePayload).eq('id', panelEvent.id).select().maybeSingle()
        if (data) setEvents(prev => prev.map(e => e.id === panelEvent.id ? toEvent(data) : e))
        fetch('/api/caldav-sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId, appointmentId: panelEvent.id, action: 'upsert' }) }).catch(() => {})
      } else {
        const isRecurring = form.repeat_type !== 'none'
        const weekGap = form.repeat_type === 'fortnightly' ? 2 : 1
        const count = isRecurring ? Math.max(1, parseInt(form.repeat_count) || 4) : 1
        const seriesId = isRecurring ? crypto.randomUUID() : null

        const payloads = Array.from({ length: count }, (_, i) => {
          const offset = i * weekGap * 7 * 24 * 60 * 60 * 1000
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

        const { data } = await supabase.from('appointments').insert(payloads).select()
        if (data) {
          setEvents(prev => [...prev, ...data.map(toEvent)])
          data.forEach(appt => {
            fetch('/api/caldav-sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId, appointmentId: appt.id, action: 'upsert' }) }).catch(() => {})
          })
        }
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
      const appt = panelEvent.resource
      if (appt.series_id) {
        // Delete just this one; could extend with "delete all in series" later
      }
      await supabase.from('appointments').delete().eq('id', panelEvent.id)
      setEvents(prev => prev.filter(e => e.id !== panelEvent.id))
      fetch('/api/caldav-sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId, appointmentId: panelEvent.id, action: 'delete' }) }).catch(() => {})
      closePanel()
    } catch (err) { console.error('Delete error:', err) }
    finally { setSaving(false) }
  }

  // ─── Mark completed ───────────────────────────────────────────────────────────
  const handleMarkCompleted = async () => {
    if (isDemo || isPreview || !panelEvent) return
    const updates = { status: 'completed' }
    setEvents(prev => prev.map(e => e.id === panelEvent.id ? { ...e, resource: { ...e.resource, status: 'completed' } } : e))
    setPanelEvent(prev => prev ? { ...prev, resource: { ...prev.resource, status: 'completed' } } : prev)
    await supabase.from('appointments').update(updates).eq('id', panelEvent.id)
  }

  const canSave = form.title.trim() && form.start && form.end && !saving
    && (!form.isSplit || (form.processing_start && form.processing_end))

  const hasTeamMode = staff.length > 0

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
              {catalogue.filter(c => c.item_type === 'service').map(c => (
                <option key={c.id} value={c.id}>{c.name} · {c.duration_minutes} min{c.processing_minutes > 0 ? ` (+ ${c.processing_minutes} min processing)` : ''}</option>
              ))}
            </FieldSelect>
            {form.service_id && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#5e3b87', fontFamily: "'DM Sans', sans-serif" }}>
                Duration and times auto-filled from catalogue ✓
              </div>
            )}
          </div>
        )}

        {/* Client name — always visible */}
        <div>
          <Label>Client name *</Label>
          <FieldInput value={form.title} onChange={f('title')}
            placeholder={bookingMode === 'service' && form.service_id ? `e.g. Sarah Mitchell — ${form.appointment_type}` : 'e.g. Sarah Mitchell'}
            autoFocus />
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
            {/* Split toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isSplit}
                onChange={e => setForm(prev => ({ ...prev, isSplit: e.target.checked, processing_start: '', processing_end: '' }))}
                style={{ width: 15, height: 15, accentColor: '#f0a500', cursor: 'pointer' }} />
              <span style={{ fontSize: '0.8125rem', color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>Split appointment — has processing time</span>
            </label>
          </div>
        )}

        {/* Processing window — service or manual split */}
        {form.isSplit && (
          <div style={{ background: '#fef3d9', borderRadius: 8, padding: '0.85rem', border: '1px solid rgba(240,165,0,0.25)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#7a5c00', marginBottom: '0.45rem', fontFamily: "'DM Sans', sans-serif" }}>Processing window — when you're free for another client</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div><Label>Starts</Label><FieldInput type="datetime-local" value={form.processing_start} onChange={f('processing_start')} /></div>
              <div><Label>Ends</Label><FieldInput type="datetime-local" value={form.processing_end} onChange={f('processing_end')} /></div>
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

        {/* Recurring series — create mode only */}
        {panelMode === 'create' && (
          <div style={{ background: '#f5f3ff', borderRadius: 8, padding: '0.85rem', border: '1px solid rgba(94,59,135,0.15)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4a2d6e', marginBottom: '0.55rem', fontFamily: "'DM Sans', sans-serif" }}>🔁 Recurring series</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <Label>Repeat</Label>
                <FieldSelect value={form.repeat_type} onChange={f('repeat_type')}>
                  <option value="none">No repeat</option>
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                </FieldSelect>
              </div>
              {form.repeat_type !== 'none' && (
                <div>
                  <Label>Occurrences</Label>
                  <FieldSelect value={form.repeat_count} onChange={f('repeat_count')}>
                    {[2,4,6,8,12,26,52].map(n => <option key={n} value={n}>{n} sessions</option>)}
                  </FieldSelect>
                </div>
              )}
            </div>
            {form.repeat_type !== 'none' && (
              <div style={{ fontSize: '0.72rem', color: '#666', fontFamily: "'DM Sans', sans-serif", marginTop: '0.5rem', lineHeight: 1.4 }}>
                Creates {form.repeat_count} appointments, {form.repeat_type === 'weekly' ? 'weekly' : 'fortnightly'} from the start date.
              </div>
            )}
          </div>
        )}
      </div>

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
          {saving ? 'Saving…' : form.repeat_type !== 'none' ? `Save ${form.repeat_count} sessions` : 'Save'}
        </button>
      </div>
    </>
  )

  const panelOpen = !!panelMode

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

  // ─── Sub-tab nav ──────────────────────────────────────────────────────────────
  const subTabs = [
    { id: 'appointments', label: 'Appointments' },
    { id: 'schedules', label: 'Staff schedules' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div>
      {/* ── Single compact top bar ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}
        data-help="Qerxel Calendar — create appointments manually, drag to reschedule, or let your AI create them from captured calls. Split appointments show processing gaps so you can book other clients during colour/drying time.">
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#1a1a1a', margin: 0, flexShrink: 0 }}>Calendar</h2>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: 0, background: '#f0ebf8', borderRadius: 9, padding: 3, flexShrink: 0 }}>
          {subTabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveSubTab(tab.id); closePanel() }}
              style={{ padding: '0.28rem 0.75rem', borderRadius: 7, border: 'none', background: activeSubTab === tab.id ? '#5e3b87' : 'transparent', color: activeSubTab === tab.id ? 'white' : '#5e3b87', fontSize: '0.75rem', fontWeight: activeSubTab === tab.id ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', transition: 'background 0.15s' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status legend — only on appointments tab, pushed to the right */}
        {activeSubTab === 'appointments' && (
          <>
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

      {/* ── Appointments sub-tab ─────────────────────────────────────────────── */}
      {activeSubTab === 'appointments' && (
        <>

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
                  events={visibleEvents}
                  date={currentDate}
                  view={view}
                  onNavigate={setCurrentDate}
                  onView={setView}
                  views={['month', 'week', 'work_week', 'day']}
                  selectable
                  resizable
                  onSelectSlot={handleSelectSlot}
                  onSelectEvent={handleSelectEvent}
                  onEventDrop={handleEventDrop}
                  onEventResize={handleEventResize}
                  eventPropGetter={eventPropGetter}
                  components={{
                    header: DayColumnHeader,
                    toolbar: (props) => <CalendarToolbar {...props}
                      staff={staff} staffFilter={staffFilter} setStaffFilter={setStaffFilter}
                      teamMode={teamMode} setTeamMode={setTeamMode}
                      smartView={smartView} setSmartView={setSmartView}
                      hasAutoAdapted={hasAutoAdapted} setView={setView}
                      hasTeamMode={hasTeamMode}
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
                  style={{ height: panelOpen && !isMobile ? 640 : 680 }}
                  scrollToTime={new Date(0, 0, 0, 7, 0, 0)}
                  min={new Date(0, 0, 0, 7, 0, 0)}
                  max={new Date(0, 0, 0, 21, 0, 0)}
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
                  <motion.div key="right-panel" variants={panelVariants} initial="hidden" animate="visible" exit="exit"
                    style={{ width: 320, flexShrink: 0, background: 'white', borderRadius: 12, border: '0.5px solid rgba(94,59,135,0.1)', boxShadow: '0 4px 24px rgba(94,59,135,0.1)', display: 'flex', flexDirection: 'column', maxHeight: 660, overflow: 'hidden' }}>
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

      {/* ── Staff schedules sub-tab ──────────────────────────────────────────── */}
      {activeSubTab === 'schedules' && (
        <StaffScheduleTab tenantId={tenantId} staff={staff} isDemo={isDemo} isPreview={isPreview} />
      )}

      {/* ── Settings sub-tab ─────────────────────────────────────────────────── */}
      {activeSubTab === 'settings' && (
        <CalendarSettingsTab tenantId={tenantId} isDemo={isDemo} isPreview={isPreview} />
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
