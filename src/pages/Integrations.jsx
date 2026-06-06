import { useState, useEffect } from 'react'
import { useDemo } from '../context/DemoContext'
import { usePreview } from '../context/PreviewContext'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'

// Integration module definitions — each is self-contained
// status: 'connected' | 'coming_soon' | 'available'
// priority: 1 | 2 | 3

const INTEGRATIONS = [
  // Priority 1
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'One-way sync. Every appointment you create in Qerxel Calendar appears in your Google, Apple, or Outlook calendar automatically.',
    category: 'Calendar',
    priority: 1,
    status: 'available',
    icon: '📅',
  },
  {
    id: 'google_business',
    name: 'Google Business Profile',
    description: 'Automatically request a review after each completed job. One click from the appointment — sent via WhatsApp or email.',
    category: 'Reviews',
    priority: 1,
    status: 'available',
    icon: '⭐',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Automatic follow-up message after every call. 98% open rate. Confirm details, send links, keep the lead warm.',
    category: 'Messaging',
    priority: 1,
    status: 'available',
    icon: '💬',
  },
  {
    id: 'freeagent',
    name: 'FreeAgent',
    description: 'Convert a captured lead to a draft invoice in one click. The UK sole trader favourite.',
    category: 'Accounting',
    priority: 1,
    status: 'available',
    icon: '🧾',
  },
  {
    id: 'xero',
    name: 'Xero',
    description: 'Lead to draft invoice in one click. For slightly larger businesses that have outgrown spreadsheets.',
    category: 'Accounting',
    priority: 1,
    status: 'available',
    icon: '📊',
  },
  // Priority 2
  {
    id: 'jobber',
    name: 'Jobber',
    description: 'Qerxel lead becomes a Jobber job automatically. Built for trades — plumbing, electrical, landscaping.',
    category: 'Field Service',
    priority: 2,
    status: 'coming_soon',
    icon: '🔧',
  },
  {
    id: 'servicem8',
    name: 'ServiceM8',
    description: 'Same as Jobber — different platform. Wire your Qerxel leads straight into your job queue.',
    category: 'Field Service',
    priority: 2,
    status: 'coming_soon',
    icon: '⚙️',
  },
  {
    id: 'stripe_payments',
    name: 'Stripe Payments',
    description: 'Create a payment link from any captured lead. Set the amount, share the link — payment lands in your Stripe account.',
    category: 'Payments',
    priority: 2,
    status: 'available',
    icon: '💳',
  },
  {
    id: 'sumup',
    name: 'SumUp',
    description: 'Payment links for UK sole traders. More common on the tools belt than a laptop — works perfectly.',
    category: 'Payments',
    priority: 2,
    status: 'coming_soon',
    icon: '💳',
  },
  {
    id: 'checkatrade',
    name: 'Checkatrade',
    description: 'Automated review request after a job is marked complete. Builds your Checkatrade profile while you work.',
    category: 'Reviews',
    priority: 2,
    status: 'available',
    icon: '✅',
  },
  {
    id: 'rated_people',
    name: 'Rated People',
    description: 'Automated review request after a job is marked complete. Same pattern as Checkatrade — different platform.',
    category: 'Reviews',
    priority: 2,
    status: 'available',
    icon: '⭐',
  },
  {
    id: 'booksy',
    name: 'Booksy',
    description: 'Call details sync into your existing Booksy booking. No double entry for hair and beauty businesses.',
    category: 'Booking',
    priority: 2,
    status: 'coming_soon',
    icon: '✂️',
  },
  {
    id: 'acuity',
    name: 'Acuity Scheduling',
    description: 'Collect deposits at booking. Qerxel captures the lead — Acuity closes with a payment.',
    category: 'Booking',
    priority: 2,
    status: 'coming_soon',
    icon: '🗓️',
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    description: 'Every Qerxel lead lands in your Pipedrive pipeline. For Professional tier tenants managing higher volumes.',
    category: 'CRM',
    priority: 2,
    status: 'coming_soon',
    icon: '📈',
  },
  {
    id: 'capsule',
    name: 'Capsule CRM',
    description: 'Simple CRM for Standard tier tenants who want more than a spreadsheet but less than Salesforce.',
    category: 'CRM',
    priority: 2,
    status: 'coming_soon',
    icon: '📋',
  },
  {
    id: 'gocardless',
    name: 'GoCardless',
    description: 'Direct debit for recurring services — cleaners, gardeners, maintenance contracts.',
    category: 'Payments',
    priority: 2,
    status: 'coming_soon',
    icon: '🔄',
  },
  // Priority 3
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect Qerxel to anything. Paste your Zap webhook URL — lead captured and appointment events fire automatically.',
    category: 'Automation',
    priority: 3,
    status: 'available',
    icon: '⚡',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Enterprise and larger Professional tenants. Full CRM with lead nurturing and pipeline management.',
    category: 'CRM',
    priority: 3,
    status: 'coming_soon',
    icon: '🏢',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Alternative to Xero and FreeAgent for tenants already embedded in the QuickBooks ecosystem.',
    category: 'Accounting',
    priority: 3,
    status: 'coming_soon',
    icon: '📒',
  },
]

