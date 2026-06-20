/**
 * ============================================================================
 * QERXEL COMPONENT CONTRACT & BOUNDARY MAP
 * ============================================================================
 * AUTHOR/VISION : Philip Keating
 * FILE PATH     : src/pages/PartnersReferrals.jsx
 * TOPOLOGY RING : Ring 2 — Contained (1 caller: Portal.jsx tab slot)
 * INTENT MAP    : Manages the referral partner network for a tenant —
 *                 the reciprocal referral layer of the Q product.
 *                 Shows KPI tiles (referrals sent, reciprocity gaps, credit
 *                 balance), partner list with relationship health status,
 *                 add-partner form, reciprocity coaching card, referral
 *                 code/QR display, and an invite modal.
 *                 On load: resolves tenantId (auth or preview), fetches
 *                 tenants + referral_partners + referral_log + banned_services
 *                 + referral_service_map in parallel, auto-generates
 *                 referral_code if absent (writes to DB on first load).
 *
 * ─── REGRESSION MAP (THE ZERO-WEB STANDARD) ──────────────────────────────────
 * INPUTS/PARAMS : { onNavigate: (tab: string) => void }
 *                 Optional. Passed by Portal.jsx. Used by ConflictWarning
 *                 (→ profile) and KPI tile (→ dashboard).
 * EXTERNAL READS: supabase (anon key) — reads:
 *                   tenant_memberships (user_id) → tenant_id
 *                   tenants (referral_code, credit_balance_months, business_name)
 *                   referral_partners (id, partner_name, contact_phone, inbound_count)
 *                   referral_log (partner_id) — full scan per tenant for sent counts
 *                   referral_log (id, count) — date-filtered for this-month count
 *                   banned_services (banned_item)
 *                   referral_service_map (partner_id, service_keyword)
 *                 AuthContext → user
 *                 PreviewContext → isPreview, previewReadOnly, previewTenantId
 *                 api.qrserver.com — QR image via <img> tag (no fetch, browser load)
 * MUTATIONS/DB  : tenants — UPDATE referral_code (only when absent and not preview)
 *                 referral_partners — INSERT on handleAddPartner
 *                   guard: if (previewReadOnly || !tenantId) return
 *                 referral_service_map — INSERT on handleAddPartner (same guard)
 *                 referral_partners — DELETE on handleRemovePartner
 *                   guard: if (previewReadOnly) return
 *                 referral_service_map — DELETE on handleRemovePartner (same guard)
 *                 referral_partners — UPDATE inbound_count on handleLogInbound
 *                   guard: if (previewReadOnly) return
 * OUTPUTS/EMITS : No signals emitted, no outbound API calls.
 *                 Clipboard writes via navigator.clipboard.
 *                 localStorage r/w: qx_partner_invite_snoozed (snooze timestamp).
 *                 CSS EXCEPTION: PartnerInviteModal contains a <style> tag for
 *                   @keyframes invitePulse — inline styles cannot define keyframes;
 *                   this is the only permitted CSS injection in this file.
 *
 * ─── IN-FILE PRIME DIRECTIVES (MANDATORY) ────────────────────────────────────
 * 1. Never create new files to house extracted logic. Keep it in this file.
 * 2. Run a regression map before every single future edit.
 * 3. No CSS, no CSS variables, inline styles only if layout is touched.
 *    Exception: the @keyframes block in PartnerInviteModal (see OUTPUTS/EMITS).
 * 4. Every database mutation must keep its save guard (if applicable).
 * 5. Clean Slate Rule: If complex nesting or multi-path drift occurs,
 *    the engineer must rebuild this module from a blank canvas. No patching.
 * ============================================================================
 */

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { usePreview } from '../context/PreviewContext'
import { Copy, Check, ExternalLink } from 'lucide-react'

// ─── STYLING SYSTEM CONTEXT ──────────────────────────────────────────────────
const BOX_SHADOW = '0 2px 8px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.06)'
const FONT_FAMILY = "'DM Sans', sans-serif"

