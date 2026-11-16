DROP POLICY IF EXISTS "service role manages verified events" ON public.verified_game_events;
CREATE POLICY "service role manages verified events"
ON public.verified_game_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);