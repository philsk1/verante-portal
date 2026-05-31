import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kkrsvkxkefijmtbwykzv.supabase.co'
const supabaseAnonKey = 'sb_publishable_6BWDEMzvXljW7y0NUopj1A_MiV2aIbX'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)