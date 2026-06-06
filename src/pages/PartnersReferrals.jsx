import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { useDemo } from '../context/DemoContext'
import { usePreview } from '../context/PreviewContext'
import { Copy, Check, ExternalLink, Share2 } from 'lucide-react'

// ─── specialty → colour system ────────────────────────────────────────────────

const specialtyColour = (spec) => {
  if (!spec) return { bar: '#5e3b87', ab: '#f0ebf8', at: '#5e3b87', cb: '#f0ebf8', ct: '#5e3b87' }
  const t = spec.toLowerCase()
  if (/plumb|electr|build|roof|carpet|floor|paint|decorat|gas|heat|air.?con|window|door|fenc|garden|lands|clean|waste|skip|pest|lock|glaz|tile|brick|concret|drain|guttr|joiner|carpent|handyman|damp|roofer|scaffold/.test(t))
    return { bar: '#f0a500', ab: '#fef3d0', at: '#92610a', cb: '#fef3d0', ct: '#92610a' }
  if (/physio|dental|dentist|doctor|osteo|chiro|optici|optom|mental|counsel|therap|health|medic|nurse|pharmac|beauty|hair|salon|spa|massage|nutrition|diet|gym|fitness|yoga|pilates|sport|care|wellbeing/.test(t))
    return { bar: '#3db87a', ab: '#e6f5ee', at: '#1e7a4a', cb: '#e6f5ee', ct: '#1e7a4a' }
  if (/solicit|account|legal|law|financ|ifa|mortgage|insur|consult|audit|tax|architect|engineer|recruit|market|design|tech|web|software|media|print|photog|video/.test(t))
    return { bar: '#1d4ed8', ab: '#eff6ff', at: '#1d4ed8', cb: '#eff6ff', ct: '#1d4ed8' }
  return { bar: '#5e3b87', ab: '#f0ebf8', at: '#5e3b87', cb: '#f0ebf8', ct: '#5e3b87' }
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

// ─── shared primitives ────────────────────────────────────────────────────────

const Row = ({ children, style }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', ...style }}>{children}</div>
)

const Badge = ({ children, bg = '#f0ebf8', color = '#5e3b87' }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    background: bg, color,
    borderRadius: '999px', padding: '0.18rem 0.65rem',
    fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.05em',
    fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
  }}>{children}</span>
)

const SectionLabel = ({ children }) => (
  <div style={{
    fontSize: '0.6875rem', fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    color: '#aaaaaa', textTransform: 'uppercase',
    letterSpacing: '0.08em', marginBottom: '0.1rem',
  }}>{children}</div>
)

const Card = ({ children, style }) => (
  <div style={{
    background: 'white', borderRadius: '16px', padding: '1.5rem',
    border: '0.5px solid rgba(94,59,135,0.08)', marginBottom: '1rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.06)',
    ...style,
  }}>{children}</div>
)

const Input = ({ style, ...props }) => (
  <input style={{
    width: '100%', padding: '0.6rem 0.8rem',
    border: '1.5px solid rgba(94,59,135,0.15)', borderRadius: '10px',
    fontSize: '0.875rem', color: '#1a1a1a', outline: 'none',
    fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box',
    background: 'white', transition: 'border-color 0.15s',
    ...style,
  }} {...props} />
)

// ─── main component ───────────────────────────────────────────────────────────

