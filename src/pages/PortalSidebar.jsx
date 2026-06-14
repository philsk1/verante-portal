import { useState, useEffect, useRef } from 'react'
import { useQScore } from '../context/QScoreContext'

// ─── Icons ────────────────────────────────────────────────────────────────────

export const IcoDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
  </svg>
)

export const IcoAI = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="9" y="2" width="6" height="11" rx="3"/>
    <path d="M5 10a7 7 0 0 0 14 0"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="9" y1="22" x2="15" y2="22"/>
  </svg>
)

export const IcoAnalytics = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
    <line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
)

export const IcoPartners = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

export const IcoCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

export const IcoIntegrations = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
)

export const IcoVera = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <ellipse cx="12" cy="14" rx="7" ry="8"/>
    <circle cx="9" cy="12" r="1.5"/>
    <circle cx="15" cy="12" r="1.5"/>
    <path d="M10 16.5c.5.8 3.5.8 4 0"/>
    <path d="M8 7l4 3 4-3"/>
    <path d="M6 9c-1.5-1.5-2-4-1.5-5.5"/>
    <path d="M18 9c1.5-1.5 2-4 1.5-5.5"/>
  </svg>
)

export const IcoSignOut = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

export const IcoChevronLeft = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

export const IcoChevronRight = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

export const IcoBell = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)

export const IcoGear = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
)

export const IcoMoon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)

export const IcoPeople = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <line x1="23" y1="21" x2="23" y2="19"/>
    <line x1="19" y1="21" x2="19" y2="19"/>
    <path d="M23 13a4 4 0 0 0-4-4"/>
  </svg>
)

export const IcoBuilding = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M3 21h18"/>
    <path d="M5 21V7l7-4 7 4v14"/>
    <path d="M9 21v-6h6v6"/>
  </svg>
)

export const IcoListen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>
    <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
  </svg>
)

export const IcoPhone = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
)

export const IcoSentry = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

// ─── Toggle ───────────────────────────────────────────────────────────────────

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

// ─── Storage keys ─────────────────────────────────────────────────────────────

const SECTIONS_KEY = 'qerxel_sb_sections'
const PINS_KEY     = 'qerxel_sb_pins'

// ─── PortalSidebar ────────────────────────────────────────────────────────────

