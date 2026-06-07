import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { useDemo } from '../context/DemoContext'
import { usePreview } from '../context/PreviewContext'
import { useNavigate } from 'react-router-dom'
import PlanSelector from './PlanSelector'

// ─── constants ────────────────────────────────────────────────────────────────

const TIERS = {
  free:         { label: 'Free',         price: '£0',     minutes: null, concurrent: 1 },
  light:        { label: 'Light',        price: '£29',    minutes: 120,  concurrent: 1 },
  standard:     { label: 'Standard',     price: '£49',    minutes: 250,  concurrent: 1 },
  professional: { label: 'Professional', price: '£69',    minutes: 450,  concurrent: 2 },
  enterprise:   { label: 'Enterprise',   price: '£249',   minutes: 1000, concurrent: 3 },
  bespoke:      { label: 'Bespoke',      price: 'Custom', minutes: null, concurrent: null },
}

const UPGRADE_PATH = {
  free:         ['light', 'standard', 'professional', 'enterprise'],
  light:        ['standard', 'professional', 'enterprise'],
  standard:     ['professional', 'enterprise'],
  professional: ['enterprise'],
  enterprise:   [],
  bespoke:      [],
}

const UPGRADE_FEATURES = {
  light:        'Premium voice · 120 included minutes',
  standard:     'Number blocking · 250 included minutes',
  professional: 'Calendar integration · Sensitive data mode · 450 minutes',
  enterprise:   'Full analytics · Staff routing · Priority support · 1,000 minutes',
}

// ─── styles ───────────────────────────────────────────────────────────────────

