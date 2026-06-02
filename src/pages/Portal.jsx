import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'
import BusinessProfile from './BusinessProfile'
import AIBehaviour from './AIBehaviour'
import ActivityDashboard from './ActivityDashboard'
import DataAnalytics from './DataAnalytics'
import PartnersReferrals from './PartnersReferrals'
import AccountSettings from './AccountSettings'
import HelpMascot from '../components/HelpMascot'

const Portal = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [checking, setChecking] = useState(true)
  const [businessName, setBusinessName] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return
    supabase
      .from('tenant_memberships')
      .select('tenant_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) { navigate('/onboarding', { replace: true }); return }
        const { data: tenant } = await supabase
          .from('tenants').select('business_name').eq('id', data.tenant_id).maybeSingle()
        setBusinessName(tenant?.business_name || '')
        setChecking(false)
      })
  }, [user])

  if (checking) return null

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const tabs = [
    { id: 'profile', label: 'Business Profile' },
    { id: 'ai', label: 'AI Behaviour' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'referrals', label: 'Partners & Referrals' },
    { id: 'account', label: 'Account' },
  ]

  const renderTab = () => {
    switch (activeTab) {
      case 'profile':
        return <BusinessProfile />
      case 'ai':
        return <AIBehaviour onNavigate={setActiveTab} />
      case 'dashboard':
        return <ActivityDashboard onNavigate={setActiveTab} />
      case 'analytics':
        return <DataAnalytics onNavigate={setActiveTab} />
      case 'referrals':
        return <PartnersReferrals />
      case 'account':
        return <AccountSettings onNavigate={setActiveTab} />
      default:
        return (
          <div style={{ background: 'white', borderRadius: '10px', padding: '2rem', border: '0.5px solid rgba(94,59,135,0.1)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#1a1a1a', marginBottom: '0.5rem' }}>
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <p style={{ color: '#aaa', fontSize: '0.875rem' }}>This section is coming soon.</p>
          </div>
        )
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f9', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{
        height: 64,
        background: '#5e3b87',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: 'white', fontSize: '1.125rem', letterSpacing: '-0.01em' }}>
            Verrante
          </span>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f0a500', display: 'inline-block', marginLeft: 3, marginBottom: 8, flexShrink: 0 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>{user?.email}</span>
          <button
            onClick={handleSignOut}
            style={{ padding: '0.375rem 0.85rem', border: '1px solid rgba(255,255,255,0.22)', borderRadius: '6px', background: 'transparent', color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Nav strip */}
      <div style={{
        height: 44,
        background: '#4a2d6e',
        display: 'flex',
        alignItems: 'stretch',
        padding: '0 1.5rem',
        boxSizing: 'border-box',
        overflowX: 'auto',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0 1.1rem',
              border: 'none',
              borderBottom: `2.5px solid ${activeTab === tab.id ? '#f0a500' : 'transparent'}`,
              background: 'transparent',
              color: activeTab === tab.id ? '#f0a500' : 'rgba(255,255,255,0.58)',
              fontSize: '0.8125rem',
              fontWeight: activeTab === tab.id ? 500 : 400,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '2rem', maxWidth: 940, margin: '0 auto', boxSizing: 'border-box' }}>
        <HelpMascot activeTab={activeTab} businessName={businessName} />
        {renderTab()}
      </div>

    </div>
  )
}

export default Portal
