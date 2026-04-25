-- 1) Estender tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS gallery text[] NOT NULL DEFAULT '{}';

-- 2) Bucket público para assets das marcas
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-assets', 'tenant-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 3) Políticas de storage: leitura pública, escrita só pelo admin da marca
-- A pasta raiz é o slug da marca: tenant-assets/<slug>/arquivo.png

DROP POLICY IF EXISTS "Tenant assets publicly readable" ON storage.objects;
CREATE POLICY "Tenant assets publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'tenant-assets');

DROP POLICY IF EXISTS "Admin uploads tenant assets" ON storage.objects;
CREATE POLICY "Admin uploads tenant assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tenant-assets'
  AND public.is_admin_of(auth.uid(), (storage.foldername(name))[1])
);

DROP POLICY IF EXISTS "Admin updates tenant assets" ON storage.objects;
CREATE POLICY "Admin updates tenant assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tenant-assets'
  AND public.is_admin_of(auth.uid(), (storage.foldername(name))[1])
);

DROP POLICY IF EXISTS "Admin deletes tenant assets" ON storage.objects;
CREATE POLICY "Admin deletes tenant assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tenant-assets'
  AND public.is_admin_of(auth.uid(), (storage.foldername(name))[1])
);