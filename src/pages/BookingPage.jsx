import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
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

// Parse "09:00" into { h, m }
function parseTime(str) {
  const [h, m] = (str || '09:00').split(':').map(Number)
  return { h, m }
}

// Build a Date for a given day + time string
function dayAt(date, timeStr) {
  const { h, m } = parseTime(timeStr)
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return d
}

// Generate next N calendar days (starting tomorrow)
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

// Slot interval in minutes
const SLOT_INTERVAL = 30

// Generate available slots for a given day, given schedules + existing appointments + service duration + buffer
function generateSlots({ date, schedules, appointments, durationMins, bufferMins }) {
  const slots = []
  const dayOfWeek = date.getDay()

  // Collect working windows across all staff
  const windows = schedules
    .filter(s => s.day_of_week === dayOfWeek && s.active)
    .map(s => ({
      staffId: s.staff_profile_id,
      start: dayAt(date, s.start_time),
      end: dayAt(date, s.end_time),
    }))

  if (!windows.length) return []

  // For each 30-min interval across all windows, check if any staff member is free
  windows.forEach(({ staffId, start, end }) => {
    let cursor = new Date(start)
    while (cursor < end) {
      const slotEnd = addMinutes(cursor, durationMins)
      const processingEnd = addMinutes(slotEnd, bufferMins)
      if (processingEnd > end) break

      // Check conflicts with this staff member's appointments
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

// ─── Step components ──────────────────────────────────────────────────────────

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
  const [tenant, setTenant]           = useState(null)
  const [catalogue, setCatalogue]     = useState([])
  const [schedules, setSchedules]     = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  // Booking state
  const [step, setStep]               = useState(1) // 1=service 2=date 3=time 4=details 5=confirmed
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate]       = useState(null)
  const [selectedSlot, setSelectedSlot]       = useState(null)
  const [slots, setSlots]                     = useState([])
  const [form, setForm]                       = useState({ name: '', phone: '', email: '', notes: '' })
  const [submitting, setSubmitting]           = useState(false)
  const [bookingRef, setBookingRef]           = useState(null)

  const days = nextDays(21)

  // ── Load tenant + catalogue + schedules ──────────────────────────────────────
  useEffect(() => {
    if (!tenantId) return
    const load = async () => {
      try {
        const [tenantRes, catRes, schedRes] = await Promise.all([
          supabase.from('tenants')
            .select('business_name, business_phone, business_email, business_address, booking_link, opening_hours, cancel_cutoff_hrs, booking_buffer_mins')
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

  // ── Load appointments for selected date range ─────────────────────────────────
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
      .then(({ data }) => {
        setAppointments(data || [])
      })
  }, [tenantId, selectedDate])

  // ── Generate slots when service + date + appointments ready ─────────────────
  useEffect(() => {
    if (!selectedService || !selectedDate || !schedules.length) { setSlots([]); return }
    const durationMins = selectedService.duration_minutes || 60
    const bufferMins   = tenant?.booking_buffer_mins ?? 15
    const generated = generateSlots({ date: selectedDate, schedules, appointments, durationMins, bufferMins })
    setSlots(generated)
    setSelectedSlot(null)
  }, [selectedService, selectedDate, appointments, schedules, tenant])

  // ── Submit booking ────────────────────────────────────────────────────────────
  const submitBooking = async () => {
    if (!selectedSlot || !selectedService || !form.name.trim() || !form.phone.trim()) return
    setSubmitting(true)
    try {
      const start = selectedSlot.time
      const end   = addMinutes(start, selectedService.duration_minutes || 60)
      const processingEnd = selectedService.processing_minutes
        ? addMinutes(end, selectedService.processing_minutes)
        : null

      const { data, error: err } = await supabase.from('appointments').insert({
        tenant_id:            tenantId,
        staff_profile_id:     selectedSlot.staffId || null,
        title:                `${selectedService.name} — ${form.name.trim()}`,
        description:          form.notes.trim() || null,
        start_time:           start.toISOString(),
        end_time:             end.toISOString(),
        processing_end_time:  processingEnd?.toISOString() || null,
        service_id:           selectedService.id,
        status:               'provisional',
        appointment_type:     selectedService.name,
        client_notes:         form.notes.trim() || null,
        created_from:         'customer_booking',
      }).select().maybeSingle()

      if (err) throw err
      setBookingRef(data?.id?.slice(0, 8).toUpperCase() || 'CONFIRMED')
      setStep(5)
    } catch {
      alert('Could not confirm your booking. Please try again or call us directly.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

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

          {/* Progress bar */}
          {step < 5 && (
            <div style={{ padding: '1.25rem 1.5rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {steps.map((s, i) => (
                  <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0, gap: '0.5rem' }}>
                    <StepDot n={s.n} active={step === s.n} done={step > s.n} />
                    {!sameDay(new Date(), new Date()) && i < steps.length - 1 && (
                      <div style={{ flex: 1, height: 2, borderRadius: 2, background: step > s.n ? '#3db87a' : '#ede8f5' }} />
                    )}
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

            {/* ── Step 1: Service ─────────────────────────────────────────── */}
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
                      <button
                        key={svc.id}
                        onClick={() => { setSelectedService(svc); setStep(2) }}
                        style={{
                          textAlign: 'left', padding: '0.9rem 1.1rem',
                          border: `1.5px solid ${selectedService?.id === svc.id ? '#5e3b87' : 'rgba(94,59,135,0.12)'}`,
                          borderRadius: 12,
                          background: selectedService?.id === svc.id ? '#f5f3ff' : 'white',
                          cursor: 'pointer',
                          transition: 'border-color 0.15s, background 0.15s',
                        }}
                      >
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

            {/* ── Step 2: Date ────────────────────────────────────────────── */}
            {step === 2 && (
              <div>
                <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '0.8rem', cursor: 'pointer', padding: '0 0 0.75rem', fontFamily: "'DM Sans', sans-serif" }}>← Back</button>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#1a1a1a', marginBottom: '0.3rem' }}>Choose a date</div>
                <div style={{ fontSize: '0.82rem', color: '#999', marginBottom: '1.1rem', lineHeight: 1.5 }}>
                  {selectedService?.name} · {selectedService?.duration_minutes || 60} min
                </div>

                {/* Date grid — 21 days, 7 per row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.35rem', marginBottom: '1.25rem' }}>
                  {DAYS_SHORT.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '0.6rem', fontWeight: 700, color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.06em', paddingBottom: '0.3rem' }}>{d}</div>
                  ))}
                  {days.map(day => {
                    const dow = day.getDay()
                    const hasSchedule = schedules.some(s => s.day_of_week === dow && s.active)
                    const isSelected = selectedDate && sameDay(day, selectedDate)
                    return (
                      <button
                        key={day.toISOString()}
                        disabled={!hasSchedule}
                        onClick={() => { setSelectedDate(day); setStep(3) }}
                        style={{
                          aspectRatio: '1', borderRadius: 8, border: isSelected ? '2px solid #5e3b87' : '1px solid transparent',
                          background: isSelected ? '#5e3b87' : hasSchedule ? '#f5f3ff' : '#f9f9f9',
                          color: isSelected ? 'white' : hasSchedule ? '#5e3b87' : '#ccc',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '0.8rem', cursor: hasSchedule ? 'pointer' : 'not-allowed',
                          fontFamily: "'DM Sans', sans-serif",
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                          padding: '0.2rem',
                          transition: 'background 0.12s',
                        }}
                      >
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{day.getDate()}</span>
                        <span style={{ fontSize: '0.55rem', opacity: 0.65 }}>{day.toLocaleDateString('en-GB', { month: 'short' })}</span>
                      </button>
                    )
                  })}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#bbb', textAlign: 'center' }}>Shaded dates have availability</div>
              </div>
            )}

            {/* ── Step 3: Time ────────────────────────────────────────────── */}
            {step === 3 && (
              <div>
                <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '0.8rem', cursor: 'pointer', padding: '0 0 0.75rem', fontFamily: "'DM Sans', sans-serif" }}>← Back</button>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#1a1a1a', marginBottom: '0.3rem' }}>Choose a time</div>
                <div style={{ fontSize: '0.82rem', color: '#999', marginBottom: '1.1rem', lineHeight: 1.5 }}>
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
                          <button
                            key={slot.key}
                            onClick={() => setSelectedSlot(slot)}
                            style={{
                              padding: '0.7rem 0.5rem', borderRadius: 10, fontFamily: "'Syne', sans-serif",
                              fontWeight: 700, fontSize: '0.875rem', textAlign: 'center',
                              border: isSelected ? '2px solid #5e3b87' : '1.5px solid rgba(94,59,135,0.15)',
                              background: isSelected ? '#5e3b87' : '#f5f3ff',
                              color: isSelected ? 'white' : '#5e3b87',
                              cursor: 'pointer',
                              transition: 'all 0.12s',
                            }}
                          >
                            {slot.label}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      onClick={() => selectedSlot && setStep(4)}
                      disabled={!selectedSlot}
                      style={{
                        width: '100%', padding: '0.75rem', borderRadius: 10, border: 'none',
                        background: selectedSlot ? '#f0a500' : '#f5d98a',
                        color: selectedSlot ? '#1a0533' : '#7a5c1a',
                        fontWeight: 700, fontSize: '0.9rem', cursor: selectedSlot ? 'pointer' : 'not-allowed',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      Continue →
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── Step 4: Details ─────────────────────────────────────────── */}
            {step === 4 && (
              <div>
                <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '0.8rem', cursor: 'pointer', padding: '0 0 0.75rem', fontFamily: "'DM Sans', sans-serif" }}>← Back</button>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#1a1a1a', marginBottom: '0.3rem' }}>Your details</div>

                {/* Booking summary */}
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
                    { key: 'name',  label: 'Full name',     type: 'text',  required: true,  placeholder: 'Your name' },
                    { key: 'phone', label: 'Phone number',  type: 'tel',   required: true,  placeholder: '+44 7700 000000' },
                    { key: 'email', label: 'Email (optional)', type: 'email', required: false, placeholder: 'you@example.com' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem', fontFamily: "'DM Sans', sans-serif" }}>
                        {f.label}{f.required && <span style={{ color: '#ef4444' }}> *</span>}
                      </label>
                      <input
                        type={f.type}
                        value={form[f.key]}
                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        style={{
                          width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid rgba(94,59,135,0.18)',
                          borderRadius: 10, fontSize: '0.9rem', color: '#1a1a1a', outline: 'none',
                          fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box',
                          background: 'white', transition: 'border-color 0.15s',
                        }}
                      />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem', fontFamily: "'DM Sans', sans-serif" }}>Notes (optional)</label>
                    <textarea
                      value={form.notes}
                      onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                      placeholder="Anything useful for your appointment…"
                      rows={2}
                      style={{
                        width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid rgba(94,59,135,0.18)',
                        borderRadius: 10, fontSize: '0.875rem', color: '#1a1a1a', outline: 'none',
                        fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box',
                        resize: 'none', lineHeight: 1.5,
                      }}
                    />
                  </div>
                </div>

                <div style={{ fontSize: '0.72rem', color: '#bbb', marginBottom: '1rem', lineHeight: 1.55 }}>
                  By confirming you agree that {tenant?.business_name} may contact you about this booking.
                  {tenant?.cancel_cutoff_hrs && ` Cancellations must be made at least ${tenant.cancel_cutoff_hrs} hours before your appointment.`}
                </div>

                <button
                  onClick={submitBooking}
                  disabled={submitting || !form.name.trim() || !form.phone.trim()}
                  style={{
                    width: '100%', padding: '0.8rem', borderRadius: 10, border: 'none',
                    background: submitting || !form.name.trim() || !form.phone.trim() ? '#f5d98a' : '#f0a500',
                    color: submitting || !form.name.trim() || !form.phone.trim() ? '#7a5c1a' : '#1a0533',
                    fontWeight: 700, fontSize: '0.9375rem',
                    cursor: submitting || !form.name.trim() || !form.phone.trim() ? 'not-allowed' : 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {submitting ? 'Confirming…' : 'Confirm booking'}
                </button>
              </div>
            )}

            {/* ── Step 5: Confirmed ───────────────────────────────────────── */}
            {step === 5 && (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', border: '2px solid rgba(61,184,122,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: '1.75rem' }}>
                  ✓
                </div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.25rem', color: '#1a1a1a', marginBottom: '0.4rem' }}>
                  Booking confirmed
                </div>
                <div style={{ fontSize: '0.875rem', color: '#666', lineHeight: 1.65, marginBottom: '1.5rem' }}>
                  {tenant?.business_name} will be in touch to confirm your appointment.
                </div>

                <div style={{ background: '#f5f3ff', border: '1px solid rgba(94,59,135,0.15)', borderRadius: 12, padding: '1rem 1.25rem', textAlign: 'left', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Your booking</div>
                  <div style={{ fontWeight: 700, color: '#5e3b87', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{selectedService?.name}</div>
                  <div style={{ fontSize: '0.82rem', color: '#555', lineHeight: 1.6 }}>
                    {selectedDate?.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at {selectedSlot?.label}<br />
                    {form.name}
                    {form.phone && ` · ${form.phone}`}
                  </div>
                  {bookingRef && (
                    <div style={{ marginTop: '0.65rem', fontSize: '0.72rem', color: '#aaa' }}>
                      Reference: <span style={{ fontFamily: 'monospace', letterSpacing: '0.08em', color: '#5e3b87' }}>{bookingRef}</span>
                    </div>
                  )}
                </div>

                {tenant?.business_phone && (
                  <div style={{ fontSize: '0.8rem', color: '#aaa', lineHeight: 1.6 }}>
                    Questions? Call us on{' '}
                    <a href={`tel:${tenant.business_phone}`} style={{ color: '#5e3b87', fontWeight: 600, textDecoration: 'none' }}>
                      {tenant.business_phone}
                    </a>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Powered by footer */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.7rem', color: '#ccc', fontFamily: "'DM Sans', sans-serif" }}>
          Booking powered by{' '}
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#bbb' }}>Qerxel</span>
        </div>
      </div>
    </div>
  )
}
