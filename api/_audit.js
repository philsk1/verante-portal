import { createClient } from '@supabase/supabase-js'
import { ragSearch } from './_kb.js'

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const BRIEF_VERSION = '1.0'

// Rank threshold — above this the interaction is considered mapped to a known twig
const MATCH_THRESHOLD = 0.15

// 1-in-20 matched interactions are stored as compliance samples for the auditor
const SAMPLE_RATE = 0.05

// Count, don't store.
// Matched interactions increment the twig's weight. Only the unknown is stored.
export function logChatTurn({ handler, tenantId, tenantTier, zoneName, userMessage, qResponse }) {
  if (!userMessage) return
  _log({ handler, tenantId, tenantTier, zoneName, userMessage, qResponse }).catch(e => {
    console.error('[audit] logChatTurn:', e.message)
  })
}

async function _log({ handler, tenantId, tenantTier, zoneName, userMessage, qResponse }) {
  const query  = `${zoneName || ''} ${userMessage}`.trim()
  const chunks = await ragSearch(query, 2)
  const top    = chunks[0]
  const matched = top && top.rank >= MATCH_THRESHOLD

  if (matched) {
    // Find the twig in meaning_map
    const { data: twig } = await supabase
      .from('meaning_map')
      .select('id')
      .eq('kb_chunk_file', top.file)
      .eq('kb_chunk_section', top.section)
      .eq('level', 'twig')
      .eq('status', 'active')
      .maybeSingle()

    if (twig) {
      // Atomic increment — this is the data
      await supabase.rpc('increment_meaning_count', { p_twig_id: twig.id })
    } else {
      // KB matched but no twig mapped yet — store so Philip can extend the map
      supabase.from('q_chat_logs').insert({
        handler,
        tenant_id:    tenantId   || null,
        tenant_tier:  tenantTier || null,
        zone_name:    zoneName   || null,
        user_message: userMessage.slice(0, 5000),
        q_response:   qResponse  ? qResponse.slice(0, 10000) : null,
        brief_version: BRIEF_VERSION,
        meaning_id:    null,
      }).then(({ error }) => { if (error) console.error('[audit] unmapped-twig insert:', error.message) })
    }

    // Compliance sample: 1-in-20 stored in full for auditor review
    if (Math.random() < SAMPLE_RATE) {
      supabase.from('q_audit_samples').insert({
        handler,
        tenant_id:    tenantId   || null,
        tenant_tier:  tenantTier || null,
        zone_name:    zoneName   || null,
        user_message: userMessage.slice(0, 5000),
        q_response:   qResponse  ? qResponse.slice(0, 10000) : null,
        brief_version: BRIEF_VERSION,
        meaning_id:    twig?.id  || null,
      }).then(({ error }) => { if (error) console.error('[audit] sample insert:', error.message) })
    }
  } else {
    // Unknown — store full content so Philip can review and grow the map
    supabase.from('q_chat_logs').insert({
      handler,
      tenant_id:    tenantId   || null,
      tenant_tier:  tenantTier || null,
      zone_name:    zoneName   || null,
      user_message: userMessage.slice(0, 5000),
      q_response:   qResponse  ? qResponse.slice(0, 10000) : null,
      brief_version: BRIEF_VERSION,
      meaning_id:    null,
    }).then(({ error }) => { if (error) console.error('[audit] unmatched insert:', error.message) })
  }
}
