import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePreview } from '../context/PreviewContext'
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
  const preview = usePreview()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [checking, setChecking] = useState(true)
  const [businessName, setBusinessName] = useState('')
  const [tenantId, setTenantId] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [allTenants, setAllTenants] = useState([])
  const navigate = useNavigate()

  // Tab → vera context key mapping
  const TAB_CONTEXT = {
    dashboard: 'dashboard.first_visit',
    profile:   'profile.first_visit',
    ai:        'ai_behaviour.first_visit',
    analytics: 'analytics.first_visit',
    referrals: 'referrals.first_visit',
    account:   'account.first_visit',
  }

  useEffect(() => {
    if (!user) return
    const init = async () => {
      const { data: membership } = await supabase
        .from('tenant_memberships').select('tenant_id').eq('user_id', user.id).maybeSingle()
      if (!membership) { navigate('/onboarding', { replace: true }); return }
      setTenantId(membership.tenant_id)

      const { data: tenant } = await supabase
        .from('tenants').select('business_name').eq('id', membership.tenant_id).maybeSingle()
      setBusinessName(tenant?.business_name || '')

      // Check owner flag
      const { data: profile } = await supabase
        .from('profiles').select('is_owner').eq('id', user.id).maybeSingle()
      if (profile?.is_owner) {
        setIsOwner(true)
        const { data: tenants } = await supabase
          .from('tenants').select('id, business_name').order('business_name')
        setAllTenants(tenants || [])
      }

      setChecking(false)
    }
    init()
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

  const displayName = preview.isPreview ? preview.previewBusinessName : businessName

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f9', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Owner preview banner */}
      {preview.isPreview && (
        <div style={{ background: '#f0a500', color: '#1a0533', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', boxSizing: 'border-box', fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif" }}>
          <span style={{ fontWeight: '600' }}>
            <span style={{ opacity: 0.65, fontWeight: '700', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Owner preview</span>
            {'  ·  '}{preview.previewBusinessName}
          </span>
          <button
            onClick={() => { preview.exitPreview(); setActiveTab('dashboard') }}
            style={{ background: 'rgba(26,5,51,0.15)', border: '1px solid rgba(26,5,51,0.25)', borderRadius: '5px', color: '#1a0533', fontSize: '0.75rem', fontWeight: '500', cursor: 'pointer', padding: '0.2rem 0.65rem', fontFamily: "'DM Sans', sans-serif" }}
          >
            Exit preview
          </button>
        </div>
      )}

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
          {/* Owner tenant selector */}
          {isOwner && (
            <select
              value={preview.isPreview ? preview.previewTenantId : ''}
              onChange={e => {
                const tid = e.target.value
                if (!tid) { preview.exitPreview(); return }
                const t = allTenants.find(t => t.id === tid)
                preview.enterPreview(tid, t?.business_name || '')
                setActiveTab('dashboard')
              }}
              style={{ padding: '0.3rem 0.5rem', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '0.75rem', cursor: 'pointer', maxWidth: '180px', fontFamily: "'DM Sans', sans-serif" }}
            >
              <option value="" style={{ background: '#5e3b87' }}>— Preview a tenant —</option>
              {allTenants.map(t => (
                <option key={t.id} value={t.id} style={{ background: '#5e3b87' }}>{t.business_name}</option>
              ))}
            </select>
          )}
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
        <HelpMascot
          activeTab={activeTab}
          businessName={displayName}
          tenantId={preview.isPreview ? preview.previewTenantId : tenantId}
          contextKey={TAB_CONTEXT[activeTab]}
        />
        {renderTab()}
      </div>

    </div>
  )
}

export default Portal
