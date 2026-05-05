ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS badge1_icon text NOT NULL DEFAULT 'award',
  ADD COLUMN IF NOT EXISTS badge1_label text NOT NULL DEFAULT 'Profissional Certificada',
  ADD COLUMN IF NOT EXISTS badge2_icon text NOT NULL DEFAULT 'heart',
  ADD COLUMN IF NOT EXISTS badge2_label text NOT NULL DEFAULT '+500 Clientes';

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_badge1_icon_check CHECK (badge1_icon IN ('award','heart','book')),
  ADD CONSTRAINT tenants_badge2_icon_check CHECK (badge2_icon IN ('award','heart','book'));