const SPECIALTY_MAP = [
  { regex: /plumb|electr|build|roof|carpet|floor|paint|decorat|gas|heat|air.?con|window|door|fenc|garden|lands|clean|waste|skip|pest|lock|glaz|tile|brick|concret|drain|guttr|joiner|carpent|handyman|damp|roofer|scaffold/, bar: '#f0a500', ab: '#fde68a', at: '#78460a' },
  { regex: /physio|dental|dentist|doctor|osteo|chiro|optici|optom|mental|counsel|therap|health|medic|nurse|pharmac|beauty|hair|salon|spa|massage|nutrition|diet|gym|fitness|yoga|pilates|sport|care|wellbeing|grooming/, bar: '#3db87a', ab: '#bbf7d0', at: '#166534' },
  { regex: /solicit|account|legal|law|financ|ifa|mortgage|insur|consult|audit|tax|architect|engineer|recruit|market|design|tech|web|software|media|print|photog|video/, bar: '#1d4ed8', ab: '#bfdbfe', at: '#1e3a8a' }
]

const specialtyColour = (spec) => {
  if (!spec) return { bar: '#5e3b87', ab: '#ddd6fe', at: '#4a2d6e', cb: '#f5f3ff', ct: '#4a2d6e' }
  const match = SPECIALTY_MAP.find(m => m.regex.test(spec.toLowerCase()))
  return match
    ? { bar: match.bar, ab: match.ab, at: match.at, cb: '#fffbeb', ct: match.at }
    : { bar: '#5e3b87', ab: '#ddd6fe', at: '#4a2d6e', cb: '#f5f3ff', ct: '#4a2d6e' }
}

const initials = (name) => name ? name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'

const networkStrength = (n) => {
  if (n === 0) return null
  if (n < 3)  return { label: 'Getting started', color: '#f0a500', bg: '#fef3d0' }
  if (n < 6)  return { label: 'Building momentum', color: '#3db87a', bg: '#e6f5ee' }
  if (n < 10) return { label: 'Strong network', color: '#1d4ed8', bg: '#eff6ff' }
  if (n < 20) return { label: 'Excellent coverage', color: '#5e3b87', bg: '#f0ebf8' }
  return       { label: 'Market-leading', color: '#1e7a4a', bg: '#dcfce7' }
}

function relationshipStatus(sent, received) {
  if (sent === 0 && received === 0) return { label: 'New', color: '#aaa', bg: '#f5f5f5' }
  if (sent > 0 && received === 0)   return { label: 'Push to reciprocate', color: '#92610a', bg: '#fef3d0', urgent: true }
  if (sent > 0 && received > 0 && sent > received * 2) return { label: 'Imbalanced', color: '#b45309', bg: '#fef3c7' }
  if (received > sent + 1)          return { label: 'Strong — they reciprocate', color: '#1e7a4a', bg: '#dcfce7' }
  return                             { label: 'Healthy', color: '#166534', bg: '#d1fae5' }
}

const networkScore = (n) => n === 0 ? 20 : n >= 3 ? 95 : 65

function reciprocHelpScore(partners) {
  if (!partners.length) return 65
  if (!partners.some(p => p.sentCount > 0 && p.inboundCount === 0)) return 95
  return 50
}

function urgentSummary(urgentCount, partnerCount) {
  if (urgentCount > 0) return `${urgentCount} partner${urgentCount > 1 ? 's' : ''} received referrals from you but haven't reciprocated yet`
  if (partnerCount > 0) return 'All active partners are reciprocating — keep building the network'
  return 'Your referral network starts with your first partner'
}

function reciprocSummary(urgentCount, outboundTotal) {
  if (urgentCount > 0) return 'Reciprocation means they sign up to Qerxel and add you as their partner. Use the invite link next to each one.'
  if (outboundTotal > 0) return 'Partners who receive multiple referrals from you feel genuine reciprocal obligation. Keep sending.'
  return 'Add your first partner above. When your AI refers a caller to them, the reciprocal expectation begins.'
}

