import { useState, useEffect, useRef, useMemo, useCallback, Component } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePreview } from '../context/PreviewContext'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'
import BusinessProfile from './BusinessProfile'
import AIBehaviour from './AIBehaviour'
import ActivityDashboard from './ActivityDashboard'
import DataAnalytics from './DataAnalytics'
import ScheduleAnalytics from './ScheduleAnalytics'
import PartnersReferrals from './PartnersReferrals'
import AccountSettings from './AccountSettings'
import Integrations from './Integrations'
import CalendarTab from './Calendar'
import StaffDirectory from './StaffDirectory'
import BusinessTab from './BusinessTab'
import ListenTab from './ListenTab'
import PhoneLines from './PhoneLines'
import ClientDirectory from './ClientDirectory'
import ServiceCatalogue from './ServiceCatalogue'
import ProductCatalogue from './ProductCatalogue'
import SentryTab from './Sentry'
import SupportIntelligence from './SupportIntelligence'
import MasterControl from './MasterControl'
import HelpMascot from '../components/HelpMascot'
import { QScoreProvider } from '../context/QScoreContext'
import PortalSidebar from './PortalSidebar'
import {
  IcoDashboard, IcoAI, IcoAnalytics, IcoPartners, IcoCalendar,
  IcoIntegrations, IcoGear, IcoPeople, IcoBuilding, IcoClients, IcoServices,
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
  business:     'business.first_visit',
  command:      'command.first_visit',
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

// ─── CalendarErrorBoundary ────────────────────────────────────────────────────
class CalendarErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(err) { return { error: err } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center', gap: 12 }}>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.9375rem', color: '#1a1a1a' }}>Calendar failed to load</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8125rem', color: '#aaaaaa', maxWidth: 360 }}>{this.state.error?.message || 'Unknown error'}</div>
          <button onClick={() => this.setState({ error: null })} style={{ padding: '0.5rem 1.25rem', background: '#f0a500', color: '#1a0533', border: 'none', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Try again</button>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── SentryPinGate ────────────────────────────────────────────────────────────
// Only rendered when the client has chosen to add PIN protection.
// PIN is optional — configured in Account Settings. Owner preview always bypasses it.
// Reset path: verify account email + business name (both things Q knows about them).

function SentryPinGate({ pin, tenantId, userEmail, businessName, onUnlocked, onReset }) {
  const [mode, setMode]             = useState('entry')
  const [value, setValue]           = useState('')
  const [error, setError]           = useState(null)
  const [resetEmail, setResetEmail] = useState('')
  const [resetWord, setResetWord]   = useState('')
  const [resetError, setResetError] = useState(null)
  const [resetting, setResetting]   = useState(false)

  const attempt = (v) => {
    if (v === pin) onUnlocked()
    else { setError('Incorrect PIN'); setValue('') }
  }

  const handleReset = async () => {
    if (resetEmail.trim().toLowerCase() !== (userEmail || '').toLowerCase()) {
      setResetError('Email does not match your account'); return
    }
    if (resetWord.trim().toLowerCase() !== (businessName || '').toLowerCase()) {
      setResetError('Business name does not match'); return
    }
    setResetting(true)
    await supabase.from('tenants').update({ sentry_pin: null }).eq('id', tenantId)
    onReset()
    setResetting(false)
  }

  const pinInputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.75rem',
    textAlign: 'center', fontSize: '1.35rem', fontFamily: "'Syne', sans-serif", fontWeight: 700,
    letterSpacing: '0.45em', border: '2px solid rgba(94,59,135,0.15)', borderRadius: 10,
    outline: 'none', background: '#faf9fc',
  }

  const fieldStyle = {
    width: '100%', boxSizing: 'border-box', padding: '0.5rem 0.65rem',
    border: '1.5px solid rgba(94,59,135,0.15)', borderRadius: 8,
    fontSize: '0.85rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: '#faf9fc',
  }

  const labelStyle = {
    display: 'block', fontSize: '0.68rem', fontWeight: 600, color: '#aaa',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: '2.5rem 2rem', maxWidth: 320, width: '100%', textAlign: 'center', boxShadow: '0 8px 32px rgba(94,59,135,0.12)', border: '0.5px solid rgba(94,59,135,0.08)', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#1a1a1a', margin: '0 0 0.35rem' }}>Sentry</h2>

        {mode === 'entry' ? (
          <>
            <p style={{ fontSize: '0.8rem', color: '#888', margin: '0 0 1.5rem', lineHeight: 1.55 }}>This business has PIN-protected Sentry. Enter your 4-digit PIN to continue.</p>
            <input
              type="password" inputMode="numeric" maxLength={4} value={value} autoFocus
              placeholder="PIN" style={pinInputStyle}
              onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); setValue(v); setError(null); if (v.length === 4) attempt(v) }}
              onKeyDown={e => { if (e.key === 'Enter') attempt(value) }}
            />
            {error && <p style={{ color: '#ef4444', fontSize: '0.78rem', margin: '0.6rem 0 0', lineHeight: 1.4 }}>{error}</p>}
            <button onClick={() => attempt(value)} style={{ marginTop: '1.25rem', width: '100%', padding: '0.65rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: 10, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              Enter Sentry
            </button>
            <button onClick={() => setMode('reset')} style={{ marginTop: '0.75rem', background: 'none', border: 'none', fontSize: '0.78rem', color: '#bbb', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textDecoration: 'underline' }}>
              Forgot PIN?
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: '0.8rem', color: '#888', margin: '0 0 1.25rem', lineHeight: 1.55 }}>Verify your identity to reset the PIN. Use your account email and business name as Q knows it.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', textAlign: 'left' }}>
              <div>
                <label style={labelStyle}>Account email</label>
                <input type="email" value={resetEmail} autoFocus onChange={e => { setResetEmail(e.target.value); setResetError(null) }} placeholder="your@email.com" style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Business name</label>
                <input type="text" value={resetWord} onChange={e => { setResetWord(e.target.value); setResetError(null) }} onKeyDown={e => e.key === 'Enter' && handleReset()} placeholder="As Q knows it" style={fieldStyle} />
              </div>
            </div>
            {resetError && <p style={{ color: '#ef4444', fontSize: '0.78rem', margin: '0.65rem 0 0', lineHeight: 1.4 }}>{resetError}</p>}
            <button onClick={handleReset} disabled={resetting} style={{ marginTop: '1.25rem', width: '100%', padding: '0.65rem', background: '#5e3b87', color: 'white', border: 'none', borderRadius: 10, fontSize: '0.875rem', fontWeight: 600, cursor: resetting ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: resetting ? 0.7 : 1 }}>
              {resetting ? 'Resetting…' : 'Reset PIN'}
            </button>
            <button onClick={() => { setMode('entry'); setResetEmail(''); setResetWord(''); setResetError(null) }} style={{ marginTop: '0.75rem', background: 'none', border: 'none', fontSize: '0.78rem', color: '#bbb', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Portal ────────────────────────────────────────────────────────────────────

const Portal = () => {
  const {
    checking,
    businessName, tenantId,
    holidayMode,
    notifyNewLead,      setNotifyNewLead,
    notifyDailySummary, setNotifyDailySummary,
    notifyWeeklyReport, setNotifyWeeklyReport,
    baseTier, urgentOutcomes, uncontactedCount,
    listenTier,  setListenTier,
    calendarTier, setCalendarTier, hasAnswerProduct,
    sentryCameraLimit, setSentryCameraLimit,
    gapData, saveNotification,
    isDemoMode, demoSector,
  } = useTenantState()

  const preview = usePreview()
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('upgraded')) return 'settings'
    if (params.get('tab') === 'integrations') return 'integrations'
    if (params.get('ownerTab')) return params.get('ownerTab')
    try { return localStorage.getItem('qerxel_last_tab') || 'dashboard' } catch { return 'dashboard' }
  })
  const [upsellModal, setUpsellModal] = useState(null)
  const [calendarPrefill, setCalendarPrefill]     = useState(null)
  const [listenPrefill, setListenPrefill]         = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed]   = useState(false)
  const [notifPanelOpen, setNotifPanelOpen]       = useState(false)
  const [planSelectorTrigger, setPlanSelectorTrigger] = useState(0)
  const [teamOpenAdd, setTeamOpenAdd]             = useState(false)
  const [sitemapOpen, setSitemapOpen]             = useState(false)
  const [sitemapQuery, setSitemapQuery]           = useState('')
  const [sitemapIdx, setSitemapIdx]               = useState(0)
  const sitemapInputRef = useRef(null)
  const [sentryUnlocked, setSentryUnlocked] = useState(false)
  const [sentryPin, setSentryPin]           = useState(undefined)
  const [qSession, setQSession]             = useState({ active: false, highlight: [], draft: null })
  const [qDisplayOnScreen, setQDisplayOnScreen] = useState(true)
  const qDisplayRef = useRef(true)
  const [showDemoEndModal, setShowDemoEndModal] = useState(false)

  useEffect(() => {
    try { localStorage.setItem('qerxel_last_tab', activeTab) } catch {}
  }, [activeTab])

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
  const hasScheduleMulti = ['multi', 'small_team', 'growth', 'large_team'].includes(calendarTier)
  const scheduleOnly    = hasSchedule && !hasAnswerProduct
  const lockedProduct   = !hasListen && activeTab === 'listen' ? 'Listen'
    : !hasSchedule && ['calendar', 'team'].includes(activeTab) ? 'Schedule'
    : !sentryCameraLimit && activeTab === 'sentry' ? 'Sentry'
    : null

  // Must stay before conditional return — hooks cannot follow a return statement
  useEffect(() => {
    if (scheduleOnly && activeTab === 'dashboard') setActiveTab('calendar')
  }, [scheduleOnly])

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

  // Reset PIN session when the active tenant changes (preview switches business)
  useEffect(() => { setSentryPin(undefined); setSentryUnlocked(false) }, [tenantId, preview.previewTenantId])

  // Lazy-fetch sentry_pin from DB when user first navigates to Sentry tab
  useEffect(() => {
    if (activeTab !== 'sentry' || !sentryCameraLimit || sentryPin !== undefined) return
    const tid = preview.isPreview ? preview.previewTenantId : tenantId
    if (!tid) return
    supabase.from('tenants').select('sentry_pin').eq('id', tid).maybeSingle()
      .then(({ data }) => setSentryPin(data?.sentry_pin ?? null))
  }, [activeTab, sentryCameraLimit, sentryPin, tenantId, preview.isPreview, preview.previewTenantId])

  // Q Live Session — Realtime subscription: Q navigates portal and changes settings during support calls
  useEffect(() => {
    const tid = preview.isPreview ? preview.previewTenantId : tenantId
    if (!tid) return

    // Load initial on-screen display preference
    supabase.from('tenants').select('q_display_on_screen').eq('id', tid).maybeSingle()
      .then(({ data }) => {
        const val = data?.q_display_on_screen !== false
        setQDisplayOnScreen(val)
        qDisplayRef.current = val
      })

    const sub = supabase
      .channel(`q-session-${tid}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tenants', filter: `id=eq.${tid}` }, (payload) => {
        const n = payload.new
        if (n.q_display_on_screen !== undefined) {
          setQDisplayOnScreen(n.q_display_on_screen)
          qDisplayRef.current = n.q_display_on_screen
        }
        setQSession(prev => ({
          active:    n.q_session_active    !== undefined ? n.q_session_active    : prev.active,
          highlight: qDisplayRef.current && n.q_session_highlight !== undefined ? (n.q_session_highlight || []) : prev.highlight,
          draft:     qDisplayRef.current && n.q_draft_instructions !== undefined ? n.q_draft_instructions : prev.draft,
        }))
        if (n.q_session_tab && qDisplayRef.current) setActiveTab(n.q_session_tab)
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [tenantId, preview.isPreview, preview.previewTenantId])

  const toggleQDisplay = useCallback(async () => {
    if (preview.isPreview) return
    const tid = tenantId
    if (!tid) return
    const next = !qDisplayRef.current
    setQDisplayOnScreen(next)
    qDisplayRef.current = next
    await supabase.from('tenants').update({ q_display_on_screen: next }).eq('id', tid)
  }, [tenantId, preview.isPreview])

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

  const hasSentry = sentryCameraLimit > 0

  const handleNotifChange = useCallback((field, v) => {
    if (field === 'notify_new_lead') setNotifyNewLead(v)
    else if (field === 'notify_daily_summary') setNotifyDailySummary(v)
    else if (field === 'notify_weekly_report') setNotifyWeeklyReport(v)
    saveNotification(field, v)
  }, [setNotifyNewLead, setNotifyDailySummary, setNotifyWeeklyReport, saveNotification])

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
      case 'ai':           return <AIBehaviour onNavigate={setActiveTab} qSessionHighlight={qSession.highlight} qDraft={qSession.draft} />
      case 'dashboard':    return <ActivityDashboard onNavigate={handleNavigate} />
      case 'analytics':    return scheduleOnly ? <ScheduleAnalytics /> : <DataAnalytics onNavigate={handleNavigate} />
      case 'referrals':    return <PartnersReferrals onNavigate={handleNavigate} />
      case 'team':         return <StaffDirectory onNavigate={handleNavigate} openAdd={teamOpenAdd} onOpenAddConsumed={() => setTeamOpenAdd(false)} tier={baseTier} />
      case 'calendar':     return <CalendarErrorBoundary><CalendarTab onNavigate={handleNavigate} prefill={calendarPrefill} onPrefillConsumed={() => setCalendarPrefill(null)} calendarTier={calendarTier} /></CalendarErrorBoundary>
      case 'integrations': return <Integrations onNavigate={setActiveTab} />
      case 'settings':     return <AccountSettings onNavigate={setActiveTab} onListenTierChange={setListenTier} onCalendarTierChange={setCalendarTier} onSentryChange={setSentryCameraLimit} triggerPlanSelector={planSelectorTrigger} />
      case 'sentry':
        // PIN gate: only when a PIN is set, and never in owner preview (owner can always investigate)
        if (sentryCameraLimit > 0 && !preview.isPreview && !sentryUnlocked) {
          if (sentryPin === undefined) return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
              <span style={{ color: '#aaa', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif" }}>Loading…</span>
            </div>
          )
          if (sentryPin) return (
            <SentryPinGate
              pin={sentryPin}
              tenantId={tenantId}
              userEmail={user?.email}
              businessName={businessName}
              onUnlocked={() => setSentryUnlocked(true)}
              onReset={() => { setSentryPin(null); setSentryUnlocked(true) }}
            />
          )
        }
        return <SentryTab cameraLimit={sentryCameraLimit} />
      case 'listen':       return <ListenTab prefill={listenPrefill} onPrefillConsumed={() => setListenPrefill(null)} urgentOutcomes={urgentOutcomes} onNavigate={setActiveTab} />
      case 'business':     return <BusinessTab onNavigate={setActiveTab} />
      case 'support':      return <SupportIntelligence />
      case 'command':      return <MasterControl />
      default: return (
        <div style={{ background: 'white', borderRadius: '10px', padding: '2rem', border: '0.5px solid rgba(94,59,135,0.1)' }}>
          <p style={{ color: '#aaa', fontSize: '0.875rem' }}>Coming soon.</p>
        </div>
      )
    }
  }

  const displayName    = preview.isPreview ? preview.previewBusinessName : businessName
  const activeTenantId = preview.isPreview ? preview.previewTenantId    : tenantId

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <QScoreProvider>
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", background: '#e9e4f3' }}>
      <style>{`
        @keyframes urgentPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.5)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-28px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Sidebar (desktop only) */}
      {!isMobile && (
        <PortalSidebar
          displayName={displayName}
          user={user}
          tenantId={tenantId}
          activeTab={activeTab}
          onTabSelect={setActiveTab}
          hasSchedule={hasSchedule}
          hasScheduleMulti={hasScheduleMulti}
          hasListen={hasListen}
          hasSentry={hasSentry}
          uncontactedCount={uncontactedCount}
          sidebarCollapsed={sidebarCollapsed}
          onCollapseToggle={() => setSidebarCollapsed(c => !c)}
          scheduleOnly={scheduleOnly}
          isPreview={preview.isPreview}
          notifPanelOpen={notifPanelOpen}
          onNotifToggle={() => setNotifPanelOpen(o => !o)}
          notifyNewLead={notifyNewLead}
          notifyDailySummary={notifyDailySummary}
          notifyWeeklyReport={notifyWeeklyReport}
          onNotifChange={handleNotifChange}
          onPlanSelectorOpen={() => { setPlanSelectorTrigger(t => t + 1); setActiveTab('settings') }}
          onCmdOpen={() => setSitemapOpen(o => !o)}
          onSignOut={handleSignOut}
          isDemoMode={isDemoMode}
          onDemoEnd={() => setShowDemoEndModal(true)}
          baseTier={baseTier}
        />
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

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

        {/* Demo mode banner */}
        {isDemoMode && !isMobile && (
          <div style={{ background: 'linear-gradient(90deg, #0f766e, #0d9488)', height: 38, display: 'flex', alignItems: 'center', padding: '0 1.5rem', gap: 10, flexShrink: 0, fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#5eead4', flexShrink: 0 }} />
            <span style={{ color: '#ccfbf1', fontWeight: 700 }}>Demo mode</span>
            <span style={{ color: 'rgba(204,251,241,0.65)' }}>
              {demoSector ? `— your personalised ${demoSector} workspace, everything works` : '— everything works, just like the real thing'}
            </span>
            <button
              onClick={() => setShowDemoEndModal(true)}
              style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 5, color: '#ccfbf1', fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', cursor: 'pointer', flexShrink: 0 }}
            >
              End demo
            </button>
          </div>
        )}

        {/* Q Live Session banner — visible when Q is navigating/editing during a support call */}
        {qSession.active && !isMobile && (
          <div style={{ background: '#1a0533', borderLeft: '4px solid #f0a500', height: 38, display: 'flex', alignItems: 'center', padding: '0 1.5rem', gap: 10, flexShrink: 0, fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f0a500', animation: 'urgentPulse 2s infinite', flexShrink: 0 }} />
            <span style={{ color: '#f0a500', fontWeight: 700 }}>Q is in session</span>
            <span style={{ color: '#6b7280' }}>
              {qDisplayOnScreen ? '— watch your screen while we sort this together' : '— working in the background'}
            </span>
            <button
              onClick={toggleQDisplay}
              style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid rgba(240,165,0,0.3)', borderRadius: 5, color: '#f0a500', fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', cursor: 'pointer', flexShrink: 0 }}
            >
              {qDisplayOnScreen ? 'Move to background' : 'Show on screen'}
            </button>
          </div>
        )}

        {/* Sticky page title bar — all tabs except listen */}
        {activeTab !== 'listen' && !isMobile && (() => {
          const PAGE_TITLES = {
            dashboard:    'Dashboard',
            ai:           'AI Behaviour',
            analytics:    'Data Analysis',
            referrals:    'Partners & Referrals',
            team:         'Team',
            calendar:     'Calendar',
            clients:      'Clients',
            services:     'Services',
            products:     'Products',
            profile:      'Business Profile',
            lines:        'Lines',
            settings:     'Account & Billing',
            integrations: 'Integrations',
            sentry:       'Sentry',
            business:     'Business Desk',
            support:      'Support Intelligence',
            command:      'Master Control',
          }
          const title = PAGE_TITLES[activeTab]
          if (!title) return null
          return (
            <div style={{ height: 56, background: 'linear-gradient(90deg, rgba(20,12,42,0.035) 0%, #ffffff 28%)', borderBottom: '2px solid rgba(240,165,0,0.55)', display: 'flex', alignItems: 'center', padding: '0 2rem', flexShrink: 0, boxSizing: 'border-box' }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.125rem', color: '#1a1a1a', letterSpacing: '-0.015em' }}>{title}</span>
            </div>
          )
        })()}

        {/* Page content */}
        <div style={{
          flex: 1, minHeight: 0,
          overflowY: 'auto',
          padding: activeTab === 'listen' ? 0 : (isMobile ? '1rem 1rem 5rem' : '2rem'),
          background: (activeTab === 'settings' || activeTab === 'profile') ? '#f0ebff' : 'radial-gradient(ellipse at 65% 0%, #c8bee8 0%, #e9e4f3 55%)',
        }}>
          {lockedProduct && !preview.isPreview && (() => {
            const INFO = {
              Listen:   { price: 'from £10/mo', tagline: 'Live AI copilot — context on screen as you take every call.', accent: '#3b82f6' },
              Schedule: { price: 'from £19/mo', tagline: 'Full booking portal and calendar — free to explore, pay to unlock.', accent: '#3db87a' },
              Sentry:   { price: 'camera-based', tagline: 'AI zone monitoring — your eyes on-site, 24 hours a day.', accent: '#ef4444' },
            }
            const info = INFO[lockedProduct] || { price: '', tagline: '', accent: '#5e3b87' }
            return (
              <div style={{ position: 'relative', animation: 'slideDown 0.35s cubic-bezier(0.34,1.56,0.64,1)', flexShrink: 0 }}>
                {/* frosted backdrop behind the locked page content */}
                <div style={{ position: 'absolute', inset: 0, top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none' }} />
                <div style={{
                  margin: '1.5rem 2rem 0',
                  padding: '1.75rem 2rem',
                  borderRadius: 16,
                  background: 'white',
                  boxShadow: '0 8px 40px rgba(94,59,135,0.18), 0 2px 8px rgba(94,59,135,0.08)',
                  border: `1.5px solid ${info.accent}33`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '2rem',
                  fontFamily: "'DM Sans', sans-serif",
                  position: 'relative',
                  zIndex: 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', minWidth: 0 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: `${info.accent}14`, border: `1.5px solid ${info.accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={info.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.05rem', color: '#1a0533' }}>{lockedProduct}</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: info.accent, background: `${info.accent}14`, border: `1px solid ${info.accent}33`, borderRadius: 20, padding: '0.15rem 0.55rem', whiteSpace: 'nowrap' }}>{info.price}</span>
                      </div>
                      <p style={{ fontSize: '0.875rem', color: '#555', margin: 0, lineHeight: 1.45 }}>{info.tagline}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0, alignItems: 'flex-end' }}>
                    <button
                      onClick={() => { setPlanSelectorTrigger(t => t + 1); setActiveTab('settings') }}
                      style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1a0533', background: '#f0a500', border: 'none', borderRadius: 10, padding: '0.65rem 1.5rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', boxShadow: '0 2px 12px rgba(240,165,0,0.3)' }}
                    >
                      Add to my plan →
                    </button>
                    <button
                      onClick={() => {}}
                      style={{ fontSize: '0.75rem', color: '#999', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Explore first
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}
          {activeTab !== 'calendar' && activeTab !== 'listen' && (
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
          {/* Q mascot — header on Listen */}
          {activeTab === 'listen' && !isMobile && (
            <div style={{ padding: '0.75rem 2rem 0' }}>
              <HelpMascot
                activeTab={activeTab}
                businessName={displayName}
                tenantId={activeTenantId}
                contextKey={TAB_CONTEXT[activeTab]}
                veraAlert={null}
                gaps={activeGaps}
                onNavigate={setActiveTab}
              />
            </div>
          )}
          <div
            onClickCapture={lockedProduct ? (e) => {
              const tag = e.target.tagName.toLowerCase()
              const isInteractive = ['input', 'button', 'select', 'textarea'].includes(tag) || e.target.getAttribute('role') === 'button'
              if (isInteractive) { e.preventDefault(); e.stopPropagation(); setUpsellModal(lockedProduct) }
            } : undefined}
          >
            {renderTab()}
          </div>
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

    {/* ── Upsell modal ───────────────────────────────────────────────────────── */}
    {upsellModal && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,5,51,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setUpsellModal(null)}>
        <div style={{ background: 'white', borderRadius: 14, padding: '2rem', maxWidth: 360, width: '90%', textAlign: 'center', boxShadow: '0 24px 64px rgba(94,59,135,0.25)', fontFamily: "'DM Sans', sans-serif" }} onClick={e => e.stopPropagation()}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(94,59,135,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5e3b87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', margin: '0 0 0.5rem' }}>{upsellModal} isn't on your plan yet</h3>
          <p style={{ fontSize: '0.8125rem', color: '#666', lineHeight: 1.55, margin: '0.5rem 0 1.5rem' }}>
            Think about adding <strong>{upsellModal}</strong> to your product range — it's how solo traders stay ahead.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button onClick={() => setUpsellModal(null)} style={{ fontSize: '0.8rem', color: '#888', background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Not now</button>
            <button onClick={() => { setActiveTab('settings'); setUpsellModal(null) }} style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1a0533', background: '#f0a500', border: 'none', borderRadius: 8, padding: '0.5rem 1.25rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Add to my plan →</button>
          </div>
        </div>
      </div>
    )}

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
            <button onClick={() => setSitemapOpen(false)} style={{ fontSize: '0.7rem', color: '#888', background: '#f3f4f6', borderRadius: 5, padding: '0.2rem 0.5rem', fontFamily: 'monospace', border: '1px solid #e5e7eb', flexShrink: 0, cursor: 'pointer' }}>Esc ×</button>
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
            <button onClick={() => setSitemapOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', fontSize: 'inherit', fontFamily: 'inherit' }}><kbd style={{ fontFamily: 'monospace', marginRight: 3 }}>Esc</kbd>close</button>
            <span style={{ marginLeft: 'auto', opacity: 0.7 }}>⌘K anywhere</span>
          </div>
        </div>
      </div>
    )}

    {/* ── Demo end modal ─────────────────────────────────────────────────────── */}
    {showDemoEndModal && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,118,110,0.25)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowDemoEndModal(false)}>
        <div style={{ background: 'white', borderRadius: 18, padding: '2.25rem 2rem', maxWidth: 380, width: '90%', textAlign: 'center', boxShadow: '0 24px 64px rgba(15,118,110,0.18)', fontFamily: "'DM Sans', sans-serif" }} onClick={e => e.stopPropagation()}>
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(15,118,110,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
            </svg>
          </div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#1a1a1a', margin: '0 0 0.5rem' }}>
            Ready to move on?
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#666', lineHeight: 1.6, margin: '0 0 1.75rem' }}>
            You can keep this demo open and come back to it, or start building your real business right now — I'll carry your sector through to setup.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={() => setShowDemoEndModal(false)}
              style={{ width: '100%', padding: '0.75rem 1.25rem', background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 10, fontSize: '0.875rem', fontWeight: 600, color: '#0c4a6e', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >
              Keep exploring the demo
            </button>
            <button
              onClick={async () => {
                const sector = demoSector || ''
                await supabase.auth.signOut()
                navigate(`/signup${sector ? `?sector=${encodeURIComponent(sector)}` : ''}`)
              }}
              style={{ width: '100%', padding: '0.75rem 1.25rem', background: 'linear-gradient(135deg, #0f766e, #0d9488)', border: 'none', borderRadius: 10, fontSize: '0.875rem', fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >
              Build my real business →
            </button>
          </div>
          <p style={{ fontSize: '0.72rem', color: '#aaa', margin: '1rem 0 0', lineHeight: 1.5 }}>
            Your demo stays live for 48 hours if you want to come back.
          </p>
        </div>
      </div>
    )}

    </QScoreProvider>
  )
}

export default Portal
