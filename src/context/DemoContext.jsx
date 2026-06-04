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

  useEffect(() => {
    if (!businessId) return
    const load = async () => {
      setLoading(true)
      try {
        const [bizRes, callRes, leadRes, refRes, svcRes, staffRes, partnerRes] = await Promise.all([
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
        ])

        setBusiness(bizRes.data)

        // Shape calls for ActivityDashboard: expects callers join { full_name, phone_number }
        setCalls((callRes.data || []).map(c => ({
          ...c,
          callers: { full_name: c.caller_name, phone_number: c.caller_number },
        })))

        // Shape leads for ActivityDashboard: expects lead_contact_name + callers join
        setLeads((leadRes.data || []).map(l => ({
          ...l,
          lead_contact_name: l.caller_name,
          callers: { phone_number: l.caller_number },
        })))

        // Shape referrals for ActivityDashboard: expects referral_partners join { business_name }
        setReferrals((refRes.data || []).map(r => ({
          ...r,
          referral_partners: { business_name: r.partner_name },
        })))

        setServices(svcRes.data || [])
        setStaff(staffRes.data || [])
        setPartners(partnerRes.data || [])
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
    // DataAnalytics expects `duration` not `duration_seconds`
    analyticsCallData: calls.map(c => ({ ...c, duration: c.duration_seconds })),
    includedMinutes: business?.included_minutes || 150,
  }

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}
