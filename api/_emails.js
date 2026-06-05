// Resend email helper + all three minute notification templates

const FROM = 'Qerxel <hello@qerxel.app>' // update when domain verified in Resend

const NEXT_TIER = {
  free:         { label: 'Light',        minutes: 120,  price: '£29' },
  light:        { label: 'Standard',     minutes: 250,  price: '£49' },
  standard:     { label: 'Professional', minutes: 450,  price: '£69' },
  professional: { label: 'Enterprise',   minutes: 1000, price: '£249' },
  enterprise:   null,
  bespoke:      null,
}

export async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('RESEND_API_KEY not set — email skipped:', subject)
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  })
  if (!res.ok) console.error('Resend send failed:', await res.text())
}

// ── template helpers ──────────────────────────────────────────────────────────

function wrap(body) {
  return `<!DOCTYPE html><html><body style="font-family:'DM Sans',Arial,sans-serif;max-width:560px;margin:0 auto;padding:2rem 1rem;color:#1a1a1a;">
    <div style="margin-bottom:1.5rem;">
      <span style="font-weight:700;color:#5e3b87;font-size:1.125rem;">Qerxel</span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#f0a500;margin-left:3px;margin-bottom:8px;"></span>
    </div>
    ${body}
    <hr style="border:none;border-top:1px solid #eee;margin:2rem 0 1rem;">
    <p style="color:#aaa;font-size:0.8rem;margin:0;">You're receiving this because you have an active Qerxel account. Manage your notification preferences in Account settings.</p>
  </body></html>`
}

// Notification 1 — 80% warning
export function email80pct({ businessName, minutesUsed, includedMinutes, overagePref }) {
  const remaining = includedMinutes - minutesUsed
  const voiceLabel = overagePref === 'standard' ? 'Standard' : 'Premium'
  const rate = overagePref === 'standard' ? '14p' : '18p'
  return {
    subject: `Heads up — your included minutes are running low`,
    html: wrap(`
      <p>Hi ${businessName},</p>
      <p>Heads up — you've used <strong>${minutesUsed}</strong> of your <strong>${includedMinutes} included Premium minutes</strong> this month. You have <strong>${remaining} minutes remaining</strong>.</p>
      <p>You've selected <strong>${voiceLabel} voice</strong> for additional minutes at <strong>${rate}/min</strong>. Your AI will automatically switch when your allowance runs out.</p>
      <p>Want to change this? Update your preference in <strong>AI Behaviour → Call Handling</strong>.</p>
    `),
  }
}

// Notification 2 — allowance exhausted
export function emailExhausted({ businessName, includedMinutes, overagePref, tier }) {
  const next = NEXT_TIER[tier]
  const upgradeP = next
    ? `<p>To avoid this next month, upgrade to <strong>${next.label}</strong> — ${next.minutes} Premium minutes for <strong>${next.price}/month</strong>.</p>`
    : ''

  const renewalDate = new Date()
  renewalDate.setMonth(renewalDate.getMonth() + 1)
  renewalDate.setDate(1)
  const renewalStr = renewalDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  if (overagePref === 'standard') {
    return {
      subject: `Your included minutes have run out — AI has switched to Standard voice`,
      html: wrap(`
        <p>Hi ${businessName},</p>
        <p>You've used all <strong>${includedMinutes} included Premium minutes</strong> this month.</p>
        <p>Your AI has switched to <strong>Standard voice</strong> — additional minutes are billed at <strong>14p/min</strong>.</p>
        <p>You'll automatically return to Premium on <strong>${renewalStr}</strong>.</p>
        ${upgradeP}
      `),
    }
  }

  return {
    subject: `Your included minutes have run out — continuing on Premium voice`,
    html: wrap(`
      <p>Hi ${businessName},</p>
      <p>You've used all <strong>${includedMinutes} included Premium minutes</strong> this month.</p>
      <p>Your AI is continuing on <strong>Premium voice</strong> — additional minutes are billed at <strong>18p/min</strong>.</p>
      <p>You'll automatically return to your included allowance on <strong>${renewalStr}</strong>.</p>
      ${upgradeP}
    `),
  }
}

