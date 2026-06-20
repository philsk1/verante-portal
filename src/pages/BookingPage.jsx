import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const SLOT_INTERVAL = 30
const DAYS_AHEAD = 21

function addMinutes(date, mins) { return new Date(date.getTime() + mins * 60000) }
function toTimeStr(date) { return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }
function parseTime(str) { const [h, m] = (str || '09:00').split(':').map(Number); return { h, m } }
function dayAt(date, timeStr) { const { h, m } = parseTime(timeStr); const d = new Date(date); d.setHours(h, m, 0, 0); return d }
function darkenHex(hex) {
  const h = hex.replace('#', '')
  return '#' + [0, 2, 4].map(i => Math.max(0, parseInt(h.slice(i, i + 2), 16) - 50).toString(16).padStart(2, '0')).join('')
}
function nextDays(n) {
  const days = [], today = new Date(); today.setHours(0,0,0,0)
  for (let i = 1; i <= n; i++) { const d = new Date(today); d.setDate(today.getDate() + i); days.push(d) }
  return days
}
function hasOverlapConflict(newStart, newEnd, aptStart, aptEnd, bufferMins, overlapMins) {
  const ns = newStart instanceof Date ? newStart.getTime() : newStart
  const ne = newEnd instanceof Date ? newEnd.getTime() : newEnd
  const as = aptStart instanceof Date ? aptStart.getTime() : aptStart
  const ae = aptEnd instanceof Date ? aptEnd.getTime() : aptEnd
  const overlapMs = Math.max(0, Math.min(ne, ae) - Math.max(ns, as))
  const allowedMs = (overlapMins || 0) * 60000
  if (overlapMs > allowedMs) return true
  if (overlapMs > 0) return false
  return ns < ae + bufferMins * 60000 && ne > as
}
function generateSlots({ date, schedules, appointments, durationMins, bufferMins, overlapMins = 0, filterStaffId = null }) {
  const slots = []
  const dayOfWeek = date.getDay()
  const windows = schedules
    .filter(s => s.day_of_week === dayOfWeek && s.active && (!filterStaffId || s.staff_profile_id === filterStaffId))
    .map(s => ({ staffId: s.staff_profile_id, start: dayAt(date, s.start_time), end: dayAt(date, s.end_time) }))
  if (!windows.length) return []
  windows.forEach(({ staffId, start, end }) => {
    let cursor = new Date(start)
    while (cursor < end) {
      const slotEnd = addMinutes(cursor, durationMins)
      if (addMinutes(slotEnd, bufferMins) > end) break
      const conflict = appointments.some(apt => {
        if (apt.staff_profile_id && staffId && apt.staff_profile_id !== staffId) return false
        return hasOverlapConflict(cursor, slotEnd, new Date(apt.start_time), new Date(apt.end_time), bufferMins, overlapMins)
      })
      if (!conflict) {
        const key = `${cursor.toISOString()}::${staffId}`
        if (!slots.find(s => s.key === key)) slots.push({ key, time: new Date(cursor), label: toTimeStr(cursor), staffId })
      }
      cursor = addMinutes(cursor, SLOT_INTERVAL)
    }
  })
  return slots.sort((a, b) => a.time - b.time)
}

const StepDot = ({ n, active, done, accent = '#5e3b87' }) => (
  <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? '#3db87a' : active ? accent : '#e9e3f3', color: done || active ? 'white' : '#aaa', fontSize: '0.72rem', fontWeight: 700, fontFamily: "'DM Sans', sans-serif", transition: 'background 0.2s' }}>
    {done ? '✓' : n}
  </div>
)

