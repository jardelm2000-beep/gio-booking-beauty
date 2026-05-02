-- A policy RESTRICTIVE atual aplica-se a ALL (incluindo SELECT), o que impede
-- usuários comuns/admin de tenant de lerem os próprios papéis em user_roles.
-- Recriamos como três policies RESTRICTIVE só de escrita (INSERT/UPDATE/DELETE),
-- mantendo a leitura controlada pelas policies PERMISSIVE existentes.

DROP POLICY IF EXISTS "Bloqueia escrita de papéis" ON public.user_roles;

CREATE POLICY "Bloqueia INSERT de papéis (não super admin)"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Bloqueia UPDATE de papéis (não super admin)"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO anon, authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Bloqueia DELETE de papéis (não super admin)"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO anon, authenticated
USING (public.is_super_admin(auth.uid()));