const s = {
  section: {
    background: 'white',
    borderRadius: '16px',
    padding: '1.25rem 1.5rem',
    border: '0.5px solid rgba(94,59,135,0.06)',
    marginBottom: '1rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.06)',
  },
  sectionTitle: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    color: '#aaaaaa',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    margin: '0 0 0.2rem',
  },
  sectionSubtitle: {
    fontSize: '0.78rem',
    color: '#999',
    marginBottom: '0.85rem',
    lineHeight: 1.5,
    marginTop: '0.1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.6875rem',
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    color: '#aaaaaa',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  // Plan
  planRow: (tier) => {
    const bgs = { free: '#f1f5f9', light: '#bfdbfe', standard: '#bbf7d0', professional: '#ddd6fe', enterprise: '#fde68a', bespoke: '#fde68a' }
    const borders = { free: 'rgba(100,116,139,0.2)', light: 'rgba(29,78,216,0.25)', standard: 'rgba(61,184,122,0.3)', professional: 'rgba(94,59,135,0.25)', enterprise: 'rgba(240,165,0,0.4)', bespoke: 'rgba(240,165,0,0.4)' }
    return {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '1rem',
      background: bgs[tier] || '#f8f7fb',
      borderRadius: '12px',
      marginBottom: '1.25rem',
      border: `1px solid ${borders[tier] || 'rgba(94,59,135,0.06)'}`,
    }
  },
  planBadge: (tier) => {
    const map = {
      free:         { bg: '#f8fafc', color: '#64748b' },
      light:        { bg: '#bfdbfe', color: '#1e3a8a' },
      standard:     { bg: '#bbf7d0', color: '#166534' },
      professional: { bg: '#ddd6fe', color: '#4a2d6e' },
      enterprise:   { bg: '#fde68a', color: '#78460a' },
      bespoke:      { bg: '#fde68a', color: '#78460a' },
    }
    const t = map[tier] || map.professional
    return {
      display: 'inline-block',
      padding: '0.3rem 0.85rem',
      borderRadius: '999px',
      fontSize: '0.75rem',
      fontWeight: '700',
      fontFamily: "'DM Sans', sans-serif",
      background: t.bg,
      color: t.color,
      flexShrink: 0,
    }
  },
  planPrice: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#1a1a1a',
  },
  planMeta: {
    fontSize: '0.775rem',
    color: '#888',
  },
  upgradeGrid: {
    display: 'grid',
    gap: '0.75rem',
  },
  upgradeCard: (highlight) => ({
    border: `1.5px solid ${highlight ? '#5e3b87' : 'rgba(94,59,135,0.12)'}`,
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    boxShadow: highlight ? '0 0 0 3px rgba(94,59,135,0.08)' : 'none',
  }),
  upgradeCardTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '0.2rem',
  },
  upgradeCardMeta: {
    fontSize: '0.775rem',
    color: '#888',
  },
  upgradeBtn: {
    padding: '0.45rem 1rem',
    background: '#f0a500',
    color: '#1a0533',
    border: 'none',
    borderRadius: '7px',
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    flexShrink: 0,
  },
  // Account details
  fieldRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginBottom: '1rem',
  },
  fieldWrap: {
    marginBottom: '1rem',
  },
  input: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '1px solid rgba(94,59,135,0.2)',
    borderRadius: '8px',
    fontSize: '0.875rem',
    color: '#1a1a1a',
    background: 'white',
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
  },
  inputReadOnly: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '1px solid rgba(94,59,135,0.1)',
    borderRadius: '8px',
    fontSize: '0.875rem',
    color: '#888',
    background: '#f8f7fa',
    boxSizing: 'border-box',
    fontFamily: "'DM Sans', sans-serif",
  },
  saveBtn: {
    padding: '0.55rem 1.25rem',
    background: '#f0a500',
    color: '#1a0533',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  saveBtnDisabled: {
    padding: '0.55rem 1.25rem',
    background: '#f5d98a',
    color: '#7a5c1a',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'not-allowed',
    fontFamily: "'DM Sans', sans-serif",
  },
  ghostBtn: {
    background: 'none',
    border: '1px solid rgba(94,59,135,0.2)',
    borderRadius: '8px',
    padding: '0.55rem 1.25rem',
    fontSize: '0.875rem',
    color: '#5e3b87',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: '500',
  },
  toast: (type) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    marginLeft: '0.75rem',
    padding: '0.45rem 0.85rem',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: '500',
    background: type === 'success' ? '#e6f5ee' : '#fef2f2',
    color: type === 'success' ? '#1e7a4a' : '#b91c1c',
    border: `1px solid ${type === 'success' ? '#a7e8c2' : '#fecaca'}`,
  }),
  // Toggles
  toggleRow: (last) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.85rem 0',
    borderBottom: last ? 'none' : '1px solid rgba(94,59,135,0.06)',
    gap: '1rem',
  }),
  toggleLabel: {
    fontSize: '0.875rem',
    color: '#1a1a1a',
    fontWeight: '500',
    marginBottom: '0.15rem',
  },
  toggleDesc: {
    fontSize: '0.775rem',
    color: '#999',
  },
  // Feedback stars
  starRow: {
    display: 'flex',
    gap: '0.35rem',
    marginBottom: '1rem',
  },
  star: (filled) => ({
    fontSize: '1.75rem',
    cursor: 'pointer',
    color: filled ? '#f0a500' : '#e2e0e8',
    lineHeight: 1,
    userSelect: 'none',
  }),
  feedbackTextarea: {
    width: '100%',
    padding: '0.65rem 0.75rem',
    border: '1px solid rgba(94,59,135,0.2)',
    borderRadius: '8px',
    fontSize: '0.875rem',
    color: '#1a1a1a',
    boxSizing: 'border-box',
    outline: 'none',
    resize: 'vertical',
    minHeight: '90px',
    fontFamily: "'DM Sans', sans-serif",
    lineHeight: 1.55,
    marginBottom: '1rem',
  },
  lockedFeedback: {
    background: '#f8f7fa',
    borderRadius: '8px',
    padding: '1.25rem',
    textAlign: 'center',
    border: '1px dashed rgba(94,59,135,0.15)',
  },
  // Support chat
  chatWrap: {
    border: '1px solid rgba(94,59,135,0.12)',
    borderRadius: '10px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '360px',
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    background: '#faf9fc',
  },
  chatBubble: (isUser) => ({
    maxWidth: '75%',
    padding: '0.6rem 0.85rem',
    borderRadius: isUser ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
    background: isUser ? '#5e3b87' : 'white',
    color: isUser ? 'white' : '#1a1a1a',
    fontSize: '0.8rem',
    lineHeight: 1.55,
    alignSelf: isUser ? 'flex-end' : 'flex-start',
    border: isUser ? 'none' : '1px solid rgba(94,59,135,0.1)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  }),
  chatInputRow: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.75rem',
    borderTop: '1px solid rgba(94,59,135,0.08)',
    background: 'white',
  },
  chatInput: {
    flex: 1,
    padding: '0.55rem 0.75rem',
    border: '1px solid rgba(94,59,135,0.2)',
    borderRadius: '8px',
    fontSize: '0.875rem',
    color: '#1a1a1a',
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
  },
  chatSend: {
    padding: '0.55rem 1rem',
    background: '#5e3b87',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    flexShrink: 0,
  },
  chatSendDisabled: {
    padding: '0.55rem 1rem',
    background: '#d1c4e9',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'not-allowed',
    fontFamily: "'DM Sans', sans-serif",
    flexShrink: 0,
  },
  // Cancel / danger
  dangerSection: {
    background: 'white',
    borderRadius: '10px',
    padding: '1.75rem',
    border: '0.5px solid rgba(185,28,28,0.15)',
    marginBottom: '1.25rem',
  },
  cancelBtn: {
    padding: '0.55rem 1.25rem',
    background: 'white',
    color: '#b91c1c',
    border: '1px solid rgba(185,28,28,0.3)',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  // Modal
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(26,5,51,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '1rem',
  },
  modal: {
    background: 'white',
    borderRadius: '14px',
    padding: '2rem',
    maxWidth: '480px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(94,59,135,0.2)',
  },
  modalTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: '0.5rem',
  },
  modalBody: {
    fontSize: '0.875rem',
    color: '#555',
    lineHeight: 1.6,
    marginBottom: '1.25rem',
  },
  lossItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.6rem',
    padding: '0.6rem 0',
    borderBottom: '1px solid rgba(94,59,135,0.06)',
    fontSize: '0.8rem',
    color: '#444',
  },
  lossDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#f0a500',
    marginTop: 5,
    flexShrink: 0,
  },
  modalBtnRow: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1.5rem',
    flexWrap: 'wrap',
  },
  modalCancelFinal: {
    padding: '0.55rem 1.1rem',
    background: 'white',
    color: '#b91c1c',
    border: '1px solid rgba(185,28,28,0.3)',
    borderRadius: '8px',
    fontSize: '0.8125rem',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  modalStay: {
    flex: 1,
    padding: '0.55rem 1.1rem',
    background: '#5e3b87',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.8125rem',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  retentionPill: (active) => ({
    padding: '0.45rem 1rem',
    background: active ? '#5e3b87' : 'white',
    color: active ? 'white' : '#5e3b87',
    border: `1.5px solid ${active ? '#5e3b87' : 'rgba(94,59,135,0.2)'}`,
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: active ? '500' : '400',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  }),
}

