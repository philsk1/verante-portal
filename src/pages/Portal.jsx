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
import Integrations from './Integrations'
import CalendarTab from './Calendar'
import HelpMascot from '../components/HelpMascot'

// ─── Icons ─────────────────────────────────────────────────────────────────────

const IcoDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
  </svg>
)

const IcoBusiness = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="4" y="2" width="16" height="20" rx="1"/>
    <path d="M9 22V12h6v10"/>
    <line x1="4" y1="8" x2="20" y2="8"/>
    <line x1="4" y1="14" x2="20" y2="14"/>
    <circle cx="9" cy="5" r="0.5" fill="currentColor"/>
    <circle cx="15" cy="5" r="0.5" fill="currentColor"/>
  </svg>
)

const IcoAI = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="9" y="2" width="6" height="11" rx="3"/>
    <path d="M5 10a7 7 0 0 0 14 0"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="9" y1="22" x2="15" y2="22"/>
  </svg>
)

const IcoAnalytics = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
    <line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
)

const IcoPartners = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const IcoCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

const IcoIntegrations = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
)

const IcoAccount = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

const IcoVera = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <ellipse cx="12" cy="14" rx="7" ry="8"/>
    <circle cx="9" cy="12" r="1.5"/>
    <circle cx="15" cy="12" r="1.5"/>
    <path d="M10 16.5c.5.8 3.5.8 4 0"/>
    <path d="M8 7l4 3 4-3"/>
    <path d="M6 9c-1.5-1.5-2-4-1.5-5.5"/>
    <path d="M18 9c1.5-1.5 2-4 1.5-5.5"/>
  </svg>
)

const IcoSignOut = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

const IcoChevronLeft = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

const IcoChevronRight = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

// ─── Portal ────────────────────────────────────────────────────────────────────

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

