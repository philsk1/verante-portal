-- Run once in Supabase SQL Editor
-- Lets demo-init look up a demo user ID by email without calling listUsers
CREATE OR REPLACE FUNCTION public.lookup_demo_user_id(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id FROM auth.users WHERE email = p_email LIMIT 1;
$$;
