ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS background_color text NOT NULL DEFAULT '#0F0D0B';