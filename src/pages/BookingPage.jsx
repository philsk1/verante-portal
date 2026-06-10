import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function addMinutes(date, mins) {
  return new Date(date.getTime() + mins * 60000)
}

function toTimeStr(date) {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function parseTime(str) {
  const [h, m] = (str || '09:00').split(':').map(Number)
  return { h, m }
}

function dayAt(date, timeStr) {
  const { h, m } = parseTime(timeStr)
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return d
}

function nextDays(n) {
  const days = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 1; i <= n; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push(d)
  }
  return days
}

const SLOT_INTERVAL = 30

function generateSlots({ date, schedules, appointments, durationMins, bufferMins }) {
  const slots = []
  const dayOfWeek = date.getDay()
  const windows = schedules
    .filter(s => s.day_of_week === dayOfWeek && s.active)
    .map(s => ({ staffId: s.staff_profile_id, start: dayAt(date, s.start_time), end: dayAt(date, s.end_time) }))

  if (!windows.length) return []

  windows.forEach(({ staffId, start, end }) => {
    let cursor = new Date(start)
    while (cursor < end) {
      const slotEnd = addMinutes(cursor, durationMins)
      const processingEnd = addMinutes(slotEnd, bufferMins)
      if (processingEnd > end) break

      const conflict = appointments.some(apt => {
        if (apt.staff_profile_id && apt.staff_profile_id !== staffId) return false
        const aptStart = new Date(apt.start_time)
        const aptEnd   = new Date(apt.end_time)
        const bufEnd   = addMinutes(aptEnd, bufferMins)
        return cursor < bufEnd && slotEnd > aptStart
      })

      if (!conflict) {
        const key = cursor.toISOString()
        if (!slots.find(s => s.key === key)) {
          slots.push({ key, time: new Date(cursor), label: toTimeStr(cursor), staffId })
        }
      }
      cursor = addMinutes(cursor, SLOT_INTERVAL)
    }
  })

  return slots.sort((a, b) => a.time - b.time)
}

// ─── Small shared components ──────────────────────────────────────────────────

const StepDot = ({ n, active, done }) => (
  <div style={{
    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: done ? '#3db87a' : active ? '#5e3b87' : '#e9e3f3',
    color: done || active ? 'white' : '#aaa',
    fontSize: '0.75rem', fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
    transition: 'background 0.2s',
  }}>
    {done ? '✓' : n}
  </div>
)

// ─── Main component ───────────────────────────────────────────────────────────

