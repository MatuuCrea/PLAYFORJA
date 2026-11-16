-- Prevent clients from changing internal economy/progression fields directly.
DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
REVOKE UPDATE ON TABLE public.profiles FROM anon, authenticated;
