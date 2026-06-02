import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { Copy, Check, ExternalLink } from 'lucide-react'

// ─── styles ───────────────────────────────────────────────────────────────────

const s = {
  section: {
    background: 'white',
    borderRadius: '10px',
    padding: '1.75rem',
    border: '0.5px solid rgba(94,59,135,0.1)',
    marginBottom: '1.25rem',
  },
  sectionTitle: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: '0 0 0.2rem',
  },
  sectionSubtitle: {
    fontSize: '0.8rem',
    color: '#888',
    marginBottom: '1.25rem',
    lineHeight: 1.55,
  },
  label: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#555',
    marginBottom: '0.4rem',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
  },
  allPlans: {
    display: 'inline-block',
    background: '#e6f5ee',
    color: '#1e7a4a',
    borderRadius: '4px',
    padding: '0.15rem 0.55rem',
    fontSize: '0.7rem',
    fontWeight: '600',
    letterSpacing: '0.04em',
    marginLeft: '0.6rem',
    verticalAlign: 'middle',
  },
  // Partner count bar
  partnerCountRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  partnerCount: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#5e3b87',
  },
  partnerCountLabel: {
    fontSize: '0.8rem',
    color: '#888',
  },
  partnerStrength: {
    fontSize: '0.775rem',
    color: '#f0a500',
    fontWeight: '500',
  },
  // Partner cards
  partnerGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
    marginBottom: '1.25rem',
  },
  partnerCard: {
    border: '1px solid rgba(94,59,135,0.14)',
    borderRadius: '8px',
    padding: '0.85rem 1rem',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '0.5rem',
    transition: 'border-color 0.15s',
  },
  partnerName: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#5e3b87',
    marginBottom: '0.15rem',
  },
  partnerPhone: {
    fontSize: '0.775rem',
    color: '#999',
    marginBottom: '0.1rem',
  },
  partnerSpecialty: {
    display: 'inline-block',
    background: '#fef3d9',
    color: '#b07a00',
    borderRadius: '4px',
    padding: '0.15rem 0.5rem',
    fontSize: '0.7rem',
    fontWeight: '500',
    marginTop: '0.3rem',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#ddd',
    fontSize: '1.1rem',
    lineHeight: 1,
    padding: '0 0 2px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },
  // Add partner form
  addSection: {
    borderTop: '1px solid rgba(94,59,135,0.07)',
    paddingTop: '1.25rem',
  },
  addRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  addRowFull: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '0.5rem',
  },
  input: {
    width: '100%',
    padding: '0.55rem 0.75rem',
    border: '1px solid rgba(94,59,135,0.2)',
    borderRadius: '8px',
    fontSize: '0.875rem',
    color: '#1a1a1a',
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
    boxSizing: 'border-box',
    background: 'white',
  },
  addBtn: {
    padding: '0.55rem 1.1rem',
    background: '#5e3b87',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.8125rem',
    color: 'white',
    cursor: 'pointer',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    fontFamily: "'DM Sans', sans-serif",
    alignSelf: 'center',
  },
  addBtnDisabled: {
    padding: '0.55rem 1.1rem',
    background: '#d1c4e9',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.8125rem',
    color: 'white',
    cursor: 'not-allowed',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    fontFamily: "'DM Sans', sans-serif",
    alignSelf: 'center',
  },
  emptyPartners: {
    fontSize: '0.8rem',
    color: '#ccc',
    padding: '0.5rem 0 1.25rem',
    fontStyle: 'italic',
  },
  // Referral code
  codeBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  codeDisplay: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#5e3b87',
    letterSpacing: '0.08em',
    background: '#f3f1f6',
    borderRadius: '8px',
    padding: '0.6rem 1.25rem',
    flex: 1,
    textAlign: 'center',
  },
  copyBtn: (copied) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.55rem 1rem',
    background: copied ? '#e6f5ee' : 'white',
    border: `1px solid ${copied ? '#a7e8c2' : 'rgba(94,59,135,0.22)'}`,
    borderRadius: '8px',
    fontSize: '0.8125rem',
    color: copied ? '#1e7a4a' : '#5e3b87',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: '500',
    transition: 'all 0.2s',
    flexShrink: 0,
  }),
  referralLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.8rem',
    color: '#888',
    marginBottom: '1.25rem',
    wordBreak: 'break-all',
  },
  qrRow: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'flex-start',
  },
  qrBox: {
    border: '1px solid rgba(94,59,135,0.12)',
    borderRadius: '8px',
    padding: '8px',
    background: 'white',
    flexShrink: 0,
  },
  codeInfoTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '0.4rem',
  },
  codeInfoText: {
    fontSize: '0.8rem',
    color: '#888',
    lineHeight: 1.6,
    marginBottom: '0.4rem',
  },
  // Credits
  creditDisplay: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.4rem',
    marginBottom: '0.75rem',
  },
  creditNumber: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '2.5rem',
    fontWeight: 700,
    color: '#5e3b87',
    lineHeight: 1,
  },
  creditUnit: {
    fontSize: '1rem',
    color: '#888',
  },
  creditNote: {
    fontSize: '0.8rem',
    color: '#888',
    lineHeight: 1.6,
  },
  creditBadge: {
    display: 'inline-block',
    background: '#fef3d9',
    color: '#b07a00',
    borderRadius: '4px',
    padding: '0.2rem 0.55rem',
    fontSize: '0.75rem',
    fontWeight: '600',
    marginBottom: '0.75rem',
  },
  // Network stats
  networkGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginBottom: '1.25rem',
  },
  networkStat: {
    background: '#f3f1f6',
    borderRadius: '8px',
    padding: '1rem 1.25rem',
    textAlign: 'center',
  },
  networkStatNum: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#5e3b87',
    marginBottom: '0.2rem',
  },
  networkStatLabel: {
    fontSize: '0.775rem',
    color: '#888',
  },
  anchorCard: {
    background: 'linear-gradient(135deg, #5e3b87 0%, #3a2057 100%)',
    borderRadius: '10px',
    padding: '1.25rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  anchorIcon: {
    width: 40,
    height: 40,
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  anchorTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: 'white',
    marginBottom: '0.25rem',
  },
  anchorText: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 1.55,
  },
}