export default function BookingPage() {
  const { tenantId } = useParams()

  // Data
  const [tenant, setTenant]             = useState(null)
  const [catalogue, setCatalogue]       = useState([])
  const [schedules, setSchedules]       = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  // Page mode
  const [mode, setMode]                 = useState('book') // 'book' | 'manage'

  // Booking state
  const [step, setStep]                       = useState(1) // 1–5
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate]       = useState(null)
  const [selectedSlot, setSelectedSlot]       = useState(null)
  const [slots, setSlots]                     = useState([])
  const [form, setForm]                       = useState({ name: '', phone: '', email: '', notes: '' })
  const [submitting, setSubmitting]           = useState(false)
  const [bookingRef, setBookingRef]           = useState(null)

  // Manage state
  const [managePhone, setManagePhone]         = useState('')
  const [manageResults, setManageResults]     = useState(null) // null = not searched, [] = none found
  const [manageLoading, setManageLoading]     = useState(false)
  const [rescheduleApt, setRescheduleApt]     = useState(null) // appointment being rescheduled
  const [rescheduling, setRescheduling]       = useState(false)

  const days = nextDays(21)

  // ── Load tenant + catalogue + schedules ──────────────────────────────────────
  useEffect(() => {
    if (!tenantId) return
    const load = async () => {
      try {
        const [tenantRes, catRes, schedRes] = await Promise.all([
          supabase.from('tenants')
            .select('business_name, business_phone, business_email, business_address, cancel_cutoff_hrs, booking_buffer_mins, client_can_reschedule, charge_late_cancel, no_show_fee, no_show_fee_type, no_show_fee_pct')
            .eq('id', tenantId)
            .maybeSingle(),
          supabase.from('catalogue_items')
            .select('id, name, description, price_from, price_to, duration_minutes, processing_minutes, category')
            .eq('tenant_id', tenantId)
            .eq('active', true)
            .eq('item_type', 'service')
            .order('name'),
          supabase.from('staff_availability')
            .select('staff_profile_id, day_of_week, start_time, end_time, active')
            .in('staff_profile_id',
              (await supabase.from('staff_profiles').select('id').eq('tenant_id', tenantId)).data?.map(s => s.id) || []
            ),
        ])
        if (!tenantRes.data) { setError('Booking page not found.'); setLoading(false); return }
        setTenant(tenantRes.data)
        setCatalogue(catRes.data || [])
        setSchedules(schedRes.data || [])
      } catch {
        setError('Something went wrong. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tenantId])

  // ── Load appointments for selected date (booking flow) ───────────────────────
  useEffect(() => {
    if (!tenantId || !selectedDate) return
    const from = new Date(selectedDate)
    from.setHours(0, 0, 0, 0)
    const to = new Date(selectedDate)
    to.setHours(23, 59, 59, 999)
    supabase.from('appointments')
      .select('staff_profile_id, start_time, end_time')
      .eq('tenant_id', tenantId)
      .gte('start_time', from.toISOString())
      .lte('start_time', to.toISOString())
      .neq('status', 'cancelled')
      .then(({ data }) => setAppointments(data || []))
  }, [tenantId, selectedDate])

  // ── Generate slots ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedService || !selectedDate || !schedules.length) { setSlots([]); return }
    const durationMins = selectedService.duration_minutes || 60
    const bufferMins   = tenant?.booking_buffer_mins ?? 15
    setSlots(generateSlots({ date: selectedDate, schedules, appointments, durationMins, bufferMins }))
    setSelectedSlot(null)
  }, [selectedService, selectedDate, appointments, schedules, tenant])

  // ── Submit new booking ────────────────────────────────────────────────────────
  const submitBooking = async () => {
    if (!selectedSlot || !selectedService || !form.name.trim() || !form.phone.trim()) return
    setSubmitting(true)
    try {
      const start = selectedSlot.time
      const end   = addMinutes(start, selectedService.duration_minutes || 60)
      const processingEnd = selectedService.processing_minutes
        ? addMinutes(end, selectedService.processing_minutes) : null

      const { data, error: err } = await supabase.from('appointments').insert({
        tenant_id:           tenantId,
        staff_profile_id:    selectedSlot.staffId || null,
        title:               `${selectedService.name} — ${form.name.trim()}`,
        description:         form.notes.trim() || null,
        start_time:          start.toISOString(),
        end_time:            end.toISOString(),
        processing_end_time: processingEnd?.toISOString() || null,
        service_id:          selectedService.id,
        status:              'provisional',
        appointment_type:    selectedService.name,
        client_notes:        form.notes.trim() || null,
        client_name:         form.name.trim(),
        client_phone:        form.phone.trim(),
        client_email:        form.email.trim() || null,
        created_from:        'customer_booking',
      }).select().maybeSingle()

      if (err) throw err
      const ref = data?.id?.slice(0, 8).toUpperCase() || 'CONFIRMED'
      setBookingRef(ref)
      setStep(5)

      // Fire confirmation notifications (non-blocking)
      fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:      'booking-confirm',
          tenantId,
          clientName:  form.name.trim(),
          clientPhone: form.phone.trim(),
          clientEmail: form.email.trim() || null,
          serviceName: selectedService.name,
          startTime:   start.toISOString(),
          bookingRef:  ref,
        }),
      }).catch(() => {})
    } catch {
      alert('Could not confirm your booking. Please try again or call us directly.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Manage: look up by phone ──────────────────────────────────────────────────
  const lookupByPhone = async () => {
    const phone = managePhone.trim()
    if (!phone) return
    setManageLoading(true)
    const now = new Date().toISOString()
    const { data } = await supabase.from('appointments')
      .select('id, title, start_time, end_time, status, appointment_type, client_name')
      .eq('tenant_id', tenantId)
      .eq('client_phone', phone)
      .neq('status', 'cancelled')
      .gte('start_time', now)
      .order('start_time')
    setManageResults(data || [])
    setManageLoading(false)
  }

  // ── Manage: cancel ────────────────────────────────────────────────────────────
  const cancelAppointment = async (apt) => {
    const cutoff = tenant?.cancel_cutoff_hrs ?? 24
    const hoursUntil = (new Date(apt.start_time) - new Date()) / 3600000
    const isLate = hoursUntil < cutoff
    const feeApplies = isLate && tenant?.charge_late_cancel

    let msg = `Cancel your ${apt.appointment_type || 'appointment'} on ${new Date(apt.start_time).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at ${toTimeStr(new Date(apt.start_time))}?`
    if (isLate && cutoff > 0) {
      msg += `\n\nThis is within the ${cutoff}-hour cancellation window.`
      if (feeApplies) {
        const fee = tenant.no_show_fee_type === 'percentage'
          ? `${tenant.no_show_fee_pct}% of your service cost`
          : tenant.no_show_fee ? `£${tenant.no_show_fee}` : 'a cancellation fee'
        msg += ` A ${fee} may apply.`
      }
    }

    if (!window.confirm(msg)) return

    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', apt.id)
    setManageResults(prev => prev.filter(a => a.id !== apt.id))
  }

  // ── Manage: start reschedule ──────────────────────────────────────────────────
  const startReschedule = (apt) => {
    setRescheduleApt(apt)
    // Pre-select the service if we can match by appointment_type
    const svc = catalogue.find(s => s.name === apt.appointment_type)
    if (svc) setSelectedService(svc)
    setSelectedDate(null)
    setSelectedSlot(null)
    setMode('book')
    setStep(2)
  }

  // ── Reschedule submit (replaces submitBooking when rescheduling) ──────────────
  const submitReschedule = async () => {
    if (!selectedSlot || !selectedService || !rescheduleApt) return
    setRescheduling(true)
    try {
      const start = selectedSlot.time
      const end   = addMinutes(start, selectedService.duration_minutes || 60)
      await supabase.from('appointments').update({
        start_time: start.toISOString(),
        end_time:   end.toISOString(),
        status:     'provisional',
      }).eq('id', rescheduleApt.id)
      setRescheduleApt(null)
      setManageResults(null)
      setManagePhone('')
      setStep(1)
      setSelectedService(null)
      setMode('manage')
      // small delay then re-lookup so the updated apt shows
      setTimeout(() => setMode('manage'), 100)
    } catch {
      alert('Could not reschedule. Please call us directly.')
    } finally {
      setRescheduling(false)
    }
  }

  // ── AI advisor widget state ────────────────────────────────────────────────
  const [aiOpen, setAiOpen]           = useState(false)
  const [aiMessages, setAiMessages]   = useState([])
  const [aiInput, setAiInput]         = useState('')
  const [aiLoading, setAiLoading]     = useState(false)
  const [aiGreeted, setAiGreeted]     = useState(false)

  const openAi = () => {
    setAiOpen(true)
    if (!aiGreeted) {
      setAiMessages([{ role: 'assistant', content: `Hi! I can help you choose the right service or answer any questions about ${tenant?.business_name || 'us'}. What would you like to know?` }])
      setAiGreeted(true)
    }
  }

  const sendAiMessage = async () => {
    const text = aiInput.trim()
    if (!text || aiLoading) return
    const next = [...aiMessages, { role: 'user', content: text }]
    setAiMessages(next)
    setAiInput('')
    setAiLoading(true)
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'booking-assist', businessName: tenant?.business_name, services: catalogue, messages: next }),
      })
      const d = await r.json()
      setAiMessages(prev => [...prev, { role: 'assistant', content: d.message || 'Sorry, I couldn\'t respond. Please try again.' }])
    } catch {
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setAiLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const steps = [
    { n: 1, label: 'Service' },
    { n: 2, label: 'Date' },
    { n: 3, label: 'Time' },
    { n: 4, label: 'Your details' },
  ]

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f7f6f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#aaa', fontSize: '0.9rem' }}>Loading…</div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#f7f6f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔍</div>
        <div style={{ fontWeight: 600, color: '#1a1a1a', marginBottom: '0.4rem' }}>{error}</div>
        <div style={{ fontSize: '0.85rem', color: '#aaa' }}>Check the link and try again.</div>
      </div>
    </div>
  )

  const priceLabel = (svc) => {
    if (!svc.price_from && !svc.price_to) return null
    if (svc.price_from && svc.price_to) return `£${svc.price_from}–£${svc.price_to}`
    return `From £${svc.price_from || svc.price_to}`
  }

  const isRescheduling = !!rescheduleApt

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f9', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #3a2057 0%, #5e3b87 100%)', padding: '1.5rem 1.5rem 2.5rem' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: 'white', fontSize: '1rem' }}>Qerxel</span>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f0a500', display: 'inline-block' }} />
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', fontFamily: "'DM Sans', sans-serif" }}>Booking</span>
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: 'white', marginBottom: '0.25rem' }}>
            {tenant?.business_name}
          </div>
          {tenant?.business_address && (
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)' }}>{tenant.business_address}</div>
          )}
        </div>
      </div>

      {/* ── Content card ──────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 520, margin: '-1.25rem auto 2rem', padding: '0 1rem' }}>
        <div style={{ background: 'white', borderRadius: 18, boxShadow: '0 4px 32px rgba(94,59,135,0.12), 0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

          {/* Mode toggle */}
          {step < 5 && !isRescheduling && (
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(94,59,135,0.07)', padding: '0 1.5rem' }}>
              {[['book','Book'], ['manage','Manage booking']].map(([m, label]) => (
                <button key={m} onClick={() => { setMode(m); if (m === 'book') setStep(1) }}
                  style={{ padding: '0.9rem 0', marginRight: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: mode === m ? 700 : 400, fontSize: '0.875rem', color: mode === m ? '#5e3b87' : '#aaa', borderBottom: mode === m ? '2px solid #5e3b87' : '2px solid transparent', transition: 'all 0.15s' }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* ── MANAGE MODE ───────────────────────────────────────────────── */}
          {mode === 'manage' && !isRescheduling && (
            <div style={{ padding: '1.5rem' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#1a1a1a', marginBottom: '0.3rem' }}>Manage your booking</div>
              <div style={{ fontSize: '0.82rem', color: '#999', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                Enter the phone number you booked with to view, cancel, or reschedule your appointment.
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <input
                  type="tel"
                  value={managePhone}
                  onChange={e => { setManagePhone(e.target.value); setManageResults(null) }}
                  onKeyDown={e => e.key === 'Enter' && lookupByPhone()}
                  placeholder="e.g. 07700 000000"
                  style={{ flex: 1, padding: '0.65rem 0.85rem', border: '1.5px solid rgba(94,59,135,0.18)', borderRadius: 10, fontSize: '0.9rem', color: '#1a1a1a', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}
                />
                <button
                  onClick={lookupByPhone}
                  disabled={manageLoading || !managePhone.trim()}
                  style={{ padding: '0.65rem 1.1rem', background: !managePhone.trim() ? '#f5d98a' : '#f0a500', color: !managePhone.trim() ? '#7a5c1a' : '#1a0533', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.875rem', cursor: !managePhone.trim() ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                  {manageLoading ? 'Looking…' : 'Find'}
                </button>
              </div>

              {manageResults !== null && manageResults.length === 0 && (
                <div style={{ padding: '1.5rem', textAlign: 'center', background: '#faf9fc', borderRadius: 12, fontSize: '0.85rem', color: '#aaa' }}>
                  No upcoming appointments found for that number.<br />
                  <span style={{ fontSize: '0.8rem' }}>Check the number or{' '}
                    <a href={`tel:${tenant?.business_phone}`} style={{ color: '#5e3b87', textDecoration: 'none', fontWeight: 600 }}>call us</a>
                  </span>
                </div>
              )}

              {manageResults && manageResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {manageResults.map(apt => {
                    const start = new Date(apt.start_time)
                    const cutoff = tenant?.cancel_cutoff_hrs ?? 24
                    const hoursUntil = (start - new Date()) / 3600000
                    const canReschedule = tenant?.client_can_reschedule !== false && catalogue.length > 0
                    return (
                      <div key={apt.id} style={{ border: '1px solid rgba(94,59,135,0.12)', borderRadius: 12, padding: '0.9rem 1.1rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1a1a1a', marginBottom: '0.2rem' }}>
                          {apt.appointment_type || apt.title}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.75rem' }}>
                          {start.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at {toTimeStr(start)}
                          {apt.client_name && ` · ${apt.client_name}`}
                        </div>
                        {hoursUntil < cutoff && cutoff > 0 && (
                          <div style={{ fontSize: '0.73rem', color: '#f0a500', background: '#fffbf0', border: '1px solid rgba(240,165,0,0.2)', borderRadius: 6, padding: '0.35rem 0.6rem', marginBottom: '0.65rem' }}>
                            Within {cutoff}h cancellation window{tenant?.charge_late_cancel ? ' — fee may apply' : ''}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {canReschedule && (
                            <button onClick={() => startReschedule(apt)}
                              style={{ flex: 1, padding: '0.5rem', border: '1.5px solid rgba(94,59,135,0.2)', borderRadius: 8, background: 'white', color: '#5e3b87', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                              Reschedule
                            </button>
                          )}
                          <button onClick={() => cancelAppointment(apt)}
                            style={{ flex: 1, padding: '0.5rem', border: '1.5px solid rgba(239,68,68,0.2)', borderRadius: 8, background: 'white', color: '#ef4444', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── BOOK MODE ─────────────────────────────────────────────────── */}
          {(mode === 'book' || isRescheduling) && (
            <>
              {/* Progress bar */}
              {step < 5 && (
                <div style={{ padding: '1.25rem 1.5rem 0' }}>
                  {isRescheduling && (
                    <div style={{ fontSize: '0.75rem', color: '#f0a500', fontWeight: 700, background: '#fffbf0', border: '1px solid rgba(240,165,0,0.2)', borderRadius: 6, padding: '0.3rem 0.7rem', marginBottom: '0.85rem', display: 'inline-block', fontFamily: "'DM Sans', sans-serif" }}>
                      Rescheduling: {rescheduleApt?.appointment_type}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    {steps.map((s, i) => (
                      <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0, gap: '0.5rem' }}>
                        <StepDot n={s.n} active={step === s.n} done={step > s.n} />
                        {i < steps.length - 1 && (
                          <div style={{ flex: 1, height: 2, borderRadius: 2, background: step > s.n ? '#3db87a' : '#ede8f5' }} />
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', fontFamily: "'DM Sans', sans-serif" }}>
                    Step {step} of {steps.length} — {steps[step - 1]?.label}
                  </div>
                </div>
              )}

              <div style={{ padding: step < 5 ? '0 1.5rem 1.5rem' : '2rem 1.5rem' }}>

                {/* ── Step 1: Service ──────────────────────────────────────── */}
                {step === 1 && (
                  <div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#1a1a1a', marginBottom: '0.3rem' }}>Choose a service</div>
                    <div style={{ fontSize: '0.82rem', color: '#999', marginBottom: '1.1rem', lineHeight: 1.5 }}>Select what you'd like to book.</div>

                    {catalogue.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa', fontSize: '0.85rem', background: '#faf9fc', borderRadius: 10 }}>
                        No services available for online booking right now.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {catalogue.map(svc => (
                          <button key={svc.id} onClick={() => { setSelectedService(svc); setStep(2) }}
                            style={{ textAlign: 'left', padding: '0.9rem 1.1rem', border: `1.5px solid ${selectedService?.id === svc.id ? '#5e3b87' : 'rgba(94,59,135,0.12)'}`, borderRadius: 12, background: selectedService?.id === svc.id ? '#f5f3ff' : 'white', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1a1a1a', marginBottom: svc.description ? '0.2rem' : 0 }}>{svc.name}</div>
                                {svc.description && <div style={{ fontSize: '0.78rem', color: '#888', lineHeight: 1.4 }}>{svc.description}</div>}
                              </div>
                              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                {priceLabel(svc) && <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5e3b87', fontFamily: "'Syne', sans-serif" }}>{priceLabel(svc)}</div>}
                                {svc.duration_minutes && <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: '0.1rem' }}>{svc.duration_minutes} min</div>}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Step 2: Date ─────────────────────────────────────────── */}
                {step === 2 && (
                  <div>
                    <button onClick={() => { if (isRescheduling) { setRescheduleApt(null); setMode('manage') } else setStep(1) }}
                      style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '0.8rem', cursor: 'pointer', padding: '0 0 0.75rem', fontFamily: "'DM Sans', sans-serif" }}>← Back</button>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#1a1a1a', marginBottom: '0.3rem' }}>Choose a date</div>
                    <div style={{ fontSize: '0.82rem', color: '#999', marginBottom: '1.1rem', lineHeight: 1.5 }}>
                      {selectedService?.name} · {selectedService?.duration_minutes || 60} min
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.35rem', marginBottom: '1.25rem' }}>
                      {DAYS_SHORT.map(d => (
                        <div key={d} style={{ textAlign: 'center', fontSize: '0.6rem', fontWeight: 700, color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.06em', paddingBottom: '0.3rem' }}>{d}</div>
                      ))}
                      {days.map(day => {
                        const dow = day.getDay()
                        const hasSchedule = schedules.some(s => s.day_of_week === dow && s.active)
                        const isSelected = selectedDate && sameDay(day, selectedDate)
                        return (
                          <button key={day.toISOString()} disabled={!hasSchedule}
                            onClick={() => { setSelectedDate(day); setStep(3) }}
                            style={{ aspectRatio: '1', borderRadius: 8, border: isSelected ? '2px solid #5e3b87' : '1px solid transparent', background: isSelected ? '#5e3b87' : hasSchedule ? '#f5f3ff' : '#f9f9f9', color: isSelected ? 'white' : hasSchedule ? '#5e3b87' : '#ccc', fontWeight: isSelected ? 700 : 500, fontSize: '0.8rem', cursor: hasSchedule ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, padding: '0.2rem', transition: 'background 0.12s' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{day.getDate()}</span>
                            <span style={{ fontSize: '0.55rem', opacity: 0.65 }}>{day.toLocaleDateString('en-GB', { month: 'short' })}</span>
                          </button>
                        )
                      })}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#bbb', textAlign: 'center' }}>Shaded dates have availability</div>
                  </div>
                )}

                {/* ── Step 3: Time ─────────────────────────────────────────── */}
                {step === 3 && (
                  <div>
                    <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '0.8rem', cursor: 'pointer', padding: '0 0 0.75rem', fontFamily: "'DM Sans', sans-serif" }}>← Back</button>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#1a1a1a', marginBottom: '0.3rem' }}>Choose a time</div>
                    <div style={{ fontSize: '0.82rem', color: '#999', marginBottom: '1.1rem' }}>
                      {selectedDate?.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>

                    {slots.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', background: '#faf9fc', borderRadius: 10 }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>😔</div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1a1a1a', marginBottom: '0.25rem' }}>No availability this day</div>
                        <div style={{ fontSize: '0.78rem', color: '#aaa' }}>Please choose another date.</div>
                        <button onClick={() => setStep(2)} style={{ marginTop: '1rem', padding: '0.5rem 1.25rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: 8, background: 'white', color: '#5e3b87', fontSize: '0.8rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                          Back to dates
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
                          {slots.map(slot => {
                            const isSelected = selectedSlot?.key === slot.key
                            return (
                              <button key={slot.key} onClick={() => setSelectedSlot(slot)}
                                style={{ padding: '0.7rem 0.5rem', borderRadius: 10, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.875rem', textAlign: 'center', border: isSelected ? '2px solid #5e3b87' : '1.5px solid rgba(94,59,135,0.15)', background: isSelected ? '#5e3b87' : '#f5f3ff', color: isSelected ? 'white' : '#5e3b87', cursor: 'pointer', transition: 'all 0.12s' }}>
                                {slot.label}
                              </button>
                            )
                          })}
                        </div>
                        <button onClick={() => selectedSlot && (isRescheduling ? submitReschedule() : setStep(4))}
                          disabled={!selectedSlot || rescheduling}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: 10, border: 'none', background: selectedSlot ? '#f0a500' : '#f5d98a', color: selectedSlot ? '#1a0533' : '#7a5c1a', fontWeight: 700, fontSize: '0.9rem', cursor: selectedSlot ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif" }}>
                          {rescheduling ? 'Saving…' : isRescheduling ? 'Confirm new time →' : 'Continue →'}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* ── Step 4: Details ──────────────────────────────────────── */}
                {step === 4 && (
                  <div>
                    <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '0.8rem', cursor: 'pointer', padding: '0 0 0.75rem', fontFamily: "'DM Sans', sans-serif" }}>← Back</button>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#1a1a1a', marginBottom: '0.3rem' }}>Your details</div>

                    <div style={{ background: '#f5f3ff', border: '1px solid rgba(94,59,135,0.15)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#5e3b87', marginBottom: '0.2rem' }}>{selectedService?.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#888', lineHeight: 1.5 }}>
                        {selectedDate?.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at {selectedSlot?.label}
                        {selectedService?.duration_minutes && ` · ${selectedService.duration_minutes} min`}
                        {priceLabel(selectedService) && ` · ${priceLabel(selectedService)}`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                      {[
                        { key: 'name',  label: 'Full name',        type: 'text',  required: true,  placeholder: 'Your name' },
                        { key: 'phone', label: 'Phone number',     type: 'tel',   required: true,  placeholder: '+44 7700 000000' },
                        { key: 'email', label: 'Email (optional)', type: 'email', required: false, placeholder: 'you@example.com' },
                      ].map(f => (
                        <div key={f.key}>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem', fontFamily: "'DM Sans', sans-serif" }}>
                            {f.label}{f.required && <span style={{ color: '#ef4444' }}> *</span>}
                          </label>
                          <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                            style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid rgba(94,59,135,0.18)', borderRadius: 10, fontSize: '0.9rem', color: '#1a1a1a', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', background: 'white' }} />
                        </div>
                      ))}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem', fontFamily: "'DM Sans', sans-serif" }}>Notes (optional)</label>
                        <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Anything useful for your appointment…" rows={2}
                          style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid rgba(94,59,135,0.18)', borderRadius: 10, fontSize: '0.875rem', color: '#1a1a1a', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', resize: 'none', lineHeight: 1.5 }} />
                      </div>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: '#bbb', marginBottom: '1rem', lineHeight: 1.55 }}>
                      By confirming you agree that {tenant?.business_name} may contact you about this booking.
                      {tenant?.cancel_cutoff_hrs > 0 && ` Cancellations must be made at least ${tenant.cancel_cutoff_hrs} hours before your appointment.`}
                    </div>

                    <button onClick={submitBooking} disabled={submitting || !form.name.trim() || !form.phone.trim()}
                      style={{ width: '100%', padding: '0.8rem', borderRadius: 10, border: 'none', background: submitting || !form.name.trim() || !form.phone.trim() ? '#f5d98a' : '#f0a500', color: submitting || !form.name.trim() || !form.phone.trim() ? '#7a5c1a' : '#1a0533', fontWeight: 700, fontSize: '0.9375rem', cursor: submitting || !form.name.trim() || !form.phone.trim() ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                      {submitting ? 'Confirming…' : 'Confirm booking'}
                    </button>
                  </div>
                )}

                {/* ── Step 5: Confirmed ────────────────────────────────────── */}
                {step === 5 && (
                  <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', border: '2px solid rgba(61,184,122,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: '1.75rem' }}>✓</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.25rem', color: '#1a1a1a', marginBottom: '0.4rem' }}>Booking confirmed</div>
                    <div style={{ fontSize: '0.875rem', color: '#666', lineHeight: 1.65, marginBottom: '1.5rem' }}>
                      {tenant?.business_name} will be in touch to confirm your appointment.
                    </div>

                    <div style={{ background: '#f5f3ff', border: '1px solid rgba(94,59,135,0.15)', borderRadius: 12, padding: '1rem 1.25rem', textAlign: 'left', marginBottom: '1.5rem' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Your booking</div>
                      <div style={{ fontWeight: 700, color: '#5e3b87', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{selectedService?.name}</div>
                      <div style={{ fontSize: '0.82rem', color: '#555', lineHeight: 1.6 }}>
                        {selectedDate?.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at {selectedSlot?.label}<br />
                        {form.name}{form.phone && ` · ${form.phone}`}
                      </div>
                      {bookingRef && (
                        <div style={{ marginTop: '0.65rem', fontSize: '0.72rem', color: '#aaa' }}>
                          Reference: <span style={{ fontFamily: 'monospace', letterSpacing: '0.08em', color: '#5e3b87' }}>{bookingRef}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#aaa', lineHeight: 1.6, marginBottom: '0.5rem' }}>
                      To cancel or reschedule, return to this page and use "Manage booking".
                    </div>

                    {tenant?.business_phone && (
                      <div style={{ fontSize: '0.8rem', color: '#aaa', lineHeight: 1.6 }}>
                        Questions? Call{' '}
                        <a href={`tel:${tenant.business_phone}`} style={{ color: '#5e3b87', fontWeight: 600, textDecoration: 'none' }}>{tenant.business_phone}</a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.7rem', color: '#ccc', fontFamily: "'DM Sans', sans-serif" }}>
          Booking powered by{' '}
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#bbb' }}>Qerxel</span>
        </div>
      </div>

      {/* ── AI Advisor Widget ─────────────────────────────────────────────── */}
      {catalogue.length > 0 && (
        <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 1200, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>

          {/* Chat panel */}
          {aiOpen && (
            <div style={{ width: 340, background: 'white', borderRadius: 18, boxShadow: '0 8px 40px rgba(94,59,135,0.18), 0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 420 }}>
              {/* Panel header */}
              <div style={{ background: 'linear-gradient(135deg, #3a2057 0%, #5e3b87 100%)', padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: 'white' }}>Ask our AI</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', marginTop: '0.1rem' }}>{tenant?.business_name}</div>
                </div>
                <button onClick={() => setAiOpen(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: 'white', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {aiMessages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '82%', padding: '0.55rem 0.8rem', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: m.role === 'user' ? '#5e3b87' : '#f5f3ff',
                      color: m.role === 'user' ? 'white' : '#1a1a1a',
                      fontSize: '0.82rem', lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif",
                    }}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ padding: '0.55rem 0.85rem', borderRadius: '14px 14px 14px 4px', background: '#f5f3ff', fontSize: '0.82rem', color: '#aaa', fontFamily: "'DM Sans', sans-serif" }}>
                      Thinking…
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(94,59,135,0.08)', display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <input
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendAiMessage()}
                  placeholder="Ask about services…"
                  style={{ flex: 1, padding: '0.55rem 0.75rem', border: '1.5px solid rgba(94,59,135,0.18)', borderRadius: 10, fontSize: '0.82rem', outline: 'none', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a' }}
                />
                <button onClick={sendAiMessage} disabled={!aiInput.trim() || aiLoading}
                  style={{ padding: '0.55rem 0.9rem', borderRadius: 10, border: 'none', background: aiInput.trim() && !aiLoading ? '#5e3b87' : '#e9e3f3', color: aiInput.trim() && !aiLoading ? 'white' : '#aaa', fontWeight: 700, fontSize: '0.8rem', cursor: aiInput.trim() && !aiLoading ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
                  →
                </button>
              </div>
            </div>
          )}

          {/* Toggle button */}
          <button onClick={() => aiOpen ? setAiOpen(false) : openAi()}
            style={{ background: aiOpen ? '#3a2057' : 'linear-gradient(135deg, #5e3b87 0%, #7c4fa0 100%)', color: 'white', border: 'none', borderRadius: 50, padding: '0.65rem 1.1rem', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 4px 18px rgba(94,59,135,0.35)', display: 'flex', alignItems: 'center', gap: '0.45rem', whiteSpace: 'nowrap', transition: 'background 0.15s' }}>
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>💬</span>
            {aiOpen ? 'Close' : 'Ask our AI'}
          </button>
        </div>
      )}
    </div>
  )
}
