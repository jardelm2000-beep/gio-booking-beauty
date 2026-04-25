-- Helper function
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- Extend is_admin_of so super admins are admins of every tenant
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
      WHERE user_id = _user_id AND role = 'admin'
        AND (tenant_slug IS NULL OR tenant_slug = _tenant)
    )
$$;

-- Replace tenants policies so super_admin can manage all brands
DROP POLICY IF EXISTS "Admin global gerencia marcas" ON public.tenants;
DROP POLICY IF EXISTS "Admin global vê todas as marcas" ON public.tenants;

CREATE POLICY "Super admin gerencia marcas"
ON public.tenants FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin vê todas as marcas"
ON public.tenants FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));
