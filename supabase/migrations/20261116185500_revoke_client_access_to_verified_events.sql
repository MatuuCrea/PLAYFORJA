REVOKE ALL ON TABLE public.verified_game_events FROM anon, authenticated;
GRANT ALL ON TABLE public.verified_game_events TO service_role;