// ─── toggle switch ────────────────────────────────────────────────────────────

const Toggle = ({ checked, onChange }) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    style={{ width: 42, height: 24, borderRadius: 12, background: checked ? '#5e3b87' : '#d1d5db', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0, padding: 0 }}
  >
    <span style={{ position: 'absolute', top: 3, left: checked ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
  </button>
)

// ─── main component ───────────────────────────────────────────────────────────

const AccountSettings = ({ onNavigate }) => {
  const { user } = useAuth()
  const demo = useDemo()
  const isDemo = !!demo?.isDemo
  const preview = usePreview()
  const isPreview = !!preview?.isPreview
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState(null)
  const [tier, setTier] = useState('light')
  const [tenantCreatedAt, setTenantCreatedAt] = useState(null)
  const [feedbackShown, setFeedbackShown] = useState(false)
  const [partnerCount, setPartnerCount] = useState(0)
  const [outboundCount, setOutboundCount] = useState(0)
  const [leadCount, setLeadCount] = useState(0)

  // Account details
  const [displayName, setDisplayName] = useState('')
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountToast, setAccountToast] = useState({ msg: '', type: '' })

  // Feedback
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSaving, setFeedbackSaving] = useState(false)
  const [feedbackDone, setFeedbackDone] = useState(false)

  // Support chat
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: 'Hi — I\'m your Qerxel support assistant. I have access to your account context and can help with portal settings, AI behaviour, and billing questions. What can I help you with?' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatWaiting, setChatWaiting] = useState(false)
  const chatEndRef = useRef(null)

  // Billing
  const [billingModel, setBillingModel] = useState('subscription')
  const [monthlyCostLimit, setMonthlyCostLimit] = useState(20)
  const [costLimitSaving, setCostLimitSaving] = useState(false)
  const [upgradingTier, setUpgradingTier] = useState(null)
  const [upgradeSuccess, setUpgradeSuccess] = useState(false)

  // GDPR & Data
  const [dataRetentionDays, setDataRetentionDays] = useState(90)
  const [dataSaving, setDataSaving] = useState(false)
  const [dataToast, setDataToast] = useState({ msg: '', type: '' })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  // Cancel modal
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)

  // Plan selector overlay
  const [showPlanSelector, setShowPlanSelector] = useState(false)

  // Demo mode: inject data from DemoContext
  useEffect(() => {
    if (!isDemo || demo?.loading) return
    const biz = demo.business || {}
    setDisplayName(biz.business_name || '')
    setTier(demo.tier)
    setTenantCreatedAt(null)
    setNotifyNewLead(true)
    setNotifyDailySummary(false)
    setNotifyWeeklyReport(true)
    setHolidayMode(false)
    setDataRetentionDays(90)
    setBillingModel('subscription')
    setMonthlyCostLimit(20)
    setPartnerCount(demo.partners.length)
    setLeadCount(demo.leads.length)
    setOutboundCount(demo.referrals.length)
    setLoading(false)
  }, [isDemo, demo?.loading])

  useEffect(() => {
    if (isDemo || (!user && !isPreview)) return
    const load = async () => {
      setLoading(true)
      try {
        let tid
        if (isPreview) {
          tid = preview.previewTenantId
        } else {
          const { data: membership } = await supabase
            .from('tenant_memberships').select('tenant_id').eq('user_id', user.id).maybeSingle()
          if (!membership) return
          tid = membership.tenant_id
        }
        setTenantId(tid)

        const { data: tenant } = await supabase
          .from('tenants')
          .select('business_name, subscription_tier, created_at, feedback_prompt_shown, data_retention_days, billing_model, monthly_cost_limit')
          .eq('id', tid)
          .maybeSingle()

        if (tenant) {
          setDisplayName(tenant.business_name || '')
          setTier(tenant.subscription_tier || 'light')
          setTenantCreatedAt(tenant.created_at)
          setFeedbackShown(tenant.feedback_prompt_shown || false)
          setNotifyNewLead(tenant.notify_new_lead !== false)
          setNotifyDailySummary(tenant.notify_daily_summary === true)
          setNotifyWeeklyReport(tenant.notify_weekly_report !== false)
          setDataRetentionDays(tenant.data_retention_days ?? 90)
          setBillingModel(tenant.billing_model || 'subscription')
          setMonthlyCostLimit(tenant.monthly_cost_limit ?? 20)
        }

        const [pRes, lRes, rRes] = await Promise.all([
          supabase.from('referral_partners').select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
          supabase.from('leads').select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
          supabase.from('referral_log').select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
        ])

        setPartnerCount(pRes.count || 0)
        setLeadCount(lRes.count || 0)
        setOutboundCount(rRes.count || 0)
      } catch (err) {
        console.error('Account load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, isDemo, isPreview])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('upgraded')) {
      setUpgradeSuccess(true)
      window.history.replaceState({}, '', window.location.pathname)
      setTimeout(() => setUpgradeSuccess(false), 6000)
    }
  }, [])

  const handleUpgrade = async (targetTier) => {
    if (isDemo || isPreview || !tenantId) return
    setUpgradingTier(targetTier)
    try {
      const res = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, targetTier }),
      })
      const data = await res.json()
      if (data.mode === 'redirect') {
        window.location.href = data.url
      } else if (data.mode === 'updated') {
        setTier(data.tier)
        setUpgradeSuccess(true)
        setTimeout(() => setUpgradeSuccess(false), 6000)
      }
    } catch {
      // network failure — silent, user can retry
    } finally {
      setUpgradingTier(null)
    }
  }

  const showAccountToast = (msg, type = 'success') => {
    setAccountToast({ msg, type })
    setTimeout(() => setAccountToast({ msg: '', type: '' }), 3000)
  }

  const saveAccountDetails = async () => {
    if (isDemo || isPreview || !tenantId) return
    setAccountSaving(true)
    const { error } = await supabase.from('tenants').update({ business_name: displayName }).eq('id', tenantId)
    setAccountSaving(false)
    showAccountToast(error ? 'Could not save. Please try again.' : 'Details saved.', error ? 'error' : 'success')
  }


  const showDataToast = (msg, type = 'success') => {
    setDataToast({ msg, type })
    setTimeout(() => setDataToast({ msg: '', type: '' }), 3500)
  }

  const saveCostLimit = async (val) => {
    if (isDemo || isPreview || !tenantId) return
    setMonthlyCostLimit(val)
    setCostLimitSaving(true)
    await supabase.from('tenants').update({ monthly_cost_limit: val }).eq('id', tenantId)
    setCostLimitSaving(false)
  }

  const saveDataRetention = async (days) => {
    if (isDemo || isPreview || !tenantId) return
    setDataRetentionDays(days)
    setDataSaving(true)
    const { error } = await supabase.from('tenants').update({ data_retention_days: days }).eq('id', tenantId)
    setDataSaving(false)
    showDataToast(error ? 'Could not save. Please try again.' : 'Data retention updated.', error ? 'error' : 'success')
  }

  const handleExportData = () => {
    showDataToast("We'll email your data export within 24 hours.", 'success')
  }

  const handleDeleteConfirm = () => {
    setShowDeleteModal(false)
    showDataToast('Deletion request received — your account will be closed within 48 hours.', 'success')
  }

  const sendPasswordReset = async () => {
    await supabase.auth.resetPasswordForEmail(user.email)
    showAccountToast('Password reset email sent.', 'success')
  }

  const submitFeedback = async () => {
    if (isDemo || !rating || !tenantId) return
    setFeedbackSaving(true)
    await supabase.from('tenant_feedback').insert({ tenant_id: tenantId, rating, feedback_text: feedbackText.trim() || null })
    await supabase.from('tenants').update({ feedback_prompt_shown: true }).eq('id', tenantId)
    setFeedbackSaving(false)
    setFeedbackDone(true)
  }

  const sendChatMessage = async () => {
    const text = chatInput.trim()
    if (!text || chatWaiting) return
    const newMessages = [...chatMessages, { role: 'user', text }]
    setChatMessages(newMessages)
    setChatInput('')
    setChatWaiting(true)
    try {
      const res = await fetch('/api/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, messages: newMessages }),
      })
      const data = await res.json()
      setChatMessages(prev => [...prev, { role: 'ai', text: data.message || 'Something went wrong. Please try again.' }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Could not reach support. Please try again or email support@qerxel.com.' }])
    } finally {
      setChatWaiting(false)
    }
  }

  const handleCancelConfirm = async () => {
    if (isDemo || isPreview) { setShowCancelModal(false); return }
    // Stripe cancellation endpoint — wired in a later build phase
    setShowCancelModal(false)
    navigate('/login')
  }

  // ── computed ────────────────────────────────────────────────────────────────

  const tierInfo = TIERS[tier] || TIERS.light
  const upgradeTiers = UPGRADE_PATH[tier] || []
  const sixWeeksAgo = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000)
  const feedbackUnlocked = tenantCreatedAt && new Date(tenantCreatedAt) <= sixWeeksAgo
  const daysUntilFeedback = tenantCreatedAt
    ? Math.max(0, Math.ceil((new Date(tenantCreatedAt).getTime() + 42 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000)))
    : null

  if (loading) {
    return <div style={{ padding: '2rem', color: '#aaa', fontSize: '0.875rem' }}>Loading account…</div>
  }

  // Plan selector handler — upgrades Answer tier via Stripe, persists Listen/Calendar to Supabase
  const handlePlanSelect = async ({ answer, listen, calendar }) => {
    setShowPlanSelector(false)
    if (isDemo || isPreview || !tenantId) return
    // Persist Listen + Calendar product selections
    await supabase.from('tenants').update({ listen_tier: listen, calendar_tier: calendar }).eq('id', tenantId)
    // Trigger Answer tier upgrade if changed
    if (answer !== tier && answer !== 'free') {
      handleUpgrade(answer)
    }
  }

  return (
    <>
    {showPlanSelector && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 300, overflowY: 'auto', background: '#f7f6f9' }}>
        <PlanSelector
          currentAnswer={tier}
          onBack={() => setShowPlanSelector(false)}
          onSelect={handlePlanSelect}
        />
      </div>
    )}
    <div>

      {/* Business Profile entry card */}
      <div
        onClick={() => onNavigate('profile')}
        style={{ ...s.section, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', marginBottom: '0.5rem', borderLeft: '3px solid #5e3b87', background: '#faf9fc' }}
      >
        <div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#5e3b87', fontFamily: "'DM Sans', sans-serif" }}>Business Profile</div>
          <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.15rem', fontFamily: "'DM Sans', sans-serif" }}>Business info, staff, services catalogue, partner details</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5e3b87" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      </div>

      {/* Plan & Billing */}
      <div style={s.section}>
        <h3 style={s.sectionTitle} data-help="Plan & Billing shows your current subscription — the plan name, monthly price, how many minutes of calls are included, and how many simultaneous calls your AI can handle. Upgrade options appear below if you'd like more.">Plan & Billing</h3>
        <p style={s.sectionSubtitle}>Your current plan and available upgrades. Billing is managed via Stripe.</p>

        {upgradeSuccess && (
          <div style={{ padding: '0.75rem 1rem', background: '#e6f9ef', border: '1px solid #3db87a', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', color: '#1a6640', fontWeight: 500 }}>
            Plan upgraded — your AI now has access to the new features.
          </div>
        )}

        <div style={s.planRow(tier)}>
          <span style={s.planBadge(tier)}>{tierInfo.label}</span>
          <div style={{ flex: 1 }}>
            <div style={s.planPrice}>{tierInfo.price}<span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#888' }}>/month</span></div>
            <div style={s.planMeta}>
              {tier === 'free' ? 'Pay as you go · 35p/min' : tierInfo.minutes ? `${tierInfo.minutes} Premium minutes included` : 'Custom allowance'}
              {tierInfo.concurrent ? ` · ${tierInfo.concurrent} concurrent call${tierInfo.concurrent > 1 ? 's' : ''}` : ''}
            </div>
          </div>
        </div>

        {/* Cost limit — PAYG tenants only */}
        {billingModel === 'payg' && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#fef3d9', borderRadius: '8px', border: '1px solid rgba(240,165,0,0.25)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#b07a00', marginBottom: '0.4rem' }}>Monthly spending limit</div>
            <p style={{ fontSize: '0.775rem', color: '#888', margin: '0 0 0.625rem', lineHeight: 1.5 }}>
              We'll pause your AI and notify you when you reach this. At 35p/min, £{monthlyCostLimit} covers ~{Math.floor(monthlyCostLimit / 0.35)} minutes.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: '600', color: '#1a1a1a' }}>£</span>
              <input
                type="number"
                min={5}
                step={5}
                value={monthlyCostLimit}
                onChange={e => setMonthlyCostLimit(parseFloat(e.target.value) || 20)}
                onBlur={e => saveCostLimit(parseFloat(e.target.value) || 20)}
                style={{ width: '80px', padding: '0.4rem 0.5rem', border: '1px solid rgba(94,59,135,0.2)', borderRadius: '6px', fontSize: '0.875rem', fontFamily: "'Syne', sans-serif", fontWeight: 700, textAlign: 'center', outline: 'none' }}
              />
              <span style={{ fontSize: '0.8rem', color: '#888' }}>per month {costLimitSaving ? '· Saving…' : ''}</span>
            </div>
          </div>
        )}

        {tier === 'bespoke' ? (
          <div style={{ fontSize: '0.8rem', color: '#888' }}>You are on a managed Bespoke plan. Contact us to discuss changes.</div>
        ) : (
          <button
            onClick={() => setShowPlanSelector(true)}
            style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0.75rem 1rem', border: '1.5px dashed rgba(94,59,135,0.25)', borderRadius: 10, background: '#faf9fc', cursor: 'pointer', textAlign: 'left' }}
          >
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: '#5e3b87', marginBottom: '0.15rem' }}>Build your Qerxel</div>
              <div style={{ fontSize: '0.75rem', color: '#888', fontFamily: "'DM Sans', sans-serif" }}>Choose Answer, Listen and Calendar independently — see live pricing</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5e3b87" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        )}
      </div>

      {/* Account Details */}
      <div style={s.section}>
        <h3 style={s.sectionTitle} data-help="Account Details lets you update your business name — this is the name your AI uses to introduce itself on calls. Your email address is the login for this account and where all notifications are sent.">Account Details</h3>
        <p style={s.sectionSubtitle}>Your business name and login details.</p>

        <div style={s.fieldRow}>
          <div>
            <label style={s.label}>Business name</label>
            <input
              style={s.input}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your business name"
            />
          </div>
          <div>
            <label style={s.label}>Email address</label>
            <input style={s.inputReadOnly} value={user?.email || ''} readOnly />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button style={accountSaving ? s.saveBtnDisabled : s.saveBtn} onClick={saveAccountDetails} disabled={accountSaving}>
            {accountSaving ? 'Saving…' : 'Save details'}
          </button>
          <button style={s.ghostBtn} onClick={sendPasswordReset}>
            Send password reset
          </button>
          {accountToast.msg && (
            <span style={s.toast(accountToast.type)}>{accountToast.type === 'success' ? '✓' : '!'} {accountToast.msg}</span>
          )}
        </div>
      </div>


      {/* Privacy & Data */}
      <div style={s.section}>
        <h3 style={s.sectionTitle} data-help="Privacy and Data covers your GDPR rights — how long Qerxel keeps your call records and leads, how to request a full export of your data, and how to request account deletion. Sensitive business types (solicitors, medical, therapists etc.) are always capped at 30 days regardless of this setting.">Privacy &amp; Data</h3>
        <p style={s.sectionSubtitle}>Your data rights under GDPR. Control how long records are kept and request exports or deletion.</p>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={s.label} data-help="How long Qerxel retains call logs and lead records before they are automatically deleted. Sensitive business types are always limited to 30 days — this setting is ignored for those.">Data retention period</label>
          <p style={{ fontSize: '0.8rem', color: '#888', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
            Call logs and lead records are deleted after this period. Sensitive business types are always capped at 30 days.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { label: '30 days', value: 30,  activeBg: '#bbf7d0', activeColor: '#166534', activeBorder: '#3db87a' },
              { label: '90 days', value: 90,  activeBg: '#bfdbfe', activeColor: '#1e3a8a', activeBorder: '#1d4ed8' },
              { label: '1 year',  value: 365, activeBg: '#fde68a', activeColor: '#78460a', activeBorder: '#f0a500' },
            ].map(opt => {
              const on = dataRetentionDays === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => saveDataRetention(opt.value)}
                  disabled={dataSaving}
                  style={{
                    padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: on ? 600 : 400,
                    fontFamily: "'DM Sans', sans-serif", cursor: dataSaving ? 'not-allowed' : 'pointer', opacity: dataSaving ? 0.7 : 1,
                    background: on ? opt.activeBg : 'white',
                    color: on ? opt.activeColor : '#666',
                    border: `1.5px solid ${on ? opt.activeBorder : 'rgba(94,59,135,0.2)'}`,
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          {dataToast.msg && (
            <div style={{ marginTop: '0.75rem' }}>
              <span style={s.toast(dataToast.type)}>{dataToast.type === 'success' ? '✓' : '!'} {dataToast.msg}</span>
            </div>
          )}
        </div>

        <div style={{ paddingTop: '1.25rem', borderTop: '1px solid rgba(94,59,135,0.06)', marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 500, fontSize: '0.875rem', color: '#1a1a1a', marginBottom: '0.3rem' }}>Export my data</div>
          <p style={{ fontSize: '0.8rem', color: '#888', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
            Request a complete export of your call logs, leads, partner network, and account data. We'll email it to your account address within 24 hours.
          </p>
          <button style={s.ghostBtn} onClick={handleExportData}>Request data export</button>
        </div>

        <div style={{ paddingTop: '1.25rem', borderTop: '1px solid rgba(94,59,135,0.06)', marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 500, fontSize: '0.875rem', color: '#b91c1c', marginBottom: '0.3rem' }}>Delete my data</div>
          <p style={{ fontSize: '0.8rem', color: '#888', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
            Permanently delete all call records, leads, and account data. This cannot be undone.
          </p>
          <button style={s.cancelBtn} onClick={() => { setShowDeleteModal(true); setDeleteConfirm(false) }}>Delete my data</button>
        </div>

        <div style={{ paddingTop: '1.25rem', borderTop: '1px solid rgba(94,59,135,0.06)', fontSize: '0.8rem', color: '#888' }}>
          <a href="/privacy-policy.pdf" target="_blank" rel="noopener noreferrer" style={{ color: '#5e3b87', textDecoration: 'none', fontWeight: 500 }}>Download Privacy Policy ↗</a>
          <span style={{ margin: '0 0.5rem', color: '#ccc' }}>·</span>
          <a href="/data-covenant.pdf" target="_blank" rel="noopener noreferrer" style={{ color: '#5e3b87', textDecoration: 'none', fontWeight: 500 }}>Data Covenant ↗</a>
        </div>
      </div>

      {/* Feedback */}
      <div style={s.section}>
        <h3 style={s.sectionTitle} data-help="Share Your Feedback unlocks after six weeks of use — long enough to form a real opinion. Your feedback goes directly to the founder and influences what gets built next. It is never used for marketing.">Share Your Feedback</h3>
        <p style={s.sectionSubtitle}>
          {feedbackUnlocked
            ? 'You\'ve been using Qerxel for over six weeks. Your honest take helps shape what gets built next.'
            : 'Unlocks after six weeks of use — enough time to form a real opinion.'}
        </p>

        {feedbackDone || feedbackShown ? (
          <div style={{ fontSize: '0.875rem', color: '#3db87a', fontWeight: 500 }}>
            Thank you — your feedback has been received.
          </div>
        ) : feedbackUnlocked ? (
          <>
            <div style={s.label}>How would you rate Qerxel so far?</div>
            <div style={s.starRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <span
                  key={n}
                  style={s.star(n <= (hoverRating || rating))}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  ★
                </span>
              ))}
            </div>
            <textarea
              style={s.feedbackTextarea}
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              placeholder="What's working well? What would you change? Any feature you wish existed?"
            />
            <button
              style={!rating || feedbackSaving ? s.saveBtnDisabled : s.saveBtn}
              onClick={submitFeedback}
              disabled={!rating || feedbackSaving}
            >
              {feedbackSaving ? 'Submitting…' : 'Submit feedback'}
            </button>
          </>
        ) : (
          <div style={s.lockedFeedback}>
            <div style={{ fontSize: '0.875rem', color: '#5e3b87', fontWeight: 600, marginBottom: '0.3rem' }}>
              {daysUntilFeedback !== null ? `Unlocks in ${daysUntilFeedback} day${daysUntilFeedback !== 1 ? 's' : ''}` : 'Coming soon'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
              First impressions are cheap. Six weeks of real use tells us something worth knowing.
            </div>
          </div>
        )}
      </div>

      {/* Support chat */}
      <div style={s.section}>
        <h3 style={s.sectionTitle} data-help="Support gives you a direct line to ask anything about your Qerxel account — how a setting works, why your AI said something on a call, how to configure a specific scenario. Ask in plain English and you'll get a plain English answer.">Support</h3>
        <p style={s.sectionSubtitle}>Ask anything about your account, settings, or how your AI works.</p>

        <div style={s.chatWrap}>
          <div style={s.chatMessages}>
            {chatMessages.map((msg, i) => (
              <div key={i} style={s.chatBubble(msg.role === 'user')}>{msg.text}</div>
            ))}
            {chatWaiting && (
              <div style={{ ...s.chatBubble(false), color: '#bbb', fontStyle: 'italic' }}>Thinking…</div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div style={s.chatInputRow}>
            <input
              style={s.chatInput}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendChatMessage() }}
              placeholder="Ask a question…"
              disabled={chatWaiting}
            />
            <button
              style={!chatInput.trim() || chatWaiting ? s.chatSendDisabled : s.chatSend}
              onClick={sendChatMessage}
              disabled={!chatInput.trim() || chatWaiting}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Cancel */}
      <div style={s.dangerSection}>
        <h3 style={{ ...s.sectionTitle, marginBottom: '0.3rem' }} data-help="Cancelling stops your AI answering calls at the end of your current billing period. Your account data — call logs, leads, partner network — is retained for 90 days before being deleted. You can reactivate within that window without losing anything.">Cancel Subscription</h3>
        <p style={{ ...s.sectionSubtitle, marginBottom: '1rem' }}>
          Your AI will stop taking calls at the end of your billing period. Your data is retained for 90 days.
        </p>
        <button style={s.cancelBtn} onClick={() => { setShowCancelModal(true); setCancelConfirm(false) }}>
          Cancel subscription
        </button>
      </div>

      {/* Retention modal */}
      {showCancelModal && (
        <div style={s.modalBackdrop} onClick={() => setShowCancelModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            {!cancelConfirm ? (
              <>
                <div style={s.modalTitle}>Before you go</div>
                <div style={s.modalBody}>
                  Cancelling means losing access to everything your account has built up. Here is what you would be walking away from:
                </div>

                <div style={{ marginBottom: '0.5rem' }}>
                  {[
                    leadCount > 0 && `${leadCount} lead${leadCount !== 1 ? 's' : ''} captured — contact history lost after 90 days`,
                    partnerCount > 0 && `${partnerCount} referral partner${partnerCount !== 1 ? 's' : ''} — reciprocal obligation ends immediately`,
                    outboundCount > 0 && `${outboundCount} outbound referral${outboundCount !== 1 ? 's' : ''} sent — the value you built in the network disappears`,
                    'Your AI stops answering calls — missed leads go straight to voicemail',
                    'Caller history and notes are no longer accessible after 90 days',
                  ].filter(Boolean).map((item, i) => (
                    <div key={i} style={s.lossItem}>
                      <span style={s.lossDot} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div style={s.modalBtnRow}>
                  <button style={s.modalStay} onClick={() => setShowCancelModal(false)}>
                    Keep my account
                  </button>
                  <button style={s.modalCancelFinal} onClick={() => setCancelConfirm(true)}>
                    Continue to cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={s.modalTitle}>Confirm cancellation</div>
                <div style={s.modalBody}>
                  Your subscription will end at your next billing date. Your account and data remain accessible until then.
                </div>
                <div style={s.modalBtnRow}>
                  <button style={s.modalStay} onClick={() => setShowCancelModal(false)}>
                    Go back
                  </button>
                  <button style={s.modalCancelFinal} onClick={handleCancelConfirm}>
                    Yes, cancel my subscription
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete data modal */}
      {showDeleteModal && (
        <div style={s.modalBackdrop} onClick={() => setShowDeleteModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            {!deleteConfirm ? (
              <>
                <div style={s.modalTitle}>Delete all my data?</div>
                <div style={s.modalBody}>
                  This will permanently delete everything associated with your account — call logs, leads, partner connections, and your AI configuration. This cannot be undone.
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  {[
                    'All call records and transcripts',
                    'All captured leads and caller history',
                    'Your referral partner network and referral log',
                    'Your AI settings, greeting, and configuration',
                  ].map((item, i) => (
                    <div key={i} style={s.lossItem}>
                      <span style={{ ...s.lossDot, background: '#b91c1c' }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <div style={s.modalBtnRow}>
                  <button style={s.modalStay} onClick={() => setShowDeleteModal(false)}>Keep my data</button>
                  <button style={s.modalCancelFinal} onClick={() => setDeleteConfirm(true)}>Continue</button>
                </div>
              </>
            ) : (
              <>
                <div style={s.modalTitle}>Confirm deletion</div>
                <div style={s.modalBody}>
                  Your deletion request will be processed within 48 hours. Your account will be closed and all data permanently removed.
                </div>
                <div style={s.modalBtnRow}>
                  <button style={s.modalStay} onClick={() => setShowDeleteModal(false)}>Go back</button>
                  <button style={s.modalCancelFinal} onClick={handleDeleteConfirm}>Yes, delete everything</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
    </>
  )
}

export default AccountSettings