const CATEGORIES = ['All', 'Calendar', 'Messaging', 'Accounting', 'Reviews', 'Field Service', 'Payments', 'Booking', 'CRM', 'Automation']

const s = {
  page: { maxWidth: 940, margin: '0 auto' },
  header: {
    marginBottom: '1.5rem',
  },
  title: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '1.3rem',
    fontWeight: 700,
    color: '#1a1a1a',
    margin: '0 0 0.3rem',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#888',
    margin: 0,
  },
  filterRow: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    marginBottom: '1.5rem',
  },
  filterBtn: (active) => ({
    padding: '0.3rem 0.85rem',
    borderRadius: '20px',
    border: active ? '1px solid #5e3b87' : '1px solid rgba(94,59,135,0.2)',
    background: active ? '#5e3b87' : 'white',
    color: active ? 'white' : '#5e3b87',
    fontSize: '0.775rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  }),
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1rem',
  },
  card: {
    background: 'white',
    borderRadius: '10px',
    border: '0.5px solid rgba(94,59,135,0.1)',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: '8px',
    background: '#f3f1f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
    flexShrink: 0,
  },
  cardName: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: '0 0 0.2rem',
  },
  cardCategory: {
    fontSize: '0.72rem',
    color: '#aaa',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    margin: 0,
  },
  cardDesc: {
    fontSize: '0.8rem',
    color: '#666',
    lineHeight: 1.55,
    margin: 0,
    flex: 1,
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    fontSize: '0.75rem',
    color: '#3db87a',
    fontWeight: 600,
  },
  comingSoonBadge: {
    fontSize: '0.72rem',
    color: '#aaa',
    fontWeight: 500,
  },
  connectBtn: {
    padding: '0.35rem 0.85rem',
    borderRadius: '6px',
    border: '1px solid rgba(94,59,135,0.3)',
    background: 'white',
    color: '#5e3b87',
    fontSize: '0.775rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  comingSoonBtn: {
    padding: '0.35rem 0.85rem',
    borderRadius: '6px',
    border: '1px solid rgba(94,59,135,0.12)',
    background: '#f7f6f9',
    color: '#bbb',
    fontSize: '0.775rem',
    fontWeight: 500,
    cursor: 'default',
    fontFamily: "'DM Sans', sans-serif",
  },
  p1Badge: {
    display: 'inline-block',
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
    background: '#fef3d9',
    color: '#b07a00',
    fontSize: '0.68rem',
    fontWeight: 600,
    marginLeft: 'auto',
  },
}

const DEFAULT_WA_TEMPLATE = `Hi {{name}}, thanks for calling {{business}}. {{owner}} will be in touch shortly.`

