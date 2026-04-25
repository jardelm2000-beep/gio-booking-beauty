ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS tenants_deleted_at_idx ON public.tenants (deleted_at);