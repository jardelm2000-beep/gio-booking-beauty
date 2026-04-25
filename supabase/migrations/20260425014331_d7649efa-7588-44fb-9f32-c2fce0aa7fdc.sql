-- ============================================================
-- FIX: Force tenant-scoped admins; only super_admin has global reach
-- ============================================================

-- Constraint: 'admin' must always have a tenant_slug.
-- 'super_admin' must NOT have a tenant_slug (it's global).
-- 'cliente' has no tenant.
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_role_tenant_check;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_role_tenant_check CHECK (
    (role = 'admin' AND tenant_slug IS NOT NULL) OR
    (role = 'super_admin' AND tenant_slug IS NULL) OR
    (role = 'cliente' AND tenant_slug IS NULL)
  );

-- Tighten is_admin_of: no more "tenant_slug IS NULL" loophole
CREATE OR REPLACE FUNCTION public.is_admin_of(_user_id uuid, _tenant text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.is_super_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role = 'admin'
        AND tenant_slug = _tenant
    )
$$;

-- ============================================================
-- Defense-in-depth: block anonymous SELECT on user_roles
-- ============================================================
CREATE POLICY "Bloqueia leitura anônima de papéis"
ON public.user_roles
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- ============================================================
-- Storage hardening: restrict bucket to images only, max 5MB
-- ============================================================
UPDATE storage.buckets
SET
  file_size_limit = 5242880, -- 5 MB
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'
  ]
WHERE id = 'tenant-assets';