// Daily cost report — PAYG tenants only
export function emailDailyCost({ businessName, callsToday, leadsToday, minutesToday, costToday, totalCostMonth, costLimit }) {
  const pct = costLimit > 0 ? Math.round((totalCostMonth / costLimit) * 100) : 0
  const barWidth = Math.min(pct, 100)
  const barColor = pct >= 80 ? '#f0a500' : '#5e3b87'
  return {
    subject: `Your Qerxel daily summary — ${businessName}`,
    html: wrap(`
      <p>Hi ${businessName},</p>
      <p>Here's what your AI handled today.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:1.25rem;">
        <tr><td style="padding:0.5rem 0;border-bottom:1px solid #eee;color:#aaa;font-size:0.8rem;">Calls handled</td><td style="padding:0.5rem 0;border-bottom:1px solid #eee;font-weight:600;text-align:right;">${callsToday}</td></tr>
        <tr><td style="padding:0.5rem 0;border-bottom:1px solid #eee;color:#aaa;font-size:0.8rem;">Leads captured</td><td style="padding:0.5rem 0;border-bottom:1px solid #eee;font-weight:600;text-align:right;">${leadsToday}</td></tr>
        <tr><td style="padding:0.5rem 0;border-bottom:1px solid #eee;color:#aaa;font-size:0.8rem;">Minutes used today</td><td style="padding:0.5rem 0;border-bottom:1px solid #eee;font-weight:600;text-align:right;">${minutesToday} min</td></tr>
        <tr><td style="padding:0.5rem 0;color:#aaa;font-size:0.8rem;">Cost today</td><td style="padding:0.5rem 0;font-weight:600;text-align:right;">£${costToday.toFixed(2)}</td></tr>
      </table>
      <div style="margin-bottom:0.4rem;display:flex;justify-content:space-between;font-size:0.8rem;">
        <span style="color:#aaa;">Month to date</span>
        <span style="font-weight:600;">£${totalCostMonth.toFixed(2)} of £${costLimit} limit (${pct}%)</span>
      </div>
      <div style="height:6px;background:#f0f0f0;border-radius:3px;overflow:hidden;">
        <div style="height:6px;width:${barWidth}%;background:${barColor};border-radius:3px;"></div>
      </div>
    `),
  }
}

// Appointment reminder — 24h or 1h before
export function emailAppointmentReminder({ businessName, appointment, hoursAhead }) {
  const start = new Date(appointment.start_time)
  const timeStr = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const dateStr = start.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const label = hoursAhead === 24 ? 'tomorrow' : 'in 1 hour'
  const serviceRow = appointment.appointment_type
    ? `<tr><td style="padding:0.5rem 0;color:#aaa;font-size:0.8rem;">Service</td><td style="padding:0.5rem 0;font-weight:600;text-align:right;">${appointment.appointment_type}</td></tr>`
    : ''
  return {
    subject: `Appointment reminder — ${appointment.title} ${label}`,
    html: wrap(`
      <p>Hi ${businessName},</p>
      <p>Reminder: you have an appointment <strong>${label}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:1.25rem;">
        <tr><td style="padding:0.5rem 0;border-bottom:1px solid #eee;color:#aaa;font-size:0.8rem;">Client</td><td style="padding:0.5rem 0;border-bottom:1px solid #eee;font-weight:600;text-align:right;">${appointment.title}</td></tr>
        <tr><td style="padding:0.5rem 0;border-bottom:1px solid #eee;color:#aaa;font-size:0.8rem;">Date</td><td style="padding:0.5rem 0;border-bottom:1px solid #eee;font-weight:600;text-align:right;">${dateStr}</td></tr>
        <tr><td style="padding:0.5rem 0;border-bottom:1px solid #eee;color:#aaa;font-size:0.8rem;">Time</td><td style="padding:0.5rem 0;border-bottom:1px solid #eee;font-weight:600;text-align:right;">${timeStr}</td></tr>
        ${serviceRow}
      </table>
      <p style="font-size:0.85rem;color:#666;">Log in to Qerxel to view or update this appointment.</p>
    `),
  }
}

// Notification 3 — monthly renewal
export function emailRenewal({ businessName, includedMinutes }) {
  return {
    subject: `Your Premium minutes have renewed`,
    html: wrap(`
      <p>Hi ${businessName},</p>
      <p>Your Premium minutes have renewed — you have <strong>${includedMinutes} minutes included</strong> this month.</p>
      <p>Your AI has automatically returned to Premium voice.</p>
    `),
  }
}
