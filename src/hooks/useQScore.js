import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export function useQScore(tenantId) {
  const [qScore, setQScore]   = useState(null)
  const [qMood, setQMood]     = useState('smile')
  const [qPillars, setQPillars] = useState(null)

  useEffect(() => {
    if (!tenantId) return
    let cancelled = false

    const compute = async () => {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [tenantRes, catalogueRes, callsRes, leadsRes] = await Promise.all([
        supabase.from('tenants')
          .select('greeting_message, booking_link, sms_followup_enabled')
          .eq('id', tenantId)
          .maybeSingle(),
        supabase.from('catalogue_items')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId),
        supabase.from('call_logs')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .gte('created_at', monthStart),
        supabase.from('leads')
          .select('status')
          .eq('tenant_id', tenantId),
      ])

      if (cancelled) return

      const tenant        = tenantRes.data || {}
      const catalogueCount = catalogueRes.count || 0
      const callsThisMonth = callsRes.count || 0
      const leads          = leadsRes.data || []

      // Setup (max 40)
      let setup = 5 // baseline: they exist
      if (tenant.greeting_message?.trim()) setup += 15
      if (catalogueCount > 0) setup += 10
      if (tenant.booking_link?.trim() || tenant.sms_followup_enabled) setup += 10

      // Activity (max 35)
      let activity = 0
      if (callsThisMonth >= 50)      activity = 35
      else if (callsThisMonth >= 20) activity = 20
      else if (callsThisMonth >= 5)  activity = 10
      else if (callsThisMonth >= 1)  activity = 2

      // Follow-up (max 25)
      let followup = 0
      const totalLeads = leads.length
      if (totalLeads > 0) {
        followup = 5
        const worked = leads.filter(l => l.status && l.status !== 'new').length
        const rate   = worked / totalLeads
        if (rate >= 0.8)      followup = 25
        else if (rate >= 0.5) followup = 15
      }

      const total = setup + activity + followup
      const mood  = total >= 75 ? 'smile' : total >= 50 ? 'content' : total >= 25 ? 'sad' : 'crying'

      setQScore(total)
      setQMood(mood)
      setQPillars({
        setup:    { score: setup,    max: 40, label: 'Setup' },
        activity: { score: activity, max: 35, label: 'Activity' },
        followup: { score: followup, max: 25, label: 'Follow-up' },
      })
    }

    compute()
    return () => { cancelled = true }
  }, [tenantId])

  return { qScore, qMood, qPillars }
}
