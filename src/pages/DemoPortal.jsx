import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DemoProvider, useDemo } from '../context/DemoContext'
import DemoBanner from '../components/DemoBanner'
import ActivityDashboard from './ActivityDashboard'
import DataAnalytics from './DataAnalytics'

const PLACEHOLDER_TABS = {
  profile:   { title: 'Business Profile',     body: 'Full demo preview coming in Session 3.' },
  ai:        { title: 'AI Behaviour',         body: 'Full demo preview coming in Session 3.' },
  referrals: { title: 'Partners & Referrals', body: 'Full demo preview coming in Session 3.' },
  account:   { title: 'Account',              body: 'Full demo preview coming in Session 3.' },
}

const DemoPortalInner = ({ businessId }) => {
  const demo = useDemo()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')

  const tabs = [
    { id: 'profile',    label: 'Business Profile' },
    { id: 'ai',         label: 'AI Behaviour' },
    { id: 'dashboard',  label: 'Dashboard' },
    { id: 'analytics',  label: 'Analytics' },
    { id: 'referrals',  label: 'Partners & Referrals' },
    { id: 'account',    label: 'Account' },
  ]

  const session = JSON.parse(localStorage.getItem('demo_session') || '{}')

  const renderTab = () => {
    if (activeTab === 'dashboard') return <ActivityDashboard onNavigate={setActiveTab} />
    if (activeTab === 'analytics') return <DataAnalytics onNavigate={setActiveTab} />
    const placeholder = PLACEHOLDER_TABS[activeTab]
    return (
      <div style={{ background: 'white', borderRadius: '10px', padding: '2rem', border: '0.5px solid rgba(94,59,135,0.1)' }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1a1a1a', marginBottom: '0.5rem', marginTop: 0 }}>
          {placeholder?.title}
        </h2>
        <p style={{ color: '#aaa', fontSize: '0.875rem', margin: 0 }}>{placeholder?.body}</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f9', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* Demo banner */}
      {demo.business && (
        <DemoBanner
          businessName={demo.business.business_name}
          tier={demo.tier}
          businessId={businessId}
        />
      )}

      {/* Header */}
      <div style={{ height: 64, background: '#5e3b87', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', boxSizing: 'border-box', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: 'white', fontSize: '1.125rem', letterSpacing: '-0.01em' }}>Verrante</span>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f0a500', display: 'inline-block', marginLeft: 3, marginBottom: 8, flexShrink: 0 }} />
          </div>
          <span style={{ fontSize: '0.7rem', background: '#f0a500', color: '#1a0533', borderRadius: '4px', padding: '0.2rem 0.5rem', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Demo</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>{session.name || session.email}</span>
          <button
            onClick={() => navigate('/demo/select')}
            style={{ padding: '0.375rem 0.85rem', border: '1px solid rgba(255,255,255,0.22)', borderRadius: '6px', background: 'transparent', color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            ← All businesses
          </button>
        </div>
      </div>

      {/* Nav strip */}
      <div style={{ height: 44, background: '#4a2d6e', display: 'flex', alignItems: 'stretch', padding: '0 1.5rem', boxSizing: 'border-box', overflowX: 'auto', flexShrink: 0 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ padding: '0 1.1rem', border: 'none', borderBottom: `2.5px solid ${activeTab === tab.id ? '#f0a500' : 'transparent'}`, background: 'transparent', color: activeTab === tab.id ? '#f0a500' : 'rgba(255,255,255,0.58)', fontSize: '0.8125rem', fontWeight: activeTab === tab.id ? 500 : 400, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif", transition: 'color 0.15s' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '2rem', maxWidth: 940, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {demo.loading ? (
          <div style={{ color: '#aaa', fontSize: '0.875rem' }}>Loading demo data…</div>
        ) : (
          renderTab()
        )}
      </div>

    </div>
  )
}

const DemoPortal = () => {
  const { businessId, tier } = useParams()

  return (
    <DemoProvider businessId={businessId} tier={tier}>
      <DemoPortalInner businessId={businessId} />
    </DemoProvider>
  )
}

export default DemoPortal
