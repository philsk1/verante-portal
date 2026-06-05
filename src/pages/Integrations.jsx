import { useState } from 'react'
import { useDemo } from '../context/DemoContext'
import { usePreview } from '../context/PreviewContext'

// Integration module definitions — each is self-contained
// status: 'connected' | 'coming_soon' | 'available'
// priority: 1 | 2 | 3

const INTEGRATIONS = [
  // Priority 1
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Two-way sync. Appointments appear in your Google Calendar and bookings made outside Verrante flow in automatically.',
    category: 'Calendar',
    priority: 1,
    status: 'coming_soon',
    icon: '📅',
  },
  {
    id: 'google_business',
    name: 'Google Business Profile',
    description: 'Automatically request a review after each completed job. Sent at the right moment — not too soon, not too late.',
    category: 'Reviews',
    priority: 1,
    status: 'coming_soon',
    icon: '⭐',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Automatic follow-up message after every call. 98% open rate. Confirm details, send links, keep the lead warm.',
    category: 'Messaging',
    priority: 1,
    status: 'coming_soon',
    icon: '💬',
  },
  {
    id: 'freeagent',
    name: 'FreeAgent',
    description: 'Convert a captured lead to a draft invoice in one click. The UK sole trader favourite.',
    category: 'Accounting',
    priority: 1,
    status: 'coming_soon',
    icon: '🧾',
  },
  {
    id: 'xero',
    name: 'Xero',
    description: 'Lead to draft invoice in one click. For slightly larger businesses that have outgrown spreadsheets.',
    category: 'Accounting',
    priority: 1,
    status: 'coming_soon',
    icon: '📊',
  },
  // Priority 2
  {
    id: 'jobber',
    name: 'Jobber',
    description: 'Verrante lead becomes a Jobber job automatically. Built for trades — plumbing, electrical, landscaping.',
    category: 'Field Service',
    priority: 2,
    status: 'coming_soon',
    icon: '🔧',
  },
  {
    id: 'servicem8',
    name: 'ServiceM8',
    description: 'Same as Jobber — different platform. Wire your Verrante leads straight into your job queue.',
    category: 'Field Service',
    priority: 2,
    status: 'coming_soon',
    icon: '⚙️',
  },
  {
    id: 'stripe_payments',
    name: 'Stripe Payments',
    description: 'Send a payment link from a captured lead. Collect deposits or full payment before the job starts.',
    category: 'Payments',
    priority: 2,
    status: 'coming_soon',
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
    status: 'coming_soon',
    icon: '✅',
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
    description: 'Collect deposits at booking. Verrante captures the lead — Acuity closes with a payment.',
    category: 'Booking',
    priority: 2,
    status: 'coming_soon',
    icon: '🗓️',
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    description: 'Every Verrante lead lands in your Pipedrive pipeline. For Professional tier tenants managing higher volumes.',
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
    description: 'Connect Verrante to anything. If we haven\'t built a direct integration, Zapier has you covered.',
    category: 'Automation',
    priority: 3,
    status: 'coming_soon',
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

export default function Integrations({ onNavigate }) {
  const demo = useDemo()
  const preview = usePreview()
  const isDemo = !!demo?.isDemo
  const isPreview = preview?.isPreview

  const [activeCategory, setActiveCategory] = useState('All')

  const filtered = activeCategory === 'All'
    ? INTEGRATIONS
    : INTEGRATIONS.filter(i => i.category === activeCategory)

  const connected = filtered.filter(i => i.status === 'connected')
  const available = filtered.filter(i => i.status === 'available')
  const comingSoon = filtered.filter(i => i.status === 'coming_soon')

  return (
    <div style={s.page}>
      <div style={s.header} data-help="Integrations connect Verrante to the tools you already use — accounting, booking, reviews, payments, CRM. Each integration is self-contained. Connect what you need, ignore what you don't.">
        <h2 style={s.title}>Integrations</h2>
        <p style={s.subtitle}>Connect Verrante to your existing tools. Built-in integrations are always free.</p>
      </div>

      <div style={s.filterRow}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            style={s.filterBtn(activeCategory === cat)}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {connected.length > 0 && (
        <>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3db87a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Connected</div>
          <div style={{ ...s.grid, marginBottom: '1.5rem' }}>
            {connected.map(integration => (
              <IntegrationCard key={integration.id} integration={integration} isDemo={isDemo} isPreview={isPreview} />
            ))}
          </div>
        </>
      )}

      {available.length > 0 && (
        <>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5e3b87', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Available</div>
          <div style={{ ...s.grid, marginBottom: '1.5rem' }}>
            {available.map(integration => (
              <IntegrationCard key={integration.id} integration={integration} isDemo={isDemo} isPreview={isPreview} />
            ))}
          </div>
        </>
      )}

      {comingSoon.length > 0 && (
        <>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Coming soon</div>
          <div style={s.grid}>
            {comingSoon.map(integration => (
              <IntegrationCard key={integration.id} integration={integration} isDemo={isDemo} isPreview={isPreview} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function IntegrationCard({ integration, isDemo, isPreview }) {
  const { id, name, description, category, priority, status, icon } = integration

  return (
    <div style={s.card}>
      <div style={s.cardTop}>
        <div style={s.iconBox}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <p style={s.cardName}>{name}</p>
            {priority === 1 && <span style={s.p1Badge}>New</span>}
          </div>
          <p style={s.cardCategory}>{category}</p>
        </div>
      </div>
      <p style={s.cardDesc}>{description}</p>
      <div style={s.cardFooter}>
        {status === 'connected' ? (
          <>
            <span style={s.connectedBadge}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3db87a', display: 'inline-block' }} />
              Connected
            </span>
            <button style={s.connectBtn}>Manage</button>
          </>
        ) : status === 'available' ? (
          <>
            <span />
            <button style={s.connectBtn} onClick={() => {}}>Connect</button>
          </>
        ) : (
          <>
            <span style={s.comingSoonBadge}>Coming soon</span>
            <button style={s.comingSoonBtn} disabled>Connect</button>
          </>
        )}
      </div>
    </div>
  )
}

