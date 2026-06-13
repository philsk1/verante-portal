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
import StaffDirectory from './StaffDirectory'
import ListenTab from './ListenTab'
import PhoneLines from './PhoneLines'
import HelpMascot from '../components/HelpMascot'
import PortalSidebar, { IcoDashboard, IcoCalendar, IcoAI, IcoAnalytics, IcoGear } from './PortalSidebar'

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
    if (params.get('upgraded')) return 'settings'
    if (params.get('tab')) return params.get('tab')
    return 'dashboard'
  })
  const [checking, setChecking] = useState(true)
  const [businessName, setBusinessName] = useState('')
  const [tenantId, setTenantId] = useState(null)
  const [calendarPrefill, setCalendarPrefill] = useState(null)
  const [listenPrefill, setListenPrefill]     = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Live operational state — passed as props to PortalSidebar
  const [holidayMode, setHolidayMode] = useState(false)
  const [holidayReturnDate, setHolidayReturnDate] = useState('')
  const [notifyNewLead, setNotifyNewLead] = useState(true)
  const [notifyDailySummary, setNotifyDailySummary] = useState(false)
  const [notifyWeeklyReport, setNotifyWeeklyReport] = useState(true)
  const [notifPanelOpen, setNotifPanelOpen] = useState(false)
  const [baseTier, setBaseTier] = useState('light')
  const [urgentOutcomes, setUrgentOutcomes] = useState(['escalated'])
  const [uncontactedCount, setUncontactedCount] = useState(0)
  const [listenTier, setListenTier] = useState('none')
  const [hasSentry, setHasSentry] = useState(false)
  const [calendarTier, setCalendarTier] = useState('entry')
  const [planSelectorTrigger, setPlanSelectorTrigger] = useState(0)
  const [teamOpenAdd, setTeamOpenAdd] = useState(false)

  const navigate = useNavigate()

  const handleNavigate = (tabId, prefillData) => {
    setActiveTab(tabId)
    if (tabId === 'calendar' && prefillData) setCalendarPrefill(prefillData)
    else setCalendarPrefill(null)
    if (tabId === 'listen' && prefillData?.callId) setListenPrefill(prefillData)
    else if (tabId !== 'listen') setListenPrefill(null)
    if (tabId === 'team' && prefillData?.openAdd) setTeamOpenAdd(true)
    else if (tabId === 'team') setTeamOpenAdd(false)
  }

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

  useEffect(() => {
    if (!user) return
    const init = async () => {
      const { data: membership } = await supabase
        .from('tenant_memberships').select('tenant_id').eq('user_id', user.id).maybeSingle()
      if (!membership) { navigate('/onboarding', { replace: true }); return }
      setTenantId(membership.tenant_id)

      const { data: tenant } = await supabase
        .from('tenants')
        .select('business_name, holiday_mode, holiday_return_date, notify_new_lead, notify_daily_summary, notify_weekly_report, subscription_tier, urgent_outcomes, listen_tier, sentry_tier, calendar_tier')
        .eq('id', membership.tenant_id)
        .maybeSingle()

      if (tenant) {
        setBusinessName(tenant.business_name || '')
        setHolidayMode(tenant.holiday_mode || false)
        setHolidayReturnDate(tenant.holiday_return_date || '')
        setNotifyNewLead(tenant.notify_new_lead !== false)
        setNotifyDailySummary(tenant.notify_daily_summary !== false)
        setNotifyWeeklyReport(tenant.notify_weekly_report !== false)
        setBaseTier(tenant.subscription_tier || 'light')
        setUrgentOutcomes(Array.isArray(tenant.urgent_outcomes) && tenant.urgent_outcomes.length > 0 ? tenant.urgent_outcomes : ['escalated'])
        setListenTier(tenant.listen_tier || 'none')
        setHasSentry(tenant.sentry_tier != null && tenant.sentry_tier !== 'none')
        setCalendarTier(tenant.calendar_tier || 'entry')
      }

      const { count: leadCount } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', membership.tenant_id)
        .or('status.is.null,status.eq.new')
      setUncontactedCount(leadCount || 0)

      const isOwnerEmail = user.email === 'finsolsoffice@gmail.com'
      if (isOwnerEmail) {
        const params = new URLSearchParams(window.location.search)
        const previewId   = params.get('ownerPreview')
        const previewName = params.get('ownerName') || ''
        if (previewId) {
          preview.enterPreview(previewId, decodeURIComponent(previewName))
          navigate('/portal', { replace: true })
        } else if (!preview.isPreview) {
          navigate('/owner/select', { replace: true })
          return
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

  const saveHolidayToggle = async (val) => {
    setHolidayMode(val)
    if (!tenantId || preview.isPreview) return
    const { error } = await supabase.from('tenants').update({ holiday_mode: val }).eq('id', tenantId)
    if (error) { console.error('Holiday mode save failed:', error); setHolidayMode(!val) }
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

  const handleNotifChange = (field, val) => {
    if (field === 'notify_new_lead') setNotifyNewLead(val)
    else if (field === 'notify_daily_summary') setNotifyDailySummary(val)
    else if (field === 'notify_weekly_report') setNotifyWeeklyReport(val)
    saveNotification(field, val)
  }

  const hasListen = listenTier !== 'none' || ['enterprise', 'bespoke'].includes(baseTier)

  const displayName    = preview.isPreview ? preview.previewBusinessName : businessName
  const activeTenantId = preview.isPreview ? preview.previewTenantId : tenantId

  const renderTab = () => {
    switch (activeTab) {
      case 'lines':        return <PhoneLines />
      case 'profile':      return <BusinessProfile />
      case 'ai':           return <AIBehaviour onNavigate={setActiveTab} />
      case 'dashboard':    return <ActivityDashboard onNavigate={handleNavigate} />
      case 'analytics':    return <DataAnalytics onNavigate={handleNavigate} />
      case 'referrals':    return <PartnersReferrals onNavigate={handleNavigate} />
      case 'team':         return <StaffDirectory calendarTier={calendarTier} onNavigate={handleNavigate} openAdd={teamOpenAdd} onOpenAddConsumed={() => setTeamOpenAdd(false)} />
      case 'calendar':     return <CalendarTab calendarTier={calendarTier} onNavigate={handleNavigate} prefill={calendarPrefill} onPrefillConsumed={() => setCalendarPrefill(null)} />
      case 'integrations': return <Integrations onNavigate={setActiveTab} />
      case 'settings':     return <AccountSettings onNavigate={setActiveTab} onListenTierChange={setListenTier} triggerPlanSelector={planSelectorTrigger} />
      case 'listen':       return <ListenTab prefill={listenPrefill} onPrefillConsumed={() => setListenPrefill(null)} urgentOutcomes={urgentOutcomes} />
      default: return (
        <div style={{ background: 'white', borderRadius: '10px', padding: '2rem', border: '0.5px solid rgba(94,59,135,0.1)' }}>
          <p style={{ color: '#aaa', fontSize: '0.875rem' }}>Coming soon.</p>
        </div>
      )
    }
  }

  const mobileNavTabs = [
    { id: 'dashboard',  label: 'Home',     icon: <IcoDashboard /> },
    { id: 'calendar',   label: 'Calendar', icon: <IcoCalendar /> },
    { id: 'ai',         label: 'AI',       icon: <IcoAI /> },
    { id: 'analytics',  label: 'Stats',    icon: <IcoAnalytics /> },
    { id: 'settings',   label: 'Settings', icon: <IcoGear /> },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", background: '#f7f6f9' }}>
      <style>{`@keyframes urgentPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.5)} }`}</style>

      {/* Sidebar (desktop only) */}
      {!isMobile && (
        <PortalSidebar
          displayName={displayName}
          user={user}
          activeTab={activeTab}
          onTabSelect={setActiveTab}
          hasListen={hasListen}
          hasSentry={hasSentry}
          uncontactedCount={uncontactedCount}
          sidebarCollapsed={sidebarCollapsed}
          onCollapseToggle={() => setSidebarCollapsed(c => !c)}
          holidayMode={holidayMode}
          onHolidayToggle={saveHolidayToggle}
          holidayReturnDate={holidayReturnDate}
          onReturnDateChange={saveReturnDate}
          isPreview={preview.isPreview}
          notifPanelOpen={notifPanelOpen}
          onNotifToggle={() => setNotifPanelOpen(o => !o)}
          notifyNewLead={notifyNewLead}
          notifyDailySummary={notifyDailySummary}
          notifyWeeklyReport={notifyWeeklyReport}
          onNotifChange={handleNotifChange}
          onPlanSelectorOpen={() => { setPlanSelectorTrigger(t => t + 1); setActiveTab('settings') }}
          onSignOut={handleSignOut}
        />
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', ...(activeTab === 'listen' && { height: '100vh', overflow: 'hidden' }) }}>

        {/* Owner preview banner */}
        {preview.isPreview && (
          <div style={{ background: '#f0a500', color: '#1a0533', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', boxSizing: 'border-box', fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
            <span style={{ fontWeight: 600 }}>
              <span style={{ opacity: 0.65, fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Owner preview</span>
              {'  ·  '}{preview.previewBusinessName}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button
                onClick={() => { preview.exitPreview(); navigate('/owner/select') }}
                style={{ background: 'none', border: 'none', color: 'rgba(26,5,51,0.65)', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', padding: '0.2rem 0', fontFamily: "'DM Sans', sans-serif", textDecoration: 'underline' }}
              >
                ← Change business
              </button>
              <button
                onClick={() => { preview.exitPreview(); setActiveTab('dashboard') }}
                style={{ background: 'rgba(26,5,51,0.15)', border: '1px solid rgba(26,5,51,0.25)', borderRadius: '5px', color: '#1a0533', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', padding: '0.2rem 0.65rem', fontFamily: "'DM Sans', sans-serif" }}
              >
                Exit preview
              </button>
            </div>
          </div>
        )}

        {/* Settings / Profile breadcrumb */}
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
          flex: 1,
          minHeight: 0,
          overflowY: activeTab === 'listen' ? 'hidden' : 'visible',
          display: activeTab === 'listen' ? 'flex' : 'block',
          flexDirection: activeTab === 'listen' ? 'column' : undefined,
          padding: activeTab === 'listen' ? 0 : (isMobile ? '1rem 1rem 5rem' : '2rem'),
          background: (activeTab === 'settings' || activeTab === 'profile') ? '#faf9fc' : '#f7f6f9',
        }}>
          {(() => {
            const veraAlert = (() => {
              if (activeTab === 'dashboard' || activeTab === 'analytics') {
                if (holidayMode) return '🌙 Q: Holiday mode is on — your AI is paused. Disable it in Settings when you\'re back.'
                if (uncontactedCount >= 5) return `⚡ Q: ${uncontactedCount} leads are waiting. The first hour matters most — callers who aren't called back often move on.`
                if (uncontactedCount >= 2) return `💡 Q: ${uncontactedCount} leads need a follow-up. A quick call now could convert them.`
              }
              if (activeTab === 'referrals' && uncontactedCount >= 3) return `💡 Q: You have ${uncontactedCount} uncalled leads on your dashboard. Partners bring more value when you close the ones you have.`
              if (activeTab === 'team' && uncontactedCount > 0) return `💡 Q: ${uncontactedCount} lead${uncontactedCount !== 1 ? 's' : ''} waiting on the dashboard. Your team might be able to help with follow-up calls.`
              return null
            })()
            const mascot = <HelpMascot activeTab={activeTab} businessName={displayName} tenantId={activeTenantId} contextKey={TAB_CONTEXT[activeTab]} veraAlert={veraAlert} />
            return activeTab !== 'calendar' ? mascot : null
          })()}
          {renderTab()}
          {activeTab === 'calendar' && (
            <HelpMascot
              activeTab={activeTab}
              businessName={displayName}
              tenantId={activeTenantId}
              contextKey={TAB_CONTEXT[activeTab]}
              veraAlert={null}
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
  )
}

export default Portal
