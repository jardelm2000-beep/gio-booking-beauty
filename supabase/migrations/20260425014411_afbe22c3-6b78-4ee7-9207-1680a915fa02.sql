-- Replace overly broad admin profile read policy
DROP POLICY IF EXISTS "Admin vê todos os perfis" ON public.profiles;

-- Helper: does this profile have an appointment in a tenant the caller admins?
CREATE OR REPLACE FUNCTION public.can_view_profile(_caller uuid, _profile_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.is_super_admin(_caller)
    OR EXISTS (
      SELECT 1
      FROM public.appointments a
      JOIN public.user_roles r
        ON r.user_id = _caller
       AND r.role = 'admin'
       AND r.tenant_slug = a.tenant_slug
      WHERE a.user_id = _profile_user
    )
$$;

CREATE POLICY "Admin vê perfis dos seus clientes"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.can_view_profile(auth.uid(), user_id));
