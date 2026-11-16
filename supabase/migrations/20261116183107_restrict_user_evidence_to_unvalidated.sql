DROP POLICY IF EXISTS "users add own evidence" ON public.evidence;
CREATE POLICY "users add own pending evidence"
ON public.evidence
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = owner_id AND validated = false);
