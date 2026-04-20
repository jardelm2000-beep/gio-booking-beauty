-- 1) Defesa em profundidade contra escalonamento de privilégios em user_roles
-- Política RESTRICTIVE: TODAS as escritas exigem ser admin, sem exceção.
DROP POLICY IF EXISTS "Apenas admin escreve papéis" ON public.user_roles;
CREATE POLICY "Apenas admin escreve papéis"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated, anon
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) Permitir UPDATE de despesas para admin
DROP POLICY IF EXISTS "Admin atualiza despesas" ON public.expenses;
CREATE POLICY "Admin atualiza despesas"
ON public.expenses
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));