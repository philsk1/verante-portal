import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { usePreview } from '../context/PreviewContext'
import { useDemo } from '../context/DemoContext'
import { Copy, Check, ExternalLink } from 'lucide-react'

// ─── colour system ────────────────────────────────────────────────────────────

const specialtyColour = (spec) => {
  if (!spec) return { bar: '#5e3b87', ab: '#ddd6fe', at: '#4a2d6e', cb: '#f5f3ff', ct: '#4a2d6e' }
  const t = spec.toLowerCase()
  if (/plumb|electr|build|roof|carpet|floor|paint|decorat|gas|heat|air.?con|window|door|fenc|garden|lands|clean|waste|skip|pest|lock|glaz|tile|brick|concret|drain|guttr|joiner|carpent|handyman|damp|roofer|scaffold/.test(t))
    return { bar: '#f0a500', ab: '#fde68a', at: '#78460a', cb: '#fffbeb', ct: '#78460a' }
  if (/physio|dental|dentist|doctor|osteo|chiro|optici|optom|mental|counsel|therap|health|medic|nurse|pharmac|beauty|hair|salon|spa|massage|nutrition|diet|gym|fitness|yoga|pilates|sport|care|wellbeing|grooming/.test(t))
    return { bar: '#3db87a', ab: '#bbf7d0', at: '#166534', cb: '#f0fdf4', ct: '#166534' }
  if (/solicit|account|legal|law|financ|ifa|mortgage|insur|consult|audit|tax|architect|engineer|recruit|market|design|tech|web|software|media|print|photog|video/.test(t))
    return { bar: '#1d4ed8', ab: '#bfdbfe', at: '#1e3a8a', cb: '#eff6ff', ct: '#1e3a8a' }
  return { bar: '#5e3b87', ab: '#ddd6fe', at: '#4a2d6e', cb: '#f5f3ff', ct: '#4a2d6e' }
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

// ─── primitives ───────────────────────────────────────────────────────────────

const SectionLabel = ({ children }) => (
  <div style={{ fontSize: '0.6875rem', fontWeight: 600, fontFamily: "'DM Sans', sans-serif", color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.1rem' }}>{children}</div>
)

const Card = ({ children, style, ...props }) => (
  <div style={{ background: 'white', borderRadius: '16px', padding: '1.1rem 1.4rem', border: '0.5px solid rgba(94,59,135,0.08)', marginBottom: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.06)', ...style }} {...props}>{children}</div>
)

const Input = ({ style, ...props }) => (
  <input style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid rgba(94,59,135,0.15)', borderRadius: '10px', fontSize: '0.875rem', color: '#1a1a1a', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', background: 'white', ...style }} {...props} />
)

const Badge = ({ children, bg = '#f0ebf8', color = '#5e3b87' }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', background: bg, color, borderRadius: '999px', padding: '0.18rem 0.65rem', fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.05em', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>{children}</span>
)

// ─── main component ───────────────────────────────────────────────────────────

const PartnersReferrals = ({ onNavigate }) => {
  const { user } = useAuth()
  const preview  = usePreview()
  const demo     = useDemo()
  const isDemo    = !!demo?.isDemo || !!preview?.isDemo
  const isPreview = !!preview?.isPreview

  const [loading, setLoading]             = useState(true)
  const [tenantId, setTenantId]           = useState(null)
  const [referralCode, setReferralCode]   = useState('')
  const [creditMonths, setCreditMonths]   = useState(0)
  const [partners, setPartners]           = useState([])      // { id, name, phone, specialty, sentCount, inboundCount }
  const [outboundTotal, setOutboundTotal] = useState(0)
  const [outboundThisMonth, setOutboundThisMonth] = useState(0)
  const [draft, setDraft]                 = useState({ name: '', phone: '', specialty: '' })
  const [adding, setAdding]               = useState(false)
  const [codeCopied, setCodeCopied]       = useState(false)
  const [linkCopied, setLinkCopied]       = useState(false)
  const [inviteCopied, setInviteCopied]   = useState(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteModalPulsing, setInviteModalPulsing] = useState(false)
  const [msgCopied, setMsgCopied] = useState(false)
  const pulseTimerRef = useRef(null)
  const pulseAnimRef  = useRef(null)

  const referralUrl     = referralCode ? `qerxel.com/join?ref=${referralCode}` : ''
  const fullReferralUrl = `https://${referralUrl}`

  // ── Demo ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!demo?.isDemo || demo.loading || !demo.business) return
    const code = demo.business.referral_code || 'DEMO2026'
    setReferralCode(code)
    setCreditMonths(0)

    const referralsByPartnerName = {}
    ;(demo.referrals || []).forEach(r => {
      const key = r.partner_name
      if (key) referralsByPartnerName[key] = (referralsByPartnerName[key] || 0) + 1
    })

    const mapped = (demo.partners || []).map(p => ({
      id:            p.id,
      name:          p.partner_name,
      phone:         p.partner_phone || '',
      specialty:     p.specialty || '',
      sentCount:     referralsByPartnerName[p.partner_name] || 0,
      inboundCount:  p.inbound_count || 0,
    }))
    setPartners(mapped)
    const total = (demo.referrals || []).length
    setOutboundTotal(total)
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
    setOutboundThisMonth((demo.referrals || []).filter(r => new Date(r.created_at) >= monthStart).length)
    setLoading(false)
  }, [demo?.isDemo, demo?.business?.id, demo?.loading])

  // ── Real tenant ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (demo?.isDemo) return
    if (!user && !isPreview) return
    const load = async () => {
      setLoading(true)
      try {
        let tid
        if (isPreview) {
          tid = preview.previewTenantId
        } else {
          const { data: m } = await supabase.from('tenant_memberships').select('tenant_id').eq('user_id', user.id).maybeSingle()
          if (!m) return
          tid = m.tenant_id
        }
        setTenantId(tid)

        const [tenantRes, partnerRes, logRes] = await Promise.all([
          supabase.from('tenants').select('referral_code, credit_balance_months').eq('id', tid).maybeSingle(),
          supabase.from('referral_partners').select('id, partner_name, contact_phone, inbound_count').eq('tenant_id', tid).order('created_at', { ascending: true }),
          supabase.from('referral_log').select('partner_id').eq('tenant_id', tid),
        ])

        if (tenantRes.data) {
          setReferralCode(tenantRes.data.referral_code || '')
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

        const mapped = (partnerRes.data || []).map(p => ({
          id:           p.id,
          name:         p.partner_name,
          phone:        p.contact_phone || '',
          specialty:    specMap[p.id] || '',
          sentCount:    sentByPartner[p.id] || 0,
          inboundCount: p.inbound_count || 0,
        }))
        setPartners(mapped)

        const total = (logRes.data || []).length
        setOutboundTotal(total)
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
  }, [user, isPreview])

  const addPartner = async () => {
    if (isDemo || isPreview || !tenantId) return
    const name = draft.name.trim()
    if (!name) return
    setAdding(true)
    const { data: np, error } = await supabase.from('referral_partners')
      .insert({ tenant_id: tenantId, partner_name: name, contact_phone: draft.phone.trim() || null })
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

  const removePartner = async (id) => {
    if (isDemo || isPreview) return
    await supabase.from('referral_service_map').delete().eq('partner_id', id)
    await supabase.from('referral_partners').delete().eq('id', id)
    setPartners(prev => prev.filter(p => p.id !== id))
  }

  const logInbound = async (id) => {
    if (isDemo || isPreview) return
    const partner = partners.find(p => p.id === id)
    if (!partner) return
    const newCount = partner.inboundCount + 1
    setPartners(prev => prev.map(p => p.id === id ? { ...p, inboundCount: newCount } : p))
    await supabase.from('referral_partners').update({ inbound_count: newCount }).eq('id', id)
  }

  const copyInvite = (partnerName) => {
    const link = `${fullReferralUrl}&from=${encodeURIComponent(partnerName)}`
    navigator.clipboard.writeText(link).then(() => {
      setInviteCopied(partnerName)
      setTimeout(() => setInviteCopied(null), 2000)
    })
  }

  const copyCode = () => navigator.clipboard.writeText(referralCode).then(() => { setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000) })
  const copyLink = () => navigator.clipboard.writeText(fullReferralUrl).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) })

  const copyInviteMsg = () => {
    const p = partners.find(p => p.sentCount > 0) || partners[0]
    const n = outboundTotal
    const msg = `Hi ${p?.name || 'there'} — I've been using Qerxel AI to handle my missed calls and have already referred ${n} enquir${n === 1 ? 'y' : 'ies'} your way. I thought you'd find it useful too, and your first month is free on me. If you sign up using my code it also makes you my overspill partner — so your AI starts sending callers back to me too. Sign up at https://${referralUrl || 'qerxel.com/join'}`
    navigator.clipboard.writeText(msg).then(() => { setMsgCopied(true); setTimeout(() => setMsgCopied(false), 2500) })
  }

  // Show invite modal when referrals exist
  useEffect(() => {
    if (loading || outboundTotal === 0) return
    const snooze = localStorage.getItem('qx_partner_invite_snoozed')
    if (snooze && Date.now() < parseInt(snooze, 10)) return
    const t = setTimeout(() => {
      setShowInviteModal(true)
      pulseTimerRef.current = setTimeout(() => {
        setInviteModalPulsing(true)
        pulseAnimRef.current = setTimeout(() => setInviteModalPulsing(false), 900)
      }, 10000)
    }, 700)
    return () => { clearTimeout(t); clearTimeout(pulseTimerRef.current); clearTimeout(pulseAnimRef.current) }
  }, [loading, outboundTotal])

  if (loading) return <div style={{ padding: '2rem', color: '#aaa', fontSize: '0.875rem' }}>Loading partners…</div>

  const strength = networkStrength(partners.length)
  const urgentCount = partners.filter(p => p.sentCount > 0 && p.inboundCount === 0).length

  return (
    <div>

      {/* ── KPI TILES ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}
        data-help="Referrals sent by your AI, partners who need to reciprocate, and free months earned from your referral code.">
        <button
          onClick={() => onNavigate && onNavigate('dashboard')}
          style={{ background: '#bbf7d0', borderRadius: '14px', padding: '1.1rem 1rem', border: '1px solid rgba(61,184,122,0.3)', textAlign: 'center', cursor: onNavigate ? 'pointer' : 'default', transition: 'transform 0.15s, box-shadow 0.15s' }}
          onMouseEnter={e => { if (onNavigate) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(61,184,122,0.2)' } }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
        >
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '2rem', fontWeight: 700, color: '#166534', lineHeight: 1, marginBottom: '0.25rem' }}>{outboundTotal}</div>
          <div style={{ fontSize: '0.69rem', fontWeight: 700, color: '#1e7a4a', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'DM Sans', sans-serif" }}>Referrals sent</div>
          <div style={{ fontSize: '0.68rem', color: '#166534', marginTop: '0.2rem', fontFamily: "'DM Sans', sans-serif", opacity: 0.7 }}>
            {outboundThisMonth > 0 ? `${outboundThisMonth} this month` : 'Partners obligated'}
          </div>
        </button>

        <div style={{ background: urgentCount > 0 ? '#fef3d0' : '#f1f5f9', borderRadius: '14px', padding: '1.1rem 1rem', border: urgentCount > 0 ? '1px solid rgba(240,165,0,0.4)' : '1px solid rgba(203,213,225,0.3)', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '2rem', fontWeight: 700, color: urgentCount > 0 ? '#92610a' : '#d1d5db', lineHeight: 1, marginBottom: '0.25rem' }}>{urgentCount}</div>
          <div style={{ fontSize: '0.69rem', fontWeight: 700, color: urgentCount > 0 ? '#78460a' : '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'DM Sans', sans-serif" }}>Need to reciprocate</div>
          <div style={{ fontSize: '0.68rem', color: urgentCount > 0 ? '#92610a' : '#bbb', marginTop: '0.2rem', fontFamily: "'DM Sans', sans-serif" }}>
            {urgentCount > 0 ? 'Invite them to Qerxel' : 'All relationships active'}
          </div>
        </div>

        <div style={{ background: creditMonths > 0 ? '#ddd6fe' : '#f1f5f9', borderRadius: '14px', padding: '1.1rem 1rem', border: creditMonths > 0 ? '1px solid rgba(94,59,135,0.3)' : '1px solid rgba(203,213,225,0.4)', textAlign: 'center' }}
          data-help="Credits are earned when someone signs up using your referral code. One signup = one free month.">
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '2rem', fontWeight: 700, color: creditMonths > 0 ? '#4a2d6e' : '#d1d5db', lineHeight: 1, marginBottom: '0.25rem' }}>{creditMonths}</div>
          <div style={{ fontSize: '0.69rem', fontWeight: 700, color: creditMonths > 0 ? '#5e3b87' : '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'DM Sans', sans-serif" }}>Credits earned</div>
          <div style={{ fontSize: '0.68rem', color: '#888', marginTop: '0.2rem', fontFamily: "'DM Sans', sans-serif" }}>
            {creditMonths === 1 ? '1 month free' : creditMonths > 1 ? `${creditMonths} months free` : 'Share your code below'}
          </div>
        </div>
      </div>

      {/* ── PARTNER LIST ──────────────────────────────────────────────────── */}
      <Card data-help="Your partner network — every partner your AI can refer callers to. Referrals sent is how many callers your AI has referred to them. Received is how many they've sent back. Reciprocate means they sign up to Qerxel and add you as their partner.">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <SectionLabel>Your Partner Network</SectionLabel>
          <Badge bg="#e6f5ee" color="#1e7a4a">All plans · unlimited</Badge>
          {strength && <Badge bg={strength.bg} color={strength.color}>{strength.label}</Badge>}
          {partners.length > 0 && (
            <span style={{ marginLeft: 'auto', fontFamily: "'Syne', sans-serif", fontSize: '1.25rem', fontWeight: 700, color: '#5e3b87' }}>
              {partners.length}
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', fontWeight: 400, color: '#aaa', marginLeft: '0.3rem' }}>
                {partners.length === 1 ? 'partner' : 'partners'}
              </span>
            </span>
          )}
        </div>

        {/* column headers */}
        {partners.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 160px auto', gap: '0.5rem', alignItems: 'center', padding: '0 0.5rem 0.5rem', borderBottom: '1px solid rgba(94,59,135,0.06)', marginBottom: '0.25rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'DM Sans', sans-serif" }}>Partner</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'DM Sans', sans-serif", textAlign: 'center' }}>↗ Sent</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'DM Sans', sans-serif", textAlign: 'center' }}>↙ Received</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'DM Sans', sans-serif" }}>Relationship</div>
            <div />
          </div>
        )}

        {/* partner rows */}
        {partners.length === 0 ? (
          <div style={{ borderRadius: '14px', border: '1.5px dashed rgba(94,59,135,0.15)', padding: '2rem 1.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤝</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.9rem', color: '#5e3b87', marginBottom: '0.35rem' }}>No partners yet</div>
            <div style={{ fontSize: '0.8rem', color: '#aaa', lineHeight: 1.55 }}>
              When your AI can't help a caller, it refers them here.<br />Every referral creates a reciprocal obligation.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '0.75rem' }}>
            {partners.map((p, i) => {
              const { bar, ab, at } = specialtyColour(p.specialty)
              const status = relationshipStatus(p.sentCount, p.inboundCount)
              const isLast = i === partners.length - 1
              return (
                <div key={p.id} style={{
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
                  {/* Partner identity */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '8px', background: ab, color: at, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.72rem', flexShrink: 0 }}>
                      {initials(p.name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>{p.name}</div>
                      {p.specialty && <div style={{ fontSize: '0.7rem', color: '#999', fontFamily: "'DM Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.specialty}</div>}
                    </div>
                  </div>

                  {/* Sent */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: p.sentCount > 0 ? '#166534' : '#ddd', lineHeight: 1 }}>{p.sentCount}</div>
                    <div style={{ fontSize: '0.62rem', color: '#bbb', fontFamily: "'DM Sans', sans-serif" }}>sent</div>
                  </div>

                  {/* Received */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: p.inboundCount > 0 ? '#5e3b87' : '#ddd', lineHeight: 1 }}>{p.inboundCount}</div>
                    <div style={{ fontSize: '0.62rem', color: '#bbb', fontFamily: "'DM Sans', sans-serif" }}>received</div>
                  </div>

                  {/* Status + action */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <span style={{ display: 'inline-block', padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700, background: status.bg, color: status.color, fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', width: 'fit-content' }}>
                      {status.label}
                    </span>
                    {status.urgent && referralCode && (
                      <button
                        onClick={() => copyInvite(p.name)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: 6, border: '1px solid rgba(240,165,0,0.4)', background: 'rgba(240,165,0,0.08)', color: '#92610a', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', width: 'fit-content' }}
                      >
                        {inviteCopied === p.name ? <Check size={10} /> : <ExternalLink size={10} />}
                        {inviteCopied === p.name ? 'Link copied!' : 'Invite to Qerxel'}
                      </button>
                    )}
                  </div>

                  {/* Remove + log */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                    {!isDemo && !isPreview && (
                      <button
                        onClick={() => logInbound(p.id)}
                        title="Log a referral received from this partner"
                        style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem', borderRadius: 5, border: '1px solid rgba(94,59,135,0.15)', background: 'white', color: '#5e3b87', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', fontWeight: 500 }}
                      >
                        + received
                      </button>
                    )}
                    <button
                      onClick={() => removePartner(p.id)}
                      style={{ background: 'none', border: 'none', cursor: isDemo || isPreview ? 'default' : 'pointer', color: '#e0e0e0', fontSize: '1rem', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                      title="Remove partner"
                    >×</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* add form */}
        <div style={{ borderTop: '1px solid rgba(94,59,135,0.07)', paddingTop: '1.25rem' }}>
          <SectionLabel>Add a partner</SectionLabel>
          <div style={{ marginBottom: '0.5rem' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') addPartner() }} placeholder="Business name" />
            <Input value={draft.phone} onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))} placeholder="Phone (optional)" type="tel" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem' }}>
            <Input value={draft.specialty} onChange={e => setDraft(d => ({ ...d, specialty: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') addPartner() }} placeholder="What do they specialise in? (e.g. Electrical work, Commercial cleaning…)" />
            <button
              onClick={addPartner}
              disabled={!draft.name.trim() || adding || isDemo || isPreview}
              style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none', background: !draft.name.trim() || adding ? '#f5d98a' : '#f0a500', color: !draft.name.trim() || adding ? '#7a5c1a' : '#1a0533', fontSize: '0.8125rem', fontWeight: 700, cursor: !draft.name.trim() || adding ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', alignSelf: 'center' }}
            >
              {adding ? 'Adding…' : '+ Add partner'}
            </button>
          </div>
        </div>
      </Card>

      {/* ── NETWORK ACTIVITY ──────────────────────────────────────────────── */}
      <Card data-help="How your referral network is performing. Reciprocation means your partners sign up to Qerxel and add you as their partner — then their AI starts sending callers to you.">
        <div style={{ background: 'linear-gradient(135deg, #5e3b87 0%, #3a2057 100%)', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8375rem', fontWeight: 600, color: 'white', marginBottom: '0.2rem' }}>
              {urgentCount > 0
                ? `${urgentCount} partner${urgentCount > 1 ? 's' : ''} received referrals from you but haven't reciprocated yet`
                : partners.length > 0 ? 'All active partners are reciprocating — keep building the network'
                : 'Your referral network starts with your first partner'}
            </div>
            <div style={{ fontSize: '0.775rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              {urgentCount > 0
                ? 'Reciprocation means they sign up to Qerxel and add you as their partner. Use the invite link next to each one.'
                : outboundTotal > 0 ? 'Partners who receive multiple referrals from you feel genuine reciprocal obligation. Keep sending.'
                : 'Add your first partner above. When your AI refers a caller to them, the reciprocal expectation begins.'}
            </div>
          </div>
        </div>
      </Card>

      {/* ── REFERRAL CODE ─────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #4a2d6e 0%, #3a2057 60%, #2d1a45 100%)', borderRadius: '20px', padding: '2rem', marginBottom: '1rem', boxShadow: '0 8px 32px rgba(94,59,135,0.35)', position: 'relative', overflow: 'hidden' }}
        data-help="Your Referral Code is the quickest way to push partners to reciprocate. Share it with any partner — when they sign up using your code, you earn one free month and they automatically start as your network partner.">
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.75rem' }}>
              Your Referral Code
            </div>
            {!referralCode ? (
              <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>Code appears once your account is activated.</div>
            ) : (
              <>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '3rem', fontWeight: 700, color: '#f0a500', letterSpacing: '0.12em', lineHeight: 1, marginBottom: '1.25rem', textShadow: '0 0 40px rgba(240,165,0,0.4)' }}>
                  {referralCode}
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                  <button onClick={copyCode} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', borderRadius: '8px', border: 'none', background: codeCopied ? '#3db87a' : '#f0a500', color: codeCopied ? 'white' : '#1a0533', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s' }}>
                    {codeCopied ? <Check size={13} /> : <Copy size={13} />}
                    {codeCopied ? 'Copied!' : 'Copy code'}
                  </button>
                  <button onClick={copyLink} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    <ExternalLink size={13} />
                    {linkCopied ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Sans', sans-serif" }}>{referralUrl}</div>
              </>
            )}
          </div>
          {referralCode && (
            <div style={{ flexShrink: 0 }}>
              <div style={{ background: 'white', borderRadius: '14px', padding: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(fullReferralUrl)}&size=130x130&margin=4`} alt="Referral QR code" width={130} height={130} style={{ display: 'block', borderRadius: 6 }} />
              </div>
              <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.67rem', color: 'rgba(255,255,255,0.3)', fontFamily: "'DM Sans', sans-serif" }}>Scan to sign up</div>
            </div>
          )}
        </div>
      </div>

      {/* ── PARTNER INVITE MODAL ──────────────────────────────────────────── */}
      <style>{`@keyframes invitePulse { 0%{box-shadow:0 0 0 0 rgba(240,165,0,0.7)} 70%{box-shadow:0 0 0 24px rgba(240,165,0,0)} 100%{box-shadow:0 0 0 0 rgba(240,165,0,0)} }`}</style>
      {showInviteModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,5,51,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: '1rem' }}
          onClick={() => setShowInviteModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, #4a2d6e 0%, #3a2057 100%)',
              borderRadius: 20,
              padding: '2rem',
              maxWidth: 460,
              width: '100%',
              boxShadow: '0 24px 60px rgba(94,59,135,0.45)',
              position: 'relative',
              animation: inviteModalPulsing ? 'invitePulse 0.9s ease-out' : 'none',
            }}
          >
            <button onClick={() => setShowInviteModal(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '1.2rem', lineHeight: 1 }}>×</button>

            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', color: '#f0a500', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.5rem' }}>
              💡 You've been referring business their way
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.15rem', color: 'white', marginBottom: '0.5rem', lineHeight: 1.25 }}>
              Why not invite them to Qerxel?
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              They get their first month free — and automatically become your overspill partner, so their AI starts sending callers back to you.
            </div>

            {/* Message preview */}
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '0.85rem 1rem', marginBottom: '1.1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.45rem' }}>Message ready to copy</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", fontStyle: 'italic' }}>
                {(() => {
                  const p = partners.find(p => p.sentCount > 0) || partners[0]
                  const n = outboundTotal
                  return `"Hi ${p?.name || 'there'} — I've been using Qerxel AI for my missed calls and have already referred ${n} enquir${n === 1 ? 'y' : 'ies'} your way. Your first month is free on me — and if you sign up using my code, you automatically become my overspill partner so your AI starts sending callers back to me too."`
                })()}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.1rem', flexWrap: 'wrap' }}>
              <button onClick={copyInviteMsg}
                style={{ flex: 1, padding: '0.7rem 1rem', background: msgCopied ? '#3db87a' : '#f0a500', color: msgCopied ? 'white' : '#1a0533', border: 'none', borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'background 0.2s' }}>
                {msgCopied ? '✓ Copied to clipboard' : 'Copy message'}
              </button>
              {referralCode && (
                <button onClick={copyLink}
                  style={{ flex: 1, padding: '0.7rem 1rem', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                  {linkCopied ? '✓ Link copied' : 'Copy invite link'}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => {
                localStorage.setItem('qx_partner_invite_snoozed', String(Date.now() + 14 * 24 * 60 * 60 * 1000))
                setShowInviteModal(false)
              }} style={{ padding: '0.35rem 0.85rem', background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, color: 'rgba(255,255,255,0.35)', fontSize: '0.775rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Remind me in 2 weeks
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default PartnersReferrals
