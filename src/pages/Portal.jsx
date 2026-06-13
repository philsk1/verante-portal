import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
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
import StaffDirectory from './StaffDirectory'
import ListenTab from './ListenTab'
import PhoneLines from './PhoneLines'
import ClientDirectory from './ClientDirectory'
import ServiceCatalogue from './ServiceCatalogue'
import ProductCatalogue from './ProductCatalogue'
import SentryTab from './Sentry'
import HelpMascot from '../components/HelpMascot'
import { QScoreProvider } from '../context/QScoreContext'
import {
  IcoDashboard, IcoAI, IcoAnalytics, IcoPartners, IcoCalendar,
  IcoIntegrations, IcoVera, IcoSignOut, IcoChevronLeft, IcoChevronRight,
  IcoBell, IcoGear, IcoPeople, IcoBuilding, IcoClients, IcoServices,
  IcoProducts, IcoListen, IcoPhone, IcoEye,
} from './PortalIcons'
import { useTenantState } from '../hooks/useTenantState'

// ─── Static data — defined outside component so they never trigger re-renders ──

const GAP_DEFS = [
  {
    id: 'booking_link',
    check: (t) => t.outcomeType === 'booking' && !t.bookingLink,
    tabs: ['ai', 'dashboard'],
    message: "I can't send callers a booking link — add one in AI Settings and I'll quote it on every call.",
    actionLabel: 'Add now',
    actionTab: 'ai',
  },
  {
    id: 'opening_hours',
    check: (t) => !t.openingHours,
    tabs: ['profile', 'ai', 'dashboard'],
    message: "Your callers ask when you're open. Add your opening hours and I'll answer that for you.",
    actionLabel: 'Add hours',
    actionTab: 'profile',
  },
  {
    id: 'catalogue',
    check: (t) => t.catalogueCount === 0,
    tabs: ['profile', 'dashboard'],
    message: "Add your services and I'll describe them on every call. Callers who know the price convert faster.",
    actionLabel: 'Add services',
    actionTab: 'profile',
  },
  {
    id: 'callback_note',
    check: (t) => !t.callbackNote,
    tabs: ['ai'],
    message: "'Within 2 hours' beats 'as soon as possible'. Tell me when to promise a callback.",
    actionLabel: 'Set it',
    actionTab: 'ai',
  },
  {
    id: 'emergency_keywords',
    check: (t) => !t.emergencyKeywords?.length,
    tabs: ['ai'],
    message: "No emergency keywords set. Add a few and I'll escalate calls immediately when I hear them.",
    actionLabel: 'Add keywords',
    actionTab: 'ai',
  },
]

const TAB_CONTEXT = {
  dashboard:    'dashboard.first_visit',
  ai:           'ai_behaviour.first_visit',
  analytics:    'analytics.first_visit',
  referrals:    'referrals.first_visit',
  listen:       'listen.first_visit',
  team:         'team.first_visit',
  calendar:     'calendar.first_visit',
  integrations: 'integrations.first_visit',
  settings:     'account.first_visit',
  profile:      'profile.first_visit',
}

function getVeraAlert(activeTab, holidayMode, uncontactedCount) {
  if (activeTab === 'dashboard' || activeTab === 'analytics') {
    if (holidayMode) return "🌙 Q: Holiday mode is on — your AI is paused. Disable it in Settings when you're back."
    if (uncontactedCount >= 5) return `⚡ Q: ${uncontactedCount} leads are waiting. The first hour matters most — callers who aren't called back often move on.`
    if (uncontactedCount >= 2) return `💡 Q: ${uncontactedCount} leads need a follow-up. A quick call now could convert them.`
  }
  if (activeTab === 'referrals' && uncontactedCount >= 3) return `💡 Q: You have ${uncontactedCount} uncalled leads on your dashboard. Partners bring more value when you close the ones you have.`
  if (activeTab === 'team' && uncontactedCount > 0) return `💡 Q: ${uncontactedCount} lead${uncontactedCount !== 1 ? 's' : ''} waiting on the dashboard. Your team might be able to help with follow-up calls.`
  return null
}

// ─── Toggle ────────────────────────────────────────────────────────────────────

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

// ─── useIsMobile ───────────────────────────────────────────────────────────────

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

// ─── Portal ────────────────────────────────────────────────────────────────────

