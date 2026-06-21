// Single source of truth for portal navigation structure. Consumed by PortalSidebar.jsx
// (desktop sidebar render) and Portal.jsx (Cmd+K sitemap index). Kept in its own file —
// not PortalSidebar.jsx — because exporting a non-component function alongside a default
// component export breaks Vite Fast Refresh (react-refresh/only-export-components).
// Do not reintroduce a second, hand-maintained copy of this array anywhere.
/**
 * ============================================================================
 * 🔒 CANONICAL INTEGRITY CONTRACT (SOP v3.0 — full procedure: CLAUDE-PROCEDURES.md §Procedure 12)
 * ============================================================================
 * 🚦 MULTI-TENANT PROOF-OF-VERIFICATION
 * - [ ] Answer + Schedule  -> Proof: static trace only. hasAnswerProduct=true spreads
 *       in Answer/Listen sections (lines 13-21); Schedule section always present,
 *       locked: !hasSchedule (lines 23-33). No live tenant render captured this session.
 * - [ ] Schedule-Only      -> Proof: static trace only. hasAnswerProduct=false collapses
 *       Answer/Listen sections to [] via the conditional spread (lines 13-21) — confirmed
 *       by reading the spread logic, not by rendering it. No live render captured.
 * - [ ] Demo/Sandbox       -> Proof: static trace only. isDemoMode=true removes the
 *       Platform/Account&Billing section (lines ~57-64). No live render captured.
 * ----------------------------------------------------------------------------
 * 🗺️ REACHABILITY & DUPLICATION PROOF
 * - [ ] Reachable via: Desktop Sidebar (PortalSidebar.jsx render loop) | Search/Cmd+K
 *       (Portal.jsx:393 sitemapAllItems) -> Proof: both call buildSidebarProducts()
 *       directly, confirmed by import grep, no second copy exists (commit 3b101af).
 * - [ ] Duplication check -> Proof: this file replaced THREE independent copies
 *       (PortalSidebar.jsx's own buildSidebarProducts, Portal.jsx's PRODUCTS literal,
 *       Portal.jsx's mobileNavTabs partially) found drifted on 2026-06-21.
 * ----------------------------------------------------------------------------
 * 📉 LOCAL METRICS (SonarJS ground truth — ran 2026-06-21)
 * Cognitive Score: 9 (buildSidebarProducts, line 12)  ·  Inputs/Outputs Frozen: NO — newly extracted, may take more callers
 * ----------------------------------------------------------------------------
 * Last Audited: 2026-06-21  ·  Audited By: Claude session (mobile-nav unification)  ·  Status: OK
 * ============================================================================
 */
import {
  IcoDashboard, IcoAI, IcoListen, IcoCalendar, IcoPeople, IcoServices, IcoProducts,
  IcoAnalytics, IcoPartners, IcoBuilding, IcoIntegrations, IcoGear, IcoPhone, IcoClients,
  IcoSentry, IcoDesk, IcoSupport, IcoCommand,
} from './PortalIcons'

export function buildSidebarProducts({ hasAnswerProduct, hasSchedule, hasScheduleMulti, hasListen, hasSentry, isDemoMode, user }) {
  const adminEmails = ['finsolsoffice@gmail.com', 'philoffice@btconnect.com']
  return [
    ...(hasAnswerProduct ? [{
      id: 'answer',
      label: 'Answer',
      dot: '#3db87a',
      tabs: [
        { id: 'dashboard', label: 'Home',      icon: <IcoDashboard /> },
        { id: 'ai',        label: 'Answer AI', icon: <IcoAI /> },
      ],
    }] : []),
    ...(hasAnswerProduct ? [{
      id: 'listen',
      label: 'Listen',
      dot: hasListen ? '#3db87a' : 'rgba(255,255,255,0.2)',
      locked: !hasListen,
      tabs: [{ id: 'listen', label: 'Listen', icon: <IcoListen /> }],
    }] : []),
    {
      id: 'schedule',
      label: 'Schedule',
      dot: hasSchedule ? '#3db87a' : 'rgba(255,255,255,0.2)',
      locked: !hasSchedule,
      tabs: [
        { id: 'calendar',  label: 'Calendar',  icon: <IcoCalendar /> },
        { id: 'team',      label: 'Team',      icon: <IcoPeople />, locked: !hasScheduleMulti },
        { id: 'services',  label: 'Services',  icon: <IcoServices /> },
        { id: 'products',  label: 'Products',  icon: <IcoProducts /> },
        { id: 'analytics', label: 'Analytics', icon: <IcoAnalytics /> },
      ],
    },
    { id: 'sentry', label: 'Sentry', dot: hasSentry ? '#ef4444' : 'rgba(255,255,255,0.2)', locked: !hasSentry, tabs: [{ id: 'sentry', label: 'Sentry', icon: <IcoSentry /> }] },
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
      dot: '#60a5fa',
      tabs: [
        { id: 'business',     label: 'Business Desk',    icon: <IcoDesk /> },
        { id: 'clients',      label: 'Clients',          icon: <IcoClients /> },
        { id: 'referrals',    label: 'Partners',         icon: <IcoPartners /> },
        { id: 'profile',      label: 'Business Profile', icon: <IcoBuilding /> },
        { id: 'integrations', label: 'Integrations',     icon: <IcoIntegrations /> },
      ],
    },
    ...(!isDemoMode ? [{
      id: 'platform',
      label: 'Platform',
      dot: '#60a5fa',
      tabs: [
        { id: 'settings', label: 'Account & Billing', icon: <IcoGear /> },
      ],
    }] : []),
    ...(adminEmails.includes(user?.email) ? [{
      id: 'support',
      label: 'Support',
      dot: '#dc2626',
      tabs: [{ id: 'support', label: 'Support Intel', icon: <IcoSupport /> }],
    }] : []),
    ...(adminEmails.includes(user?.email) ? [{
      id: 'command',
      label: 'Command',
      dot: '#dc2626',
      tabs: [{ id: 'command', label: 'Master Control', icon: <IcoCommand /> }],
    }] : []),
  ]
}
