import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePreview } from '../context/PreviewContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const OWNER_EMAIL = 'finsolsoffice@gmail.com'

const TENANT_SELECT = [
  'business_name', 'holiday_mode', 'holiday_return_date',
  'notify_new_lead', 'notify_daily_summary', 'notify_weekly_report',
  'subscription_tier', 'urgent_outcomes', 'listen_tier', 'calendar_tier',
  'booking_link', 'opening_hours', 'callback_preference_note',
  'emergency_keywords', 'business_outcome_type', 'sentry_camera_limit',
].join(', ')

export function useTenantState() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const preview = usePreview()

  const [checking, setChecking]               = useState(true)
  const [businessName, setBusinessName]       = useState('')
  const [tenantId, setTenantId]               = useState(null)
  const [holidayMode, setHolidayMode]         = useState(false)
  const [holidayReturnDate, setHolidayReturnDate] = useState('')
  const [notifyNewLead, setNotifyNewLead]         = useState(true)
  const [notifyDailySummary, setNotifyDailySummary] = useState(false)
  const [notifyWeeklyReport, setNotifyWeeklyReport] = useState(true)
  const [baseTier, setBaseTier]               = useState('light')
  const [urgentOutcomes, setUrgentOutcomes]   = useState(['escalated'])
  const [uncontactedCount, setUncontactedCount] = useState(0)
  const [listenTier, setListenTier]           = useState('none')
  const [calendarTier, setCalendarTier]       = useState('entry')
  const [hasAnswerProduct, setHasAnswerProduct] = useState(true)
  const [sentryCameraLimit, setSentryCameraLimit] = useState(0)
  const [gapData, setGapData]                 = useState(null)

  // ── Initial load ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return
    const init = async () => {
      const { data: membership } = await supabase
        .from('tenant_memberships').select('tenant_id').eq('user_id', user.id).maybeSingle()
      if (!membership) { navigate('/onboarding', { replace: true }); return }
      setTenantId(membership.tenant_id)

      const { data: tenant } = await supabase
        .from('tenants').select(TENANT_SELECT).eq('id', membership.tenant_id).maybeSingle()

      if (tenant) {
        setBusinessName(tenant.business_name || '')
        setHolidayMode(tenant.holiday_mode || false)
        setHolidayReturnDate(tenant.holiday_return_date || '')
        setNotifyNewLead(tenant.notify_new_lead !== false)
        setNotifyDailySummary(tenant.notify_daily_summary !== false)
        setNotifyWeeklyReport(tenant.notify_weekly_report !== false)
        setBaseTier(tenant.subscription_tier || 'light')
        setHasAnswerProduct(!!tenant.subscription_tier)
        setUrgentOutcomes(
          Array.isArray(tenant.urgent_outcomes) && tenant.urgent_outcomes.length > 0
            ? tenant.urgent_outcomes : ['escalated']
        )
        setListenTier(tenant.listen_tier || 'none')
        setCalendarTier(tenant.calendar_tier || 'entry')
        setSentryCameraLimit(tenant.sentry_camera_limit || 0)
      }

      const [{ count: leadCount }, { count: catCount }] = await Promise.all([
        supabase.from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', membership.tenant_id)
          .or('status.is.null,status.eq.new'),
        supabase.from('catalogue_items')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', membership.tenant_id)
          .eq('active', true),
      ])
      setUncontactedCount(leadCount || 0)

      if (tenant) {
        setGapData({
          bookingLink:       tenant.booking_link || null,
          openingHours:      tenant.opening_hours || null,
          callbackNote:      tenant.callback_preference_note || null,
          emergencyKeywords: Array.isArray(tenant.emergency_keywords) ? tenant.emergency_keywords : [],
          outcomeType:       tenant.business_outcome_type || null,
          catalogueCount:    catCount || 0,
        })
      }

      if (user.email === OWNER_EMAIL) {
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
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reload sidebar tiers when preview tenant changes ────────────────────────

  useEffect(() => {
    if (!preview.isPreview || !preview.previewTenantId) return
    supabase.from('tenants')
      .select('listen_tier, calendar_tier, subscription_tier, sentry_camera_limit')
      .eq('id', preview.previewTenantId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setListenTier(data.listen_tier || 'none')
        setCalendarTier(data.calendar_tier || 'entry')
        setBaseTier(data.subscription_tier || 'light')
        setHasAnswerProduct(!!data.subscription_tier)
        setSentryCameraLimit(data.sentry_camera_limit || 0)
      })
  }, [preview.previewTenantId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── DB write helpers — guarded: no-op in owner preview mode ────────────────

  const saveReturnDate = async (val) => {
    setHolidayReturnDate(val)
    if (!tenantId || preview.isPreview) return
    await supabase.from('tenants').update({ holiday_return_date: val || null }).eq('id', tenantId)
  }

  const saveNotification = async (field, val) => {
    if (!tenantId || preview.isPreview) return
    await supabase.from('tenants').update({ [field]: val }).eq('id', tenantId)
  }

  return {
    checking,
    businessName,
    tenantId,
    holidayMode,
    holidayReturnDate,
    notifyNewLead,    setNotifyNewLead,
    notifyDailySummary, setNotifyDailySummary,
    notifyWeeklyReport, setNotifyWeeklyReport,
    baseTier,
    urgentOutcomes,
    uncontactedCount,
    listenTier,       setListenTier,
    calendarTier,
    hasAnswerProduct,
    sentryCameraLimit,
    gapData,
    saveReturnDate,
    saveNotification,
  }
}
