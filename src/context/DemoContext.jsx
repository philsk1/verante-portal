import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabase'

const DemoContext = createContext(null)
export const useDemo = () => useContext(DemoContext)

export const DemoProvider = ({ businessId, tier: selectedTier, children }) => {
  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState(null)
  const [calendarTierOverride, setCalendarTierOverride] = useState(null)
  const [calls, setCalls] = useState([])
  const [leads, setLeads] = useState([])
  const [referrals, setReferrals] = useState([])
  const [services, setServices] = useState([])
  const [staff, setStaff] = useState([])
  const [partners, setPartners] = useState([])
  const [appointments, setAppointments] = useState([])

  useEffect(() => {
    if (!businessId) return
    const load = async () => {
      setLoading(true)
      try {
        const [bizRes, callRes, leadRes, refRes, svcRes, staffRes, partnerRes, apptRes] = await Promise.all([
          supabase.from('tenants').select('*').eq('id', businessId).maybeSingle(),
          supabase.from('call_logs').select('*, callers(full_name, phone_number)')
            .eq('tenant_id', businessId).order('created_at', { ascending: false }).limit(500),
          supabase.from('leads').select('*')
            .eq('tenant_id', businessId).order('created_at', { ascending: false }).limit(100),
          supabase.from('referral_log').select('*, referral_partners(partner_name)')
            .eq('tenant_id', businessId).order('created_at', { ascending: false }).limit(100),
          supabase.from('catalogue_items').select('*').eq('tenant_id', businessId),
          supabase.from('staff_profiles').select('*').eq('tenant_id', businessId),
          supabase.from('referral_partners').select('*').eq('tenant_id', businessId),
          supabase.from('appointments').select('*')
            .eq('tenant_id', businessId).order('start_time', { ascending: true }),
        ])

        setBusiness(bizRes.data)

        // Normalize timestamps so demo always feels live — shift most recent call to ~30 mins ago
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

        // Shape calls — callers join provides full_name; fall back to phone
        setCalls(rawCalls.map(c => ({
          ...c,
          created_at: shiftIso(c.created_at),
          callers: c.callers
            ? c.callers
            : { full_name: null, phone_number: c.caller_phone },
        })))

        // Shape leads — real table has caller_name + caller_phone directly
        setLeads(rawLeads.map(l => ({
          ...l,
          created_at: shiftIso(l.created_at),
          lead_contact_name: l.caller_name,
          callers: { phone_number: l.caller_phone },
          ai_summary: l.ai_summary || [l.enquiry_type?.replace(/_/g, ' '), l.notes].filter(Boolean).join(' — ') || null,
        })))

        // Shape referrals — join provides referral_partners.partner_name
        setReferrals(rawRefs.map(r => ({
          ...r,
          created_at: shiftIso(r.created_at),
          referral_partners: {
            business_name: r.referral_partners?.partner_name || r.service_keyword || 'Partner',
          },
        })))

        // catalogue_items uses `name` — keep both for backward compat
        setServices((svcRes.data || []).map(s => ({ ...s, service_name: s.name })))
        setStaff((staffRes.data || []).map(s => ({ ...s, direct_line_did: s.direct_line_did || '' })))
        setPartners(partnerRes.data || [])

        // Normalize appointments to current week so Calendar looks live
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

  const tier = selectedTier || business?.subscription_tier || 'standard'
  const calendarTier = calendarTierOverride ?? business?.calendar_tier ?? 'entry'

  const value = {
    isDemo: true,
    loading,
    business,
    tier,
    calendarTier,
    setCalendarTierOverride,
    calls,
    leads,
    referrals,
    services,
    staff,
    partners,
    appointments,
    pricingIntelligence: [],
    competitorIntelligence: [],
    analyticsCallData: calls.map(c => ({ ...c, duration: c.duration_seconds })),
    includedMinutes: business?.included_minutes || 250,
  }

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}
