import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DemoProvider, useDemo } from '../context/DemoContext'
import DemoBanner from '../components/DemoBanner'
import BusinessProfile from './BusinessProfile'
import AIBehaviour from './AIBehaviour'
import ActivityDashboard from './ActivityDashboard'
import DataAnalytics from './DataAnalytics'
import PartnersReferrals from './PartnersReferrals'
import AccountSettings from './AccountSettings'

const DemoPortalInner = ({ businessId }) => {
  const demo = useDemo()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')

  const tabs = [
    { id: 'profile',   label: 'Business Profile' },
    { id: 'ai',        label: 'AI Behaviour' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'referrals', label: 'Partners & Referrals' },
    { id: 'account',   label: 'Account' },
  ]

  const session = JSON.parse(localStorage.getItem('demo_session') || '{}')

  const renderTab = () => {
    switch (activeTab) {
      case 'profile':   return <BusinessProfile />
      case 'ai':        return <AIBehaviour onNavigate={setActiveTab} />
      case 'dashboard': return <ActivityDashboard onNavigate={setActiveTab} />
      case 'analytics': return <DataAnalytics onNavigate={setActiveTab} />
      case 'referrals': return <PartnersReferrals />
      case 'account':   return <AccountSettings onNavigate={setActiveTab} />
      default:          return null
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f9', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* Demo banner with inline tier switcher */}
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