const Portal = () => {
  const {
    checking,
    businessName, tenantId,
    holidayMode, holidayReturnDate,
    notifyNewLead,      setNotifyNewLead,
    notifyDailySummary, setNotifyDailySummary,
    notifyWeeklyReport, setNotifyWeeklyReport,
    baseTier, urgentOutcomes, uncontactedCount,
    listenTier,  setListenTier,
    calendarTier, hasAnswerProduct, sentryCameraLimit,
    gapData, saveReturnDate, saveNotification,
  } = useTenantState()

  const preview = usePreview()
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const notifPanelRef = useRef(null)

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('upgraded')) return 'settings'
    if (params.get('tab') === 'integrations') return 'integrations'
    if (params.get('ownerTab')) return params.get('ownerTab')
    return 'dashboard'
  })
  const [calendarPrefill, setCalendarPrefill]     = useState(null)
  const [listenPrefill, setListenPrefill]         = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed]   = useState(false)
  const [hoveredNav, setHoveredNav]               = useState(null)
  const [notifPanelOpen, setNotifPanelOpen]       = useState(false)
  const [planSelectorTrigger, setPlanSelectorTrigger] = useState(0)
  const [teamOpenAdd, setTeamOpenAdd]             = useState(false)
  const [sitemapOpen, setSitemapOpen]             = useState(false)
  const [sitemapQuery, setSitemapQuery]           = useState('')
  const [sitemapIdx, setSitemapIdx]               = useState(0)
  const sitemapInputRef = useRef(null)

  const handleNavigate = useCallback((tabId, prefillData) => {
    setActiveTab(tabId)
    if (tabId === 'calendar' && prefillData) setCalendarPrefill(prefillData)
    else setCalendarPrefill(null)
    if (tabId === 'listen' && prefillData?.callId) setListenPrefill(prefillData)
    else if (tabId !== 'listen') setListenPrefill(null)
    if (tabId === 'team' && prefillData?.openAdd) setTeamOpenAdd(true)
    else if (tabId === 'team') setTeamOpenAdd(false)
  }, [])

  const activeGaps = useMemo(() => {
    if (!gapData || !tenantId || !hasAnswerProduct) return []
    return GAP_DEFS.filter(def => def.check(gapData))
  }, [gapData, tenantId, hasAnswerProduct])

  const hasListen       = listenTier !== 'none'
  const hasSchedule     = calendarTier !== 'none'
  const hasScheduleMulti = calendarTier === 'multi'
  const scheduleOnly    = hasSchedule && !hasAnswerProduct

  // Must stay before conditional return — hooks cannot follow a return statement
  useEffect(() => {
    if (scheduleOnly && activeTab === 'dashboard') setActiveTab('calendar')
  }, [scheduleOnly])

  useEffect(() => {
    if (!notifPanelOpen) return
    const handler = (e) => {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target)) setNotifPanelOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifPanelOpen])

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSitemapOpen(o => !o) }
      if (e.key === 'Escape') setSitemapOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!sitemapOpen) return
    setSitemapQuery('')
    setSitemapIdx(0)
    setTimeout(() => sitemapInputRef.current?.focus(), 40)
  }, [sitemapOpen])

  // Memoised so icon React elements aren't recreated on unrelated re-renders
  const PRODUCTS = useMemo(() => scheduleOnly ? [
    {
      id: 'schedule',
      label: 'Schedule',
      dot: '#60a5fa',
      tabs: [
        { id: 'calendar',  label: 'Calendar',  icon: <IcoCalendar /> },
        { id: 'team',      label: 'Team',      icon: <IcoPeople />,   locked: !hasScheduleMulti },
        { id: 'services',  label: 'Services',  icon: <IcoServices /> },
        { id: 'analytics', label: 'Analytics', icon: <IcoAnalytics /> },
        { id: 'referrals', label: 'Partners',  icon: <IcoPartners /> },
      ],
    },
    { id: '_build_card', buildCard: true, tabs: [] },
    {
      id: 'sentry',
      label: 'Sentry',
      dot: sentryCameraLimit > 0 ? '#ef4444' : 'rgba(255,255,255,0.18)',
      locked: sentryCameraLimit === 0,
      tabs: [{ id: 'sentry', label: 'Sentry', icon: <IcoEye />, locked: sentryCameraLimit === 0 }],
    },
    {
      id: 'platform',
      label: 'Platform',
      dot: null,
      tabs: [
        { id: 'profile',      label: 'Business Profile',  icon: <IcoBuilding /> },
        { id: 'settings',     label: 'Account & Billing', icon: <IcoGear /> },
        { id: 'integrations', label: 'Integrations',      icon: <IcoIntegrations /> },
      ],
    },
    { id: '_answer_upsell', upsell: 'answer', tabs: [] },
  ] : [
    {
      id: 'answer',
      label: 'Answer',
      dot: '#f0a500',
      tabs: [
        { id: 'dashboard', label: 'Home',        icon: <IcoDashboard /> },
        { id: 'analytics', label: 'Analytics',   icon: <IcoAnalytics /> },
        { id: 'ai',        label: 'AI Settings', icon: <IcoAI /> },
        { id: 'referrals', label: 'Partners',    icon: <IcoPartners /> },
      ],
    },
    {
      id: 'listen',
      label: 'Listen',
      dot: hasListen ? '#3db87a' : 'rgba(255,255,255,0.18)',
      locked: !hasListen,
      tabs: [{ id: 'listen', label: 'Listen', icon: <IcoListen />, locked: !hasListen }],
    },
    {
      id: 'schedule',
      label: 'Schedule',
      dot: hasSchedule ? '#60a5fa' : 'rgba(255,255,255,0.18)',
      locked: !hasSchedule,
      tabs: [
        { id: 'calendar', label: 'Calendar', icon: <IcoCalendar />, locked: !hasSchedule },
        { id: 'team',     label: 'Team',     icon: <IcoPeople />,   locked: !hasScheduleMulti },
      ],
    },
    { id: '_build_card', buildCard: true, tabs: [] },
    {
      id: 'sentry',
      label: 'Sentry',
      dot: sentryCameraLimit > 0 ? '#ef4444' : 'rgba(255,255,255,0.18)',
      locked: sentryCameraLimit === 0,
      tabs: [{ id: 'sentry', label: 'Sentry', icon: <IcoEye />, locked: sentryCameraLimit === 0 }],
    },
    {
      id: 'business',
      label: 'Business',
      dot: '#f0a500',
      tabs: [
        { id: 'clients',  label: 'Clients',  icon: <IcoClients /> },
        { id: 'services', label: 'Services', icon: <IcoServices /> },
        { id: 'products', label: 'Products', icon: <IcoProducts /> },
      ],
    },
    {
      id: 'platform',
      label: 'Platform',
      dot: null,
      tabs: [
        { id: 'profile',      label: 'Business Profile',  icon: <IcoBuilding /> },
        { id: 'lines',        label: 'Lines',             icon: <IcoPhone /> },
        { id: 'settings',     label: 'Account & Billing', icon: <IcoGear /> },
        { id: 'integrations', label: 'Integrations',      icon: <IcoIntegrations /> },
      ],
    },
  ], [scheduleOnly, hasListen, hasSchedule, hasScheduleMulti, sentryCameraLimit])

  const mobileNavTabs = useMemo(() => scheduleOnly ? [
    { id: 'calendar',  label: 'Calendar', icon: <IcoCalendar /> },
    { id: 'team',      label: 'Team',     icon: <IcoPeople /> },
    { id: 'services',  label: 'Services', icon: <IcoServices /> },
    { id: 'analytics', label: 'Stats',    icon: <IcoAnalytics /> },
    { id: 'settings',  label: 'Account',  icon: <IcoGear /> },
  ] : [
    { id: 'dashboard', label: 'Home',     icon: <IcoDashboard /> },
    { id: 'calendar',  label: 'Calendar', icon: <IcoCalendar /> },
    { id: 'ai',        label: 'AI',       icon: <IcoAI /> },
    { id: 'analytics', label: 'Stats',    icon: <IcoAnalytics /> },
    { id: 'settings',  label: 'Settings', icon: <IcoGear /> },
  ], [scheduleOnly])

  if (checking) return null

  // ── Sitemap items (built after check so PRODUCTS is available) ─────────────

  const sitemapAllItems = PRODUCTS
    .filter(p => !p.buildCard && !p.upsell)
    .flatMap(p => p.tabs.map(t => ({ id: t.id, label: t.label, icon: t.icon, group: p.label, locked: !!t.locked })))

  const sitemapItems = sitemapQuery.trim()
    ? sitemapAllItems.filter(item => item.label.toLowerCase().includes(sitemapQuery.toLowerCase().trim()))
    : sitemapAllItems

  // ── Post-load helpers ──────────────────────────────────────────────────────

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'lines':        return <PhoneLines />
      case 'clients':      return <ClientDirectory />
      case 'services':     return <ServiceCatalogue />
      case 'products':     return <ProductCatalogue />
      case 'profile':      return <BusinessProfile onNavigate={setActiveTab} />
      case 'ai':           return <AIBehaviour onNavigate={setActiveTab} />
      case 'dashboard':    return <ActivityDashboard onNavigate={handleNavigate} />
      case 'analytics':    return <DataAnalytics onNavigate={handleNavigate} />
      case 'referrals':    return <PartnersReferrals onNavigate={handleNavigate} />
      case 'team':         return <StaffDirectory onNavigate={handleNavigate} openAdd={teamOpenAdd} onOpenAddConsumed={() => setTeamOpenAdd(false)} tier={baseTier} />
      case 'calendar':     return <CalendarTab onNavigate={handleNavigate} prefill={calendarPrefill} onPrefillConsumed={() => setCalendarPrefill(null)} calendarTier={calendarTier} />
      case 'integrations': return <Integrations onNavigate={setActiveTab} />
      case 'settings':     return <AccountSettings onNavigate={setActiveTab} onListenTierChange={setListenTier} triggerPlanSelector={planSelectorTrigger} />
      case 'sentry':       return <SentryTab cameraLimit={sentryCameraLimit} />
      case 'listen':       return <ListenTab prefill={listenPrefill} onPrefillConsumed={() => setListenPrefill(null)} urgentOutcomes={urgentOutcomes} />
      default: return (
        <div style={{ background: 'white', borderRadius: '10px', padding: '2rem', border: '0.5px solid rgba(94,59,135,0.1)' }}>
          <p style={{ color: '#aaa', fontSize: '0.875rem' }}>Coming soon.</p>
        </div>
      )
    }
  }

  const displayName    = preview.isPreview ? preview.previewBusinessName : businessName
  const activeTenantId = preview.isPreview ? preview.previewTenantId    : tenantId
  const sidebarW       = sidebarCollapsed ? 60 : 260

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <QScoreProvider>
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", background: '#f7f6f9' }}>
      <style>{`@keyframes urgentPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.5)} }`}</style>

      {/* Sidebar (desktop only) */}
      {!isMobile && (
        <aside style={{
          position: 'sticky', top: 0, alignSelf: 'flex-start',
          height: '100vh', width: sidebarW, flexShrink: 0,
          background: '#5e3b87', display: 'flex', flexDirection: 'column',
          transition: 'width 0.22s ease', overflow: 'hidden', zIndex: 10,
        }}>

          {/* Logo */}
          <div
            onClick={() => setSitemapOpen(true)}
            title="Search pages  ⌘K"
            style={{
              height: 64, display: 'flex', alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'space-between',
              padding: sidebarCollapsed ? 0 : '0 0.9rem 0 1.25rem',
              borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, boxSizing: 'border-box',
              cursor: 'pointer',
            }}
          >
            {sidebarCollapsed ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f0a500', display: 'block' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3db87a', display: 'block' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: 'white', fontSize: '1.125rem', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                  Qerxel
                </span>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f0a500', display: 'inline-block', marginLeft: 3, marginBottom: 8, flexShrink: 0 }} />
              </div>
            )}
          </div>

          {/* Holiday return date strip */}
          {holidayMode && !sidebarCollapsed && (
            <div style={{ padding: '0.4rem 0.9rem', background: 'rgba(240,165,0,0.08)', borderBottom: '1px solid rgba(240,165,0,0.15)', flexShrink: 0 }}>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.2rem' }}>Return date (optional)</div>
              <input
                type="date"
                value={holidayReturnDate}
                onChange={e => saveReturnDate(e.target.value)}
                style={{
                  width: '100%', fontSize: '0.68rem', padding: '0.25rem 0.35rem', borderRadius: 4,
                  border: '1px solid rgba(240,165,0,0.3)', background: 'rgba(0,0,0,0.2)',
                  color: holidayReturnDate ? '#f0a500' : 'rgba(255,255,255,0.35)',
                  fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', cursor: 'pointer', colorScheme: 'dark',
                }}
              />
            </div>
          )}

          {/* Nav */}
          <style>{`#qerxel-nav::-webkit-scrollbar { width: 4px } #qerxel-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 2px }`}</style>
          <nav id="qerxel-nav" style={{ flex: 1, minHeight: 0, paddingTop: '0.35rem', overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.18) transparent' }}>
            {PRODUCTS.map((product, pi) => {

              if (product.buildCard) {
                return (
                  <button
                    key="_build_card"
                    onClick={() => { setPlanSelectorTrigger(t => t + 1); setActiveTab('settings') }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(240,165,0,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    title={sidebarCollapsed ? 'More products' : undefined}
                    style={{
                      width: '100%', height: 40, display: 'flex', alignItems: 'center',
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                      gap: '0.65rem', padding: sidebarCollapsed ? 0 : '0 1.25rem',
                      border: 'none', borderLeft: '3px solid transparent',
                      background: 'transparent', cursor: 'pointer', transition: 'background 0.12s', boxSizing: 'border-box',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', color: 'rgba(240,165,0,0.7)', flexShrink: 0, lineHeight: 1 }}>✦</span>
                    {!sidebarCollapsed && (
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8125rem', fontWeight: 400, color: 'rgba(240,165,0,0.65)', whiteSpace: 'nowrap' }}>
                        More products
                      </span>
                    )}
                  </button>
                )
              }

              if (product.upsell) {
                if (sidebarCollapsed) return null
                const isAnswerUpsell = product.upsell === 'answer'
                return (
                  <div key={`_${product.upsell}_upsell`}>
                    <div style={{ height: 1, margin: '0.3rem 0.75rem 0', background: 'rgba(255,255,255,0.07)' }} />
                    <button
                      onClick={() => { setPlanSelectorTrigger(t => t + 1); setActiveTab('settings') }}
                      onMouseEnter={e => { e.currentTarget.querySelector('span').style.color = isAnswerUpsell ? 'rgba(240,165,0,0.75)' : 'rgba(255,255,255,0.5)' }}
                      onMouseLeave={e => { e.currentTarget.querySelector('span').style.color = isAnswerUpsell ? 'rgba(240,165,0,0.42)' : 'rgba(255,255,255,0.28)' }}
                      style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: isAnswerUpsell ? '0.55rem 1.25rem 0.7rem' : '0.45rem 1.25rem 0.35rem', textAlign: 'left' }}
                    >
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', fontWeight: isAnswerUpsell ? 500 : 400, color: isAnswerUpsell ? 'rgba(240,165,0,0.42)' : 'rgba(255,255,255,0.28)', transition: 'color 0.15s', letterSpacing: '0.01em' }}>
                        {isAnswerUpsell ? '✦ Add Answer — never miss a lead' : '＋ Add Listen'}
                      </span>
                    </button>
                  </div>
                )
              }

              return (
                <div key={product.id}>
                  {!sidebarCollapsed && product.label && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: pi === 0 ? '0.55rem 1.25rem 0.2rem' : '0.7rem 1.25rem 0.2rem' }}>
                      {product.dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: product.dot, flexShrink: 0 }} />}
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.11em', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                        {product.label}
                      </span>
                      {product.locked && (
                        <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.07)', borderRadius: 3, padding: '0.05rem 0.3rem', letterSpacing: '0.06em' }}>
                          + Add
                        </span>
                      )}
                    </div>
                  )}

                  {sidebarCollapsed && pi > 0 && (
                    <div style={{ height: 1, margin: '0.25rem 0.75rem', background: 'rgba(255,255,255,0.08)' }} />
                  )}

                  {product.tabs.map(tab => {
                    const isActive  = activeTab === tab.id
                    const isHovered = hoveredNav === tab.id
                    const isLocked  = !!tab.locked
                    return (
                      <button
                        key={tab.id}
                        onClick={() => isLocked ? (setPlanSelectorTrigger(t => t + 1), setActiveTab('settings')) : setActiveTab(tab.id)}
                        onMouseEnter={() => setHoveredNav(tab.id)}
                        onMouseLeave={() => setHoveredNav(null)}
                        title={sidebarCollapsed ? (isLocked ? `Add ${product.label}` : tab.label) : undefined}
                        style={{
                          width: '100%', height: 40, display: 'flex', alignItems: 'center',
                          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                          gap: '0.65rem', padding: sidebarCollapsed ? 0 : '0 1.25rem',
                          border: 'none', borderLeft: `3px solid ${isActive ? '#f0a500' : 'transparent'}`,
                          marginLeft: isActive ? -3 : 0,
                          background: isActive ? 'rgba(255,255,255,0.15)' : isHovered && !isLocked ? 'rgba(255,255,255,0.05)' : 'transparent',
                          color: isLocked ? 'rgba(255,255,255,0.22)' : isActive ? 'white' : 'rgba(255,255,255,0.62)',
                          cursor: isLocked ? 'default' : 'pointer',
                          transition: 'background 0.12s, color 0.12s', boxSizing: 'border-box',
                          fontFamily: "'DM Sans', sans-serif", fontSize: '0.8125rem', fontWeight: isActive ? 500 : 400,
                        }}
                      >
                        {tab.icon}
                        {!sidebarCollapsed && (
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>
                            {tab.label}
                          </span>
                        )}
                        {!sidebarCollapsed && tab.id === 'dashboard' && uncontactedCount > 0 && (
                          <span style={{ fontSize: '0.6rem', fontWeight: 700, background: '#f0a500', color: '#1a0533', borderRadius: 10, padding: '0.05rem 0.38rem', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
                            {uncontactedCount}
                          </span>
                        )}
                      </button>
                    )
                  })}

                  {!sidebarCollapsed && pi < PRODUCTS.length - 1 && !PRODUCTS[pi + 1]?.buildCard && !PRODUCTS[pi]?.buildCard && (
                    <div style={{ height: 1, margin: '0.3rem 0.75rem 0', background: 'rgba(255,255,255,0.07)' }} />
                  )}
                </div>
              )
            })}
          </nav>

          {/* Bottom controls */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
            {!sidebarCollapsed && (
              <div style={{ padding: '0.6rem 1.25rem 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>
                {displayName || user?.email}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', padding: '0.4rem 0', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '0.4rem' }}>
              {[
                { id: 'bell',    icon: <IcoBell />,    label: 'Notifications', action: () => setNotifPanelOpen(o => !o),                                   active: notifPanelOpen },
                { id: 'gear',    icon: <IcoGear />,    label: 'Settings',      action: () => setActiveTab('settings'),                                      active: activeTab === 'settings' },
                { id: 'vera',    icon: <IcoVera />,    label: 'Ask Q',         action: () => document.getElementById('vera-trigger-btn')?.click(),          active: false },
                { id: 'signout', icon: <IcoSignOut />, label: 'Sign out',      action: handleSignOut,                                                       active: false },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={item.action}
                  title={item.label}
                  onMouseEnter={() => setHoveredNav(item.id)}
                  onMouseLeave={() => setHoveredNav(null)}
                  style={{
                    flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none', borderTop: item.active ? '2px solid #f0a500' : '2px solid transparent',
                    background: item.active ? 'rgba(255,255,255,0.12)' : hoveredNav === item.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                    color: item.active ? '#f0a500' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer', transition: 'all 0.12s', padding: 0, boxSizing: 'border-box',
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
              position: 'fixed', left: sidebarW - 12, top: '50%', transform: 'translateY(-50%)',
              width: 24, height: 24, borderRadius: '50%',
              background: 'white', border: '1px solid rgba(94,59,135,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 30, boxShadow: '0 2px 8px rgba(94,59,135,0.15)',
              color: '#5e3b87', padding: 0, transition: 'left 0.22s ease',
            }}
          >
            {sidebarCollapsed ? <IcoChevronRight /> : <IcoChevronLeft />}
          </button>

          {/* Notification panel */}
          {notifPanelOpen && (
            <div
              ref={notifPanelRef}
              style={{
                position: 'fixed', left: sidebarW, bottom: 0, width: 280,
                background: 'white', borderRadius: '0 12px 0 0',
                boxShadow: '6px -4px 28px rgba(0,0,0,0.16)', padding: '1.25rem',
                zIndex: 200, borderTop: '3px solid #f0a500', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
                Notifications
              </div>
              {[
                { label: 'New lead captured',  desc: 'Immediate alert when your AI captures a lead.',        val: notifyNewLead,      field: 'notify_new_lead',      set: setNotifyNewLead },
                { label: 'Daily summary',      desc: 'End-of-day digest of calls, leads, referrals.',        val: notifyDailySummary, field: 'notify_daily_summary', set: setNotifyDailySummary },
                { label: 'Weekly report',      desc: 'Monday morning overview of the week.',                 val: notifyWeeklyReport, field: 'notify_weekly_report', set: setNotifyWeeklyReport },
              ].map((item, i, arr) => (
                <div key={item.field} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                  paddingBottom: i < arr.length - 1 ? '0.9rem' : 0,
                  marginBottom:  i < arr.length - 1 ? '0.9rem' : 0,
                  borderBottom:  i < arr.length - 1 ? '1px solid #f3f4f6' : 'none',
                }}>
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1a1a1a', marginBottom: '0.15rem' }}>{item.label}</div>
                    <div style={{ fontSize: '0.72rem', color: '#999', lineHeight: 1.4 }}>{item.desc}</div>
                  </div>
                  <Toggle checked={item.val} onChange={v => { item.set(v); saveNotification(item.field, v) }} />
                </div>
              ))}
            </div>
          )}

        </aside>
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', ...(activeTab === 'listen' && { height: '100vh', overflow: 'hidden' }) }}>

        {/* Owner preview banner */}
        {preview.isPreview && (
          <div style={{ background: preview.previewEditable ? '#3db87a' : '#f0a500', color: '#1a0533', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', boxSizing: 'border-box', fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif", flexShrink: 0, transition: 'background 0.2s' }}>
            <span style={{ fontWeight: 600 }}>
              <span style={{ opacity: 0.65, fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{preview.previewEditable ? 'Editing' : 'Owner preview'}</span>
              {'  ·  '}{preview.previewBusinessName}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button
                onClick={() => preview.setPreviewEditable(e => !e)}
                style={{ background: 'rgba(26,5,51,0.12)', border: '1px solid rgba(26,5,51,0.25)', borderRadius: '5px', color: '#1a0533', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '0.2rem 0.65rem', fontFamily: "'DM Sans', sans-serif" }}
              >
                {preview.previewEditable ? '🔒 Read-only' : '✏ Edit mode'}
              </button>
              <button
                onClick={() => { preview.exitPreview(); navigate('/owner/select') }}
                style={{ background: 'none', border: 'none', color: preview.previewEditable ? 'rgba(255,255,255,0.7)' : 'rgba(26,5,51,0.65)', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', padding: '0.2rem 0', fontFamily: "'DM Sans', sans-serif", textDecoration: 'underline' }}
              >
                ← Change business
              </button>
              <button
                onClick={() => { preview.exitPreview(); setActiveTab('dashboard') }}
                style={{ background: preview.previewEditable ? 'rgba(255,255,255,0.2)' : 'rgba(26,5,51,0.15)', border: `1px solid ${preview.previewEditable ? 'rgba(255,255,255,0.3)' : 'rgba(26,5,51,0.25)'}`, borderRadius: '5px', color: preview.previewEditable ? 'white' : '#1a0533', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', padding: '0.2rem 0.65rem', fontFamily: "'DM Sans', sans-serif" }}
              >
                Exit preview
              </button>
            </div>
          </div>
        )}

        {/* Settings / profile breadcrumb */}
        {activeTab === 'settings' && (
          <div style={{ background: 'white', borderBottom: '1px solid rgba(94,59,135,0.08)', padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
            <IcoGear />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#5e3b87', fontFamily: "'DM Sans', sans-serif" }}>Settings</span>
            <span style={{ fontSize: '0.8125rem', color: '#ccc' }}>·</span>
            <button
              onClick={() => setActiveTab('profile')}
              style={{ fontSize: '0.8125rem', color: '#888', fontWeight: 400, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'DM Sans', sans-serif" }}
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

        {/* Page content */}
        <div style={{
          flex: 1, minHeight: 0,
          overflowY: activeTab === 'listen' ? 'hidden' : 'visible',
          display: activeTab === 'listen' ? 'flex' : 'block',
          flexDirection: activeTab === 'listen' ? 'column' : undefined,
          padding: activeTab === 'listen' ? 0 : (isMobile ? '1rem 1rem 5rem' : '2rem'),
          background: (activeTab === 'settings' || activeTab === 'profile') ? '#faf9fc' : '#f7f6f9',
        }}>
          {activeTab !== 'calendar' && (
            <HelpMascot
              activeTab={activeTab}
              businessName={displayName}
              tenantId={activeTenantId}
              contextKey={TAB_CONTEXT[activeTab]}
              veraAlert={getVeraAlert(activeTab, holidayMode, uncontactedCount)}
              gaps={activeGaps}
              onNavigate={setActiveTab}
            />
          )}
          {renderTab()}
          {activeTab === 'calendar' && (
            <HelpMascot
              activeTab={activeTab}
              businessName={displayName}
              tenantId={activeTenantId}
              contextKey={TAB_CONTEXT[activeTab]}
              veraAlert={null}
              gaps={activeGaps}
              onNavigate={setActiveTab}
            />
          )}
        </div>

      </div>

      {/* Bottom nav (mobile only) */}
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

    {/* ── Sitemap overlay ────────────────────────────────────────────────────── */}
    {sitemapOpen && (
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(26,5,51,0.45)', zIndex: 500, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh' }}
        onClick={() => setSitemapOpen(false)}
      >
        <div
          style={{ width: '100%', maxWidth: 520, margin: '0 1rem', background: 'white', borderRadius: 14, boxShadow: '0 24px 64px rgba(94,59,135,0.3)', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" }}
          onClick={e => e.stopPropagation()}
        >
          {/* Search input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1.1rem', borderBottom: '1px solid rgba(94,59,135,0.1)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              ref={sitemapInputRef}
              value={sitemapQuery}
              onChange={e => { setSitemapQuery(e.target.value); setSitemapIdx(0) }}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setSitemapIdx(i => Math.min(i + 1, sitemapItems.length - 1)) }
                if (e.key === 'ArrowUp')   { e.preventDefault(); setSitemapIdx(i => Math.max(i - 1, 0)) }
                if (e.key === 'Enter' && sitemapItems[sitemapIdx]) {
                  const item = sitemapItems[sitemapIdx]
                  if (item.locked) { setPlanSelectorTrigger(t => t + 1); setActiveTab('settings') }
                  else setActiveTab(item.id)
                  setSitemapOpen(false)
                }
                if (e.key === 'Escape') setSitemapOpen(false)
              }}
              placeholder="Search pages…"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.9375rem', color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", background: 'transparent' }}
            />
            <kbd style={{ fontSize: '0.7rem', color: '#aaa', background: '#f3f4f6', borderRadius: 5, padding: '0.2rem 0.5rem', fontFamily: 'monospace', border: '1px solid #e5e7eb', flexShrink: 0 }}>Esc</kbd>
          </div>

          {/* Results */}
          <div style={{ maxHeight: '55vh', overflowY: 'auto', paddingBottom: '0.4rem' }}>
            {sitemapItems.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', fontSize: '0.875rem', color: '#aaa' }}>
                No pages match &ldquo;{sitemapQuery}&rdquo;
              </div>
            ) : (() => {
              const rows = []
              let lastGroup = null
              sitemapItems.forEach((item, idx) => {
                if (item.group !== lastGroup) {
                  rows.push(
                    <div key={`g-${item.group}`} style={{ padding: '0.65rem 1.1rem 0.2rem', fontSize: '0.6rem', fontWeight: 700, color: '#c0b8d0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {item.group}
                    </div>
                  )
                  lastGroup = item.group
                }
                const isHl = idx === sitemapIdx
                rows.push(
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.locked) { setPlanSelectorTrigger(t => t + 1); setActiveTab('settings') }
                      else setActiveTab(item.id)
                      setSitemapOpen(false)
                    }}
                    onMouseEnter={() => setSitemapIdx(idx)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.55rem 1.1rem', border: 'none', textAlign: 'left', cursor: 'pointer',
                      background: isHl ? '#f5f3ff' : 'transparent',
                      color: item.locked ? '#bbb' : '#1a1a1a',
                      fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem', fontWeight: isHl ? 500 : 400,
                      transition: 'background 0.08s',
                    }}
                  >
                    <span style={{ opacity: item.locked ? 0.35 : 0.65, flexShrink: 0, color: isHl ? '#5e3b87' : 'currentColor' }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.locked && (
                      <span style={{ fontSize: '0.65rem', color: '#c0b8d0', background: '#f3f4f6', borderRadius: 4, padding: '0.15rem 0.45rem', fontWeight: 600, flexShrink: 0 }}>Upgrade</span>
                    )}
                    {isHl && !item.locked && (
                      <kbd style={{ fontSize: '0.65rem', color: '#aaa', background: '#ede9f5', borderRadius: 4, padding: '0.15rem 0.45rem', fontFamily: 'monospace', flexShrink: 0 }}>↵</kbd>
                    )}
                  </button>
                )
              })
              return rows
            })()}
          </div>

          {/* Footer hint */}
          <div style={{ borderTop: '1px solid rgba(94,59,135,0.07)', padding: '0.5rem 1.1rem', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.7rem', color: '#c0b8d0' }}>
            <span><kbd style={{ fontFamily: 'monospace', marginRight: 3 }}>↑↓</kbd>navigate</span>
            <span><kbd style={{ fontFamily: 'monospace', marginRight: 3 }}>↵</kbd>open</span>
            <span><kbd style={{ fontFamily: 'monospace', marginRight: 3 }}>Esc</kbd>close</span>
            <span style={{ marginLeft: 'auto', opacity: 0.7 }}>⌘K anywhere</span>
          </div>
        </div>
      </div>
    )}

    </QScoreProvider>
  )
}

export default Portal