function setupPulseModal({ outboundTotal, setShowInviteModal, setInviteModalPulsing, pulseTimerRef, pulseAnimRef }) {
  const snooze = localStorage.getItem('qx_partner_invite_snoozed')
  if (snooze && Date.now() < parseInt(snooze, 10)) return null
  const t = setTimeout(() => {
    setShowInviteModal(true)
    pulseTimerRef.current = setTimeout(() => {
      setInviteModalPulsing(true)
      pulseAnimRef.current = setTimeout(() => setInviteModalPulsing(false), 900)
    }, 10000)
  }, 700)
  return () => { clearTimeout(t); clearTimeout(pulseTimerRef.current); clearTimeout(pulseAnimRef.current) }
}

const SectionLabel = ({ children }) => (
  <div style={{ fontSize: '0.6875rem', fontWeight: 600, fontFamily: FONT_FAMILY, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.1rem' }}>{children}</div>
)

const Card = ({ children, style, ...props }) => (
  <div style={{ background: 'white', borderRadius: '16px', padding: '1.1rem 1.4rem', border: '0.5px solid rgba(94,59,135,0.08)', marginBottom: '1rem', boxShadow: BOX_SHADOW, ...style }} {...props}>{children}</div>
)

const Input = ({ style, ...props }) => (
  <input style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid rgba(94,59,135,0.15)', borderRadius: '10px', fontSize: '0.875rem', color: '#1a1a1a', outline: 'none', fontFamily: FONT_FAMILY, boxSizing: 'border-box', background: 'white', ...style }} {...props} />
)

const Badge = ({ children, bg = '#f0ebf8', color = '#5e3b87' }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', background: bg, color, borderRadius: '999px', padding: '0.18rem 0.65rem', fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.05em', fontFamily: FONT_FAMILY, whiteSpace: 'nowrap' }}>{children}</span>
)

function ConflictWarning({ partners, bannedItems, onNavigate }) {
  const conflicts = partners.filter(p =>
    p.specialty && bannedItems.some(b => p.specialty.toLowerCase().includes(b) || b.includes(p.specialty.toLowerCase()))
  )
  if (!conflicts.length) return null
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem', padding: '0.6rem 0.75rem', background: '#fffbeb', border: '1px solid rgba(240,165,0,0.4)', borderRadius: '8px', fontSize: '0.78rem', color: '#78460a', lineHeight: 1.45 }}>
      <span style={{ flexShrink: 0, marginTop: '0.05rem' }}>⚠</span>
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: '0.4rem' }}>{conflicts.map(p => p.name).join(', ')} {conflicts.length === 1 ? 'specialises' : 'specialise'} in a service you've marked as out-of-scope. Your AI may refer callers for work you don't want to take.</div>
        <button onClick={() => onNavigate && onNavigate('profile')} style={{ padding: '0.25rem 0.65rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: 5, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: FONT_FAMILY }}>
          → Review banned items in Business Profile
        </button>
      </div>
    </div>
  )
}

