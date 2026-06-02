import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kkrsvkxkefijmtbwykzv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrcnN2a3hrZWZpam10Ynd5a3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMTMyNTcsImV4cCI6MjA5NTY4OTI1N30.NbWanJ9UsUKJgDudleI492P4Z0-jL-SKNSqUr4uREeQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})