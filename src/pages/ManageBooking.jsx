import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

export default function ManageBooking() {
  const { token } = useParams()
  const [state, setState] = useState('loading') // loading | found | cancelled | notfound | error | past_cutoff
  const [booking, setBooking] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [cutoffHrs, setCutoffHrs] = useState(24)

  useEffect(() => {
    if (!token) { setState('notfound'); return }
    fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-booking', cancelToken: token }),
    })
      .then(r => r.json())
      .then(({ appointment, error }) => {
        if (error || !appointment) { setState('notfound'); return }
        if (appointment.status === 'cancelled') { setState('cancelled'); return }
        setBooking(appointment)
        setState('found')
      })
      .catch(() => setState('error'))
  }, [token])

  const doCancel = async () => {
    if (!window.confirm('Cancel this booking?')) return
    setConfirming(true)
    try {
      const r = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel-booking', cancelToken: token }),
      })
      const { cancelled, pastCutoff, cutoffHrs: hrs, alreadyCancelled } = await r.json()
      if (alreadyCancelled || cancelled) {
        setState('cancelled')
      } else if (pastCutoff) {
        setCutoffHrs(hrs)
        setState('past_cutoff')
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    } finally {
      setConfirming(false)
    }
  }

  const wrap = (content) => (
    <div style={{ minHeight: '100vh', background: '#f7f6f9', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: 'white', borderRadius: 20, padding: '2rem 2.25rem', maxWidth: 440, width: '100%', boxShadow: '0 8px 40px rgba(94,59,135,0.12)' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <span style={{ fontWeight: 700, color: '#5e3b87', fontSize: '1.125rem', fontFamily: "'DM Sans', sans-serif" }}>Qerxel</span>
          <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#f0a500', marginLeft: 3, verticalAlign: 'middle', marginBottom: 2 }} />
        </div>
        {content}
      </div>
    </div>
  )

  if (state === 'loading') return wrap(
    <div style={{ color: '#aaa', fontSize: '0.875rem' }}>Loading your booking…</div>
  )

  if (state === 'notfound') return wrap(
    <>
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔍</div>
      <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.125rem', color: '#1a1a1a', margin: '0 0 0.5rem' }}>Booking not found</h2>
      <p style={{ color: '#666', fontSize: '0.875rem', margin: 0 }}>This link may have expired or the booking reference is incorrect. Please contact the business directly.</p>
    </>
  )

  if (state === 'error') return wrap(
    <>
      <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.125rem', color: '#1a1a1a', margin: '0 0 0.5rem' }}>Something went wrong</h2>
      <p style={{ color: '#666', fontSize: '0.875rem', margin: 0 }}>Please try again or contact the business to cancel your booking.</p>
    </>
  )

  if (state === 'cancelled') return wrap(
    <>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f5f5f5', border: '2px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', fontSize: '1.4rem' }}>✕</div>
      <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.125rem', color: '#1a1a1a', margin: '0 0 0.5rem' }}>Booking cancelled</h2>
      <p style={{ color: '#666', fontSize: '0.875rem', margin: 0 }}>Your appointment has been cancelled. We hope to see you again soon.</p>
    </>
  )

  if (state === 'past_cutoff') return wrap(
    <>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fff3e0', border: '2px solid #f0a500', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', fontSize: '1.4rem' }}>⏰</div>
      <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.125rem', color: '#1a1a1a', margin: '0 0 0.5rem' }}>Cancellation window has passed</h2>
      <p style={{ color: '#666', fontSize: '0.875rem', margin: 0 }}>
        This business requires at least {cutoffHrs} hour{cutoffHrs !== 1 ? 's' : ''} notice to cancel. Please contact them directly if you need to make changes.
        {booking?.tenants?.business_phone && (
          <> Call <a href={`tel:${booking.tenants.business_phone}`} style={{ color: '#5e3b87', fontWeight: 600 }}>{booking.tenants.business_phone}</a>.</>
        )}
      </p>
    </>
  )

  if (state !== 'found' || !booking) return null

  const start = new Date(booking.start_time)
  const end = new Date(booking.end_time)
  const dateStr = start.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = `${start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
  const businessName = booking.tenants?.business_name
  const businessPhone = booking.tenants?.business_phone

  return wrap(
    <>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#dcfce7', border: '2px solid rgba(61,184,122,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', fontSize: '1.5rem' }}>✓</div>
      <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.125rem', color: '#1a1a1a', margin: '0 0 0.25rem' }}>Your booking</h2>
      {businessName && <p style={{ color: '#888', fontSize: '0.8rem', margin: '0 0 1.25rem' }}>with {businessName}</p>}

      <div style={{ background: '#f5f3ff', border: '1px solid rgba(94,59,135,0.12)', borderRadius: 12, padding: '1rem 1.125rem', marginBottom: '1.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {booking.appointment_type && (
              <tr>
                <td style={{ padding: '0.4rem 0', borderBottom: '1px solid rgba(94,59,135,0.08)', color: '#aaa', fontSize: '0.78rem' }}>Service</td>
                <td style={{ padding: '0.4rem 0', borderBottom: '1px solid rgba(94,59,135,0.08)', fontWeight: 600, textAlign: 'right', color: '#5e3b87', fontSize: '0.875rem' }}>{booking.appointment_type}</td>
              </tr>
            )}
            <tr>
              <td style={{ padding: '0.4rem 0', borderBottom: '1px solid rgba(94,59,135,0.08)', color: '#aaa', fontSize: '0.78rem' }}>Date</td>
              <td style={{ padding: '0.4rem 0', borderBottom: '1px solid rgba(94,59,135,0.08)', fontWeight: 600, textAlign: 'right', fontSize: '0.875rem' }}>{dateStr}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.4rem 0', color: '#aaa', fontSize: '0.78rem' }}>Time</td>
              <td style={{ padding: '0.4rem 0', fontWeight: 600, textAlign: 'right', fontSize: '0.875rem' }}>{timeStr}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {businessPhone && (
        <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: '1.5rem' }}>
          Questions? Call <a href={`tel:${businessPhone}`} style={{ color: '#5e3b87', fontWeight: 600, textDecoration: 'none' }}>{businessPhone}</a>
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {new Date(booking.start_time) > new Date() && (
          <a
            href={`/book/${booking.tenant_id}`}
            style={{
              display: 'block',
              width: '100%',
              padding: '0.7rem',
              borderRadius: 10,
              border: '1.5px solid #5e3b87',
              background: '#5e3b87',
              color: 'white',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: '0.875rem',
              textAlign: 'center',
              textDecoration: 'none',
              boxSizing: 'border-box',
            }}
          >
            Reschedule
          </a>
        )}
        <button
          onClick={doCancel}
          disabled={confirming}
          style={{
            width: '100%',
            padding: '0.7rem',
            borderRadius: 10,
            border: '1.5px solid #e05252',
            background: 'white',
            color: '#e05252',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: confirming ? 'not-allowed' : 'pointer',
            opacity: confirming ? 0.6 : 1,
          }}
        >
          {confirming ? 'Cancelling…' : 'Cancel this booking'}
        </button>
      </div>
    </>
  )
}
