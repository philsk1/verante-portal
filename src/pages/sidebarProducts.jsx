// Single source of truth for portal navigation structure. Consumed by PortalSidebar.jsx
// (desktop sidebar render) and Portal.jsx (Cmd+K sitemap index). Kept in its own file —
// not PortalSidebar.jsx — because exporting a non-component function alongside a default
// component export breaks Vite Fast Refresh (react-refresh/only-export-components).
// Do not reintroduce a second, hand-maintained copy of this array anywhere.
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
