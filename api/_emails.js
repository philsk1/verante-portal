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

// Immediate lead notification — fires when AI captures a new lead
export function emailNewLead({ businessName, callerName, callerPhone, summary, outcome, callbackUrl }) {
  const outcomeLabel = outcome === 'booked' ? 'Booking request' : 'New lead'
  const outcomeColor = outcome === 'booked' ? '#5e3b87' : '#f0a500'
  const callerRow = callerPhone
    ? `<tr><td style="padding:0.5rem 0;border-bottom:1px solid #eee;color:#aaa;font-size:0.8rem;">Phone</td><td style="padding:0.5rem 0;border-bottom:1px solid #eee;font-weight:600;text-align:right;"><a href="tel:${callerPhone}" style="color:#5e3b87;text-decoration:none;">${callerPhone}</a></td></tr>`
    : ''
  const nameRow = callerName
    ? `<tr><td style="padding:0.5rem 0;border-bottom:1px solid #eee;color:#aaa;font-size:0.8rem;">Name</td><td style="padding:0.5rem 0;border-bottom:1px solid #eee;font-weight:600;text-align:right;">${callerName}</td></tr>`
    : ''
  const ctaBtn = callbackUrl
    ? `<div style="margin-top:1.5rem;"><a href="${callbackUrl}" style="display:inline-block;background:#f0a500;color:#1a0533;padding:0.65rem 1.4rem;border-radius:8px;font-weight:700;font-size:0.875rem;text-decoration:none;">View lead in Qerxel →</a></div>`
    : ''
  return {
    subject: `${outcomeLabel} — ${callerName || callerPhone || 'Unknown caller'} via ${businessName}`,
    html: wrap(`
      <div style="display:inline-block;background:${outcomeColor};color:${outcome === 'booked' ? 'white' : '#1a0533'};padding:0.25rem 0.65rem;border-radius:4px;font-size:0.75rem;font-weight:700;margin-bottom:1rem;">${outcomeLabel.toUpperCase()}</div>
      <p>Your AI just captured a new enquiry for <strong>${businessName}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:1.25rem;">
        ${nameRow}
        ${callerRow}
        ${summary ? `<tr><td style="padding:0.5rem 0;color:#aaa;font-size:0.8rem;vertical-align:top;">Summary</td><td style="padding:0.5rem 0;font-weight:500;text-align:right;">${summary}</td></tr>` : ''}
      </table>
      ${ctaBtn}
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

// Daily call summary — subscription tenants
export function emailDailySummary({
  businessName, date,
  callsTotal, leadsCount, referralsCount, filteredCount, escalatedCount,
  minutesUsed, includedMinutes, tier,
  leads, referrals,
}) {
  const NEXT_TIER_LOCAL = {
    light:        { label: 'Standard',     minutes: 250,  price: '£49' },
    standard:     { label: 'Professional', minutes: 450,  price: '£69' },
    professional: { label: 'Enterprise',   minutes: 1000, price: '£249' },
  }
  const pct = includedMinutes > 0 ? Math.round((minutesUsed / includedMinutes) * 100) : 0
  const barWidth = Math.min(pct, 100)
  const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f0a500' : '#5e3b87'
  const next = NEXT_TIER_LOCAL[tier]

  const leadRows = (leads || []).slice(0, 5).map(l => {
    const time = new Date(l.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    return `<tr>
      <td style="padding:0.4rem 0;border-bottom:1px solid #f5f5f5;font-size:0.82rem;">${l.lead_contact_name || l.caller_name || 'Unknown'}</td>
      <td style="padding:0.4rem 0;border-bottom:1px solid #f5f5f5;font-size:0.82rem;color:#666;">${l.phone_number || l.caller_number || ''}</td>
      <td style="padding:0.4rem 0;border-bottom:1px solid #f5f5f5;font-size:0.82rem;color:#aaa;text-align:right;">${time}</td>
    </tr>`
  }).join('')

  const refRows = (referrals || []).slice(0, 4).map(r => {
    const time = new Date(r.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    return `<tr>
      <td style="padding:0.4rem 0;border-bottom:1px solid #f5f5f5;font-size:0.82rem;">${r.caller_name || 'Caller'}</td>
      <td style="padding:0.4rem 0;border-bottom:1px solid #f5f5f5;font-size:0.82rem;color:#666;">→ ${r.partner_name || ''}</td>
      <td style="padding:0.4rem 0;border-bottom:1px solid #f5f5f5;font-size:0.82rem;color:#aaa;text-align:right;">${time}</td>
    </tr>`
  }).join('')

  const leadsSection = leadsCount > 0 ? `
    <p style="margin:1.5rem 0 0.5rem;font-weight:600;color:#1a1a1a;font-size:0.875rem;">New leads to follow up</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:0.5rem;">${leadRows}</table>
    ${leadsCount > 5 ? `<p style="font-size:0.78rem;color:#aaa;margin:0;">+ ${leadsCount - 5} more in your portal</p>` : ''}
  ` : ''

  const refSection = referralsCount > 0 ? `
    <p style="margin:1.5rem 0 0.5rem;font-weight:600;color:#1a1a1a;font-size:0.875rem;">Referrals made</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:0.5rem;">${refRows}</table>
  ` : ''

  const minutesSection = includedMinutes > 0 ? `
    <div style="margin-top:1.5rem;">
      <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:0.35rem;">
        <span style="color:#aaa;">Minutes this month</span>
        <span style="font-weight:600;">${minutesUsed} of ${includedMinutes} min (${pct}%)</span>
      </div>
      <div style="height:6px;background:#f0f0f0;border-radius:3px;overflow:hidden;">
        <div style="height:6px;width:${barWidth}%;background:${barColor};border-radius:3px;"></div>
      </div>
      ${pct >= 80 && next ? `<p style="font-size:0.78rem;color:#f0a500;margin:0.4rem 0 0;">Running low — upgrade to ${next.label} for ${next.minutes} min at ${next.price}/month.</p>` : ''}
    </div>
  ` : ''

  const noCalls = callsTotal === 0 ? `<p style="color:#888;font-size:0.875rem;">No calls were handled yesterday. Your AI is ready and waiting.</p>` : ''

  return {
    subject: callsTotal > 0
      ? `${callsTotal} call${callsTotal !== 1 ? 's' : ''} handled yesterday — ${businessName}`
      : `Daily summary — ${businessName}`,
    html: wrap(`
      <p>Hi ${businessName},</p>
      <p style="color:#666;font-size:0.875rem;margin-top:-0.5rem;">${date}</p>
      ${noCalls}
      ${callsTotal > 0 ? `
      <table style="width:100%;border-collapse:collapse;margin-bottom:0.25rem;">
        <tr>
          <td style="padding:0.5rem 0.75rem;background:#f7f6f9;border-radius:8px;text-align:center;width:25%;">
            <div style="font-size:1.5rem;font-weight:700;color:#5e3b87;">${callsTotal}</div>
            <div style="font-size:0.72rem;color:#888;margin-top:2px;">Calls</div>
          </td>
          <td style="width:4px;"></td>
          <td style="padding:0.5rem 0.75rem;background:#f0fdf4;border-radius:8px;text-align:center;width:25%;">
            <div style="font-size:1.5rem;font-weight:700;color:#166534;">${leadsCount}</div>
            <div style="font-size:0.72rem;color:#888;margin-top:2px;">Leads</div>
          </td>
          <td style="width:4px;"></td>
          <td style="padding:0.5rem 0.75rem;background:#eff6ff;border-radius:8px;text-align:center;width:25%;">
            <div style="font-size:1.5rem;font-weight:700;color:#1e3a8a;">${referralsCount}</div>
            <div style="font-size:0.72rem;color:#888;margin-top:2px;">Referred</div>
          </td>
          <td style="width:4px;"></td>
          <td style="padding:0.5rem 0.75rem;background:#fff5f5;border-radius:8px;text-align:center;width:25%;">
            <div style="font-size:1.5rem;font-weight:700;color:#991b1b;">${filteredCount}</div>
            <div style="font-size:0.72rem;color:#888;margin-top:2px;">Filtered</div>
          </td>
        </tr>
      </table>
      ${leadsSection}
      ${refSection}
      ${minutesSection}
      <div style="margin-top:1.75rem;">
        <a href="https://verrante-portal.vercel.app" style="display:inline-block;background:#f0a500;color:#1a0533;text-decoration:none;font-weight:600;font-size:0.875rem;padding:0.625rem 1.25rem;border-radius:8px;">View in portal →</a>
      </div>
      ` : ''}
    `),
  }
}

// Urgent escalation alert — fires immediately when a call is escalated
export function emailUrgentEscalation({ businessName, callerName, callerPhone, summary, callbackMins, portalUrl }) {
  const callerLabel = callerName && callerPhone
    ? `${callerName} — ${callerPhone}`
    : callerName || callerPhone || 'Unknown caller'
  const ctaBtn = portalUrl
    ? `<div style="margin-top:1.5rem;"><a href="${portalUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;padding:0.65rem 1.4rem;border-radius:8px;font-weight:700;font-size:0.875rem;text-decoration:none;">View in Qerxel →</a></div>`
    : ''
  return {
    subject: `URGENT — Caller needs a response within ${callbackMins} min — ${businessName}`,
    html: wrap(`
      <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:0.75rem 1rem;border-radius:0 6px 6px 0;margin-bottom:1.25rem;">
        <div style="font-weight:700;color:#dc2626;font-size:0.875rem;margin-bottom:0.2rem;">URGENT — Action required within ${callbackMins} minutes</div>
        <div style="font-size:0.82rem;color:#991b1b;">Your AI has flagged this caller as requiring an urgent callback.</div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:1.25rem;">
        <tr><td style="padding:0.5rem 0;border-bottom:1px solid #eee;color:#aaa;font-size:0.8rem;">Caller</td><td style="padding:0.5rem 0;border-bottom:1px solid #eee;font-weight:600;text-align:right;">${callerLabel}</td></tr>
        ${callerPhone ? `<tr><td style="padding:0.5rem 0;border-bottom:1px solid #eee;color:#aaa;font-size:0.8rem;">Call back</td><td style="padding:0.5rem 0;border-bottom:1px solid #eee;font-weight:600;text-align:right;"><a href="tel:${callerPhone}" style="color:#dc2626;text-decoration:none;">${callerPhone}</a></td></tr>` : ''}
        ${summary ? `<tr><td style="padding:0.5rem 0;color:#aaa;font-size:0.8rem;vertical-align:top;">Need</td><td style="padding:0.5rem 0;font-weight:500;text-align:right;">${summary}</td></tr>` : ''}
      </table>
      ${ctaBtn}
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
