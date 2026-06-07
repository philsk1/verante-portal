import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabase'

const DemoContext = createContext(null)
export const useDemo = () => useContext(DemoContext)

export const DemoProvider = ({ businessId, tier: selectedTier, children }) => {
  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState(null)
  const [calls, setCalls] = useState([])
  const [leads, setLeads] = useState([])
  const [referrals, setReferrals] = useState([])
  const [services, setServices] = useState([])
  const [staff, setStaff] = useState([])
  const [partners, setPartners] = useState([])
  const [appointments, setAppointments] = useState([])
  const [pricingIntelligence, setPricingIntelligence] = useState([])
  const [competitorIntelligence, setCompetitorIntelligence] = useState([])

  useEffect(() => {
    if (!businessId) return
    const load = async () => {
      setLoading(true)
      try {
        const [bizRes, callRes, leadRes, refRes, svcRes, staffRes, partnerRes, apptRes, pricingRes, competitorRes] = await Promise.all([
          supabase.from('demo_businesses').select('*').eq('id', businessId).maybeSingle(),
          supabase.from('demo_call_logs').select('*').eq('business_id', businessId)
            .order('created_at', { ascending: false }).limit(500),
          supabase.from('demo_leads').select('*').eq('business_id', businessId)
            .order('created_at', { ascending: false }).limit(100),
          supabase.from('demo_referral_log').select('*').eq('business_id', businessId)
            .order('created_at', { ascending: false }).limit(100),
          supabase.from('demo_services').select('*').eq('business_id', businessId),
          supabase.from('demo_staff').select('*').eq('business_id', businessId),
          supabase.from('demo_partners').select('*').eq('business_id', businessId),
          supabase.from('demo_appointments').select('*').eq('business_id', businessId)
            .order('start_time', { ascending: true }),
          supabase.from('demo_pricing_intelligence').select('*').eq('business_id', businessId),
          supabase.from('demo_competitor_intelligence').select('*').eq('business_id', businessId)
            .order('mention_count', { ascending: false }),
        ])

        setBusiness(bizRes.data)

        // Normalize timestamps so demo always feels live — find most recent call and
        // shift everything so that call appears ~30 minutes ago in the browser.
        const rawCalls = callRes.data || []
        const rawLeads = leadRes.data || []
        const rawRefs  = refRes.data  || []

        let shiftMs = 0
        if (rawCalls.length > 0) {
          const latestMs = Math.max(...rawCalls.map(c => new Date(c.created_at).getTime()))
          const targetMs = Date.now() - 30 * 60 * 1000
          if (latestMs < targetMs) shiftMs = targetMs - latestMs
        }
        const shiftIso = (iso) =>
          shiftMs > 0 ? new Date(new Date(iso).getTime() + shiftMs).toISOString() : iso

        // Shape calls for ActivityDashboard: expects callers join { full_name, phone_number }
        setCalls(rawCalls.map(c => ({
          ...c,
          created_at: shiftIso(c.created_at),
          callers: { full_name: c.caller_name, phone_number: c.caller_number },
        })))

        // Shape leads for ActivityDashboard: expects lead_contact_name + callers join
        setLeads(rawLeads.map(l => ({
          ...l,
          created_at: shiftIso(l.created_at),
          lead_contact_name: l.caller_name,
          callers: { phone_number: l.caller_number },
        })))

        // Shape referrals for ActivityDashboard: expects referral_partners join { business_name }
        setReferrals(rawRefs.map(r => ({
          ...r,
          created_at: shiftIso(r.created_at),
          referral_partners: { business_name: r.partner_name },
        })))

        setServices(svcRes.data || [])
        setStaff(staffRes.data || [])
        setPartners(partnerRes.data || [])
        setPricingIntelligence(pricingRes.data || [])
        setCompetitorIntelligence(competitorRes.data || [])

        // Normalize appointments to the current week (Mon–Fri) so Calendar always looks live
        const rawAppts = apptRes.data || []
        if (rawAppts.length > 0) {
          const getMonday = (ms) => {
            const d = new Date(ms)
            const day = d.getDay()
            d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
            d.setHours(0, 0, 0, 0)
            return d.getTime()
          }
          const seedWeekStart = getMonday(new Date(rawAppts[0].start_time).getTime())
          const nowWeekStart  = getMonday(Date.now())
          const weekShiftMs   = nowWeekStart - seedWeekStart
          setAppointments(rawAppts.map(a => ({
            ...a,
            staff_profile_id: a.staff_id,
            start_time: weekShiftMs !== 0
              ? new Date(new Date(a.start_time).getTime() + weekShiftMs).toISOString()
              : a.start_time,
            end_time: weekShiftMs !== 0
              ? new Date(new Date(a.end_time).getTime() + weekShiftMs).toISOString()
              : a.end_time,
          })))
        } else {
          setAppointments([])
        }
      } catch (err) {
        console.error('DemoContext load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [businessId])

  const tier = selectedTier || business?.tier || 'standard'

  const value = {
    isDemo: true,
    loading,
    business,
    tier,
    calls,
    leads,
    referrals,
    services,
    staff,
    partners,
    appointments,
    pricingIntelligence,
    competitorIntelligence,
    // DataAnalytics expects `duration` not `duration_seconds`
    analyticsCallData: calls.map(c => ({ ...c, duration: c.duration_seconds })),
    includedMinutes: business?.included_minutes || 250,
  }

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}