const PartnersReferrals = () => {
  const { user } = useAuth()
  const demo = useDemo()
  const isDemo = !!demo?.isDemo
  const preview = usePreview()
  const isPreview = !!preview?.isPreview

  const [loading, setLoading]               = useState(true)
  const [tenantId, setTenantId]             = useState(null)
  const [referralCode, setReferralCode]     = useState('')
  const [creditMonths, setCreditMonths]     = useState(0)
  const [partners, setPartners]             = useState([])
  const [partnerSpecialties, setPartnerSpecialties] = useState({})
  const [outboundCount, setOutboundCount]   = useState(0)
  const [draft, setDraft]                   = useState({ name: '', phone: '', specialty: '' })
  const [adding, setAdding]                 = useState(false)
  const [codeCopied, setCodeCopied]         = useState(false)
  const [linkCopied, setLinkCopied]         = useState(false)

  const referralUrl     = referralCode ? `qerxel.com/join?ref=${referralCode}` : ''
  const fullReferralUrl = `https://${referralUrl}`
  const estimatedValue  = Math.round(outboundCount * 75)

  useEffect(() => {
    if (!isDemo || demo?.loading) return
    const biz = demo.business || {}
    setReferralCode(biz.referral_code || '')
    setCreditMonths(biz.credits_balance || 0)
    setPartners(demo.partners.map(p => ({ id: p.id, business_name: p.partner_name, business_phone: p.partner_phone || '' })))
    setPartnerSpecialties(Object.fromEntries(demo.partners.filter(p => p.specialty).map(p => [p.id, p.specialty])))
    setOutboundCount(demo.referrals.length)
    setLoading(false)
  }, [isDemo, demo?.loading])

  useEffect(() => {
    if (isDemo || (!user && !isPreview)) return
    const load = async () => {
      setLoading(true)
      try {
        let tid
        if (isPreview) {
          tid = preview.previewTenantId
        } else {
          const { data: membership } = await supabase
            .from('tenant_memberships').select('tenant_id').eq('user_id', user.id).maybeSingle()
          if (!membership) return
          tid = membership.tenant_id
        }
        setTenantId(tid)
        const { data: tenant } = await supabase.from('tenants').select('referral_code, credit_balance_months').eq('id', tid).maybeSingle()
        if (tenant) {
          setReferralCode(tenant.referral_code || '')
          setCreditMonths(tenant.credit_balance_months || 0)
        }
        const partnerRes = await supabase.from('referral_partners').select('id, business_name, business_phone').eq('tenant_id', tid).order('created_at', { ascending: true })
        const loaded = partnerRes.data || []
        setPartners(loaded)
        const partnerIds = loaded.map(p => p.id)
        const [specialtyRes, logRes] = await Promise.all([
          partnerIds.length > 0
            ? supabase.from('referral_service_map').select('partner_id, service_name').in('partner_id', partnerIds)
            : Promise.resolve({ data: [] }),
          supabase.from('referral_log').select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
        ])
        const specMap = {}
        ;(specialtyRes.data || []).forEach(row => { if (!specMap[row.partner_id]) specMap[row.partner_id] = row.service_name })
        setPartnerSpecialties(specMap)
        setOutboundCount(logRes.count || 0)
      } catch (err) {
        console.error('Partners load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, isDemo, isPreview])

  const addPartner = async () => {
    if (isDemo || isPreview) return
    const name = draft.name.trim()
    if (!name || !tenantId) return
    setAdding(true)
    const { data: newPartner, error } = await supabase.from('referral_partners')
      .insert({ tenant_id: tenantId, business_name: name, business_phone: draft.phone.trim() || null })
      .select().maybeSingle()
    if (!error && newPartner) {
      setPartners(prev => [...prev, newPartner])
      if (draft.specialty.trim()) {
        const { error: specError } = await supabase.from('referral_service_map').insert({ partner_id: newPartner.id, service_name: draft.specialty.trim() })
        if (!specError) setPartnerSpecialties(prev => ({ ...prev, [newPartner.id]: draft.specialty.trim() }))
      }
      setDraft({ name: '', phone: '', specialty: '' })
    }
    setAdding(false)
  }

  const removePartner = async (id) => {
    if (isDemo || isPreview) return
    await supabase.from('referral_service_map').delete().eq('partner_id', id)
    await supabase.from('referral_partners').delete().eq('id', id)
    setPartners(prev => prev.filter(p => p.id !== id))
    setPartnerSpecialties(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  const copyCode = () => navigator.clipboard.writeText(referralCode).then(() => { setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000) })
  const copyLink = () => navigator.clipboard.writeText(fullReferralUrl).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) })

  if (loading) return <div style={{ padding: '2rem', color: '#aaa', fontSize: '0.875rem' }}>Loading partners…</div>

  const strength = networkStrength(partners.length)

  // ── speciality legend (unique colors in use) ──────────────────────────────
  const legendColors = [...new Set(partners.map(p => specialtyColour(partnerSpecialties[p.id]).bar))]
  const colorLabels = {
    '#f0a500': 'Trades',
    '#3db87a': 'Health & Wellness',
    '#1d4ed8': 'Professional',
    '#5e3b87': 'Other',
  }

  return (
    <div>

      {/* ── KPI TILES ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}
        data-help="At a glance: referrals sent by your AI, estimated value those referrals created, and free months earned from your referral code.">
        <div style={{ background: '#d1f5e4', borderRadius: '14px', padding: '1.1rem 1rem', border: '1px solid rgba(61,184,122,0.2)', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '2rem', fontWeight: 700, color: '#1e7a4a', lineHeight: 1, marginBottom: '0.25rem' }}>{outboundCount}</div>
          <div style={{ fontSize: '0.69rem', fontWeight: 700, color: '#3db87a', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'DM Sans', sans-serif" }}>Referrals sent</div>
          <div style={{ fontSize: '0.68rem', color: '#888', marginTop: '0.2rem', fontFamily: "'DM Sans', sans-serif" }}>Partners obligated</div>
        </div>
        <div style={{ background: '#fef3d0', borderRadius: '14px', padding: '1.1rem 1rem', border: '1px solid rgba(240,165,0,0.25)', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '2rem', fontWeight: 700, color: '#92610a', lineHeight: 1, marginBottom: '0.25rem' }}>£{estimatedValue.toLocaleString()}</div>
          <div style={{ fontSize: '0.69rem', fontWeight: 700, color: '#f0a500', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'DM Sans', sans-serif" }}>Est. value generated</div>
          <div style={{ fontSize: '0.68rem', color: '#888', marginTop: '0.2rem', fontFamily: "'DM Sans', sans-serif" }}>At £75 per caller</div>
        </div>
        <div style={{ background: creditMonths > 0 ? '#ede8f8' : '#f8fafc', borderRadius: '14px', padding: '1.1rem 1rem', border: creditMonths > 0 ? '1px solid rgba(94,59,135,0.2)' : '1px solid rgba(203,213,225,0.4)', textAlign: 'center' }}
          data-help="Credits are earned when someone signs up using your referral code. One signup = one free month, applied automatically at renewal.">
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '2rem', fontWeight: 700, color: creditMonths > 0 ? '#5e3b87' : '#d1d5db', lineHeight: 1, marginBottom: '0.25rem' }}>{creditMonths}</div>
          <div style={{ fontSize: '0.69rem', fontWeight: 700, color: creditMonths > 0 ? '#5e3b87' : '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'DM Sans', sans-serif" }}>Credits earned</div>
          <div style={{ fontSize: '0.68rem', color: '#888', marginTop: '0.2rem', fontFamily: "'DM Sans', sans-serif" }}>
            {creditMonths === 1 ? '1 month free' : creditMonths > 1 ? `${creditMonths} months free` : 'Share your code below'}
          </div>
        </div>
      </div>

      {/* ── PARTNER NETWORK ───────────────────────────────────────────── */}
      <Card>
        <Row style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.6rem' }}>
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
        </Row>

        {/* legend */}
        {legendColors.length > 1 && (
          <Row style={{ marginBottom: '1rem', gap: '0.9rem', flexWrap: 'wrap' }}>
            {legendColors.map(c => (
              <span key={c} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#888', fontFamily: "'DM Sans', sans-serif" }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
                {colorLabels[c] || 'Other'}
              </span>
            ))}
          </Row>
        )}

        {/* partner grid */}
        {partners.length === 0 ? (
          <div style={{ borderRadius: '14px', border: '1.5px dashed rgba(94,59,135,0.15)', padding: '2rem 1.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤝</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.9rem', color: '#5e3b87', marginBottom: '0.35rem' }}>No partners yet</div>
            <div style={{ fontSize: '0.8rem', color: '#aaa', lineHeight: 1.55 }}>
              When your AI can't help a caller, it refers them here.<br />Every referral creates a reciprocal obligation.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem', marginBottom: '1.25rem' }}>
            {partners.map(p => {
              const spec = partnerSpecialties[p.id]
              const { bar, ab, at, cb, ct } = specialtyColour(spec)
              return (
                <div key={p.id} style={{
                  background: 'white', borderRadius: '12px',
                  border: '0.5px solid rgba(94,59,135,0.08)',
                  borderLeft: `4px solid ${bar}`,
                  padding: '0.8rem 0.8rem 0.8rem 0.85rem',
                  display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '9px',
                    background: ab, color: at,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.8rem',
                    flexShrink: 0,
                  }}>
                    {initials(p.business_name)}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a', marginBottom: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.business_name}
                    </div>
                    {p.business_phone && (
                      <div style={{ fontSize: '0.75rem', color: '#999', marginBottom: '0.2rem' }}>{p.business_phone}</div>
                    )}
                    {spec && (
                      <span style={{ display: 'inline-block', background: cb, color: ct, borderRadius: '999px', padding: '0.12rem 0.55rem', fontSize: '0.66rem', fontWeight: 700 }}>
                        {spec}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removePartner(p.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', fontSize: '1.1rem', lineHeight: 1, padding: '0', flexShrink: 0 }}
                    title="Remove"
                  >×</button>
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
              disabled={!draft.name.trim() || adding}
              style={{
                padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none',
                background: !draft.name.trim() || adding ? '#f5d98a' : '#f0a500',
                color: !draft.name.trim() || adding ? '#7a5c1a' : '#1a0533',
                fontSize: '0.8125rem', fontWeight: 700, cursor: !draft.name.trim() || adding ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', alignSelf: 'center',
              }}
            >
              {adding ? 'Adding…' : '+ Add partner'}
            </button>
          </div>
        </div>
      </Card>

      {/* ── NETWORK ACTIVITY ──────────────────────────────────────────── */}
      <Card data-help="Network Activity shows how your referral network is performing. Every referral your AI sends creates reciprocal obligation.">
        <Row style={{ marginBottom: '1rem' }}>
          <SectionLabel>Network Activity</SectionLabel>
        </Row>
        <div style={{
          background: 'linear-gradient(135deg, #5e3b87 0%, #3a2057 100%)',
          borderRadius: '12px', padding: '1rem 1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.85rem',
        }}>
          <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8375rem', fontWeight: 600, color: 'white', marginBottom: '0.2rem' }}>
              {partners.length >= 10 ? `${partners.length} partners — your network is a competitive advantage`
                : partners.length >= 4 ? `${partners.length} partners — reciprocal obligation is building`
                : partners.length > 0 ? `${partners.length} partner${partners.length > 1 ? 's' : ''} — keep building`
                : 'Your referral network starts with your first partner'}
            </div>
            <div style={{ fontSize: '0.775rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              {outboundCount >= 4 ? 'At this volume, partners feel genuine reciprocal obligation. Inbound leads from the network compound over time.'
                : outboundCount > 0 ? 'Keep building. Partners who receive multiple referrals from you become reliable sources of inbound leads.'
                : 'Add your first partner above. When your AI refers a caller to them, the reciprocal expectation begins.'}
            </div>
          </div>
        </div>
      </Card>

      {/* ── REFERRAL CODE — feature card (bottom) ─────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #4a2d6e 0%, #3a2057 60%, #2d1a45 100%)',
        borderRadius: '20px', padding: '2rem', marginBottom: '1rem',
        boxShadow: '0 8px 32px rgba(94,59,135,0.35)',
        position: 'relative', overflow: 'hidden',
      }}
        data-help="Your Referral Code is the quickest way to grow your partner network. When another business owner signs up using your code or link, you earn one free month of Qerxel automatically."
      >
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
                <div style={{
                  fontFamily: "'Syne', sans-serif", fontSize: '3rem', fontWeight: 700,
                  color: '#f0a500', letterSpacing: '0.12em', lineHeight: 1,
                  marginBottom: '1.25rem', textShadow: '0 0 40px rgba(240,165,0,0.4)',
                }}>
                  {referralCode}
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                  <button onClick={copyCode} style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.55rem 1.1rem', borderRadius: '8px', border: 'none',
                    background: codeCopied ? '#3db87a' : '#f0a500',
                    color: codeCopied ? 'white' : '#1a0533',
                    fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s',
                  }}>
                    {codeCopied ? <Check size={13} /> : <Copy size={13} />}
                    {codeCopied ? 'Copied!' : 'Copy code'}
                  </button>
                  <button onClick={copyLink} style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.55rem 1rem', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.8)', fontSize: '0.8125rem', fontWeight: 500,
                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  }}>
                    <ExternalLink size={13} />
                    {linkCopied ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Sans', sans-serif" }}>
                  {referralUrl}
                </div>
              </>
            )}
          </div>
          {referralCode && (
            <div style={{ flexShrink: 0 }}>
              <div style={{ background: 'white', borderRadius: '14px', padding: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(fullReferralUrl)}&size=130x130&margin=4`}
                  alt="Referral QR code"
                  width={130} height={130}
                  style={{ display: 'block', borderRadius: 6 }}
                />
              </div>
              <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.67rem', color: 'rgba(255,255,255,0.3)', fontFamily: "'DM Sans', sans-serif" }}>
                Scan to sign up
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

export default PartnersReferrals