const inBtn = { width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid rgba(94,59,135,0.18)', borderRadius: 10, fontSize: '0.9rem', color: '#1a1a1a', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', background: 'white' }
const lbl   = { display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.3rem', fontFamily: "'DM Sans', sans-serif" }
function priceLabel(svc) {
  if (!svc.price_from && !svc.price_to) return null
  if (svc.price_from && svc.price_to) return `£${svc.price_from}–£${svc.price_to}`
  return `From £${svc.price_from || svc.price_to}`
}

function MyBookingsTab({ myBookings, myBookingsLoading, accent, tenant, setMode }) {
  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#1a1a1a', marginBottom: '0.25rem' }}>My bookings</div>
      <div style={{ fontSize: '0.82rem', color: '#999', marginBottom: '1.25rem' }}>Your upcoming appointments at {tenant?.business_name}.</div>
      {myBookingsLoading && <div style={{ color: '#aaa', fontSize: '0.85rem' }}>Loading…</div>}
      {myBookings !== null && !myBookingsLoading && myBookings.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', background: '#faf9fc', borderRadius: 12, fontSize: '0.85rem', color: '#aaa' }}>
          No upcoming appointments.<br />
          <button onClick={() => setMode('book')} style={{ marginTop: '0.75rem', color: accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', fontFamily: "'DM Sans', sans-serif" }}>Make a booking →</button>
        </div>
      )}
      {myBookings && myBookings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {myBookings.map(apt => {
            const start = new Date(apt.start_time)
            return (
              <div key={apt.id} style={{ border: '1px solid rgba(94,59,135,0.12)', borderRadius: 12, padding: '0.9rem 1.1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1a1a1a', marginBottom: '0.2rem' }}>{apt.appointment_type || apt.title}</div>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>{start.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at {toTimeStr(start)}</div>
                {apt.cancel_token && <a href={`/manage-booking/${apt.cancel_token}`} style={{ display: 'inline-block', marginTop: '0.65rem', fontSize: '0.78rem', color: '#ef4444', textDecoration: 'none', fontWeight: 500 }}>Cancel or reschedule →</a>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StepTeam({ staffProfiles, selectedStaff, accent, setSelectedStaff, setStep }) {
  return (
    <div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#1a1a1a', marginBottom: '0.3rem' }}>Who would you like to see?</div>
      <div style={{ fontSize: '0.82rem', color: '#999', marginBottom: '1.1rem', lineHeight: 1.5 }}>Choose a team member, or let us pick the first available slot.</div>
      <div style={{ display: 'grid', gridTemplateColumns: staffProfiles.length > 1 ? '1fr 1fr' : '1fr', gap: '0.65rem' }}>
        <button onClick={() => { setSelectedStaff(null); setStep(2) }} style={{ textAlign: 'left', padding: '0.9rem 1rem', border: `1.5px solid ${selectedStaff === null ? accent : 'rgba(94,59,135,0.12)'}`, borderRadius: 12, background: selectedStaff === null ? accent + '10' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#ede8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>✨</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a' }}>No preference</div>
            <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: 2 }}>First available slot</div>
          </div>
        </button>
        {staffProfiles.map(sp => {
          const isSelected = selectedStaff?.id === sp.id
          const initials = (sp.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
          return (
            <button key={sp.id} onClick={() => { setSelectedStaff(sp); setStep(2) }} style={{ textAlign: 'left', padding: '0.9rem 1rem', border: `1.5px solid ${isSelected ? accent : 'rgba(94,59,135,0.12)'}`, borderRadius: 12, background: isSelected ? accent + '10' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: sp.colour || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>{initials}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a' }}>{sp.name}</div>
                {sp.role && <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: 2 }}>{sp.role}</div>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StepService({ selectedStaff, categories, serviceCategory, catalogue, filteredCatalogue, serviceSearch, selectedService, accent, setStep, setServiceCategory, setServiceSearch, setSelectedService }) {
  return (
    <div>
      <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '0.8rem', cursor: 'pointer', padding: '0 0 0.75rem', fontFamily: "'DM Sans', sans-serif" }}>← Back</button>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#1a1a1a', marginBottom: '0.25rem' }}>Choose a service</div>
      {selectedStaff && <div style={{ fontSize: '0.78rem', color: accent, fontWeight: 600, marginBottom: '0.75rem' }}>with {selectedStaff.name}</div>}
      {!selectedStaff && selectedStaff !== undefined && <div style={{ fontSize: '0.78rem', color: '#aaa', marginBottom: '0.75rem' }}>No preference selected</div>}
      {categories.length > 0 && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
          {['all', ...categories].map(cat => (
            <button key={cat} onClick={() => setServiceCategory(cat)} style={{ padding: '0.3rem 0.75rem', borderRadius: 999, border: `1px solid ${serviceCategory === cat ? accent : 'rgba(94,59,135,0.18)'}`, background: serviceCategory === cat ? accent : 'white', color: serviceCategory === cat ? 'white' : '#555', fontSize: '0.78rem', fontWeight: serviceCategory === cat ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.12s' }}>
              {cat === 'all' ? 'All services' : cat}
            </button>
          ))}
        </div>
      )}
      {catalogue.length > 5 && (
        <div style={{ position: 'relative', marginBottom: '0.85rem' }}>
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', color: '#bbb', pointerEvents: 'none' }}>🔍</span>
          <input type="search" value={serviceSearch} onChange={e => setServiceSearch(e.target.value)} placeholder="Search services…" style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem', border: '1.5px solid rgba(94,59,135,0.18)', borderRadius: 10, fontSize: '0.875rem', color: '#1a1a1a', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', background: 'white' }} />
        </div>
      )}
      {filteredCatalogue.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa', fontSize: '0.85rem', background: '#faf9fc', borderRadius: 10 }}>
          {catalogue.length === 0 ? 'No services available right now.' : 'No services match your search.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredCatalogue.map(svc => (
            <button key={svc.id} onClick={() => { setSelectedService(svc); setStep(3) }} style={{ textAlign: 'left', padding: '0.85rem 1rem', border: `1.5px solid ${selectedService?.id === svc.id ? accent : 'rgba(94,59,135,0.12)'}`, borderRadius: 11, background: selectedService?.id === svc.id ? accent + '10' : 'white', cursor: 'pointer', transition: 'border-color 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a', marginBottom: svc.description ? '0.15rem' : 0 }}>{svc.name}</div>
                  {svc.description && <div style={{ fontSize: '0.76rem', color: '#888', lineHeight: 1.4 }}>{svc.description}</div>}
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  {priceLabel(svc) && <div style={{ fontSize: '0.8rem', fontWeight: 700, color: accent, fontFamily: "'Syne', sans-serif" }}>{priceLabel(svc)}</div>}
                  {svc.duration_minutes && <div style={{ fontSize: '0.7rem', color: '#bbb', marginTop: '0.1rem' }}>{svc.duration_minutes} min</div>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function StepSlots({ selectedService, selectedStaff, slotsLoading, slotsByDay, selectedSlot, schedules, tenant, accent, clientUser, setStep, setSelectedSlot }) {
  return (
    <div>
      <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '0.8rem', cursor: 'pointer', padding: '0 0 0.75rem', fontFamily: "'DM Sans', sans-serif" }}>← Back</button>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#1a1a1a', marginBottom: '0.25rem' }}>Choose a date & time</div>
      <div style={{ fontSize: '0.78rem', color: '#999', marginBottom: '1.1rem' }}>
        {selectedService?.name} · {selectedService?.duration_minutes || 60} min{selectedStaff ? ` · ${selectedStaff.name}` : ''}
      </div>
      {slotsLoading ? (
        <div style={{ padding: '2.5rem', textAlign: 'center', color: '#aaa', fontSize: '0.85rem' }}>Finding available times…</div>
      ) : schedules.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', background: '#faf9fc', borderRadius: 12 }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📅</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1a1a1a', marginBottom: '0.25rem' }}>Online booking not yet available</div>
          {tenant?.business_phone && <a href={`tel:${tenant.business_phone}`} style={{ display: 'inline-block', marginTop: '0.75rem', padding: '0.55rem 1.25rem', background: '#f0a500', color: '#1a0533', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>Call to book: {tenant.business_phone}</a>}
        </div>
      ) : slotsByDay.every(d => d.slots.length === 0) ? (
        <div style={{ padding: '2rem', textAlign: 'center', background: '#faf9fc', borderRadius: 12 }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>😔</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1a1a1a', marginBottom: '0.25rem' }}>No availability in the next {DAYS_AHEAD} days</div>
          <div style={{ fontSize: '0.78rem', color: '#aaa' }}>Please call us or try a different service.</div>
        </div>
      ) : (
        <div>
          {slotsByDay.map(({ day, slots }, idx) => {
            const hasSlots = slots.length > 0
            return (
              <div key={day.toISOString()} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.65rem 0', borderBottom: idx < slotsByDay.length - 1 ? '1px solid rgba(94,59,135,0.06)' : 'none' }}>
                <div style={{ width: 48, flexShrink: 0 }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: hasSlots ? '#999' : '#ddd', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{DAYS[day.getDay()]}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: hasSlots ? '#1a1a1a' : '#e0e0e0', lineHeight: 1.1 }}>{day.getDate()}</div>
                  <div style={{ fontSize: '0.62rem', color: '#ccc' }}>{MONTHS[day.getMonth()]}</div>
                </div>
                <div style={{ flex: 1, paddingTop: '0.15rem' }}>
                  {!hasSlots ? (
                    <div style={{ fontSize: '0.75rem', color: '#e0e0e0' }}>No availability</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {slots.map(slot => {
                        const isSel = selectedSlot?.key === slot.key
                        return (
                          <button key={slot.key} onClick={() => { setSelectedSlot(slot); setStep(clientUser ? 5 : 4) }} style={{ padding: '0.35rem 0.75rem', borderRadius: 7, border: isSel ? `2px solid ${accent}` : `1.5px solid ${accent}35`, background: isSel ? accent : accent + '12', color: isSel ? 'white' : accent, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'Syne', sans-serif", transition: 'all 0.1s' }}>
                            {slot.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StepAuth({ authTab, authName, authPhone, authEmail, authPassword, authLoading, authError, selectedService, selectedSlot, selectedStaff, accent, setStep, setAuthTab, setAuthError, setAuthName, setAuthPhone, setAuthEmail, setAuthPassword, handleSignUp, handleSignIn }) {
  return (
    <div>
      <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '0.8rem', cursor: 'pointer', padding: '0 0 0.75rem', fontFamily: "'DM Sans', sans-serif" }}>← Back</button>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#1a1a1a', marginBottom: '0.25rem' }}>{authTab === 'signup' ? 'Create an account' : 'Sign in to continue'}</div>
      <div style={{ fontSize: '0.82rem', color: '#999', marginBottom: '1.25rem', lineHeight: 1.5 }}>{authTab === 'signup' ? 'A quick account so we can save your booking and let you manage it later.' : 'Welcome back — sign in to confirm your booking.'}</div>
      <div style={{ background: accent + '10', border: `1px solid ${accent}26`, borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: accent }}>{selectedService?.name}</div>
        <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '0.2rem' }}>{selectedSlot?.time.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at {selectedSlot?.label}{selectedStaff ? ` · ${selectedStaff.name}` : ''}</div>
      </div>
      <div style={{ display: 'flex', marginBottom: '1.25rem', border: '1.5px solid rgba(94,59,135,0.15)', borderRadius: 9, overflow: 'hidden' }}>
        {[['signup', 'New client'], ['signin', 'Returning client']].map(([tab, label]) => (
          <button key={tab} onClick={() => { setAuthTab(tab); setAuthError(null) }} style={{ flex: 1, padding: '0.6rem', background: authTab === tab ? accent : 'white', color: authTab === tab ? 'white' : '#888', border: 'none', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s' }}>{label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        {authTab === 'signup' && <>
          <div><label style={lbl}>Full name *</label><input type="text" value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Your name" style={inBtn} /></div>
          <div><label style={lbl}>Phone number *</label><input type="tel" value={authPhone} onChange={e => setAuthPhone(e.target.value)} placeholder="+44 7700 000000" style={inBtn} /></div>
        </>}
        <div><label style={lbl}>Email *</label><input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="you@example.com" style={inBtn} /></div>
        <div><label style={lbl}>Password *</label><input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder={authTab === 'signup' ? 'At least 8 characters' : 'Your password'} onKeyDown={e => e.key === 'Enter' && (authTab === 'signup' ? handleSignUp() : handleSignIn())} style={inBtn} /></div>
      </div>
      {authError && <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.85rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: '0.8rem', color: '#b91c1c' }}>{authError}</div>}
      <button onClick={authTab === 'signup' ? handleSignUp : handleSignIn} disabled={authLoading} style={{ width: '100%', padding: '0.8rem', borderRadius: 10, border: 'none', background: authLoading ? '#f5d98a' : '#f0a500', color: authLoading ? '#7a5c1a' : '#1a0533', fontWeight: 700, fontSize: '0.9375rem', cursor: authLoading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", marginTop: '1.1rem' }}>
        {authLoading ? 'Please wait…' : authTab === 'signup' ? 'Create account & continue →' : 'Sign in & continue →'}
      </button>
      <div style={{ fontSize: '0.72rem', color: '#ccc', marginTop: '0.75rem', lineHeight: 1.55, textAlign: 'center' }}>Your details are used only for this booking and managing future appointments.</div>
    </div>
  )
}

function StepConfirm({ selectedService, selectedSlot, selectedStaff, notes, submitting, tenant, clientUser, accent, setNotes, submitBooking, setStep }) {
  return (
    <div>
      <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '0.8rem', cursor: 'pointer', padding: '0 0 0.75rem', fontFamily: "'DM Sans', sans-serif" }}>← Back</button>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#1a1a1a', marginBottom: '0.3rem' }}>Review & confirm</div>
      <div style={{ background: '#faf9fc', border: '1px solid rgba(94,59,135,0.1)', borderRadius: 12, padding: '1rem 1.1rem', marginBottom: '1.25rem' }}>
        {[
          ['Service', <span key="svc">{selectedService?.name}{priceLabel(selectedService) && <span style={{ fontFamily: "'Syne', sans-serif", color: accent, marginLeft: '0.4rem' }}>{priceLabel(selectedService)}</span>}</span>],
          ...(selectedStaff ? [['With', selectedStaff.name]] : []),
          ['Date & time', `${selectedSlot?.time.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at ${selectedSlot?.label}`],
          ['Name', clientUser?.user_metadata?.full_name || clientUser?.email],
          ['Contact', [clientUser?.user_metadata?.phone, clientUser?.email].filter(Boolean).join(' · ')],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.55rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0, paddingTop: 2 }}>{k}</div>
            <div style={{ fontWeight: 500, fontSize: '0.875rem', color: '#1a1a1a', textAlign: 'right', maxWidth: '65%' }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label style={lbl}>Notes (optional)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything useful for your appointment…" rows={2} style={{ ...inBtn, resize: 'none', lineHeight: 1.5 }} />
      </div>
      {tenant?.cancel_cutoff_hrs > 0 && <div style={{ fontSize: '0.72rem', color: '#bbb', marginBottom: '1rem', lineHeight: 1.55 }}>Cancellations must be made at least {tenant.cancel_cutoff_hrs} hours in advance.</div>}
      <button onClick={submitBooking} disabled={submitting} style={{ width: '100%', padding: '0.8rem', borderRadius: 10, border: 'none', background: submitting ? '#f5d98a' : '#f0a500', color: submitting ? '#7a5c1a' : '#1a0533', fontWeight: 700, fontSize: '0.9375rem', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
        {submitting ? 'Confirming…' : 'Confirm booking'}
      </button>
    </div>
  )
}

function StepDone({ selectedService, selectedSlot, selectedStaff, bookingRef, tenant, accent, setStep, setSelectedService, setSelectedSlot, setSelectedStaff, setNotes, setMode }) {
  return (
    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', border: '2px solid rgba(61,184,122,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: '1.75rem' }}>✓</div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.25rem', color: '#1a1a1a', marginBottom: '0.4rem' }}>Booking confirmed</div>
      <div style={{ fontSize: '0.875rem', color: '#666', lineHeight: 1.65, marginBottom: '1.5rem' }}>{tenant?.business_name} will be in touch to confirm your appointment.</div>
      <div style={{ background: accent + '10', border: `1px solid ${accent}26`, borderRadius: 12, padding: '1rem 1.25rem', textAlign: 'left', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Your booking</div>
        <div style={{ fontWeight: 700, color: accent, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{selectedService?.name}</div>
        <div style={{ fontSize: '0.82rem', color: '#555', lineHeight: 1.6 }}>
          {selectedSlot?.time.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at {selectedSlot?.label}
          {selectedStaff && <><br />with {selectedStaff.name}</>}
          {bookingRef && <><br /><span style={{ fontSize: '0.72rem', color: '#aaa' }}>Ref: <span style={{ fontFamily: 'monospace', letterSpacing: '0.08em', color: accent }}>{bookingRef}</span></span></>}
        </div>
      </div>
      <button onClick={() => { setStep(1); setSelectedService(null); setSelectedSlot(null); setSelectedStaff(undefined); setNotes(''); setMode('mybookings') }} style={{ padding: '0.55rem 1.25rem', border: `1.5px solid ${accent}30`, borderRadius: 8, background: 'white', color: accent, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
        View my bookings
      </button>
      {tenant?.business_phone && <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '0.75rem' }}>Questions? <a href={`tel:${tenant.business_phone}`} style={{ color: accent, fontWeight: 600, textDecoration: 'none' }}>{tenant.business_phone}</a></div>}
    </div>
  )
}

function AiChatPanel({ aiMessages, aiInput, aiLoading, accent, setAiOpen, setAiInput, sendAiMessage }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, width: 300, background: 'white', borderRadius: 16, boxShadow: '0 8px 40px rgba(94,59,135,0.25)', zIndex: 100, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 400 }}>
      <div style={{ background: accent, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: 'white', fontSize: '0.875rem' }}>Ask Q</div>
        <button onClick={() => setAiOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: 0 }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {aiMessages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? accent : '#f5f3fa', color: m.role === 'user' ? 'white' : '#1a1a1a', borderRadius: 10, padding: '0.5rem 0.75rem', fontSize: '0.82rem', lineHeight: 1.5, maxWidth: '85%', fontFamily: "'DM Sans', sans-serif" }}>{m.content}</div>
        ))}
        {aiLoading && <div style={{ alignSelf: 'flex-start', background: '#f5f3fa', borderRadius: 10, padding: '0.5rem 0.75rem', fontSize: '0.82rem', color: '#aaa' }}>…</div>}
      </div>
      <div style={{ borderTop: '1px solid rgba(94,59,135,0.07)', padding: '0.6rem', display: 'flex', gap: '0.4rem' }}>
        <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendAiMessage()} placeholder="Ask a question…" style={{ flex: 1, padding: '0.45rem 0.65rem', border: '1.5px solid rgba(94,59,135,0.15)', borderRadius: 8, fontSize: '0.82rem', outline: 'none', fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a' }} />
        <button onClick={sendAiMessage} disabled={aiLoading || !aiInput.trim()} style={{ padding: '0.45rem 0.75rem', background: accent, color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>→</button>
      </div>
    </div>
  )
}

export default function BookingPage() {
  const { tenantId } = useParams()

  const [tenant, setTenant]             = useState(null)
  const [catalogue, setCatalogue]       = useState([])
  const [staffProfiles, setStaffProfiles] = useState([])
  const [schedules, setSchedules]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  const [clientUser, setClientUser]     = useState(null)
  const [authTab, setAuthTab]           = useState('signup')
  const [authEmail, setAuthEmail]       = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName]         = useState('')
  const [authPhone, setAuthPhone]       = useState('')
  const [authLoading, setAuthLoading]   = useState(false)
  const [authError, setAuthError]       = useState(null)

  const [step, setStep]                 = useState(1)
  const [selectedStaff, setSelectedStaff] = useState(undefined) // undefined=not chosen, null=no preference
  const [selectedService, setSelectedService] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [serviceSearch, setServiceSearch] = useState('')
  const [serviceCategory, setServiceCategory] = useState('all')
  const [slotsByDay, setSlotsByDay]     = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [notes, setNotes]               = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [bookingRef, setBookingRef]     = useState(null)

  const [mode, setMode]                 = useState('book')
  const [myBookings, setMyBookings]     = useState(null)
  const [myBookingsLoading, setMyBookingsLoading] = useState(false)

  const [aiOpen, setAiOpen]             = useState(false)
  const [aiMessages, setAiMessages]     = useState([])
  const [aiInput, setAiInput]           = useState('')
  const [aiLoading, setAiLoading]       = useState(false)
  const [aiGreeted, setAiGreeted]       = useState(false)

  // ── Load tenant + catalogue + staff ────────────────────────────────────────
  useEffect(() => {
    if (!tenantId) return
    const load = async () => {
      try {
        const staffRes = await supabase.from('staff_profiles').select('id, name, role, colour, bio').eq('tenant_id', tenantId).order('name')
        const staffIds = (staffRes.data || []).map(s => s.id)
        const [tenantRes, catRes, schedRes] = await Promise.all([
          supabase.from('tenants').select('business_name, business_phone, business_email, business_address, cancel_cutoff_hrs, booking_buffer_mins, client_can_reschedule, charge_late_cancel, no_show_fee, no_show_fee_type, no_show_fee_pct, subscription_tier, calendar_tier, brand_colour, logo_url, booking_promo_text, booking_promo_expires_at, hide_qerxel_ad, booking_overlap_mins').eq('id', tenantId).maybeSingle(),
          supabase.from('catalogue_items').select('id, name, description, price_from, price_to, duration_minutes, processing_minutes, category').eq('tenant_id', tenantId).eq('active', true).eq('item_type', 'service').order('category').order('name'),
          staffIds.length
            ? supabase.from('staff_availability').select('staff_profile_id, day_of_week, start_time, end_time, active').in('staff_profile_id', staffIds)
            : Promise.resolve({ data: [] }),
        ])
        if (!tenantRes.data) { setError('Booking page not found.'); setLoading(false); return }
        setTenant(tenantRes.data)
        setCatalogue(catRes.data || [])
        setStaffProfiles(staffRes.data || [])
        setSchedules(schedRes.data || [])
      } catch { setError('Something went wrong. Please try again.') }
      finally { setLoading(false) }
    }
    load()
  }, [tenantId])

  // ── Client session ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (session?.user) setClientUser(session.user) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setClientUser(session?.user || null))
    return () => subscription.unsubscribe()
  }, [])

  // ── Generate slots when entering step 3 ────────────────────────────────────
  useEffect(() => {
    if (step !== 3 || !selectedService) return
    const loadSlots = async () => {
      setSlotsLoading(true)
      setSelectedSlot(null)
      const days = nextDays(DAYS_AHEAD)
      const from = new Date(days[0]); from.setHours(0,0,0,0)
      const to = new Date(days[days.length - 1]); to.setHours(23,59,59,999)
      const { data: apts } = await supabase.from('appointments').select('staff_profile_id, start_time, end_time').eq('tenant_id', tenantId).gte('start_time', from.toISOString()).lte('start_time', to.toISOString()).neq('status', 'cancelled')
      const appointments = apts || []
      const durationMins = selectedService.duration_minutes || 60
      const bufferMins = tenant?.booking_buffer_mins ?? 15
      const overlapMins = tenant?.booking_overlap_mins ?? 0
      const filterStaffId = selectedStaff?.id || null
      setSlotsByDay(days.map(day => ({ day, slots: generateSlots({ date: day, schedules, appointments, durationMins, bufferMins, overlapMins, filterStaffId }) })))
      setSlotsLoading(false)
    }
    loadSlots()
  }, [step, selectedService, selectedStaff, schedules, tenant, tenantId])

  // ── My bookings ─────────────────────────────────────────────────────────────
  const loadMyBookings = useCallback(async () => {
    if (!clientUser) return
    setMyBookingsLoading(true)
    const { data } = await supabase.from('appointments').select('id, title, appointment_type, start_time, end_time, status, cancel_token').eq('tenant_id', tenantId).eq('client_user_id', clientUser.id).neq('status', 'cancelled').gte('start_time', new Date().toISOString()).order('start_time')
    setMyBookings(data || [])
    setMyBookingsLoading(false)
  }, [clientUser, tenantId])

  useEffect(() => { if (mode === 'mybookings' && clientUser) loadMyBookings() }, [mode, clientUser, loadMyBookings])

  // ── Auth handlers ───────────────────────────────────────────────────────────
  const handleSignUp = async () => {
    if (!authEmail.trim() || !authPassword || !authName.trim() || !authPhone.trim()) { setAuthError('Please fill in all fields.'); return }
    if (authPassword.length < 8) { setAuthError('Password must be at least 8 characters.'); return }
    setAuthLoading(true); setAuthError(null)
    const { data, error: err } = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword, options: { data: { full_name: authName.trim(), phone: authPhone.trim() } } })
    if (err) { setAuthError(err.message); setAuthLoading(false); return }
    if (data.user) { setClientUser(data.user); setStep(5) }
    setAuthLoading(false)
  }

  const handleSignIn = async () => {
    if (!authEmail.trim() || !authPassword) { setAuthError('Please enter your email and password.'); return }
    setAuthLoading(true); setAuthError(null)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword })
    if (err) { setAuthError('Incorrect email or password.'); setAuthLoading(false); return }
    if (data.user) { setClientUser(data.user); setStep(5) }
    setAuthLoading(false)
  }

  // ── Submit booking ──────────────────────────────────────────────────────────
  const submitBooking = async () => {
    if (!selectedSlot || !selectedService || !clientUser) return
    setSubmitting(true)
    try {
      const start = selectedSlot.time
      const end = addMinutes(start, selectedService.duration_minutes || 60)
      const bufferMins = tenant?.booking_buffer_mins ?? 15
      const overlapMins = tenant?.booking_overlap_mins ?? 0
      const meta = clientUser.user_metadata || {}
      const clientName = meta.full_name || clientUser.email
      const clientPhone = meta.phone || ''
      const clientEmail = clientUser.email

      const from = new Date(start); from.setHours(0,0,0,0)
      const to = new Date(start); to.setHours(23,59,59,999)
      const { data: fresh } = await supabase.from('appointments').select('id, staff_profile_id, start_time, end_time').eq('tenant_id', tenantId).gte('start_time', from.toISOString()).lte('start_time', to.toISOString()).neq('status', 'cancelled')
      const conflict = (fresh || []).some(apt => {
        if (apt.staff_profile_id && selectedSlot.staffId && apt.staff_profile_id !== selectedSlot.staffId) return false
        return hasOverlapConflict(start, end, new Date(apt.start_time), new Date(apt.end_time), bufferMins, overlapMins)
      })
      if (conflict) { setSelectedSlot(null); setStep(3); alert('Sorry, that slot was just taken. Please choose another time.'); return }

      const processingEnd = selectedService.processing_minutes ? addMinutes(end, selectedService.processing_minutes) : null
      const { data, error: err } = await supabase.from('appointments').insert({
        tenant_id: tenantId, staff_profile_id: selectedSlot.staffId || null,
        title: `${selectedService.name} — ${clientName}`,
        start_time: start.toISOString(), end_time: end.toISOString(),
        processing_start_time: selectedService.processing_minutes ? end.toISOString() : null,
        processing_end_time: processingEnd?.toISOString() || null,
        service_id: selectedService.id, status: 'provisional',
        appointment_type: selectedService.name, client_notes: notes.trim() || null,
        client_name: clientName, client_phone: clientPhone, client_email: clientEmail,
        client_user_id: clientUser.id, created_from: 'customer_booking',
      }).select().maybeSingle()
      if (err) throw err
      setBookingRef(data?.id?.slice(0, 8).toUpperCase() || 'CONFIRMED')
      setStep(6)
      fetch('/api/integrations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'booking-confirm', tenantId, clientName, clientPhone, clientEmail, serviceName: selectedService.name, startTime: start.toISOString(), bookingRef: data?.id?.slice(0,8).toUpperCase(), cancelToken: data?.cancel_token || null }) }).catch(() => {})
    } catch { alert('Could not confirm your booking. Please try again or call us directly.') }
    finally { setSubmitting(false) }
  }

  // ── AI advisor ──────────────────────────────────────────────────────────────
  const openAi = () => {
    setAiOpen(true)
    if (!aiGreeted) { setAiMessages([{ role: 'assistant', content: `Hi! I can help you choose the right service or answer questions about ${tenant?.business_name || 'us'}. What would you like to know?` }]); setAiGreeted(true) }
  }
  const sendAiMessage = async () => {
    const text = aiInput.trim(); if (!text || aiLoading) return
    const next = [...aiMessages, { role: 'user', content: text }]
    setAiMessages(next); setAiInput(''); setAiLoading(true)
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'booking-assist', businessName: tenant?.business_name, services: catalogue, messages: next }) })
      const d = await r.json()
      setAiMessages(prev => [...prev, { role: 'assistant', content: d.message || 'Sorry, I couldn\'t respond.' }])
    } catch { setAiMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]) }
    finally { setAiLoading(false) }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const subTier = tenant?.subscription_tier
  const hasBrandingBP = (!!subTier && subTier !== 'schedule_only') || tenant?.calendar_tier === 'multi'
  const accent     = (hasBrandingBP && tenant?.brand_colour) ? tenant.brand_colour : '#5e3b87'
  const accentDark = darkenHex(accent)
  const headerLogo = hasBrandingBP ? (tenant?.logo_url || null) : null
  const showPromo  = !!tenant?.booking_promo_text && (!tenant?.booking_promo_expires_at || new Date(tenant.booking_promo_expires_at) > new Date())
  const isProfPlus = ['professional', 'enterprise', 'bespoke'].includes(subTier)
  const showDiscoveryCard = !(isProfPlus && tenant?.hide_qerxel_ad)

  const categories = useMemo(() => [...new Set(catalogue.filter(s => s.category).map(s => s.category))].sort(), [catalogue])

  const filteredCatalogue = useMemo(() => {
    let list = serviceCategory !== 'all' ? catalogue.filter(s => s.category === serviceCategory) : catalogue
    if (serviceSearch.trim()) {
      const terms = serviceSearch.toLowerCase().split(/\s+/).filter(t => t.length > 1)
      list = list.filter(s => terms.some(t => `${s.name} ${s.description || ''}`.toLowerCase().includes(t)))
    }
    return list
  }, [catalogue, serviceCategory, serviceSearch])

  const STEP_LABELS = ['Team', 'Service', 'Date & time', 'Account', 'Confirm']

  // ── Render guards ───────────────────────────────────────────────────────────
  if (loading) return <div style={{ minHeight: '100vh', background: '#f7f6f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", color: '#aaa', fontSize: '0.9rem' }}>Loading…</div>
  if (error) return (
    <div style={{ minHeight: '100vh', background: '#f7f6f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔍</div>
        <div style={{ fontWeight: 600, color: '#1a1a1a', marginBottom: '0.4rem' }}>{error}</div>
        <div style={{ fontSize: '0.85rem', color: '#aaa' }}>Check the link and try again.</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f9', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${accentDark} 0%, ${accent} 100%)`, padding: '1.5rem 1.5rem 2.5rem' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: 'white', fontSize: '1rem' }}>Qerxel</span>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f0a500', display: 'inline-block' }} />
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>Booking</span>
            </div>
            {clientUser && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)' }}>{clientUser.user_metadata?.full_name || clientUser.email}</span>
                <button onClick={() => supabase.auth.signOut().then(() => setClientUser(null))} style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 4, padding: '0.2rem 0.5rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Sign out</button>
              </div>
            )}
          </div>
          {headerLogo
            ? <img src={headerLogo} alt={tenant?.business_name} style={{ height: 52, maxWidth: 220, objectFit: 'contain', marginBottom: '0.35rem', display: 'block' }} />
            : <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: 'white', marginBottom: '0.25rem' }}>{tenant?.business_name}</div>}
          {headerLogo && <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '1rem', color: 'rgba(255,255,255,0.85)', marginBottom: '0.2rem' }}>{tenant?.business_name}</div>}
          {tenant?.business_address && <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)' }}>{tenant.business_address}</div>}
        </div>
      </div>

      {/* Promo */}
      {showPromo && (
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 1rem' }}>
          <div style={{ background: '#fffbf0', border: '1px solid rgba(240,165,0,0.35)', borderRadius: 10, padding: '0.7rem 1rem', display: 'flex', gap: '0.6rem', marginTop: '0.75rem' }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>🎉</span>
            <div style={{ fontSize: '0.83rem', color: '#78460a', lineHeight: 1.5, fontWeight: 500 }}>{tenant.booking_promo_text}</div>
          </div>
        </div>
      )}

      {/* Card */}
      <div style={{ maxWidth: 560, margin: '-1.25rem auto 2rem', padding: '0 1rem' }}>
        <div style={{ background: 'white', borderRadius: 18, boxShadow: '0 4px 32px rgba(94,59,135,0.12), 0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

          {/* Mode tabs */}
          {step < 6 && (
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(94,59,135,0.07)', padding: '0 1.5rem' }}>
              {[['book', 'Make a booking'], ...(clientUser ? [['mybookings', 'My bookings']] : [])].map(([m, label]) => (
                <button key={m} onClick={() => setMode(m)} style={{ padding: '0.9rem 0', marginRight: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: mode === m ? 700 : 400, fontSize: '0.875rem', color: mode === m ? accent : '#aaa', borderBottom: mode === m ? `2px solid ${accent}` : '2px solid transparent', transition: 'all 0.15s' }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* MY BOOKINGS */}
          {mode === 'mybookings' && step < 6 && <MyBookingsTab myBookings={myBookings} myBookingsLoading={myBookingsLoading} accent={accent} tenant={tenant} setMode={setMode} />}

          {/* BOOK MODE */}
          {mode === 'book' && (
            <>
              {step < 6 && (
                <div style={{ padding: '1.25rem 1.5rem 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
                    {[1,2,3,4,5].map((n, i) => (
                      <div key={n} style={{ display: 'flex', alignItems: 'center', flex: i < 4 ? 1 : 0, gap: '0.4rem' }}>
                        <StepDot n={n} active={step === n} done={step > n} accent={accent} />
                        {i < 4 && <div style={{ flex: 1, height: 2, borderRadius: 2, background: step > n ? '#3db87a' : '#ede8f5' }} />}
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                    Step {step} of 5 — {STEP_LABELS[step - 1]}
                  </div>
                </div>
              )}

              <div style={{ padding: step < 6 ? '0 1.5rem 1.5rem' : '2rem 1.5rem' }}>

                {/* Steps 1-6 */}
                {step === 1 && <StepTeam staffProfiles={staffProfiles} selectedStaff={selectedStaff} accent={accent} setSelectedStaff={setSelectedStaff} setStep={setStep} />}
                {step === 2 && <StepService selectedStaff={selectedStaff} categories={categories} serviceCategory={serviceCategory} catalogue={catalogue} filteredCatalogue={filteredCatalogue} serviceSearch={serviceSearch} selectedService={selectedService} accent={accent} setStep={setStep} setServiceCategory={setServiceCategory} setServiceSearch={setServiceSearch} setSelectedService={setSelectedService} />}
                {step === 3 && <StepSlots selectedService={selectedService} selectedStaff={selectedStaff} slotsLoading={slotsLoading} slotsByDay={slotsByDay} selectedSlot={selectedSlot} schedules={schedules} tenant={tenant} accent={accent} clientUser={clientUser} setStep={setStep} setSelectedSlot={setSelectedSlot} />}
                {step === 4 && <StepAuth authTab={authTab} authName={authName} authPhone={authPhone} authEmail={authEmail} authPassword={authPassword} authLoading={authLoading} authError={authError} selectedService={selectedService} selectedSlot={selectedSlot} selectedStaff={selectedStaff} accent={accent} setStep={setStep} setAuthTab={setAuthTab} setAuthError={setAuthError} setAuthName={setAuthName} setAuthPhone={setAuthPhone} setAuthEmail={setAuthEmail} setAuthPassword={setAuthPassword} handleSignUp={handleSignUp} handleSignIn={handleSignIn} />}
                {step === 5 && <StepConfirm selectedService={selectedService} selectedSlot={selectedSlot} selectedStaff={selectedStaff} notes={notes} submitting={submitting} tenant={tenant} clientUser={clientUser} accent={accent} setNotes={setNotes} submitBooking={submitBooking} setStep={setStep} />}
                {step === 6 && <StepDone selectedService={selectedService} selectedSlot={selectedSlot} selectedStaff={selectedStaff} bookingRef={bookingRef} tenant={tenant} accent={accent} setStep={setStep} setSelectedService={setSelectedService} setSelectedSlot={setSelectedSlot} setSelectedStaff={setSelectedStaff} setNotes={setNotes} setMode={setMode} />}
              </div>
            </>
          )}
        </div>

        {/* Discovery card */}
        {step === 6 && showDiscoveryCard && (
          <div style={{ marginTop: '1.25rem', background: 'white', borderRadius: 18, boxShadow: '0 4px 24px rgba(94,59,135,0.10)', overflow: 'hidden', border: '0.5px solid rgba(94,59,135,0.08)' }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, #5e3b87 0%, #f0a500 100%)' }} />
            <div style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.65rem' }}>Booking service provided free by Qerxel</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#1a1a1a', marginBottom: '0.45rem', lineHeight: 1.3 }}>Run a business like {tenant?.business_name}?</div>
              <div style={{ fontSize: '0.82rem', color: '#666', lineHeight: 1.65, marginBottom: '1.25rem' }}>Qerxel gives every small business the tools that used to cost enterprise money. 30-day free trial — no card, no commitment. Scheduling is <strong style={{ color: '#3db87a' }}>free for life</strong> for one person.</div>
              <a href="/try-q" style={{ display: 'inline-block', padding: '0.6rem 1.25rem', background: '#5e3b87', color: 'white', borderRadius: 9, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>Talk to Q →</a>
            </div>
          </div>
        )}
      </div>

      {/* AI advisor bubble */}
      {!aiOpen && step < 6 && (
        <button onClick={openAi} style={{ position: 'fixed', bottom: 24, right: 24, background: accent, color: 'white', border: 'none', borderRadius: '50%', width: 52, height: 52, fontSize: '1.3rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(94,59,135,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          💬
        </button>
      )}
      {aiOpen && <AiChatPanel aiMessages={aiMessages} aiInput={aiInput} aiLoading={aiLoading} accent={accent} setAiOpen={setAiOpen} setAiInput={setAiInput} sendAiMessage={sendAiMessage} />}
    </div>
  )
}
