/**
 * ============================================================================
 * QERXEL COMPONENT CONTRACT & BOUNDARY MAP
 * ============================================================================
 * AUTHOR/VISION : Philip Keating
 * FILE PATH     : api/export-data.js
 * TOPOLOGY RING : Ring 1 — Leaf (Standalone API Module)
 * INTENT MAP    : Responds to a tenant-triggered GDPR data export request.
 *                 Reads all tenant records across 6 tables in a single parallel
 *                 batch, formats each dataset as RFC 4180-compliant CSV, embeds
 *                 the combined output into an HTML email, and dispatches it to
 *                 the tenant's registered business_email. Reads and sends only
 *                 — no downstream mutations of any kind.
 *
 * ─── REGRESSION MAP (THE ZERO-WEB STANDARD) ──────────────────────────────────
 * INPUTS/PARAMS : HTTP POST body: { tenantId: string }
 * EXTERNAL READS: Supabase tables (SELECT only):
 *                   tenants (id, business_name, business_email, data_retention_days)
 *                   call_logs (id, created_at, caller_phone, duration_seconds,
 *                              call_outcome, ai_summary)
 *                   leads (id, created_at, lead_contact_name, status, notes)
 *                   referral_log (id, created_at, referral_partners.partner_name)
 *                   referral_partners (id, partner_name, contact_phone,
 *                                      contact_email, categories)
 *                   staff_profiles (id, name, role, phone, email, active)
 *                 Env vars: SUPABASE_SERVICE_ROLE_KEY
 *                 Helper: _emails.js → sendEmail()
 * MUTATIONS/DB  : NONE. All 6 table queries are SELECT. No INSERT, UPDATE,
 *                 or DELETE operations exist in this file.
 * OUTPUTS/EMITS : One email sent via sendEmail() to tenant.business_email
 *                 containing CSV data embedded in HTML.
 *                 HTTP response on success: { ok: true }
 *                 HTTP response on failure: { error: string } with 4xx/5xx status
 *
 * ─── IN-FILE PRIME DIRECTIVES (MANDATORY) ────────────────────────────────────
 * 1. Never create new files to house extracted logic. Keep it in this file.
 * 2. Run a regression map before every single future edit.
 * 3. No CSS, no CSS variables, inline styles only if layout is touched.
 * 4. Every database mutation must keep its save guard (if applicable).
 * 5. Clean Slate Rule: If complex nesting or multi-path drift occurs,
 *    the engineer must rebuild this module from a blank canvas. No patching.
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js'
import { sendEmail } from './_emails.js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function toCsv(rows) {
  if (!rows || rows.length === 0) return '(no records)'
  const keys = Object.keys(rows[0])
  const header = keys.join(',')
  const body = rows.map(row =>
    keys.map(k => {
      const v = row[k] === null || row[k] === undefined ? '' : String(row[k])
      return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v
    }).join(',')
  ).join('\n')
  return `${header}\n${body}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { tenantId } = req.body
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, business_name, business_email, data_retention_days')
    .eq('id', tenantId)
    .maybeSingle()

  if (!tenant || !tenant.business_email) {
    return res.status(404).json({ error: 'Tenant not found or no email' })
  }

  const [callsRes, leadsRes, refsRes, partnersRes, staffRes] = await Promise.all([
    supabase.from('call_logs').select('id, created_at, caller_phone, duration_seconds, call_outcome, ai_summary').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    supabase.from('leads').select('id, created_at, lead_contact_name, status, notes').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    supabase.from('referral_log').select('id, created_at, referral_partners(partner_name)').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    supabase.from('referral_partners').select('id, partner_name, contact_phone, contact_email, categories').eq('tenant_id', tenantId),
    supabase.from('staff_profiles').select('id, name, role, phone, email, active').eq('tenant_id', tenantId),
  ])

  const calls    = callsRes.data || []
  const leads    = leadsRes.data || []
  const refs     = (refsRes.data || []).map(r => ({ ...r, partner_name: r.referral_partners?.partner_name || '' }))
  const partners = partnersRes.data || []
  const staff    = staffRes.data || []

  const sections = [
    { title: 'Call Logs', rows: calls.map(c => ({ id: c.id, date: c.created_at, caller_phone: c.caller_phone, duration_seconds: c.duration_seconds, outcome: c.call_outcome, summary: c.ai_summary })) },
    { title: 'Leads', rows: leads.map(l => ({ id: l.id, date: l.created_at, name: l.lead_contact_name, status: l.status, notes: l.notes })) },
    { title: 'Referral Log', rows: refs.map(r => ({ id: r.id, date: r.created_at, partner: r.partner_name })) },
    { title: 'Partner Network', rows: partners.map(p => ({ id: p.id, name: p.partner_name, phone: p.contact_phone, email: p.contact_email, categories: Array.isArray(p.categories) ? p.categories.join('; ') : '' })) },
    { title: 'Staff', rows: staff.map(s => ({ id: s.id, name: s.name, role: s.role, phone: s.phone, email: s.email, active: s.active })) },
  ]

  const bodyText = sections.map(s =>
    `## ${s.title}\n${toCsv(s.rows)}`
  ).join('\n\n')

  const subject = `Your Qerxel data export — ${tenant.business_name}`
  const html = `<!DOCTYPE html><html><body style="font-family:'DM Sans',Arial,sans-serif;max-width:560px;margin:0 auto;padding:2rem 1rem;color:#1a1a1a;">
    <div style="margin-bottom:1.5rem;">
      <span style="font-weight:700;color:#5e3b87;font-size:1.125rem;">Qerxel</span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#f0a500;margin-left:3px;margin-bottom:8px;"></span>
    </div>
    <p>Hi ${tenant.business_name},</p>
    <p>Here is your data export. This file contains all records held by Qerxel for your account as of today, in CSV format.</p>
    <p><strong>Sections included:</strong> Call Logs, Leads, Referral Log, Partner Network, Staff.</p>
    <p>Note: transcripts are excluded from exports for security. Contact support if you need individual transcripts.</p>
    <pre style="background:#f7f6f9;padding:1rem;border-radius:8px;font-size:0.75rem;overflow:auto;white-space:pre-wrap;word-break:break-all;">${bodyText.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
    <hr style="border:none;border-top:1px solid #eee;margin:2rem 0 1rem;">
    <p style="color:#aaa;font-size:0.8rem;margin:0;">You requested this export from your Qerxel Account Settings. Records are retained for ${tenant.data_retention_days ?? 90} days from creation.</p>
  </body></html>`

  await sendEmail({ to: tenant.business_email, subject, html })

  return res.status(200).json({ ok: true })
}