const Portal = () => {
  const { user } = useAuth()
  const preview = usePreview()
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('upgraded')) return 'account'
    if (params.get('tab') === 'integrations') return 'integrations'
    return 'dashboard'
  })
  const [checking, setChecking] = useState(true)
  const [businessName, setBusinessName] = useState('')
  const [tenantId, setTenantId] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [allTenants, setAllTenants] = useState([])
  const [calendarPrefill, setCalendarPrefill] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [hoveredNav, setHoveredNav] = useState(null)
  const navigate = useNavigate()

  const handleNavigate = (tabId, prefillData) => {
    setActiveTab(tabId)
    if (tabId === 'calendar' && prefillData) setCalendarPrefill(prefillData)
    else setCalendarPrefill(null)
  }

  const TAB_CONTEXT = {
    dashboard:    'dashboard.first_visit',
    profile:      'profile.first_visit',
    ai:           'ai_behaviour.first_visit',
    analytics:    'analytics.first_visit',
    referrals:    'referrals.first_visit',
    calendar:     'calendar.first_visit',
    integrations: 'integrations.first_visit',
    account:      'account.first_visit',
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

      if (user.email === 'finsolsoffice@gmail.com') {
        setIsOwner(true)
        try {
          const res = await fetch('/api/owner-tenants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userEmail: user.email }),
          })
          if (res.ok) {
            const json = await res.json()
            setAllTenants(json.tenants || [])
          }
        } catch {
          // not available on localhost
        }
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
    { id: 'dashboard',    label: 'Dashboard',            icon: <IcoDashboard /> },
    { id: 'calendar',     label: 'Calendar',             icon: <IcoCalendar /> },
    { id: 'ai',           label: 'AI Behaviour',         icon: <IcoAI /> },
    { id: 'analytics',    label: 'Analytics',            icon: <IcoAnalytics /> },
    { id: 'referrals',    label: 'Partners & Referrals', icon: <IcoPartners /> },
    { id: 'integrations', label: 'Integrations',         icon: <IcoIntegrations /> },
    { id: 'profile',      label: 'Business Profile',     icon: <IcoBusiness /> },
    { id: 'account',      label: 'Account',              icon: <IcoAccount /> },
  ]

  const renderTab = () => {
    switch (activeTab) {
      case 'profile':      return <BusinessProfile />
      case 'ai':           return <AIBehaviour onNavigate={setActiveTab} />
      case 'dashboard':    return <ActivityDashboard onNavigate={handleNavigate} />
      case 'analytics':    return <DataAnalytics onNavigate={handleNavigate} />
      case 'referrals':    return <PartnersReferrals />
      case 'calendar':     return <CalendarTab onNavigate={handleNavigate} prefill={calendarPrefill} onPrefillConsumed={() => setCalendarPrefill(null)} />
      case 'integrations': return <Integrations onNavigate={setActiveTab} />
      case 'account':      return <AccountSettings onNavigate={setActiveTab} />
      default: return (
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
  const activeTenantId = preview.isPreview ? preview.previewTenantId : tenantId

  const mobileNavTabs = [
    { id: 'dashboard', label: 'Home',     icon: <IcoDashboard /> },
    { id: 'calendar',  label: 'Calendar', icon: <IcoCalendar /> },
    { id: 'ai',        label: 'AI',       icon: <IcoAI /> },
    { id: 'analytics', label: 'Analytics',icon: <IcoAnalytics /> },
    { id: 'account',   label: 'Account',  icon: <IcoAccount /> },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'DM Sans', system-ui, sans-serif", background: '#f7f6f9' }}>

      {/* ── Sidebar (desktop only) ─────────────────────────────────────────── */}
      <aside style={{
        width: isMobile ? 0 : sidebarCollapsed ? 60 : 260,
        background: '#5e3b87',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.22s ease',
        overflow: 'hidden',
        flexShrink: 0,
        zIndex: 10,
        visibility: isMobile ? 'hidden' : 'visible',
      }}>

        {/* Logo */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          padding: sidebarCollapsed ? 0 : '0 1.25rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
          boxSizing: 'border-box',
        }}>
          {sidebarCollapsed ? (
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f0a500', display: 'block' }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: 'white', fontSize: '1.125rem', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                Qerxel
              </span>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f0a500', display: 'inline-block', marginLeft: 3, marginBottom: 8, flexShrink: 0 }} />
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, paddingTop: '0.5rem', overflowY: 'auto', overflowX: 'hidden' }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id
            const isHovered = hoveredNav === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                onMouseEnter={() => setHoveredNav(tab.id)}
                onMouseLeave={() => setHoveredNav(null)}
                title={sidebarCollapsed ? tab.label : undefined}
                style={{
                  width: '100%',
                  height: 42,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  gap: '0.7rem',
                  padding: sidebarCollapsed ? 0 : '0 1.25rem',
                  border: 'none',
                  borderLeft: `3px solid ${isActive ? '#f0a500' : 'transparent'}`,
                  background: isActive ? 'rgba(255,255,255,0.1)' : isHovered ? 'rgba(255,255,255,0.05)' : 'transparent',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
                  cursor: 'pointer',
                  transition: 'background 0.12s, color 0.12s',
                  boxSizing: 'border-box',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.8125rem',
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {tab.icon}
                {!sidebarCollapsed && (
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tab.label}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>

          {/* Owner tenant selector */}
          {isOwner && !sidebarCollapsed && (
            <div style={{ padding: '0.75rem 1rem 0' }}>
              <select
                value={preview.isPreview ? preview.previewTenantId : ''}
                onChange={e => {
                  const tid = e.target.value
                  if (!tid) { preview.exitPreview(); return }
                  const t = allTenants.find(t => t.id === tid)
                  preview.enterPreview(tid, t?.business_name || '')
                  setActiveTab('dashboard')
                }}
                style={{ width: '100%', padding: '0.3rem 0.5rem', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }}
              >
                <option value="" style={{ background: '#5e3b87' }}>— Preview tenant —</option>
                {allTenants.map(t => (
                  <option key={t.id} value={t.id} style={{ background: '#5e3b87' }}>{t.business_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* User + sign out */}
          {!sidebarCollapsed && (
            <div style={{ padding: '0.75rem 1.25rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
              <button
                onClick={handleSignOut}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: 0, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
              >
                <IcoSignOut />
                Sign out
              </button>
            </div>
          )}

          {/* Vera help trigger */}
          <button
            onClick={() => document.getElementById('vera-trigger-btn')?.click()}
            onMouseEnter={() => setHoveredNav('vera')}
            onMouseLeave={() => setHoveredNav(null)}
            title="Ask Vera for help"
            style={{
              width: '100%',
              height: 42,
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              gap: '0.7rem',
              padding: sidebarCollapsed ? 0 : '0 1.25rem',
              border: 'none',
              background: hoveredNav === 'vera' ? 'rgba(255,255,255,0.07)' : 'transparent',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              transition: 'background 0.12s',
              boxSizing: 'border-box',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.8125rem',
            }}
          >
            <IcoVera />
            {!sidebarCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Ask Vera</span>}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(c => !c)}
            onMouseEnter={() => setHoveredNav('collapse')}
            onMouseLeave={() => setHoveredNav(null)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              width: '100%',
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              gap: '0.5rem',
              padding: sidebarCollapsed ? 0 : '0 1.25rem',
              border: 'none',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
              transition: 'color 0.12s',
              boxSizing: 'border-box',
              fontSize: '0.72rem',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {sidebarCollapsed ? <IcoChevronRight /> : <IcoChevronLeft />}
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>

      </aside>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Preview banner */}
        {preview.isPreview && (
          <div style={{ background: '#f0a500', color: '#1a0533', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', boxSizing: 'border-box', fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
            <span style={{ fontWeight: 600 }}>
              <span style={{ opacity: 0.65, fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Owner preview</span>
              {'  ·  '}{preview.previewBusinessName}
            </span>
            <button
              onClick={() => { preview.exitPreview(); setActiveTab('dashboard') }}
              style={{ background: 'rgba(26,5,51,0.15)', border: '1px solid rgba(26,5,51,0.25)', borderRadius: '5px', color: '#1a0533', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', padding: '0.2rem 0.65rem', fontFamily: "'DM Sans', sans-serif" }}
            >
              Exit preview
            </button>
          </div>
        )}

        {/* Scrollable page content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '1rem 1rem 5rem' : '2rem' }}>
          <HelpMascot
            activeTab={activeTab}
            businessName={displayName}
            tenantId={activeTenantId}
            contextKey={TAB_CONTEXT[activeTab]}
          />
          {renderTab()}
        </div>

      </div>

      {/* ── Bottom nav (mobile only) ──────────────────────────────────────────── */}
      {isMobile && (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 58, background: '#5e3b87', display: 'flex', zIndex: 200, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {mobileNavTabs.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, border: 'none', borderTop: isActive ? '2px solid #f0a500' : '2px solid transparent', background: 'transparent', color: isActive ? '#f0a500' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '0.6rem', fontWeight: isActive ? 600 : 400, transition: 'color 0.12s', padding: '0 0.25rem', boxSizing: 'border-box' }}
              >
                {tab.icon}
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      )}

    </div>
  )
}

export default Portal
