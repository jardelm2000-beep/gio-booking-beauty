-- ============================================================
-- FIX 1: Privilege escalation on user_roles
-- Only super_admin can manage roles. Tenant-scoped admins cannot
-- promote themselves or others.
-- ============================================================
DROP POLICY IF EXISTS "Admins gerenciam papéis" ON public.user_roles;
DROP POLICY IF EXISTS "Admins veem todos os papéis" ON public.user_roles;
DROP POLICY IF EXISTS "Apenas admin escreve papéis" ON public.user_roles;

CREATE POLICY "Super admin gerencia papéis"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin vê todos os papéis"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Restrictive policy: even if someone adds a permissive policy later,
-- writes are blocked unless the caller is a super_admin.
CREATE POLICY "Bloqueia escrita de papéis"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- ============================================================
-- FIX 2: appointments — block anonymous inserts and require user_id
-- ============================================================
-- Backfill: there shouldn't be NULL user_ids, but ensure no nulls exist
DELETE FROM public.appointments WHERE user_id IS NULL;
ALTER TABLE public.appointments ALTER COLUMN user_id SET NOT NULL;

-- Replace insert policy: must be authenticated AND be self
DROP POLICY IF EXISTS "Cliente cria seu agendamento" ON public.appointments;
CREATE POLICY "Cliente autenticado cria seu agendamento"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Tighten select/update/delete to authenticated only
DROP POLICY IF EXISTS "Cliente vê seus agendamentos" ON public.appointments;
CREATE POLICY "Cliente vê seus agendamentos"
ON public.appointments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Cliente cancela seu agendamento" ON public.appointments;
CREATE POLICY "Cliente cancela seu agendamento"
ON public.appointments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admin policies: tighten to authenticated role
DROP POLICY IF EXISTS "Admin vê agendamentos da sua marca" ON public.appointments;
DROP POLICY IF EXISTS "Admin atualiza agendamentos da sua marca" ON public.appointments;
DROP POLICY IF EXISTS "Admin cria agendamentos da sua marca" ON public.appointments;
DROP POLICY IF EXISTS "Admin remove agendamentos da sua marca" ON public.appointments;

CREATE POLICY "Admin vê agendamentos da sua marca"
ON public.appointments FOR SELECT TO authenticated
USING (public.is_admin_of(auth.uid(), tenant_slug));

CREATE POLICY "Admin cria agendamentos da sua marca"
ON public.appointments FOR INSERT TO authenticated
WITH CHECK (public.is_admin_of(auth.uid(), tenant_slug));

CREATE POLICY "Admin atualiza agendamentos da sua marca"
ON public.appointments FOR UPDATE TO authenticated
USING (public.is_admin_of(auth.uid(), tenant_slug))
WITH CHECK (public.is_admin_of(auth.uid(), tenant_slug));

CREATE POLICY "Admin remove agendamentos da sua marca"
ON public.appointments FOR DELETE TO authenticated
USING (public.is_admin_of(auth.uid(), tenant_slug));

-- Same hardening on expenses (admin-only) — restrict to authenticated
DROP POLICY IF EXISTS "Admin vê despesas da sua marca" ON public.expenses;
DROP POLICY IF EXISTS "Admin cria despesas da sua marca" ON public.expenses;
DROP POLICY IF EXISTS "Admin atualiza despesas da sua marca" ON public.expenses;
DROP POLICY IF EXISTS "Admin remove despesas da sua marca" ON public.expenses;

CREATE POLICY "Admin vê despesas da sua marca"
ON public.expenses FOR SELECT TO authenticated
USING (public.is_admin_of(auth.uid(), tenant_slug));
CREATE POLICY "Admin cria despesas da sua marca"
ON public.expenses FOR INSERT TO authenticated
WITH CHECK (public.is_admin_of(auth.uid(), tenant_slug));
CREATE POLICY "Admin atualiza despesas da sua marca"
ON public.expenses FOR UPDATE TO authenticated
USING (public.is_admin_of(auth.uid(), tenant_slug))
WITH CHECK (public.is_admin_of(auth.uid(), tenant_slug));
CREATE POLICY "Admin remove despesas da sua marca"
ON public.expenses FOR DELETE TO authenticated
USING (public.is_admin_of(auth.uid(), tenant_slug));

-- Services: keep public read of active services, scope writes to authenticated admins
DROP POLICY IF EXISTS "Admin gerencia serviços da sua marca" ON public.services;
CREATE POLICY "Admin gerencia serviços da sua marca"
ON public.services FOR ALL TO authenticated
USING (public.is_admin_of(auth.uid(), tenant_slug))
WITH CHECK (public.is_admin_of(auth.uid(), tenant_slug));

-- ============================================================
-- FIX 3: Storage bucket — restrict LISTING to brand admins,
-- keep direct file access public (needed for <img src=...>)
-- ============================================================
-- Drop existing broad select policies on tenant-assets if any
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname IN (
        'Tenant assets publicly readable',
        'Public read tenant assets',
        'Public read access tenant-assets'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', p.policyname);
  END LOOP;
END $$;

-- Note: the bucket is "public", which means files are served via CDN
-- without going through RLS. The SELECT policy below only controls
-- what the *list*/metadata API can return.
CREATE POLICY "Admin lista assets da sua marca"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tenant-assets'
  AND public.is_admin_of(auth.uid(), (storage.foldername(name))[1])
);
