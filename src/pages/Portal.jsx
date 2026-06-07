import { useState, useEffect, useRef } from 'react'
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

const IcoVera = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
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

const IcoBell = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)

const IcoGear = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
)

const IcoMoon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)

const IcoListen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>
    <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
  </svg>
)

// ─── Simple toggle ─────────────────────────────────────────────────────────────

const Toggle = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    style={{
      width: 38, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', flexShrink: 0,
      background: checked ? '#3db87a' : '#d1d5db', position: 'relative', transition: 'background 0.18s', padding: 0,
    }}
  >
    <div style={{
      width: 16, height: 16, borderRadius: '50%', background: 'white',
      position: 'absolute', top: 3, left: checked ? 19 : 3, transition: 'left 0.18s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    }} />
  </button>
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
  const notifPanelRef = useRef(null)

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('upgraded')) return 'settings'
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

  // Live operational state — owned here, displayed in sidebar
  const [holidayMode, setHolidayMode] = useState(false)
  const [holidayReturnDate, setHolidayReturnDate] = useState('')
  const [notifyNewLead, setNotifyNewLead] = useState(true)
  const [notifyDailySummary, setNotifyDailySummary] = useState(false)
  const [notifyWeeklyReport, setNotifyWeeklyReport] = useState(true)
  const [notifPanelOpen, setNotifPanelOpen] = useState(false)

  const navigate = useNavigate()

  const handleNavigate = (tabId, prefillData) => {
    setActiveTab(tabId)
    if (tabId === 'calendar' && prefillData) setCalendarPrefill(prefillData)
    else setCalendarPrefill(null)
  }

  const TAB_CONTEXT = {
    dashboard:    'dashboard.first_visit',
    ai:           'ai_behaviour.first_visit',
    analytics:    'analytics.first_visit',
    referrals:    'referrals.first_visit',
    calendar:     'calendar.first_visit',
    integrations: 'integrations.first_visit',
    settings:     'account.first_visit',
    profile:      'profile.first_visit',
  }

  useEffect(() => {
    if (!user) return
    const init = async () => {
      const { data: membership } = await supabase
        .from('tenant_memberships').select('tenant_id').eq('user_id', user.id).maybeSingle()
      if (!membership) { navigate('/onboarding', { replace: true }); return }
      setTenantId(membership.tenant_id)

      const { data: tenant } = await supabase
        .from('tenants')
        .select('business_name, holiday_mode, holiday_return_date, notify_new_lead, notify_daily_summary, notify_weekly_report')
        .eq('id', membership.tenant_id)
        .maybeSingle()

      if (tenant) {
        setBusinessName(tenant.business_name || '')
        setHolidayMode(tenant.holiday_mode || false)
        setHolidayReturnDate(tenant.holiday_return_date || '')
        setNotifyNewLead(tenant.notify_new_lead !== false)
        setNotifyDailySummary(tenant.notify_daily_summary === true)
        setNotifyWeeklyReport(tenant.notify_weekly_report !== false)
      }

      if (user.email === 'finsolsoffice@gmail.com') {
        setIsOwner(true)
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userEmail: user.email }),
          })
          if (res.ok) {
            const json = await res.json()
            setAllTenants(json.tenants || [])
          }
        } catch {}
      }

      setChecking(false)
    }
    init()
  }, [user])

  // Close notif panel on outside click
  useEffect(() => {
    if (!notifPanelOpen) return
    const handler = (e) => {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target)) {
        setNotifPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifPanelOpen])

  if (checking) return null

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const saveHolidayToggle = async (val) => {
    setHolidayMode(val)
    if (!tenantId || preview.isPreview) return
    const { error } = await supabase.from('tenants').update({ holiday_mode: val }).eq('id', tenantId)
    if (error) {
      console.error('Holiday mode save failed:', error)
      setHolidayMode(!val) // revert on failure
    }
  }

  const saveReturnDate = async (val) => {
    setHolidayReturnDate(val)
    if (!tenantId || preview.isPreview) return
    await supabase.from('tenants').update({ holiday_return_date: val || null }).eq('id', tenantId)
  }

  const saveNotification = async (field, val) => {
    if (!tenantId || preview.isPreview) return
    await supabase.from('tenants').update({ [field]: val }).eq('id', tenantId)
  }

  // Product-organised navigation
  const PRODUCTS = [
    {
      id: 'answer',
      label: 'Answer',
      dot: '#f0a500',
      tabs: [
        { id: 'dashboard',  label: 'Home',      icon: <IcoDashboard /> },
        { id: 'analytics',  label: 'Analytics', icon: <IcoAnalytics /> },
        { id: 'ai',         label: 'Answer AI', icon: <IcoAI /> },
        { id: 'referrals',  label: 'Partners',  icon: <IcoPartners /> },
      ],
    },
    {
      id: 'calendar',
      label: 'Calendar',
      dot: '#1d4ed8',
      tabs: [
        { id: 'calendar', label: 'Calendar', icon: <IcoCalendar /> },
      ],
    },
    {
      id: 'listen',
      label: 'Listen',
      dot: '#3db87a',
      locked: true,
      tabs: [
        { id: 'listen', label: 'Real-time assist', icon: <IcoListen />, locked: true },
      ],
    },
    {
      id: 'platform',
      label: '',
      dot: null,
      dividerOnly: true,
      tabs: [
        { id: 'integrations', label: 'Integrations', icon: <IcoIntegrations /> },
      ],
    },
  ]

  // Flat tab list still needed for renderTab + mobile nav
  const tabs = PRODUCTS.flatMap(p => p.tabs).filter(t => !t.locked)

  const renderTab = () => {
    switch (activeTab) {
      case 'profile':      return <BusinessProfile />
      case 'ai':           return <AIBehaviour onNavigate={setActiveTab} />
      case 'dashboard':    return <ActivityDashboard onNavigate={handleNavigate} />
      case 'analytics':    return <DataAnalytics onNavigate={handleNavigate} />
      case 'referrals':    return <PartnersReferrals />
      case 'calendar':     return <CalendarTab onNavigate={handleNavigate} prefill={calendarPrefill} onPrefillConsumed={() => setCalendarPrefill(null)} />
      case 'integrations': return <Integrations onNavigate={setActiveTab} />
      case 'settings':     return <AccountSettings onNavigate={setActiveTab} />
      case 'listen': return (
        <div style={{ background: 'white', borderRadius: 16, padding: '2.5rem 2rem', border: '0.5px solid rgba(61,184,122,0.15)', textAlign: 'center', maxWidth: 540, margin: '0 auto' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4', border: '1.5px solid rgba(61,184,122,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', color: '#3db87a' }}>
            <IcoListen />
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#1a1a1a', marginBottom: '0.5rem' }}>Qerxel Listen</div>
          <div style={{ fontSize: '0.875rem', color: '#666', lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif", marginBottom: '1.5rem' }}>
            Real-time call listening with on-screen AI assist. Your AI surfaces the right information as the conversation happens — product details, availability, notes — without the caller knowing.
          </div>
          <div style={{ display: 'inline-block', padding: '0.4rem 1rem', background: '#f0fdf4', border: '1px solid rgba(61,184,122,0.3)', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, color: '#3db87a', fontFamily: "'DM Sans', sans-serif" }}>
            Coming in a future release
          </div>
        </div>
      )
      default: return (
        <div style={{ background: 'white', borderRadius: '10px', padding: '2rem', border: '0.5px solid rgba(94,59,135,0.1)' }}>
          <p style={{ color: '#aaa', fontSize: '0.875rem' }}>Coming soon.</p>
        </div>
      )
    }
  }

  const displayName = preview.isPreview ? preview.previewBusinessName : businessName
  const activeTenantId = preview.isPreview ? preview.previewTenantId : tenantId

  const mobileNavTabs = [
    { id: 'dashboard',  label: 'Home',     icon: <IcoDashboard /> },
    { id: 'calendar',   label: 'Calendar', icon: <IcoCalendar /> },
    { id: 'ai',         label: 'AI',       icon: <IcoAI /> },
    { id: 'analytics',  label: 'Stats',    icon: <IcoAnalytics /> },
    { id: 'settings',   label: 'Settings', icon: <IcoGear /> },
  ]

  const sidebarW = sidebarCollapsed ? 60 : 260

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'DM Sans', system-ui, sans-serif", background: '#f7f6f9' }}>

      {/* ── Sidebar (desktop only) ─────────────────────────────────────────── */}
      {!isMobile && (
        <aside style={{
          position: 'relative',
          width: sidebarW,
          background: '#5e3b87',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.22s ease',
          overflow: 'hidden',
          flexShrink: 0,
          zIndex: 10,
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

          {/* Nav items — product-grouped */}
          <nav style={{ flex: 1, paddingTop: '0.35rem', overflowY: 'auto', overflowX: 'hidden' }}>
            {PRODUCTS.map((product, pi) => (
              <div key={product.id}>
                {/* Product label */}
                {!sidebarCollapsed && product.label && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: pi === 0 ? '0.55rem 1.25rem 0.2rem' : '0.7rem 1.25rem 0.2rem' }}>
                    {product.dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: product.dot, flexShrink: 0 }} />}
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.11em', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                      {product.label}
                    </span>
                    {product.locked && (
                      <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.07)', borderRadius: 3, padding: '0.05rem 0.3rem', letterSpacing: '0.06em' }}>
                        SOON
                      </span>
                    )}
                  </div>
                )}
                {/* Collapsed divider between products */}
                {sidebarCollapsed && pi > 0 && (
                  <div style={{ height: 1, margin: '0.25rem 0.75rem', background: 'rgba(255,255,255,0.08)' }} />
                )}

                {/* Tabs */}
                {product.tabs.map(tab => {
                  const isActive = activeTab === tab.id
                  const isHovered = hoveredNav === tab.id
                  const isLocked = !!tab.locked
                  return (
                    <button
                      key={tab.id}
                      onClick={() => !isLocked && setActiveTab(tab.id)}
                      onMouseEnter={() => setHoveredNav(tab.id)}
                      onMouseLeave={() => setHoveredNav(null)}
                      title={sidebarCollapsed ? tab.label : undefined}
                      disabled={isLocked}
                      style={{
                        width: '100%', height: 40,
                        display: 'flex', alignItems: 'center',
                        justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                        gap: '0.65rem',
                        padding: sidebarCollapsed ? 0 : '0 1.25rem',
                        border: 'none',
                        borderLeft: `3px solid ${isActive ? '#f0a500' : 'transparent'}`,
                        marginLeft: isActive ? -3 : 0,
                        background: isActive ? 'rgba(255,255,255,0.15)' : isHovered && !isLocked ? 'rgba(255,255,255,0.05)' : 'transparent',
                        color: isLocked ? 'rgba(255,255,255,0.22)' : isActive ? 'white' : 'rgba(255,255,255,0.62)',
                        cursor: isLocked ? 'default' : 'pointer',
                        transition: 'background 0.12s, color 0.12s',
                        boxSizing: 'border-box',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '0.8125rem',
                        fontWeight: isActive ? 500 : 400,
                      }}
                    >
                      {tab.icon}
                      {!sidebarCollapsed && (
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>
                          {tab.label}
                        </span>
                      )}
                    </button>
                  )
                })}

                {/* Divider after each product group (except last) */}
                {!sidebarCollapsed && pi < PRODUCTS.length - 1 && (
                  <div style={{ height: 1, margin: '0.3rem 0.75rem 0', background: 'rgba(255,255,255,0.07)' }} />
                )}
              </div>
            ))}
          </nav>

          {/* ── Holiday widget ─────────────────────────────────────────────── */}
          {holidayMode ? (
            <div style={{
              margin: sidebarCollapsed ? '0.5rem 0' : '0.5rem 0.75rem',
              borderRadius: 10,
              background: 'rgba(240,165,0,0.18)',
              border: '1px solid rgba(240,165,0,0.35)',
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 0 12px rgba(240,165,0,0.2)',
            }}>
              {sidebarCollapsed ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '0.6rem 0' }}>
                  <IcoMoon />
                </div>
              ) : (
                <div style={{ padding: '0.75rem 0.9rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f0a500', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'DM Sans', sans-serif" }}>
                      <IcoMoon />
                      Away mode
                    </div>
                    <Toggle checked={true} onChange={saveHolidayToggle} />
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.3rem' }}>Return date (optional)</div>
                  <input
                    type="date"
                    value={holidayReturnDate}
                    onChange={e => saveReturnDate(e.target.value)}
                    style={{
                      width: '100%', fontSize: '0.7rem', padding: '0.3rem 0.4rem', borderRadius: 5,
                      border: '1px solid rgba(240,165,0,0.4)', background: 'rgba(0,0,0,0.25)',
                      color: holidayReturnDate ? '#f0a500' : 'rgba(255,255,255,0.4)',
                      fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', cursor: 'pointer',
                      colorScheme: 'dark',
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div style={{
              margin: sidebarCollapsed ? '0.5rem 0' : '0.5rem 0.75rem',
              borderRadius: 8,
              background: 'rgba(61,184,122,0.1)',
              border: '1px solid rgba(61,184,122,0.2)',
              overflow: 'hidden',
              flexShrink: 0,
            }}>
              {sidebarCollapsed ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '0.55rem 0' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3db87a' }} />
                </div>
              ) : (
                <div style={{ padding: '0.6rem 0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3db87a', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>Available</span>
                  </div>
                  <button
                    onClick={() => saveHolidayToggle(true)}
                    style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'DM Sans', sans-serif" }}
                    title="Set to away"
                  >
                    Going away?
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Bottom controls ─────────────────────────────────────────────── */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>

            {/* Owner controls */}
            {isOwner && !sidebarCollapsed && (
              <div style={{ padding: '0.75rem 1rem 0', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {/* Tenant selector */}
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
                {/* Tier override */}
                <select
                  value={preview.tierOverride || ''}
                  onChange={e => preview.setTierOverride(e.target.value || null)}
                  style={{ width: '100%', padding: '0.3rem 0.5rem', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', background: preview.tierOverride ? 'rgba(240,165,0,0.2)' : 'rgba(255,255,255,0.1)', color: preview.tierOverride ? '#f0a500' : 'rgba(255,255,255,0.6)', fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }}
                >
                  <option value="" style={{ background: '#5e3b87' }}>— Tier view —</option>
                  {['free', 'light', 'standard', 'professional', 'enterprise'].map(t => (
                    <option key={t} value={t} style={{ background: '#5e3b87' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
                {/* Demo portal link */}
                <a
                  href="/demo/login"
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', textAlign: 'center', padding: '0.2rem 0', fontFamily: "'DM Sans', sans-serif" }}
                  onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.75)'}
                  onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}
                >
                  Demo businesses →
                </a>
              </div>
            )}

            {/* Business name */}
            {!sidebarCollapsed && (
              <div style={{ padding: '0.6rem 1.25rem 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>
                {displayName || user?.email}
              </div>
            )}

            {/* Icon row: Bell · Gear · Vera · Sign out */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '0.4rem 0', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '0.4rem' }}>
              {[
                { id: 'bell', icon: <IcoBell />, label: 'Notifications', action: () => setNotifPanelOpen(o => !o), active: notifPanelOpen },
                { id: 'gear', icon: <IcoGear />, label: 'Settings', action: () => setActiveTab('settings'), active: activeTab === 'settings' },
                { id: 'vera', icon: <IcoVera />, label: 'Ask Vera', action: () => document.getElementById('vera-trigger-btn')?.click(), active: false },
                { id: 'signout', icon: <IcoSignOut />, label: 'Sign out', action: handleSignOut, active: false },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={item.action}
                  title={item.label}
                  onMouseEnter={() => setHoveredNav(item.id)}
                  onMouseLeave={() => setHoveredNav(null)}
                  style={{
                    flex: 1, height: 40,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none',
                    borderTop: item.active ? '2px solid #f0a500' : '2px solid transparent',
                    background: item.active ? 'rgba(255,255,255,0.12)' : hoveredNav === item.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                    color: item.active ? '#f0a500' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                    padding: 0,
                    boxSizing: 'border-box',
                  }}
                >
                  {item.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(c => !c)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)',
              width: 24, height: 24, borderRadius: '50%',
              background: 'white', border: '1px solid rgba(94,59,135,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 20,
              boxShadow: '0 2px 8px rgba(94,59,135,0.15)',
              color: '#5e3b87', padding: 0,
            }}
          >
            {sidebarCollapsed ? <IcoChevronRight /> : <IcoChevronLeft />}
          </button>

          {/* Notification slide-out panel */}
          {notifPanelOpen && (
            <div
              ref={notifPanelRef}
              style={{
                position: 'fixed',
                left: sidebarW,
                bottom: 0,
                width: 280,
                background: 'white',
                borderRadius: '0 12px 0 0',
                boxShadow: '6px -4px 28px rgba(0,0,0,0.16)',
                padding: '1.25rem',
                zIndex: 200,
                borderTop: '3px solid #f0a500',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
                Notifications
              </div>
              {[
                { label: 'New lead captured', desc: 'Immediate alert when your AI captures a lead.', val: notifyNewLead, field: 'notify_new_lead', set: setNotifyNewLead },
                { label: 'Daily summary', desc: 'End-of-day digest of calls, leads, referrals.', val: notifyDailySummary, field: 'notify_daily_summary', set: setNotifyDailySummary },
                { label: 'Weekly report', desc: 'Monday morning overview of the week.', val: notifyWeeklyReport, field: 'notify_weekly_report', set: setNotifyWeeklyReport },
              ].map((item, i, arr) => (
                <div key={item.field} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                  paddingBottom: i < arr.length - 1 ? '0.9rem' : 0,
                  marginBottom: i < arr.length - 1 ? '0.9rem' : 0,
                  borderBottom: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none',
                }}>
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1a1a1a', marginBottom: '0.15rem' }}>{item.label}</div>
                    <div style={{ fontSize: '0.72rem', color: '#999', lineHeight: 1.4 }}>{item.desc}</div>
                  </div>
                  <Toggle
                    checked={item.val}
                    onChange={v => { item.set(v); saveNotification(item.field, v) }}
                  />
                </div>
              ))}
            </div>
          )}

        </aside>
      )}

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

        {/* Settings mode header */}
        {activeTab === 'settings' && (
          <div style={{ background: 'white', borderBottom: '1px solid rgba(94,59,135,0.08)', padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
            <IcoGear />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#5e3b87', fontFamily: "'DM Sans', sans-serif" }}>Settings</span>
            <span style={{ fontSize: '0.8125rem', color: '#ccc' }}>·</span>
            <button
              onClick={() => setActiveTab('profile')}
              style={{ fontSize: '0.8125rem', color: activeTab === 'profile' ? '#5e3b87' : '#888', fontWeight: activeTab === 'profile' ? 600 : 400, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'DM Sans', sans-serif" }}
            >
              Business Profile
            </button>
          </div>
        )}
        {activeTab === 'profile' && (
          <div style={{ background: 'white', borderBottom: '1px solid rgba(94,59,135,0.08)', padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
            <IcoGear />
            <button
              onClick={() => setActiveTab('settings')}
              style={{ fontSize: '0.8125rem', color: '#888', fontWeight: 400, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'DM Sans', sans-serif" }}
            >
              Settings
            </button>
            <span style={{ fontSize: '0.8125rem', color: '#ccc' }}>›</span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#5e3b87', fontFamily: "'DM Sans', sans-serif" }}>Business Profile</span>
          </div>
        )}

        {/* Scrollable page content */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: isMobile ? '1rem 1rem 5rem' : '2rem',
          background: (activeTab === 'settings' || activeTab === 'profile') ? '#faf9fc' : '#f7f6f9',
        }}>
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