const PartnerRow = ({ p, isLast, i, referralCode, previewReadOnly, onCopyInvite, onLogInbound, onRemove, inviteCopied }) => {
  const { bar, ab, at } = specialtyColour(p.specialty)
  const status = relationshipStatus(p.sentCount, p.inboundCount)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 80px 80px 160px auto',
      gap: '0.5rem',
      alignItems: 'center',
      padding: '0.7rem 0.5rem',
      borderBottom: isLast ? 'none' : '1px solid rgba(94,59,135,0.05)',
      borderLeft: `3px solid ${bar}`,
      borderRadius: i === 0 ? '8px 8px 0 0' : isLast ? '0 0 8px 8px' : '0',
      background: status.urgent ? 'rgba(254,243,208,0.35)' : 'transparent',
      transition: 'background 0.12s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: '8px', background: ab, color: at, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.72rem', flexShrink: 0 }}>
          {initials(p.name)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: FONT_FAMILY }}>{p.name}</div>
          {p.specialty && <div style={{ fontSize: '0.7rem', color: '#999', fontFamily: FONT_FAMILY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.specialty}</div>}
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: p.sentCount > 0 ? '#166534' : '#ddd', lineHeight: 1 }}>{p.sentCount}</div>
        <div style={{ fontSize: '0.62rem', color: '#bbb', fontFamily: FONT_FAMILY }}>sent</div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: p.inboundCount > 0 ? '#5e3b87' : '#ddd', lineHeight: 1 }}>{p.inboundCount}</div>
        <div style={{ fontSize: '0.62rem', color: '#bbb', fontFamily: FONT_FAMILY }}>received</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        <span style={{ display: 'inline-block', padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700, background: status.bg, color: status.color, fontFamily: FONT_FAMILY, whiteSpace: 'nowrap', width: 'fit-content' }}>
          {status.label}
        </span>
        {status.urgent && referralCode && (
          <button
            onClick={() => onCopyInvite(p.name)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: 6, border: '1px solid rgba(240,165,0,0.4)', background: 'rgba(240,165,0,0.08)', color: '#92610a', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', fontFamily: FONT_FAMILY, whiteSpace: 'nowrap', width: 'fit-content' }}
          >
            {inviteCopied === p.name ? <Check size={10} /> : <ExternalLink size={10} />}
            {inviteCopied === p.name ? 'Link copied!' : 'Invite to Qerxel'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
        {!previewReadOnly && (
          <button
            onClick={() => onLogInbound(p.id)}
            title="Log a referral received from this partner"
            style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem', borderRadius: 5, border: '1px solid rgba(94,59,135,0.15)', background: 'white', color: '#5e3b87', cursor: 'pointer', fontFamily: FONT_FAMILY, whiteSpace: 'nowrap', fontWeight: 500 }}
          >
            + received
          </button>
        )}
        <button
          onClick={() => onRemove(p.id)}
          style={{ background: 'none', border: 'none', cursor: previewReadOnly ? 'default' : 'pointer', color: '#e0e0e0', fontSize: '1rem', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
          title="Remove partner"
        >×</button>
      </div>
    </div>
  )
}

const AddPartnerForm = ({ draft, setDraft, onAdd, adding, previewReadOnly }) => (
  <div style={{ borderTop: '1px solid rgba(94,59,135,0.07)', paddingTop: '1.25rem' }}>
    <SectionLabel>Add a partner</SectionLabel>
    <div style={{ marginBottom: '0.5rem' }} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
      <Input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && onAdd()} placeholder="Business name" />
      <Input value={draft.phone} onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))} placeholder="Phone (optional)" type="tel" />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem' }}>
      <Input value={draft.specialty} onChange={e => setDraft(d => ({ ...d, specialty: e.target.value }))} onKeyDown={e => e.key === 'Enter' && onAdd()} placeholder="What do they specialise in? (e.g. Electrical work...)" />
      <button
        onClick={onAdd}
        disabled={!draft.name.trim() || adding || previewReadOnly}
        style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none', background: !draft.name.trim() || adding ? '#f5d98a' : '#f0a500', color: !draft.name.trim() || adding ? '#7a5c1a' : '#1a0533', fontSize: '0.8125rem', fontWeight: 700, cursor: !draft.name.trim() || adding ? 'not-allowed' : 'pointer', fontFamily: FONT_FAMILY, whiteSpace: 'nowrap', alignSelf: 'center' }}
      >
        {adding ? 'Adding…' : '+ Add partner'}
      </button>
    </div>
  </div>
)