// ─── partner strength label ───────────────────────────────────────────────────

const networkStrength = (n) => {
  if (n === 0) return null
  if (n < 3) return 'Getting started'
  if (n < 6) return 'Building momentum'
  if (n < 10) return 'Strong network'
  if (n < 20) return 'Excellent coverage'
  return 'Market-leading network'
}

// ─── main component ───────────────────────────────────────────────────────────

const PartnersReferrals = () => {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState(null)
  const [referralCode, setReferralCode] = useState('')
  const [creditMonths, setCreditMonths] = useState(0)

  const [partners, setPartners] = useState([])
  const [partnerSpecialties, setPartnerSpecialties] = useState({})
  const [outboundCount, setOutboundCount] = useState(0)

  const [draft, setDraft] = useState({ name: '', phone: '', specialty: '' })
  const [adding, setAdding] = useState(false)

  const [codeCopied, setCodeCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const referralUrl = referralCode ? `verrante.com/join?ref=${referralCode}` : ''
  const fullReferralUrl = `https://${referralUrl}`

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      try {
        const { data: membership } = await supabase
          .from('tenant_memberships')
          .select('tenant_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!membership) return
        const tid = membership.tenant_id
        setTenantId(tid)

        const { data: tenant } = await supabase
          .from('tenants')
          .select('referral_code, credit_balance_months')
          .eq('id', tid)
          .maybeSingle()

        if (tenant) {
          setReferralCode(tenant.referral_code || '')
          setCreditMonths(tenant.credit_balance_months || 0)
        }

        const partnerRes = await supabase
          .from('referral_partners')
          .select('id, business_name, business_phone')
          .eq('tenant_id', tid)
          .order('created_at', { ascending: true })

        const loaded = partnerRes.data || []
        setPartners(loaded)

        const partnerIds = loaded.map(p => p.id)

        const [specialtyRes, logRes] = await Promise.all([
          partnerIds.length > 0
            ? supabase.from('referral_service_map').select('partner_id, service_name').in('partner_id', partnerIds)
            : Promise.resolve({ data: [] }),
          supabase.from('referral_log').select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
        ])

        // Build specialty map: partner_id → first service_name
        const specMap = {}
        ;(specialtyRes.data || []).forEach(row => {
          if (!specMap[row.partner_id]) specMap[row.partner_id] = row.service_name
        })
        setPartnerSpecialties(specMap)

        setOutboundCount(logRes.count || 0)
      } catch (err) {
        console.error('Partners load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const addPartner = async () => {
    const name = draft.name.trim()
    if (!name || !tenantId) return
    setAdding(true)
    const { data: newPartner, error } = await supabase
      .from('referral_partners')
      .insert({ tenant_id: tenantId, business_name: name, business_phone: draft.phone.trim() || null })
      .select()
      .maybeSingle()

    if (!error && newPartner) {
      setPartners(prev => [...prev, newPartner])

      if (draft.specialty.trim()) {
        const { error: specError } = await supabase
          .from('referral_service_map')
          .insert({ partner_id: newPartner.id, service_name: draft.specialty.trim() })

        if (!specError) {
          setPartnerSpecialties(prev => ({ ...prev, [newPartner.id]: draft.specialty.trim() }))
        }
      }

      setDraft({ name: '', phone: '', specialty: '' })
    }
    setAdding(false)
  }

  const removePartner = async (id) => {
    await supabase.from('referral_service_map').delete().eq('partner_id', id)
    await supabase.from('referral_partners').delete().eq('id', id)
    setPartners(prev => prev.filter(p => p.id !== id))
    setPartnerSpecialties(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode).then(() => {
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    })
  }

  const copyLink = () => {
    navigator.clipboard.writeText(fullReferralUrl).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }

  const strength = networkStrength(partners.length)
  const estimatedValue = Math.round(outboundCount * 75)

  if (loading) {
    return <div style={{ padding: '2rem', color: '#aaa', fontSize: '0.875rem' }}>Loading partners…</div>
  }

  return (
    <div>

      {/* Partner network */}
      <div style={s.section}>
        <h3 style={s.sectionTitle} data-help="Your Partner Network is the list of businesses your AI can refer callers to when they ask for something you don't do. Every referral builds reciprocal obligation — partners who receive your callers are far more likely to send their callers to you.">
          Your Partner Network
          <span style={s.allPlans}>All plans · unlimited</span>
        </h3>

        <p style={s.sectionSubtitle}>
          When your AI cannot help a caller, it refers them to one of these businesses. Every referral you send builds an expectation of reciprocation. There is no limit to how many partners you can add.
        </p>

        {partners.length > 0 && (
          <div style={s.partnerCountRow}>
            <span style={s.partnerCount}>{partners.length}</span>
            <span style={s.partnerCountLabel}>{partners.length === 1 ? 'partner' : 'partners'}</span>
            {strength && <span style={s.partnerStrength}>· {strength}</span>}
          </div>
        )}

        {partners.length === 0 ? (
          <div style={s.emptyPartners}>No partners added yet. Add your first below.</div>
        ) : (
          <div style={s.partnerGrid}>
            {partners.map(p => (
              <div key={p.id} style={s.partnerCard}>
                <div style={{ minWidth: 0 }}>
                  <div style={s.partnerName}>{p.business_name}</div>
                  {p.business_phone && <div style={s.partnerPhone}>{p.business_phone}</div>}
                  {partnerSpecialties[p.id] && (
                    <span style={s.partnerSpecialty}>{partnerSpecialties[p.id]}</span>
                  )}
                </div>
                <button style={s.removeBtn} onClick={() => removePartner(p.id)} title="Remove partner">×</button>
              </div>
            ))}
          </div>
        )}

        <div style={s.addSection}>
          <div style={s.label}>Add a partner</div>
          <div style={s.addRow}>
            <input
              style={s.input}
              value={draft.name}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') addPartner() }}
              placeholder="Business name"
            />
            <input
              style={s.input}
              value={draft.phone}
              onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))}
              placeholder="Phone (optional)"
              type="tel"
            />
          </div>
          <div style={s.addRowFull}>
            <input
              style={s.input}
              value={draft.specialty}
              onChange={e => setDraft(d => ({ ...d, specialty: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') addPartner() }}
              placeholder="What do they specialise in? (e.g. Electrical work, Commercial cleaning…)"
            />
            <button
              style={!draft.name.trim() || adding ? s.addBtnDisabled : s.addBtn}
              onClick={addPartner}
              disabled={!draft.name.trim() || adding}
            >
              {adding ? 'Adding…' : '+ Add partner'}
            </button>
          </div>
        </div>
      </div>

      {/* Referral code */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>
          Your Referral Code
          <span style={s.allPlans}>All plans</span>
        </h3>
        <p style={s.sectionSubtitle} data-help="Your Referral Code is unique to you. Share it with any business owner who takes calls — a plumber, a salon, a solicitor, anyone. When they sign up and enter your code, you earn one free month of Verrante automatically. No chasing, no admin.">
          Share this with any business owner. When they sign up, you earn a free month and they start knowing someone vouched for the product.
        </p>

        {!referralCode ? (
          <div style={{ fontSize: '0.85rem', color: '#aaa' }}>Your referral code will appear here once your account is activated.</div>
        ) : (
          <>
            <div style={s.codeBlock}>
              <div style={s.codeDisplay}>{referralCode}</div>
              <button style={s.copyBtn(codeCopied)} onClick={copyCode}>
                {codeCopied ? <Check size={14} /> : <Copy size={14} />}
                {codeCopied ? 'Copied' : 'Copy code'}
              </button>
            </div>

            <div style={s.referralLink}>
              <ExternalLink size={13} color="#bbb" />
              <span>{referralUrl}</span>
              <button
                onClick={copyLink}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: linkCopied ? '#1e7a4a' : '#5e3b87', fontSize: '0.775rem', padding: '0 0.25rem', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
              >
                {linkCopied ? 'Copied' : 'Copy link'}
              </button>
            </div>

            <div style={s.qrRow}>
              <div style={s.qrBox}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(fullReferralUrl)}&size=140x140&margin=4`}
                  alt="Referral QR code"
                  width={140}
                  height={140}
                  style={{ display: 'block', borderRadius: 4 }}
                />
              </div>
              <div>
                <div style={s.codeInfoTitle}>How to use your code</div>
                <p style={s.codeInfoText}>
                  Give this code or link to any local business owner who takes calls. When they sign up, your code is recorded automatically — no follow-up needed.
                </p>
                <p style={s.codeInfoText}>
                  Print the QR code and leave it with trade contacts, on invoices, or in your van. One scan starts the chain.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Credits */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>
          Credits
          <span style={s.allPlans}>All plans</span>
        </h3>
        <p style={s.sectionSubtitle}>
          Earned through referrals. Applied to your subscription automatically. They stack with no expiry.
        </p>

        <div style={s.creditDisplay}>
          <span style={{ ...s.creditNumber, ...(creditMonths === 0 ? { color: '#d1d5db' } : {}) }}>
            {creditMonths}
          </span>
          <span style={s.creditUnit}>{creditMonths === 1 ? 'month' : 'months'} credit</span>
        </div>

        {creditMonths > 0 && <div style={s.creditBadge}>Applied automatically at renewal</div>}

        <div style={s.creditNote}>
          One referral signup = one free month. Three referrals = three months. There is no cap. A tenant who has referred ten businesses has effectively earned almost a year free — and has ten partners who feel reciprocal obligation.
        </div>
      </div>

      {/* Network activity */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>Network Activity</h3>
        <p style={s.sectionSubtitle}>
          Every referral you send builds reciprocal obligation. Partners who receive your callers are motivated to return them.
        </p>

        <div style={s.networkGrid}>
          <div style={s.networkStat}>
            <div style={s.networkStatNum}>{outboundCount}</div>
            <div style={s.networkStatLabel}>Referrals sent</div>
          </div>
          <div style={s.networkStat}>
            <div style={s.networkStatNum}>£{estimatedValue.toLocaleString()}</div>
            <div style={s.networkStatLabel}>Est. network value generated</div>
          </div>
        </div>

        <div style={{ fontSize: '0.775rem', color: '#bbb', marginBottom: '1.25rem' }}>
          Estimated at £75 per referred caller. Inbound reciprocal referrals populate as your network partners grow.
        </div>

        <div style={s.anchorCard}>
          <div style={s.anchorIcon}>
            <svg width="20" height="20" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={s.anchorTitle}>
              {partners.length >= 10
                ? `${partners.length} partners — your network is a competitive advantage`
                : partners.length >= 4
                  ? `${partners.length} partners — reciprocal obligation is building`
                  : partners.length > 0
                    ? `${partners.length} partner${partners.length > 1 ? 's' : ''} — keep building`
                    : 'Your referral network starts with your first partner'}
            </div>
            <div style={s.anchorText}>
              {outboundCount >= 4
                ? 'At this volume, partners feel genuine reciprocal obligation. Your inbound leads from the network will compound over time.'
                : outboundCount > 0
                  ? 'Keep building. Partners who receive multiple referrals from you become reliable sources of inbound leads.'
                  : 'Add your first partner above. When your AI refers a caller to them, the reciprocal expectation begins.'}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

export default PartnersReferrals
