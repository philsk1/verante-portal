import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Full-text search across all KB chunks. Returns up to matchCount results.
// Returns [] on error so callers never need to guard.
export async function ragSearch(query, matchCount = 4) {
  if (!query || query.trim().length < 4) return []
  try {
    const { data, error } = await supabase.rpc('match_kb_chunks', {
      query: query.trim().slice(0, 500),
      match_count: matchCount,
    })
    if (error) { console.error('[kb] ragSearch:', error.message); return [] }
    return data || []
  } catch (e) {
    console.error('[kb] ragSearch exception:', e.message)
    return []
  }
}

// Format RAG results for injection into a system prompt.
// Returns empty string if no results.
export function formatChunks(chunks) {
  if (!chunks || chunks.length === 0) return ''
  const sections = chunks.map(c => {
    const source = c.file.replace('KB-', '').replace('.md', '').toLowerCase()
    return `[${source} — ${c.section}]\n${c.content}`
  })
  return `\n=== RELEVANT DOCUMENTATION ===\n${sections.join('\n\n')}\n===\n`
}