const ReferralCodePanel = ({ referralCode, referralUrl, onCopyCode, onCopyLink, codeCopied, linkCopied }) => {
  if (!referralCode) {
    return (
      <div style={{ background: 'linear-gradient(135deg, #4a2d6e 0%, #3a2057 60%)', borderRadius: '20px', padding: '2rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
        Code appears once your account is activated.
      </div>
    )
  }
  const fullUrl = `https://${referralUrl}`
  return (
    <div style={{ background: 'linear-gradient(135deg, #4a2d6e 0%, #3a2057 60%, #2d1a45 100%)', borderRadius: '20px', padding: '2rem', marginBottom: '1rem', boxShadow: '0 8px 32px rgba(94,59,135,0.35)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', fontFamily: FONT_FAMILY, marginBottom: '0.75rem' }}>
            Your Referral Code
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '3rem', fontWeight: 700, color: '#f0a500', letterSpacing: '0.12em', lineHeight: 1, marginBottom: '1.25rem', textShadow: '0 0 40px rgba(240,165,0,0.4)' }}>
            {referralCode}
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <button onClick={onCopyCode} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', borderRadius: '8px', border: 'none', background: codeCopied ? '#3db87a' : '#f0a500', color: codeCopied ? 'white' : '#1a0533', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', fontFamily: FONT_FAMILY, transition: 'all 0.2s' }}>
              {codeCopied ? <Check size={13} /> : <Copy size={13} />}
              {codeCopied ? 'Copied!' : 'Copy code'}
            </button>
            <button onClick={onCopyLink} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', fontFamily: FONT_FAMILY }}>
              <ExternalLink size={13} />
              {linkCopied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', fontFamily: FONT_FAMILY }}>{referralUrl}</div>
        </div>
        <div style={{ flexShrink: 0 }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(fullUrl)}&size=130x130&margin=4`} alt="Referral QR code" width={130} height={130} style={{ display: 'block', borderRadius: 6 }} />
          </div>
          <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.67rem', color: 'rgba(255,255,255,0.3)', fontFamily: FONT_FAMILY }}>Scan to sign up</div>
        </div>
      </div>
    </div>
  )
}

function PartnerInviteModal({ showInviteModal, setShowInviteModal, inviteModalPulsing, partners, outboundTotal, msgCopied, copyInviteMsg, referralCode, copyLink, linkCopied }) {
  if (!showInviteModal) return null
  const p = partners.find(q => q.sentCount > 0) || partners[0]
  const n = outboundTotal
  const previewMsg = `"Hi ${p?.name || 'there'} — I've been using Qerxel AI for my missed calls and have already referred ${n} enquir${n === 1 ? 'y' : 'ies'} your way. Your first month is free on me — and if you sign up using my code, you automatically become my overspill partner so your AI starts sending callers back to me too."`
  return (
    <>
      <style>{`@keyframes invitePulse { 0%{box-shadow:0 0 0 0 rgba(240,165,0,0.7)} 70%{box-shadow:0 0 0 24px rgba(240,165,0,0)} 100%{box-shadow:0 0 0 0 rgba(240,165,0,0)} }`}</style>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(26,5,51,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: '1rem' }}
        onClick={() => setShowInviteModal(false)}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{ background: 'linear-gradient(135deg, #4a2d6e 0%, #3a2057 100%)', borderRadius: 20, padding: '2rem', maxWidth: 460, width: '100%', boxShadow: '0 24px 60px rgba(94,59,135,0.45)', position: 'relative', animation: inviteModalPulsing ? 'invitePulse 0.9s ease-out' : 'none' }}
        >
          <button onClick={() => setShowInviteModal(false)}
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '1.2rem', lineHeight: 1 }}>×</button>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', color: '#f0a500', textTransform: 'uppercase', fontFamily: FONT_FAMILY, marginBottom: '0.5rem' }}>
            💡 You've been referring business their way
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.15rem', color: 'white', marginBottom: '0.5rem', lineHeight: 1.25 }}>
            Why not invite them to Qerxel?
          </div>
          <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            They get their first month free — and automatically become your overspill partner, so their AI starts sending callers back to you.
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '0.85rem 1rem', marginBottom: '1.1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: FONT_FAMILY, marginBottom: '0.45rem' }}>Message ready to copy</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, fontFamily: FONT_FAMILY, fontStyle: 'italic' }}>
              {previewMsg}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.1rem', flexWrap: 'wrap' }}>
            <button onClick={copyInviteMsg}
              style={{ flex: 1, padding: '0.7rem 1rem', background: msgCopied ? '#3db87a' : '#f0a500', color: msgCopied ? 'white' : '#1a0533', border: 'none', borderRadius: 10, fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'background 0.2s' }}>
              {msgCopied ? '✓ Copied to clipboard' : 'Copy message'}
            </button>
            {referralCode && (
              <button onClick={copyLink}
                style={{ flex: 1, padding: '0.7rem 1rem', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, fontFamily: FONT_FAMILY, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                {linkCopied ? '✓ Link copied' : 'Copy invite link'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => {
              localStorage.setItem('qx_partner_invite_snoozed', String(Date.now() + 14 * 24 * 60 * 60 * 1000))
              setShowInviteModal(false)
            }} style={{ padding: '0.35rem 0.85rem', background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, color: 'rgba(255,255,255,0.35)', fontSize: '0.775rem', cursor: 'pointer', fontFamily: FONT_FAMILY }}>
              Remind me in 2 weeks
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

const PartnersReferrals = ({ onNavigate }) => {
  const { user } = useAuth()
  const preview  = usePreview()
  const isPreview = !!preview?.isPreview
  const previewReadOnly = preview?.previewReadOnly ?? isPreview

  const [loading, setLoading]             = useState(true)
  const [tenantId, setTenantId]           = useState(null)
  const [referralCode, setReferralCode]   = useState('')
  const [creditMonths, setCreditMonths]   = useState(0)
  const [partners, setPartners]           = useState([])
  const [outboundTotal, setOutboundTotal] = useState(0)
  const [outboundThisMonth, setOutboundThisMonth] = useState(0)
  const [draft, setDraft]                 = useState({ name: '', phone: '', specialty: '' })
  const [adding, setAdding]               = useState(false)
  const [bannedItems, setBannedItems]     = useState([])
  const [codeCopied, setCodeCopied]       = useState(false)
  const [linkCopied, setLinkCopied]       = useState(false)
  const [inviteCopied, setInviteCopied]   = useState(null)
  const [showInviteModal, setShowInviteModal]     = useState(false)
  const [inviteModalPulsing, setInviteModalPulsing] = useState(false)
  const [msgCopied, setMsgCopied]         = useState(false)
  const pulseTimerRef = useRef(null)
  const pulseAnimRef  = useRef(null)

  const referralUrl     = referralCode ? `qerxel.com/join?ref=${referralCode}` : ''
  const fullReferralUrl = `https://${referralUrl}`

  useEffect(() => {
    if (!user && !isPreview) return
    const load = async () => {
      setLoading(true)
      try {
        let tid = isPreview ? preview.previewTenantId : null
        if (!isPreview) {
          const { data: m } = await supabase.from('tenant_memberships').select('tenant_id').eq('user_id', user.id).maybeSingle()
          if (!m) return
          tid = m.tenant_id
        }
        setTenantId(tid)

        const [tenantRes, partnerRes, logRes, bannedRes] = await Promise.all([
          supabase.from('tenants').select('referral_code, credit_balance_months, business_name').eq('id', tid).maybeSingle(),
          supabase.from('referral_partners').select('id, partner_name, contact_phone, inbound_count').eq('tenant_id', tid).order('created_at', { ascending: true }),
          supabase.from('referral_log').select('partner_id').eq('tenant_id', tid),
          supabase.from('banned_services').select('banned_item').eq('tenant_id', tid),
        ])

        setBannedItems((bannedRes.data || []).map(b => b.banned_item.toLowerCase()))

        if (tenantRes.data) {
          let code = tenantRes.data.referral_code || ''
          if (!code && tid && !isPreview) {
            const raw = tenantRes.data.business_name || 'QERXEL'
            code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'QERXEL'
            await supabase.from('tenants').update({ referral_code: code }).eq('id', tid)
          }
          setReferralCode(code)
          setCreditMonths(tenantRes.data.credit_balance_months || 0)
        }

        const sentByPartner = {}
        ;(logRes.data || []).forEach(r => {
          if (r.partner_id) sentByPartner[r.partner_id] = (sentByPartner[r.partner_id] || 0) + 1
        })

        const partnerIds = (partnerRes.data || []).map(p => p.id)
        const specialtyRes = partnerIds.length > 0
          ? await supabase.from('referral_service_map').select('partner_id, service_keyword').in('partner_id', partnerIds)
          : { data: [] }

        const specMap = {}
        ;(specialtyRes.data || []).forEach(r => { if (!specMap[r.partner_id]) specMap[r.partner_id] = r.service_keyword })

        setPartners((partnerRes.data || []).map(p => ({
          id: p.id,
          name: p.partner_name,
          phone: p.contact_phone || '',
          specialty: specMap[p.id] || '',
          sentCount: sentByPartner[p.id] || 0,
          inboundCount: p.inbound_count || 0,
        })))

        setOutboundTotal((logRes.data || []).length)
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
        const { count: mc } = await supabase.from('referral_log').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).gte('created_at', monthStart.toISOString())
        setOutboundThisMonth(mc || 0)
      } catch (err) {
        console.error('Partners load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, isPreview]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (loading || outboundTotal === 0) return undefined
    return setupPulseModal({ outboundTotal, setShowInviteModal, setInviteModalPulsing, pulseTimerRef, pulseAnimRef })
  }, [loading, outboundTotal])

  const handleAddPartner = async () => {
    if (previewReadOnly || !tenantId || !draft.name.trim()) return
    setAdding(true)
    const { data: np, error } = await supabase.from('referral_partners')
      .insert({ tenant_id: tenantId, partner_name: draft.name.trim(), contact_phone: draft.phone.trim() || null })
      .select('id, partner_name, contact_phone, inbound_count').maybeSingle()
    if (!error && np) {
      if (draft.specialty.trim()) {
        await supabase.from('referral_service_map').insert({ partner_id: np.id, service_keyword: draft.specialty.trim() })
      }
      setPartners(prev => [...prev, { id: np.id, name: np.partner_name, phone: np.contact_phone || '', specialty: draft.specialty.trim(), sentCount: 0, inboundCount: 0 }])
      setDraft({ name: '', phone: '', specialty: '' })
    }
    setAdding(false)
  }

  const handleRemovePartner = async (id) => {
    if (previewReadOnly) return
    await supabase.from('referral_service_map').delete().eq('partner_id', id)
    await supabase.from('referral_partners').delete().eq('id', id)
    setPartners(prev => prev.filter(p => p.id !== id))
  }

  const handleLogInbound = async (id) => {
    if (previewReadOnly) return
    setPartners(prev => prev.map(p => {
      if (p.id !== id) return p
      const nextCount = p.inboundCount + 1
      supabase.from('referral_partners').update({ inbound_count: nextCount }).eq('id', id).then()
      return { ...p, inboundCount: nextCount }
    }))
  }

  const handleCopyInvite = (name) => {
    navigator.clipboard.writeText(`${fullReferralUrl}&from=${encodeURIComponent(name)}`).then(() => {
      setInviteCopied(name)
      setTimeout(() => setInviteCopied(null), 2000)
    })
  }

  const handleCopyCode = () => navigator.clipboard.writeText(referralCode).then(() => { setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000) })
  const handleCopyLink = () => navigator.clipboard.writeText(fullReferralUrl).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) })

  const copyInviteMsg = () => {
    const p = partners.find(p => p.sentCount > 0) || partners[0]
    const n = outboundTotal
    const msg = `Hi ${p?.name || 'there'} — I've been using Qerxel AI to handle my missed calls and have already referred ${n} enquir${n === 1 ? 'y' : 'ies'} your way. I thought you'd find it useful too, and your first month is free on me. If you sign up using my code it also makes you my overspill partner — so your AI starts sending callers back to me too. Sign up at https://${referralUrl || 'qerxel.com/join'}`
    navigator.clipboard.writeText(msg).then(() => { setMsgCopied(true); setTimeout(() => setMsgCopied(false), 2500) })
  }

  if (loading) return <div style={{ padding: '2rem', color: '#aaa', fontSize: '0.875rem' }}>Loading partners…</div>

  const strength    = networkStrength(partners.length)
  const urgentCount = partners.filter(p => p.sentCount > 0 && p.inboundCount === 0).length

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}
        data-help="Referrals sent by your AI, partners who need to reciprocate, and free months earned from your referral code.">
        <button onClick={() => onNavigate?.('dashboard')} style={{ background: '#bbf7d0', borderRadius: '14px', padding: '1.1rem 1rem', border: '1px solid rgba(61,184,122,0.3)', textAlign: 'center', cursor: 'pointer' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '2rem', fontWeight: 700, color: '#166534' }}>{outboundTotal}</div>
          <div style={{ fontSize: '0.69rem', fontWeight: 700, color: '#1e7a4a', textTransform: 'uppercase', fontFamily: FONT_FAMILY }}>Referrals sent</div>
          <div style={{ fontSize: '0.68rem', color: '#166534', marginTop: '0.2rem', fontFamily: FONT_FAMILY, opacity: 0.7 }}>
            {outboundThisMonth > 0 ? `${outboundThisMonth} this month` : 'Partners obligated'}
          </div>
        </button>
        <div style={{ background: urgentCount > 0 ? '#fef3d0' : '#f1f5f9', borderRadius: '14px', padding: '1.1rem 1rem', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '2rem', fontWeight: 700, color: urgentCount > 0 ? '#92610a' : '#d1d5db' }}>{urgentCount}</div>
          <div style={{ fontSize: '0.69rem', fontWeight: 700, textTransform: 'uppercase', fontFamily: FONT_FAMILY }}>Reciprocate</div>
        </div>
        <div style={{ background: creditMonths > 0 ? '#ddd6fe' : '#f1f5f9', borderRadius: '14px', padding: '1.1rem 1rem', textAlign: 'center' }}
          data-help="Credits are earned when someone signs up using your referral code. One signup = one free month.">
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '2rem', fontWeight: 700, color: creditMonths > 0 ? '#4a2d6e' : '#d1d5db' }}>{creditMonths}</div>
          <div style={{ fontSize: '0.69rem', fontWeight: 700, textTransform: 'uppercase', fontFamily: FONT_FAMILY }}>Credits</div>
        </div>
      </div>

      <Card data-help="Your partner network — every partner your AI can refer callers to." data-help-score={networkScore(partners.length)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <SectionLabel>Your Partner Network</SectionLabel>
          {strength && <Badge bg={strength.bg} color={strength.color}>{strength.label}</Badge>}
        </div>

        <ConflictWarning partners={partners} bannedItems={bannedItems} onNavigate={onNavigate} />

        {partners.length === 0 ? (
          <div style={{ borderRadius: '14px', border: '1.5px dashed rgba(94,59,135,0.15)', padding: '2rem 1.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤝</div>
            <div style={{ fontFamily: FONT_FAMILY, fontWeight: 600, fontSize: '0.9rem', color: '#5e3b87', marginBottom: '0.35rem' }}>No partners yet</div>
            <div style={{ fontSize: '0.8rem', color: '#aaa', lineHeight: 1.55 }}>
              When your AI can't help a caller, it refers them here.<br />Every referral creates a reciprocal obligation.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '0.75rem' }}>
            {partners.map((p, idx) => (
              <PartnerRow
                key={p.id}
                p={p}
                i={idx}
                isLast={idx === partners.length - 1}
                referralCode={referralCode}
                previewReadOnly={previewReadOnly}
                onCopyInvite={handleCopyInvite}
                onLogInbound={handleLogInbound}
                onRemove={handleRemovePartner}
                inviteCopied={inviteCopied}
              />
            ))}
          </div>
        )}

        <AddPartnerForm
          draft={draft}
          setDraft={setDraft}
          onAdd={handleAddPartner}
          adding={adding}
          previewReadOnly={previewReadOnly}
        />
      </Card>

      <Card data-help="How your referral network is performing. Reciprocation means your partners sign up to Qerxel and add you as their partner — then their AI starts sending callers to you." data-help-score={reciprocHelpScore(partners)}>
        <div style={{ background: 'linear-gradient(135deg, #5e3b87 0%, #3a2057 100%)', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8375rem', fontWeight: 600, color: 'white', marginBottom: '0.2rem' }}>
              {urgentSummary(urgentCount, partners.length)}
            </div>
            <div style={{ fontSize: '0.775rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              {reciprocSummary(urgentCount, outboundTotal)}
            </div>
          </div>
        </div>
      </Card>

      <ReferralCodePanel
        referralCode={referralCode}
        referralUrl={referralUrl}
        onCopyCode={handleCopyCode}
        onCopyLink={handleCopyLink}
        codeCopied={codeCopied}
        linkCopied={linkCopied}
      />

      <PartnerInviteModal
        showInviteModal={showInviteModal}
        setShowInviteModal={setShowInviteModal}
        inviteModalPulsing={inviteModalPulsing}
        partners={partners}
        outboundTotal={outboundTotal}
        msgCopied={msgCopied}
        copyInviteMsg={copyInviteMsg}
        referralCode={referralCode}
        copyLink={handleCopyLink}
        linkCopied={linkCopied}
      />
    </div>
  )
}

export default PartnersReferrals