export default function Integrations({ onNavigate }) {
  const { user } = useAuth()
  const demo = useDemo()
  const preview = usePreview()
  const isDemo = !!demo?.isDemo
  const isPreview = preview?.isPreview

  const [tenantId, setTenantId] = useState(null)
  const [activeCategory, setActiveCategory] = useState('All')
  const [connectedMap, setConnectedMap] = useState({}) // { whatsapp: { settings: {} }, ... }
  const [expandedId, setExpandedId] = useState(null)
  const [toast, setToast] = useState({ msg: '', type: '' })

  // ── Detect return from OAuth flow ──────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    const error = params.get('error')
    if (connected) {
      showToast(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully.`, 'success')
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (error) {
      showToast('Connection failed. Please try again.', 'error')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // ── Load tenant ID ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemo || (!user && !isPreview)) return
    const getTid = async () => {
      if (isPreview) { setTenantId(preview.previewTenantId); return }
      const { data } = await supabase
        .from('tenant_memberships').select('tenant_id').eq('user_id', user.id).maybeSingle()
      if (data) setTenantId(data.tenant_id)
    }
    getTid()
  }, [user, isDemo, isPreview])

  // ── Load connected integrations ──────────────────────────────────────────────
  useEffect(() => {
    if (!tenantId) return
    const load = async () => {
      const { data } = await supabase
        .from('tenant_integrations')
        .select('integration_id, enabled, settings, connected_at')
        .eq('tenant_id', tenantId)
      const map = {}
      for (const row of (data || [])) {
        if (row.enabled) map[row.integration_id] = { settings: row.settings || {}, connected_at: row.connected_at }
      }
      setConnectedMap(map)
    }
    load()
  }, [tenantId])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: '' }), 4000)
  }

  const handleDisconnect = async (integrationId) => {
    if (isDemo || isPreview || !tenantId) return
    await fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'disconnect', tenantId, integrationId }),
    })
    setConnectedMap(prev => { const next = { ...prev }; delete next[integrationId]; return next })
    setExpandedId(null)
    showToast('Integration disconnected.')
  }

  const withConnectedStatus = INTEGRATIONS.map(i => ({
    ...i,
    isConnected: !!connectedMap[i.id],
  }))

  const filtered = activeCategory === 'All'
    ? withConnectedStatus
    : withConnectedStatus.filter(i => i.category === activeCategory)

  const connectedList = filtered.filter(i => i.isConnected)
  const availableList = filtered.filter(i => !i.isConnected && i.status === 'available')
  const comingSoonList = filtered.filter(i => !i.isConnected && i.status === 'coming_soon')

  const cardProps = { tenantId, isDemo, isPreview, expandedId, setExpandedId, connectedMap, setConnectedMap, showToast, handleDisconnect }

  return (
    <div style={s.page}>
      <div style={s.header} data-help="Integrations connect Qerxel to the tools you already use — accounting, booking, reviews, payments, CRM. Each integration is self-contained. Connect what you need, ignore what you don't.">
        <h2 style={s.title}>Integrations</h2>
        <p style={s.subtitle}>Connect Qerxel to your existing tools. Built-in integrations are always free.</p>
      </div>

      {toast.msg && (
        <div style={{ padding: '0.7rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 500, background: toast.type === 'error' ? '#fde8e8' : '#e6f9ef', color: toast.type === 'error' ? '#7a1a1a' : '#1a6640', border: `1px solid ${toast.type === 'error' ? '#e05252' : '#3db87a'}` }}>
          {toast.msg}
        </div>
      )}

      <div style={s.filterRow}>
        {CATEGORIES.map(cat => (
          <button key={cat} style={s.filterBtn(activeCategory === cat)} onClick={() => setActiveCategory(cat)}>{cat}</button>
        ))}
      </div>

      {connectedList.length > 0 && (
        <>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3db87a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Connected</div>
          <div style={{ ...s.grid, marginBottom: '1.5rem' }}>
            {connectedList.map(i => <IntegrationCard key={i.id} integration={i} {...cardProps} />)}
          </div>
        </>
      )}

      {availableList.length > 0 && (
        <>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Available now</div>
          <div style={{ ...s.grid, marginBottom: '1.5rem' }}>
            {availableList.map(i => <IntegrationCard key={i.id} integration={i} {...cardProps} />)}
          </div>
        </>
      )}

      {comingSoonList.length > 0 && (
        <>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Coming soon</div>
          <div style={s.grid}>
            {comingSoonList.map(i => <IntegrationCard key={i.id} integration={i} {...cardProps} />)}
          </div>
        </>
      )}
    </div>
  )
}

function IntegrationCard({ integration, tenantId, isDemo, isPreview, expandedId, setExpandedId, connectedMap, setConnectedMap, showToast, handleDisconnect }) {
  const { id, name, description, category, priority, status, icon, isConnected } = integration
  const isExpanded = expandedId === id
  const [saving, setSaving] = useState(false)

  // WhatsApp form state
  const [waPhoneId, setWaPhoneId] = useState('')
  const [waToken, setWaToken] = useState('')
  const [waTemplate, setWaTemplate] = useState(DEFAULT_WA_TEMPLATE)

  const inputStyle = { width: '100%', padding: '0.5rem 0.65rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '6px', fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', outline: 'none', marginBottom: '0.6rem' }
  const labelStyle = { display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#555', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }

  const handleWhatsAppSave = async () => {
    if (!tenantId || !waPhoneId.trim() || !waToken.trim()) return
    setSaving(true)
    try {
      await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          tenantId,
          integrationId: 'whatsapp',
          credentials: { phone_number_id: waPhoneId.trim(), access_token: waToken.trim() },
          settings: { message_template: waTemplate.trim() || DEFAULT_WA_TEMPLATE },
        }),
      })
      setConnectedMap(prev => ({ ...prev, whatsapp: { settings: { message_template: waTemplate }, connected_at: new Date().toISOString() } }))
      setExpandedId(null)
      showToast('WhatsApp Business connected.')
    } catch { showToast('Connection failed. Please try again.', 'error') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ ...s.card, ...(isExpanded ? { gridColumn: '1 / -1' } : {}) }}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <div style={s.iconBox}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <p style={s.cardName}>{name}</p>
            {priority === 1 && !isConnected && <span style={s.p1Badge}>New</span>}
          </div>
          <p style={s.cardCategory}>{category}</p>
        </div>
        {/* Action button */}
        <div style={{ flexShrink: 0 }}>
          {isConnected ? (
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <span style={s.connectedBadge}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3db87a', display: 'inline-block' }} />Connected</span>
              <button style={s.connectBtn} onClick={() => setExpandedId(isExpanded ? null : id)}>Manage</button>
            </div>
          ) : status === 'available' ? (
            <button style={s.connectBtn} onClick={() => setExpandedId(isExpanded ? null : id)}>Connect</button>
          ) : (
            <button style={s.comingSoonBtn} disabled>Coming soon</button>
          )}
        </div>
      </div>

      <p style={s.cardDesc}>{description}</p>

      {/* ── WhatsApp connect form ── */}
      {isExpanded && id === 'whatsapp' && (
        <div style={{ borderTop: '1px solid rgba(94,59,135,0.1)', paddingTop: '1rem', marginTop: '0.5rem' }}>
          {isConnected ? (
            <div>
              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.75rem' }}>WhatsApp Business is connected. To update credentials, disconnect and reconnect.</p>
              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem' }}>Message template: <em>{connectedMap.whatsapp?.settings?.message_template || DEFAULT_WA_TEMPLATE}</em></p>
              <button onClick={() => handleDisconnect('whatsapp')} style={{ padding: '0.4rem 0.85rem', border: '1px solid rgba(224,82,82,0.3)', borderRadius: '6px', background: 'white', color: '#e05252', fontSize: '0.775rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Disconnect</button>
            </div>
          ) : (
            <div style={{ maxWidth: 540 }}>
              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem', lineHeight: 1.55 }}>
                You'll need a Meta Business account with WhatsApp Business API access. Get your Phone Number ID and a permanent access token from <strong>Meta Business Manager → WhatsApp → Phone Numbers</strong>.
              </p>
              <label style={labelStyle}>Phone Number ID</label>
              <input style={inputStyle} placeholder="e.g. 123456789012345" value={waPhoneId} onChange={e => setWaPhoneId(e.target.value)} />
              <label style={labelStyle}>Access Token</label>
              <input style={inputStyle} type="password" placeholder="Permanent access token from Meta" value={waToken} onChange={e => setWaToken(e.target.value)} />
              <label style={labelStyle}>Follow-up message template</label>
              <p style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '0.35rem' }}>Use {'{{name}}'}, {'{{business}}'}, {'{{owner}}'} as placeholders.</p>
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }} value={waTemplate} onChange={e => setWaTemplate(e.target.value)} />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button onClick={() => setExpandedId(null)} style={{ ...s.connectBtn, fontSize: '0.8rem' }}>Cancel</button>
                <button
                  onClick={handleWhatsAppSave}
                  disabled={saving || !waPhoneId.trim() || !waToken.trim() || isDemo || isPreview}
                  style={{ padding: '0.45rem 1rem', border: 'none', borderRadius: '6px', background: (!waPhoneId.trim() || !waToken.trim() || saving) ? '#f5d98a' : '#f0a500', color: '#1a0533', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                >
                  {saving ? 'Connecting…' : 'Connect WhatsApp'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Xero connect form ── */}
      {isExpanded && id === 'xero' && (
        <div style={{ borderTop: '1px solid rgba(94,59,135,0.1)', paddingTop: '1rem', marginTop: '0.5rem' }}>
          {isConnected ? (
            <div>
              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.75rem' }}>
                Xero is connected{connectedMap.xero?.settings?.org_name ? ` — ${connectedMap.xero.settings.org_name}` : ''}. Leads can be converted to draft invoices in one click from your Dashboard.
              </p>
              <button onClick={() => handleDisconnect('xero')} style={{ padding: '0.4rem 0.85rem', border: '1px solid rgba(224,82,82,0.3)', borderRadius: '6px', background: 'white', color: '#e05252', fontSize: '0.775rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Disconnect</button>
            </div>
          ) : (
            <div style={{ maxWidth: 540 }}>
              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem', lineHeight: 1.55 }}>Connect your Xero account. You'll be taken to Xero to approve access — then redirected straight back here.</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setExpandedId(null)} style={{ ...s.connectBtn, fontSize: '0.8rem' }}>Cancel</button>
                <button
                  onClick={() => { if (!tenantId || isDemo || isPreview) return; window.location.href = `/api/xero-auth?tenantId=${tenantId}` }}
                  disabled={!tenantId || isDemo || isPreview}
                  style={{ padding: '0.45rem 1rem', border: 'none', borderRadius: '6px', background: '#f0a500', color: '#1a0533', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                >
                  Connect Xero →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Google Business Profile connect form ── */}
      {isExpanded && id === 'google_business' && (
        <div style={{ borderTop: '1px solid rgba(94,59,135,0.1)', paddingTop: '1rem', marginTop: '0.5rem' }}>
          {isConnected ? (
            <div>
              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.75rem' }}>Google Business Profile is connected. Open any completed appointment in your Calendar to send a review request.</p>
              <button onClick={() => handleDisconnect('google_business')} style={{ padding: '0.4rem 0.85rem', border: '1px solid rgba(224,82,82,0.3)', borderRadius: '6px', background: 'white', color: '#e05252', fontSize: '0.775rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Disconnect</button>
            </div>
          ) : (
            <GoogleBusinessForm tenantId={tenantId} isDemo={isDemo} isPreview={isPreview} setExpandedId={setExpandedId} setConnectedMap={setConnectedMap} showToast={showToast} />
          )}
        </div>
      )}

      {/* ── Google Calendar (CalDAV) connect form ── */}
      {isExpanded && id === 'google_calendar' && (
        <div style={{ borderTop: '1px solid rgba(94,59,135,0.1)', paddingTop: '1rem', marginTop: '0.5rem' }}>
          {isConnected ? (
            <div>
              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.75rem' }}>Calendar sync is connected. New appointments created in Qerxel Calendar will appear in your external calendar automatically.</p>
              <button onClick={() => handleDisconnect('google_calendar')} style={{ padding: '0.4rem 0.85rem', border: '1px solid rgba(224,82,82,0.3)', borderRadius: '6px', background: 'white', color: '#e05252', fontSize: '0.775rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Disconnect</button>
            </div>
          ) : (
            <CalDAVForm tenantId={tenantId} isDemo={isDemo} isPreview={isPreview} setExpandedId={setExpandedId} setConnectedMap={setConnectedMap} showToast={showToast} />
          )}
        </div>
      )}

      {/* ── FreeAgent connect form ── */}
      {isExpanded && id === 'freeagent' && (
        <div style={{ borderTop: '1px solid rgba(94,59,135,0.1)', paddingTop: '1rem', marginTop: '0.5rem' }}>
          {isConnected ? (
            <div>
              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.75rem' }}>FreeAgent is connected. Leads can now be converted to draft invoices in one click from your Dashboard.</p>
              <button onClick={() => handleDisconnect('freeagent')} style={{ padding: '0.4rem 0.85rem', border: '1px solid rgba(224,82,82,0.3)', borderRadius: '6px', background: 'white', color: '#e05252', fontSize: '0.775rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Disconnect</button>
            </div>
          ) : (
            <div style={{ maxWidth: 540 }}>
              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem', lineHeight: 1.55 }}>
                Connect your FreeAgent account. You'll be taken to FreeAgent to approve access — then redirected straight back here.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setExpandedId(null)} style={{ ...s.connectBtn, fontSize: '0.8rem' }}>Cancel</button>
                <button
                  onClick={() => { if (!tenantId || isDemo || isPreview) return; window.location.href = `/api/freeagent-oauth?tenantId=${tenantId}` }}
                  disabled={!tenantId || isDemo || isPreview}
                  style={{ padding: '0.45rem 1rem', border: 'none', borderRadius: '6px', background: '#f0a500', color: '#1a0533', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                >
                  Connect FreeAgent →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Stripe Payments info panel ── */}
      {isExpanded && id === 'stripe_payments' && (
        <div style={{ borderTop: '1px solid rgba(94,59,135,0.1)', paddingTop: '1rem', marginTop: '0.5rem' }}>
          <p style={{ fontSize: '0.8rem', color: '#666', lineHeight: 1.55, marginBottom: 0 }}>
            No setup needed — uses your existing Stripe connection. Go to your Dashboard, find any lead, and click <strong>£ Pay</strong> to create a payment link on the spot. Set the amount and description, copy the link, and share it with your client.
          </p>
        </div>
      )}

      {/* ── Checkatrade connect form ── */}
      {isExpanded && id === 'checkatrade' && (
        <ReviewUrlForm tenantId={tenantId} integrationId="checkatrade" platform="Checkatrade" placeholder="https://www.checkatrade.com/trades/YourBusiness/reviews" isDemo={isDemo} isPreview={isPreview} setExpandedId={setExpandedId} setConnectedMap={setConnectedMap} showToast={showToast} isConnected={isConnected} handleDisconnect={handleDisconnect} connectedMap={connectedMap} />
      )}

      {/* ── Rated People connect form ── */}
      {isExpanded && id === 'rated_people' && (
        <ReviewUrlForm tenantId={tenantId} integrationId="rated_people" platform="Rated People" placeholder="https://www.ratedpeople.com/profile/YourBusiness" isDemo={isDemo} isPreview={isPreview} setExpandedId={setExpandedId} setConnectedMap={setConnectedMap} showToast={showToast} isConnected={isConnected} handleDisconnect={handleDisconnect} connectedMap={connectedMap} />
      )}

      {/* ── Zapier connect form ── */}
      {isExpanded && id === 'zapier' && (
        <div style={{ borderTop: '1px solid rgba(94,59,135,0.1)', paddingTop: '1rem', marginTop: '0.5rem' }}>
          {isConnected ? (
            <div>
              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.75rem' }}>Zapier is connected. Events fire to your webhook URL when leads are captured and appointments change status.</p>
              <button onClick={() => handleDisconnect('zapier')} style={{ padding: '0.4rem 0.85rem', border: '1px solid rgba(224,82,82,0.3)', borderRadius: '6px', background: 'white', color: '#e05252', fontSize: '0.775rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Disconnect</button>
            </div>
          ) : (
            <ZapierForm tenantId={tenantId} isDemo={isDemo} isPreview={isPreview} setExpandedId={setExpandedId} setConnectedMap={setConnectedMap} showToast={showToast} />
          )}
        </div>
      )}
    </div>
  )
}

function GoogleBusinessForm({ tenantId, isDemo, isPreview, setExpandedId, setConnectedMap, showToast }) {
  const [reviewUrl, setReviewUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const inputStyle = { width: '100%', padding: '0.5rem 0.65rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '6px', fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', outline: 'none', marginBottom: '0.6rem' }
  const labelStyle = { display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#555', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }

  const handleSave = async () => {
    if (!tenantId || !reviewUrl.trim()) return
    setSaving(true)
    try {
      await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', tenantId, integrationId: 'google_business', credentials: {}, settings: { google_review_url: reviewUrl.trim() } }),
      })
      setConnectedMap(prev => ({ ...prev, google_business: { settings: { google_review_url: reviewUrl.trim() }, connected_at: new Date().toISOString() } }))
      setExpandedId(null)
      showToast('Google Business Profile connected.')
    } catch { showToast('Connection failed. Please try again.', 'error') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth: 540 }}>
      <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem', lineHeight: 1.55 }}>
        Paste your Google review link. Find it in <strong>Google Business Profile → Home → Get more reviews → Share review form</strong>. It starts with <code>g.page/</code> or <code>maps.google.com/</code>.
      </p>
      <label style={labelStyle}>Your Google review link</label>
      <input style={inputStyle} placeholder="https://g.page/r/xxxxxx/review" value={reviewUrl} onChange={e => setReviewUrl(e.target.value)} />
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
        <button onClick={() => setExpandedId(null)} style={{ padding: '0.4rem 0.85rem', border: '1px solid rgba(94,59,135,0.25)', borderRadius: '6px', background: 'white', color: '#5e3b87', fontSize: '0.775rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
        <button onClick={handleSave} disabled={saving || !reviewUrl.trim() || isDemo || isPreview}
          style={{ padding: '0.45rem 1rem', border: 'none', borderRadius: '6px', background: (!reviewUrl.trim() || saving) ? '#f5d98a' : '#f0a500', color: '#1a0533', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          {saving ? 'Connecting…' : 'Connect'}
        </button>
      </div>
    </div>
  )
}

function CalDAVForm({ tenantId, isDemo, isPreview, setExpandedId, setConnectedMap, showToast }) {
  const [caldavUrl, setCaldavUrl] = useState('')
  const [username, setUsername] = useState('')
  const [appPassword, setAppPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const inputStyle = { width: '100%', padding: '0.5rem 0.65rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '6px', fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', outline: 'none', marginBottom: '0.6rem' }
  const labelStyle = { display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#555', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }

  const handleSave = async () => {
    if (!tenantId || !caldavUrl.trim() || !username.trim() || !appPassword.trim()) return
    setSaving(true)
    try {
      await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          tenantId, integrationId: 'google_calendar',
          credentials: { caldav_url: caldavUrl.trim(), username: username.trim(), app_password: appPassword.trim() },
          settings: { calendar_label: username.trim() },
        }),
      })
      setConnectedMap(prev => ({ ...prev, google_calendar: { settings: { calendar_label: username.trim() }, connected_at: new Date().toISOString() } }))
      setExpandedId(null)
      showToast('Calendar sync connected.')
    } catch { showToast('Connection failed. Please try again.', 'error') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth: 540 }}>
      <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem', lineHeight: 1.55 }}>
        Works with Google Calendar, Apple iCloud, and Outlook. Use an app password — not your regular password.<br />
        <strong>Google:</strong> myaccount.google.com/apppasswords &nbsp;·&nbsp;
        <strong>Apple:</strong> appleid.apple.com → Security → App-Specific Passwords
      </p>
      <label style={labelStyle}>CalDAV URL</label>
      <input style={inputStyle} placeholder="e.g. https://apidata.googleusercontent.com/caldav/v2/you@gmail.com/events/" value={caldavUrl} onChange={e => setCaldavUrl(e.target.value)} />
      <label style={labelStyle}>Username (email)</label>
      <input style={inputStyle} placeholder="you@gmail.com" value={username} onChange={e => setUsername(e.target.value)} />
      <label style={labelStyle}>App password</label>
      <input style={inputStyle} type="password" placeholder="16-character app password" value={appPassword} onChange={e => setAppPassword(e.target.value)} />
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
        <button onClick={() => setExpandedId(null)} style={{ padding: '0.4rem 0.85rem', border: '1px solid rgba(94,59,135,0.25)', borderRadius: '6px', background: 'white', color: '#5e3b87', fontSize: '0.775rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
        <button onClick={handleSave} disabled={saving || !caldavUrl.trim() || !username.trim() || !appPassword.trim() || isDemo || isPreview}
          style={{ padding: '0.45rem 1rem', border: 'none', borderRadius: '6px', background: (!caldavUrl.trim() || !username.trim() || !appPassword.trim() || saving) ? '#f5d98a' : '#f0a500', color: '#1a0533', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          {saving ? 'Connecting…' : 'Connect calendar'}
        </button>
      </div>
    </div>
  )
}

// ─── Shared review URL form (Checkatrade, Rated People, etc.) ─────────────────
function ReviewUrlForm({ tenantId, integrationId, platform, placeholder, isDemo, isPreview, setExpandedId, setConnectedMap, showToast, isConnected, handleDisconnect, connectedMap }) {
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const inputStyle = { width: '100%', padding: '0.5rem 0.65rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '6px', fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', outline: 'none', marginBottom: '0.6rem' }

  const handleSave = async () => {
    if (!tenantId || !url.trim()) return
    setSaving(true)
    try {
      await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', tenantId, integrationId, credentials: {}, settings: { review_url: url.trim() } }),
      })
      setConnectedMap(prev => ({ ...prev, [integrationId]: { settings: { review_url: url.trim() }, connected_at: new Date().toISOString() } }))
      setExpandedId(null)
      showToast(`${platform} connected.`)
    } catch { showToast('Connection failed. Please try again.', 'error') }
    finally { setSaving(false) }
  }

  if (isConnected) {
    return (
      <div style={{ borderTop: '1px solid rgba(94,59,135,0.1)', paddingTop: '1rem', marginTop: '0.5rem' }}>
        <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.75rem' }}>{platform} is connected. Open any completed appointment in your Calendar to send a review request.</p>
        <button onClick={() => handleDisconnect(integrationId)} style={{ padding: '0.4rem 0.85rem', border: '1px solid rgba(224,82,82,0.3)', borderRadius: '6px', background: 'white', color: '#e05252', fontSize: '0.775rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Disconnect</button>
      </div>
    )
  }

  return (
    <div style={{ borderTop: '1px solid rgba(94,59,135,0.1)', paddingTop: '1rem', marginTop: '0.5rem', maxWidth: 540 }}>
      <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem', lineHeight: 1.55 }}>
        Paste your {platform} profile URL. Find it on your {platform} dashboard — it's the public-facing page your customers can leave a review on.
      </p>
      <input style={inputStyle} placeholder={placeholder} value={url} onChange={e => setUrl(e.target.value)} />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => setExpandedId(null)} style={{ padding: '0.4rem 0.85rem', border: '1px solid rgba(94,59,135,0.25)', borderRadius: '6px', background: 'white', color: '#5e3b87', fontSize: '0.775rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
        <button onClick={handleSave} disabled={saving || !url.trim() || isDemo || isPreview}
          style={{ padding: '0.45rem 1rem', border: 'none', borderRadius: '6px', background: (!url.trim() || saving) ? '#f5d98a' : '#f0a500', color: '#1a0533', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          {saving ? 'Connecting…' : `Connect ${platform}`}
        </button>
      </div>
    </div>
  )
}

// ─── Zapier webhook URL form ──────────────────────────────────────────────────
function ZapierForm({ tenantId, isDemo, isPreview, setExpandedId, setConnectedMap, showToast }) {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const inputStyle = { width: '100%', padding: '0.5rem 0.65rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '6px', fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', outline: 'none', marginBottom: '0.6rem' }

  const handleSave = async () => {
    if (!tenantId || !webhookUrl.trim()) return
    setSaving(true)
    try {
      await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', tenantId, integrationId: 'zapier', credentials: {}, settings: { webhook_url: webhookUrl.trim() } }),
      })
      setConnectedMap(prev => ({ ...prev, zapier: { settings: { webhook_url: webhookUrl.trim() }, connected_at: new Date().toISOString() } }))
      setExpandedId(null)
      showToast('Zapier connected.')
    } catch { showToast('Connection failed. Please try again.', 'error') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth: 540 }}>
      <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem', lineHeight: 1.55 }}>
        In Zapier, create a new Zap → Trigger: <strong>Webhooks by Zapier → Catch Hook</strong>. Copy the webhook URL and paste it here.
        Qerxel will fire events to it when a lead is captured or an appointment changes status.
      </p>
      <input style={inputStyle} placeholder="https://hooks.zapier.com/hooks/catch/..." value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => setExpandedId(null)} style={{ padding: '0.4rem 0.85rem', border: '1px solid rgba(94,59,135,0.25)', borderRadius: '6px', background: 'white', color: '#5e3b87', fontSize: '0.775rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
        <button onClick={handleSave} disabled={saving || !webhookUrl.trim() || isDemo || isPreview}
          style={{ padding: '0.45rem 1rem', border: 'none', borderRadius: '6px', background: (!webhookUrl.trim() || saving) ? '#f5d98a' : '#f0a500', color: '#1a0533', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          {saving ? 'Connecting…' : 'Connect Zapier'}
        </button>
      </div>
    </div>
  )
}
