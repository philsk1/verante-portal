import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DemoProvider, useDemo } from '../context/DemoContext'
import { supabase } from '../supabase'
import DemoBanner from '../components/DemoBanner'
import BusinessProfile from './BusinessProfile'
import AIBehaviour from './AIBehaviour'
import ActivityDashboard from './ActivityDashboard'
import DataAnalytics from './DataAnalytics'
import PartnersReferrals from './PartnersReferrals'
import AccountSettings from './AccountSettings'
import Calendar from './Calendar'
import StaffDirectory from './StaffDirectory'
import ListenTab from './ListenTab'

// ── Icons ────────────────────────────────────────────────────────────────────
const IcoGrid    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
const IcoUser    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const IcoBot     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M12 11V5"/><circle cx="12" cy="4" r="1"/><path d="M8 15h.01M16 15h.01"/></svg>
const IcoChart   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
const IcoPartner = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
const IcoGear    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
const IcoCalendar = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
const IcoPeople   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
const IcoChevron = ({ dir }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{dir === 'left' ? <polyline points="15 18 9 12 15 6"/> : <polyline points="9 18 15 12 9 6"/>}</svg>
const IcoListen   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>

const NAV = [
  { id: 'dashboard', label: 'Dashboard',            icon: <IcoGrid /> },
  { id: 'analytics', label: 'Analytics',            icon: <IcoChart /> },
  { id: 'ai',        label: 'AI Behaviour',         icon: <IcoBot /> },
  { id: 'referrals', label: 'Partners & Referrals', icon: <IcoPartner /> },
  { id: 'team',      label: 'Team',                 icon: <IcoPeople /> },
  { id: 'listen',    label: 'Listen',               icon: <IcoListen /> },
  { id: 'calendar',  label: 'Calendar',             icon: <IcoCalendar /> },
  { id: 'account',   label: 'Account',              icon: <IcoGear /> },
  { id: 'profile',   label: 'Business Profile',     icon: <IcoUser /> },
]

const DemoPortalInner = ({ businessId }) => {
  const demo = useDemo()
  const navigate = useNavigate()
  const [activeTab, setActiveTab]         = useState('dashboard')
  const [collapsed, setCollapsed]         = useState(false)
  const [hoveredNav, setHoveredNav]       = useState(null)

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('demo_session') || '{}')
    if (!session.id || !businessId || !demo.tier) return
    supabase.from('demo_sessions').insert({ user_id: session.id, business_id: businessId, tier: demo.tier }).then(() => {})
  }, [businessId, demo.tier])

  const session = JSON.parse(localStorage.getItem('demo_session') || '{}')

  const renderTab = () => {
    switch (activeTab) {
      case 'profile':   return <BusinessProfile />
      case 'ai':        return <AIBehaviour onNavigate={setActiveTab} />
      case 'dashboard': return <ActivityDashboard onNavigate={setActiveTab} />
      case 'analytics': return <DataAnalytics onNavigate={setActiveTab} />
      case 'referrals': return <PartnersReferrals />
      case 'listen':    return <ListenTab />
      case 'calendar':  return <Calendar />
      case 'team':      return <StaffDirectory />
      case 'account':   return <AccountSettings onNavigate={setActiveTab} />
      default:          return null
    }
  }

  const sidebarW = collapsed ? 60 : 260

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f9', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* Demo banner */}
      {demo.business && (
        <DemoBanner businessName={demo.business.business_name} tier={demo.tier} businessId={businessId} />
      )}

      {/* Body: sidebar + content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div style={{
          width: sidebarW, minHeight: '100%',
          background: 'linear-gradient(180deg, #5e3b87 0%, #4a2d6e 100%)',
          display: 'flex', flexDirection: 'column',
          transition: 'width 0.22s cubic-bezier(.4,0,.2,1)',
          position: 'relative', flexShrink: 0, overflow: 'hidden',
          boxShadow: '2px 0 12px rgba(58,32,87,0.18)',
        }}>

          {/* Logo */}
          <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: collapsed ? '0' : '0 1.25rem', justifyContent: collapsed ? 'center' : 'flex-start', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {collapsed ? (
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: 'white', fontSize: '1.1rem' }}>Q</span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: 'white', fontSize: '1.125rem', letterSpacing: '-0.01em' }}>Qerxel</span>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f0a500', display: 'inline-block', marginLeft: 3, marginBottom: 8, flexShrink: 0 }} />
              </div>
            )}
          </div>

          {/* Business name */}
          {!collapsed && demo.business && (
            <div style={{ padding: '0.75rem 1.25rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.2rem' }}>Viewing</div>
              <div style={{ fontSize: '0.82rem', color: 'white', fontWeight: 600, fontFamily: "'DM Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{demo.business.business_name}</div>
            </div>
          )}

          {/* Nav */}
          <nav style={{ flex: 1, padding: collapsed ? '0.5rem 0' : '0.5rem 0', overflowY: 'auto' }}>
            {NAV.map(item => {
              const active = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  onMouseEnter={() => setHoveredNav(item.id)}
                  onMouseLeave={() => setHoveredNav(null)}
                  title={collapsed ? item.label : undefined}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    gap: collapsed ? 0 : '0.75rem',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '0.7rem 0' : '0.7rem 1.25rem',
                    border: 'none', borderLeft: active ? '3px solid #f0a500' : '3px solid transparent',
                    background: active ? 'rgba(255,255,255,0.12)' : hoveredNav === item.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                    color: active ? '#f0a500' : 'rgba(255,255,255,0.65)',
                    cursor: 'pointer', transition: 'all 0.13s', boxSizing: 'border-box',
                    fontFamily: "'DM Sans', sans-serif", fontSize: '0.84rem', fontWeight: active ? 500 : 400,
                    textAlign: 'left',
                  }}
                >
                  <span style={{ flexShrink: 0 }}>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </button>
              )
            })}
          </nav>

          {/* Bottom: back to businesses + user */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
            {!collapsed && (
              <>
                <button
                  onClick={() => navigate('/demo/select')}
                  style={{ width: '100%', padding: '0.65rem 1.25rem', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.85)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                >
                  ← All businesses
                </button>
                <div style={{ padding: '0 1.25rem 0.75rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>
                  {session.name || session.email}
                </div>
              </>
            )}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand' : 'Collapse'}
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
            {collapsed ? <IcoChevron dir="right" /> : <IcoChevron dir="left" />}
          </button>
        </div>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <div style={{
          flex: 1, minWidth: 0,
          overflowY: activeTab === 'listen' ? 'hidden' : 'auto',
          display: activeTab === 'listen' ? 'flex' : 'block',
          flexDirection: activeTab === 'listen' ? 'column' : undefined,
        }}>
          {demo.loading ? (
            <div style={{ padding: '3rem 2rem', color: '#aaa', fontSize: '0.875rem' }}>Loading demo data…</div>
          ) : (
            renderTab()
          )}
        </div>

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