export default function PortalSidebar({
  displayName,
  user,
  activeTab,
  onTabSelect,
  hasListen,
  hasSentry,
  uncontactedCount,
  sidebarCollapsed,
  onCollapseToggle,
  isPreview,
  notifPanelOpen,
  onNotifToggle,
  notifyNewLead,
  notifyDailySummary,
  notifyWeeklyReport,
  onNotifChange,
  onPlanSelectorOpen,
  onCmdOpen,
  onSignOut,
}) {
  const { globalScore: qScore, globalMood: qMood, configPillar, toolPillar, perfPillar } = useQScore()
  const qPillars = (configPillar != null || toolPillar != null) ? {
    setup:    { label: 'Config',      score: configPillar ?? 0, max: 100 },
    tools:    { label: 'Tools',       score: toolPillar   ?? 0, max: 100 },
    activity: { label: 'Performance', score: perfPillar   ?? 0, max: 100 },
  } : null

  const [sections, setSections] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SECTIONS_KEY) || '{}') }
    catch { return {} }
  })

  const [pins, setPins] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PINS_KEY) || '[]') }
    catch { return [] }
  })

  const [hoveredTab, setHoveredTab]     = useState(null)
  const [hoveredIcon, setHoveredIcon]   = useState(null)
  const [healthDismissed, setHealthDismissed] = useState(() => {
    try { return localStorage.getItem('qerxel_health_dismissed') } catch { return null }
  })
  const [healthExpanded, setHealthExpanded] = useState(false)
  const notifPanelRef = useRef(null)
  const sidebarW = sidebarCollapsed ? 60 : 260

  // ── Product / section map ─────────────────────────────────────────────────

  const PRODUCTS = [
    {
      id: 'answer',
      label: 'Answer',
      dot: '#f0a500',
      tabs: [
        { id: 'dashboard', label: 'Home',      icon: <IcoDashboard /> },
        { id: 'analytics', label: 'Analytics', icon: <IcoAnalytics /> },
        { id: 'ai',        label: 'Answer AI', icon: <IcoAI /> },
      ],
    },
    {
      id: 'schedule',
      label: 'Schedule',
      dot: '#1d4ed8',
      tabs: [
        { id: 'calendar', label: 'Calendar', icon: <IcoCalendar /> },
        { id: 'team',     label: 'Team',     icon: <IcoPeople /> },
      ],
    },
    ...(hasSentry ? [{ id: 'sentry', label: 'Sentry', dot: '#5e3b87', tabs: [{ id: 'sentry', label: 'Sentry', icon: <IcoSentry /> }] }] : []),
    ...(hasListen ? [{ id: 'listen', label: 'Listen', dot: '#3db87a', tabs: [{ id: 'listen', label: 'Listen', icon: <IcoListen /> }] }] : []),
    {
      id: 'lines',
      label: 'Lines',
      dot: '#0d9488',
      subtle: true,
      tabs: [{ id: 'lines', label: 'Lines', icon: <IcoPhone /> }],
    },
    { id: '_divider', divider: true, tabs: [] },
    {
      id: 'business',
      label: 'Business',
      dot: null,
      tabs: [
        { id: 'referrals',    label: 'Partners',         icon: <IcoPartners /> },
        { id: 'profile',      label: 'Business Profile', icon: <IcoBuilding /> },
        { id: 'integrations', label: 'Integrations',     icon: <IcoIntegrations /> },
      ],
    },
    {
      id: 'platform',
      label: 'Platform',
      dot: null,
      tabs: [
        { id: 'settings', label: 'Account & Billing', icon: <IcoGear /> },
      ],
    },
  ]

  const activeProductId = PRODUCTS.find(p => p.tabs?.some(t => t.id === activeTab))?.id
  const allTabs         = PRODUCTS.flatMap(p => p.tabs || [])
  const pinnedTabs      = allTabs.filter(t => pins.includes(t.id))

  const isPoorHealth     = qScore !== null && qScore < 75
  const healthSuppressed = !!healthDismissed && (Date.now() - new Date(healthDismissed).getTime()) < 30 * 24 * 60 * 60 * 1000
  const showHealthAtTop  = isPoorHealth && !healthSuppressed && !sidebarCollapsed

  const healthTarget = (() => {
    const scores = [
      { s: configPillar ?? 100, tab: 'ai' },
      { s: toolPillar   ?? 100, tab: 'integrations' },
      { s: perfPillar   ?? 100, tab: 'dashboard' },
    ]
    return scores.reduce((a, b) => a.s < b.s ? a : b).tab
  })()

  const dismissHealth = () => {
    const now = new Date().toISOString()
    setHealthDismissed(now)
    try { localStorage.setItem('qerxel_health_dismissed', now) } catch {}
  }

  // ── Auto-expand the section containing the active tab ─────────────────────

  useEffect(() => {
    if (!activeProductId) return
    setSections(prev => {
      if (prev[activeProductId]) return prev
      return { ...prev, [activeProductId]: true }
    })
  }, [activeTab, activeProductId])

  // ── Persist state ─────────────────────────────────────────────────────────

  useEffect(() => { localStorage.setItem(SECTIONS_KEY, JSON.stringify(sections)) }, [sections])
  useEffect(() => { localStorage.setItem(PINS_KEY, JSON.stringify(pins)) }, [pins])

  // ── Outside click for notification panel ──────────────────────────────────

  useEffect(() => {
    if (!notifPanelOpen) return
    const handler = (e) => {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target)) onNotifToggle()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifPanelOpen])

  // ── Section + pin helpers ─────────────────────────────────────────────────

  const toggleSection = (sectionId) => {
    const isActiveSection = sectionId === activeProductId
    const isFavWithActivePin = sectionId === '_favourites' && pins.includes(activeTab)
    if (isActiveSection || isFavWithActivePin) return
    setSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  const togglePin = (tabId, e) => {
    e.stopPropagation()
    setPins(prev => prev.includes(tabId) ? prev.filter(p => p !== tabId) : [...prev, tabId])
  }

  const isSectionOpen = (sectionId) => {
    if (sidebarCollapsed) return true
    if (sectionId === activeProductId) return true
    if (sectionId === '_favourites') return sections['_favourites'] !== false
    return sections[sectionId] === true
  }

  // ── Tab row ───────────────────────────────────────────────────────────────

  const renderTab = (tab, inFavourites = false) => {
    const isActive  = activeTab === tab.id
    const isHovered = hoveredTab === tab.id && !sidebarCollapsed
    const isPinned  = pins.includes(tab.id)
    const showBadge = tab.id === 'dashboard' && uncontactedCount > 0
    const showStar  = !sidebarCollapsed && !inFavourites && (isPinned || isHovered) && !showBadge
    const showFavStar = !sidebarCollapsed && inFavourites

    return (
      <button
        key={inFavourites ? `fav-${tab.id}` : tab.id}
        onClick={() => onTabSelect(tab.id)}
        onMouseEnter={() => setHoveredTab(tab.id)}
        onMouseLeave={() => setHoveredTab(null)}
        title={sidebarCollapsed ? tab.label : undefined}
        style={{
          width: '100%', height: 36,
          display: 'flex', alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          gap: '0.6rem',
          padding: sidebarCollapsed ? 0 : '0 0.85rem 0 1.35rem',
          border: 'none',
          borderLeft: `3px solid ${isActive ? '#f0a500' : 'transparent'}`,
          marginLeft: isActive ? -3 : 0,
          background: isActive ? 'rgba(255,255,255,0.15)' : isHovered ? 'rgba(255,255,255,0.05)' : 'transparent',
          color: isActive ? 'white' : 'rgba(255,255,255,0.62)',
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
          <>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>
              {tab.label}
            </span>
            {showBadge && (
              <span style={{ fontSize: '0.6rem', fontWeight: 700, background: '#f0a500', color: '#1a0533', borderRadius: 10, padding: '0.05rem 0.38rem', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
                {uncontactedCount}
              </span>
            )}
            {showStar && (
              <button
                onClick={e => togglePin(tab.id, e)}
                title={isPinned ? 'Remove from favourites' : 'Add to favourites'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0.15rem', color: isPinned ? '#f0a500' : 'rgba(255,255,255,0.22)', fontSize: '0.8rem', lineHeight: 1, flexShrink: 0, transition: 'color 0.12s' }}
              >
                {isPinned ? '★' : '☆'}
              </button>
            )}
            {showFavStar && (
              <button
                onClick={e => togglePin(tab.id, e)}
                title="Remove from favourites"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0.15rem', color: 'rgba(240,165,0,0.55)', fontSize: '0.8rem', lineHeight: 1, flexShrink: 0, opacity: isHovered ? 1 : 0.7, transition: 'opacity 0.1s' }}
              >
                ★
              </button>
            )}
          </>
        )}
      </button>
    )
  }

  // ── Section header ────────────────────────────────────────────────────────

  const renderSectionHeader = (product, pi, isOpen) => {
    const isActiveSection = product.id === activeProductId
    const isFav           = product.id === '_favourites'
    const locked          = isActiveSection || (isFav && pins.includes(activeTab))

    if (sidebarCollapsed) {
      return pi > 0 ? (
        <div key={`div-${product.id}`} style={{ height: 1, margin: '0.2rem 0.75rem', background: 'rgba(255,255,255,0.07)' }} />
      ) : null
    }

    return (
      <button
        onClick={() => toggleSection(product.id)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.35rem',
          padding: pi === 0 ? '0.5rem 0.85rem 0.15rem 1.25rem' : '0.65rem 0.85rem 0.15rem 1.25rem',
          background: 'none', border: 'none',
          cursor: locked ? 'default' : 'pointer',
          textAlign: 'left', boxSizing: 'border-box',
        }}
      >
        {isFav ? (
          <span style={{ fontSize: '0.6rem', color: '#f0a500', lineHeight: 1, flexShrink: 0 }}>★</span>
        ) : product.dot ? (
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: product.dot, flexShrink: 0 }} />
        ) : (
          <span style={{ width: 6, flexShrink: 0 }} />
        )}
        <span style={{
          fontSize: '0.585rem', fontWeight: 700,
          color: isActiveSection ? 'rgba(255,255,255,0.42)' : product.subtle ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.28)',
          textTransform: 'uppercase', letterSpacing: '0.12em',
          fontFamily: "'DM Sans', sans-serif", flex: 1, whiteSpace: 'nowrap', transition: 'color 0.12s',
        }}>
          {product.label}
        </span>
        {!locked && (
          <span style={{
            color: 'rgba(255,255,255,0.18)', fontSize: '0.65rem', lineHeight: 1,
            display: 'inline-block', transition: 'transform 0.15s',
            transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}>
            ▾
          </span>
        )}
      </button>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <aside style={{
      position: 'sticky', top: 0, alignSelf: 'flex-start', height: '100vh',
      width: sidebarW, flexShrink: 0, background: '#5e3b87',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.22s ease', overflow: 'hidden', zIndex: 10,
    }}>

      {/* Logo */}
      <div style={{
        height: 64, display: 'flex', alignItems: 'center',
        justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
        padding: sidebarCollapsed ? 0 : '0 0.9rem 0 1.25rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, boxSizing: 'border-box',
      }}>
        {sidebarCollapsed ? (
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f0a500', display: 'block' }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: 'white', fontSize: '1.125rem', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>Qerxel</span>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f0a500', display: 'inline-block', marginLeft: 3, marginBottom: 8, flexShrink: 0 }} />
          </div>
        )}
      </div>

      {/* Nav */}
      <style>{`#qerxel-nav::-webkit-scrollbar { display: none }`}</style>
      <nav id="qerxel-nav" style={{ flex: 1, paddingTop: '0.25rem', overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none' }}>

        {/* Health check warning — shown at top when score is poor */}
        {showHealthAtTop && (
          <div style={{ margin: '0.5rem 0.75rem 0.4rem', background: 'rgba(255,255,255,0.07)', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <button
              onClick={() => setHealthExpanded(e => !e)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 0.7rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box' }}
            >
              <img src={`/qmood/${qMood || 'smile'}.png`} alt="" style={{ width: 24, height: 24, objectFit: 'contain', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', fontFamily: "'DM Sans', sans-serif" }}>Health check</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, fontFamily: "'Syne', sans-serif", color: qScore >= 50 ? '#f0a500' : '#f87171', flexShrink: 0 }}>{qScore}</span>
              <button onClick={e => { e.stopPropagation(); dismissHealth() }} title="Dismiss for 1 month" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: '0.9rem', lineHeight: 1, padding: '0 0.1rem', flexShrink: 0 }}>×</button>
              <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.6rem', display: 'inline-block', transition: 'transform 0.15s', transform: healthExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', lineHeight: 1, flexShrink: 0 }}>▾</span>
            </button>
            {healthExpanded && qPillars && (
              <div style={{ padding: '0 0.7rem 0.6rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {Object.entries(qPillars).map(([key, p]) => {
                  const pct = Math.round((p.score / p.max) * 100)
                  const tab = { setup: 'ai', tools: 'integrations', activity: 'dashboard' }[key]
                  return (
                    <button key={key} onClick={() => onTabSelect(tab)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.12rem' }}>
                        <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.45)', fontFamily: "'DM Sans', sans-serif" }}>{p.label}</span>
                        <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontFamily: "'DM Sans', sans-serif" }}>{p.score}/{p.max} →</span>
                      </div>
                      <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 75 ? '#3db87a' : pct >= 50 ? '#f0a500' : '#f87171', borderRadius: 2 }} />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Favourites — only when pins exist */}
        {pinnedTabs.length > 0 && (
          <div>
            {!sidebarCollapsed && renderSectionHeader({ id: '_favourites', label: 'Favourites', dot: null }, 0, isSectionOpen('_favourites'))}
            {isSectionOpen('_favourites') && pinnedTabs.map(tab => renderTab(tab, true))}
            {!sidebarCollapsed && (
              <div style={{ height: 1, margin: '0.3rem 0.75rem', background: 'rgba(255,255,255,0.07)' }} />
            )}
          </div>
        )}

        {/* Product sections */}
        {PRODUCTS.map((product, pi) => {
          if (product.divider) {
            return !sidebarCollapsed
              ? <div key="_div" style={{ height: 1, margin: '0.45rem 0.75rem', background: 'rgba(255,255,255,0.12)' }} />
              : null
          }

          const isOpen         = isSectionOpen(product.id)
          const labelIndex     = PRODUCTS.filter((p, i) => !p.divider && i <= pi).length - 1

          return (
            <div key={product.id}>
              {renderSectionHeader(product, labelIndex, isOpen)}
              {isOpen && product.tabs.map(tab => renderTab(tab))}
            </div>
          )
        })}
      </nav>

      {/* Bottom controls */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>

        {!sidebarCollapsed && (
          <div style={{ padding: '0.5rem 1.25rem 0' }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>
              {displayName || user?.email}
            </div>
          </div>
        )}


        {/* Icon row */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0.35rem 0', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '0.3rem' }}>
          {[
            { id: 'bell',    icon: <IcoBell />,    label: 'Notifications', action: onNotifToggle,                                           active: notifPanelOpen },
            { id: 'gear',    icon: <IcoGear />,    label: 'Settings',      action: () => onTabSelect('settings'),                          active: activeTab === 'settings' },
            { id: 'vera',    icon: <IcoVera />,    label: 'Ask Q',         action: () => document.getElementById('vera-ask-btn')?.click(), active: false },
            { id: 'signout', icon: <IcoSignOut />, label: 'Sign out',      action: onSignOut,                                               active: false },
          ].map(item => (
            <button
              key={item.id}
              onClick={item.action}
              title={item.label}
              onMouseEnter={() => setHoveredIcon(item.id)}
              onMouseLeave={() => setHoveredIcon(null)}
              style={{
                flex: 1, height: 38,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none',
                borderTop: item.active ? '2px solid #f0a500' : '2px solid transparent',
                background: item.active ? 'rgba(255,255,255,0.12)' : hoveredIcon === item.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: item.active ? '#f0a500' : 'rgba(255,255,255,0.45)',
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
        onClick={onCollapseToggle}
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
            position: 'fixed', left: sidebarW, bottom: 0, width: 280, background: 'white',
            borderRadius: '0 12px 0 0', boxShadow: '6px -4px 28px rgba(0,0,0,0.16)',
            padding: '1.25rem', zIndex: 200, borderTop: '3px solid #f0a500',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
            Notifications
          </div>
          {[
            { label: 'New lead captured', desc: 'Immediate alert when your AI captures a lead.', val: notifyNewLead, field: 'notify_new_lead' },
            { label: 'Daily summary',     desc: 'End-of-day digest of calls, leads, referrals.', val: notifyDailySummary, field: 'notify_daily_summary' },
            { label: 'Weekly report',     desc: 'Monday morning overview of the week.', val: notifyWeeklyReport, field: 'notify_weekly_report' },
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
              <Toggle checked={item.val} onChange={v => onNotifChange(item.field, v)} />
            </div>
          ))}
        </div>
      )}

    </aside>
  )
}
