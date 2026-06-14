import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from './AuthContext'
import { usePreview } from './PreviewContext'
import {
  configScore, toolScore, performanceScore, qMoodFromScore, qCaption,
  buildAnswerIssues, answerChannelHealth, scheduleChannelHealth, sentryChannelHealth,
} from '../utils/qScore.js'

const QScoreContext = createContext(null)
export const useQScore = () => useContext(QScoreContext) || {}

const SEV = { high: 0, medium: 1, low: 2 }

function buildCoachingPoints(tenant, ps, catalogueCount = 0) {
  return buildAnswerIssues(tenant, { catalogueCount, ps })
    .sort((a, b) => SEV[a.severity] - SEV[b.severity])
    .slice(0, 5)
}

export const QScoreProvider = ({ children }) => {
  const { user } = useAuth()
  const preview  = usePreview()

  const [globalScore,    setGlobalScore]    = useState(null)
  const [globalMood,     setGlobalMood]     = useState('smile')
  const [globalCaption,  setGlobalCaption]  = useState(null)
  const [qMode,          setQMode]          = useState('jump_in')
  const [configPillar,   setConfigPillar]   = useState(null)
  const [toolPillar,     setToolPillar]     = useState(null)
  const [perfPillar,     setPerfPillar]     = useState(null)
  const [coachingPoints, setCoachingPoints] = useState([])
  const [qDismissals,    setQDismissals]    = useState({})
  const [channelHealth,  setChannelHealth]  = useState([])
  const tenantIdRef = useRef(null)

  const tenantId = preview?.isPreview ? preview.previewTenantId : null

  const compute = useCallback(async () => {
    let tid = tenantId
    if (!tid && user) {
      const { data: m } = await supabase
        .from('tenant_memberships')
        .select('tenant_id')
        .eq('user_id', user.id)
        .maybeSingle()
      tid = m?.tenant_id
    }
    if (!tid) return
    tenantIdRef.current = tid

    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()

    const [tenantRes, callRes, recentCallRes, staffRes, availRes, zonesRes, catRes] = await Promise.all([
      supabase.from('tenants')
        .select('greeting_message, additional_instructions, business_name, lead_contact_name, callback_preference_note, emergency_keywords, booking_link, opening_hours, sms_followup_enabled, provisional_booking_enabled, keep_alive_topics, calendar_tier, listen_tier, sentry_camera_limit, blocked_phone_numbers, q_mode, q_dismissals')
        .eq('id', tid).maybeSingle(),
      supabase.from('call_logs').select('call_outcome').eq('tenant_id', tid),
      supabase.from('call_logs').select('call_outcome').eq('tenant_id', tid).gte('created_at', tenDaysAgo),
      supabase.from('staff_profiles').select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
      supabase.from('staff_availability').select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
      supabase.from('sentry_zones').select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
      supabase.from('catalogue_items').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).eq('active', true),
    ])

    const tenant = tenantRes.data
    if (!tenant) return

    const mode = tenant.q_mode || 'jump_in'
    setQMode(mode)
    setQDismissals(tenant.q_dismissals || {})

    // ── Legacy pillar scores (still used by HelpMascot) ──────────────────────
    const cs = configScore(tenant)
    const ts = toolScore(tenant)
    const outcomeCounts = (callRes.data || []).reduce((a, c) => {
      a[c.call_outcome] = (a[c.call_outcome] || 0) + 1
      return a
    }, {})
    const recentOutcomeCounts = (recentCallRes.data || []).reduce((a, c) => {
      a[c.call_outcome] = (a[c.call_outcome] || 0) + 1
      return a
    }, {})
    const psAll    = performanceScore(outcomeCounts)
    const psRecent = performanceScore(recentOutcomeCounts)
    const ps = (psAll !== null && psRecent !== null)
      ? Math.round((psAll + psRecent) / 2)
      : (psRecent ?? psAll)

    const catalogueCount = catRes.count ?? 0

    setConfigPillar(cs)
    setToolPillar(ts)
    setPerfPillar(ps)
    setCoachingPoints(buildCoachingPoints(tenant, ps, catalogueCount))

    // ── Per-channel health ────────────────────────────────────────────────────
    const hasSchedule = tenant.calendar_tier && tenant.calendar_tier !== 'none'
    const hasSentry   = (tenant.sentry_camera_limit ?? 0) > 0

    const channels = []

    channels.push(answerChannelHealth(tenant, ps, catalogueCount))

    if (hasSchedule) {
      channels.push(scheduleChannelHealth({
        staffCount:        staffRes.count ?? 0,
        availabilityCount: availRes.count ?? 0,
        catalogueCount,
      }))
    }

    if (hasSentry) {
      channels.push(sentryChannelHealth({ zonesCount: zonesRes.count ?? 0 }))
    }

    setChannelHealth(channels)

    // Global score = average of owned channel scores
    const avg = Math.round(channels.reduce((s, c) => s + c.score, 0) / channels.length)
    setGlobalScore(avg)
    setGlobalMood(qMoodFromScore(avg))
    setGlobalCaption(qCaption(avg, mode))
  }, [user, tenantId])

  const saveDismissal = useCallback(async (pageKey) => {
    const tid = tenantIdRef.current
    if (!tid || !pageKey) return
    const now = new Date().toISOString()
    const updated = { ...qDismissals, [pageKey]: now }
    setQDismissals(updated)
    await supabase.from('tenants').update({ q_dismissals: updated }).eq('id', tid)
  }, [qDismissals])

  useEffect(() => { compute() }, [compute])

  return (
    <QScoreContext.Provider value={{ globalScore, globalMood, globalCaption, qMode, configPillar, toolPillar, perfPillar, coachingPoints, qDismissals, saveDismissal, channelHealth, refresh: compute }}>
      {children}
    </QScoreContext.Provider>
  )
}
