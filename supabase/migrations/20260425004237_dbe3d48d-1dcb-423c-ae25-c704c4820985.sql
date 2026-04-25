
-- Remove a unicidade global pelo nome do serviço
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_name_key;

-- 1. Tabela de marcas
CREATE TABLE public.tenants (
  slug text PRIMARY KEY,
  name text NOT NULL,
  primary_color text NOT NULL DEFAULT '#C9A96E',
  whatsapp_url text,
  instagram_handle text,
  hero_title text,
  hero_subtitle text,
  about_text text,
  about_photo_url text,
  logo_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenants_slug_format CHECK (slug ~ '^[a-z0-9-]{2,50}$'),
  CONSTRAINT tenants_color_format CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$')
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um vê marcas ativas"
  ON public.tenants FOR SELECT USING (active = true);

CREATE POLICY "Admin global vê todas as marcas"
  ON public.tenants FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin global gerencia marcas"
  ON public.tenants FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. tenant_slug nas demais tabelas
ALTER TABLE public.services    ADD COLUMN tenant_slug text;
ALTER TABLE public.appointments ADD COLUMN tenant_slug text;
ALTER TABLE public.expenses    ADD COLUMN tenant_slug text;
ALTER TABLE public.user_roles  ADD COLUMN tenant_slug text;

-- 3. Marcas iniciais
INSERT INTO public.tenants (slug, name, primary_color, whatsapp_url, instagram_handle, hero_title, hero_subtitle, about_text, active) VALUES
  ('giovanna',     'Giovanna Belizário', '#C9A96E', 'https://wa.link/t0ghdg', 'bygiovannabelizario',
   'Agende seu melhor horário',
   'Bem-vinda, madame. Se sinta à vontade — você faz total diferença para nós!',
   'Apaixonada pela arte de realçar a beleza natural de cada mulher.', true),
  ('divas-beauty', 'Divas Beauty',       '#D4AF37', 'https://wa.me/5511999999999', 'divasbeauty',
   'Sua beleza, nossa arte',
   'Cuidado e sofisticação em cada detalhe.',
   'Equipe especializada em transformar e realçar a beleza de cada cliente.', true);

-- 4. Backfill
UPDATE public.services     SET tenant_slug = 'giovanna' WHERE tenant_slug IS NULL;
UPDATE public.appointments SET tenant_slug = 'giovanna' WHERE tenant_slug IS NULL;
UPDATE public.expenses     SET tenant_slug = 'giovanna' WHERE tenant_slug IS NULL;
UPDATE public.user_roles   SET tenant_slug = 'giovanna' WHERE role = 'admin' AND tenant_slug IS NULL;

-- 5. Catálogo da divas-beauty (espelha giovanna)
INSERT INTO public.services (id, name, price, duration, active, tenant_slug)
SELECT 'divas-' || id, name, price, duration, active, 'divas-beauty'
FROM public.services WHERE tenant_slug = 'giovanna';

-- 6. NOT NULL + FKs
ALTER TABLE public.services
  ALTER COLUMN tenant_slug SET NOT NULL,
  ADD CONSTRAINT services_tenant_fk FOREIGN KEY (tenant_slug) REFERENCES public.tenants(slug) ON DELETE CASCADE,
  ADD CONSTRAINT services_tenant_name_unique UNIQUE (tenant_slug, name);

ALTER TABLE public.appointments
  ALTER COLUMN tenant_slug SET NOT NULL,
  ADD CONSTRAINT appointments_tenant_fk FOREIGN KEY (tenant_slug) REFERENCES public.tenants(slug) ON DELETE RESTRICT;

ALTER TABLE public.expenses
  ALTER COLUMN tenant_slug SET NOT NULL,
  ADD CONSTRAINT expenses_tenant_fk FOREIGN KEY (tenant_slug) REFERENCES public.tenants(slug) ON DELETE RESTRICT;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_tenant_fk FOREIGN KEY (tenant_slug) REFERENCES public.tenants(slug) ON DELETE CASCADE;

-- 7. Índice único de horário por marca
DROP INDEX IF EXISTS public.uniq_active_appointment_slot;
CREATE UNIQUE INDEX uniq_active_appointment_slot
  ON public.appointments (tenant_slug, appointment_date, appointment_time)
  WHERE status <> 'cancelado';

CREATE INDEX idx_appointments_tenant ON public.appointments (tenant_slug);
CREATE INDEX idx_expenses_tenant     ON public.expenses (tenant_slug);
CREATE INDEX idx_services_tenant     ON public.services (tenant_slug);
CREATE INDEX idx_user_roles_tenant   ON public.user_roles (tenant_slug);

-- 8. Funções de acesso por marca
CREATE OR REPLACE FUNCTION public.admin_tenant_slug(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_slug FROM public.user_roles
  WHERE user_id = _user_id AND role = 'admin' LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of(_user_id uuid, _tenant text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
      AND (tenant_slug IS NULL OR tenant_slug = _tenant)
  )
$$;

-- 9. Pricing por tenant
CREATE OR REPLACE FUNCTION public.enforce_service_pricing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s_record public.services%ROWTYPE;
BEGIN
  SELECT * INTO s_record FROM public.services
  WHERE name = NEW.service_name AND tenant_slug = NEW.tenant_slug AND active = true LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Serviço inválido para esta marca' USING ERRCODE = '22023';
  END IF;
  NEW.service_price := s_record.price;
  RETURN NEW;
END;
$$;

-- 10. Proteção de colunas (inclui tenant_slug)
CREATE OR REPLACE FUNCTION public.protect_appointment_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin_of(auth.uid(), OLD.tenant_slug) THEN
    IF NEW.tenant_slug IS DISTINCT FROM OLD.tenant_slug THEN
      RAISE EXCEPTION 'Sem permissão (tenant_slug)' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.paid           IS DISTINCT FROM OLD.paid           THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501'; END IF;
  IF NEW.service_price  IS DISTINCT FROM OLD.service_price  THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501'; END IF;
  IF NEW.service_name   IS DISTINCT FROM OLD.service_name   THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501'; END IF;
  IF NEW.appointment_date IS DISTINCT FROM OLD.appointment_date THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501'; END IF;
  IF NEW.appointment_time IS DISTINCT FROM OLD.appointment_time THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501'; END IF;
  IF NEW.user_id        IS DISTINCT FROM OLD.user_id        THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501'; END IF;
  IF NEW.client_name    IS DISTINCT FROM OLD.client_name    THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501'; END IF;
  IF NEW.client_phone   IS DISTINCT FROM OLD.client_phone   THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501'; END IF;
  IF NEW.tenant_slug    IS DISTINCT FROM OLD.tenant_slug    THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelado' THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

-- 11. RLS por tenant
DROP POLICY IF EXISTS "Admin atualiza agendamentos" ON public.appointments;
DROP POLICY IF EXISTS "Admin cria agendamentos"     ON public.appointments;
DROP POLICY IF EXISTS "Admin remove agendamentos"   ON public.appointments;
DROP POLICY IF EXISTS "Admin vê todos agendamentos" ON public.appointments;

CREATE POLICY "Admin vê agendamentos da sua marca"
  ON public.appointments FOR SELECT USING (public.is_admin_of(auth.uid(), tenant_slug));
CREATE POLICY "Admin cria agendamentos da sua marca"
  ON public.appointments FOR INSERT WITH CHECK (public.is_admin_of(auth.uid(), tenant_slug));
CREATE POLICY "Admin atualiza agendamentos da sua marca"
  ON public.appointments FOR UPDATE
  USING (public.is_admin_of(auth.uid(), tenant_slug))
  WITH CHECK (public.is_admin_of(auth.uid(), tenant_slug));
CREATE POLICY "Admin remove agendamentos da sua marca"
  ON public.appointments FOR DELETE USING (public.is_admin_of(auth.uid(), tenant_slug));

DROP POLICY IF EXISTS "Admin atualiza despesas" ON public.expenses;
DROP POLICY IF EXISTS "Admin cria despesas"     ON public.expenses;
DROP POLICY IF EXISTS "Admin remove despesas"   ON public.expenses;
DROP POLICY IF EXISTS "Admin vê despesas"       ON public.expenses;

CREATE POLICY "Admin vê despesas da sua marca"
  ON public.expenses FOR SELECT USING (public.is_admin_of(auth.uid(), tenant_slug));
CREATE POLICY "Admin cria despesas da sua marca"
  ON public.expenses FOR INSERT WITH CHECK (public.is_admin_of(auth.uid(), tenant_slug));
CREATE POLICY "Admin atualiza despesas da sua marca"
  ON public.expenses FOR UPDATE
  USING (public.is_admin_of(auth.uid(), tenant_slug))
  WITH CHECK (public.is_admin_of(auth.uid(), tenant_slug));
CREATE POLICY "Admin remove despesas da sua marca"
  ON public.expenses FOR DELETE USING (public.is_admin_of(auth.uid(), tenant_slug));

DROP POLICY IF EXISTS "Admin gerencia serviços" ON public.services;
CREATE POLICY "Admin gerencia serviços da sua marca"
  ON public.services FOR ALL
  USING (public.is_admin_of(auth.uid(), tenant_slug))
  WITH CHECK (public.is_admin_of(auth.uid(), tenant_slug));
