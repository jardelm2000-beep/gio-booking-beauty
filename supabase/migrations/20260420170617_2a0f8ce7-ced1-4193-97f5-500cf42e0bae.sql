-- =========================================================
-- HARDENING: appointments
-- =========================================================

-- 1) Catálogo server-side de serviços (evita preço forjado pelo cliente)
CREATE TABLE IF NOT EXISTS public.services (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  price numeric NOT NULL CHECK (price >= 0),
  duration text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer um vê serviços ativos" ON public.services;
CREATE POLICY "Qualquer um vê serviços ativos"
ON public.services FOR SELECT
USING (active = true);

DROP POLICY IF EXISTS "Admin gerencia serviços" ON public.services;
CREATE POLICY "Admin gerencia serviços"
ON public.services FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.services (id, name, price, duration) VALUES
  ('cilios',      'Extensão de Cílios',       150, '1h30'),
  ('sobrancelha', 'Design de Sobrancelhas',    60, '40min'),
  ('lifting',     'Lash Lifting',             120, '1h')
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      price = EXCLUDED.price,
      duration = EXCLUDED.duration;

-- 2) Trigger que SOBRESCREVE preço/nome do serviço a partir do catálogo
CREATE OR REPLACE FUNCTION public.enforce_service_pricing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s_record public.services%ROWTYPE;
BEGIN
  SELECT * INTO s_record
  FROM public.services
  WHERE name = NEW.service_name AND active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Serviço inválido' USING ERRCODE = '22023';
  END IF;

  NEW.service_price := s_record.price;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_service_pricing ON public.appointments;
CREATE TRIGGER trg_enforce_service_pricing
BEFORE INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_service_pricing();

-- 3) Bloqueia o cliente de alterar campos sensíveis (paid, price, status, datas)
CREATE OR REPLACE FUNCTION public.protect_appointment_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin pode tudo
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Cliente só pode atualizar 'status' para 'cancelado' e 'notes'
  IF NEW.paid           IS DISTINCT FROM OLD.paid           THEN RAISE EXCEPTION 'Sem permissão (paid)'           USING ERRCODE = '42501'; END IF;
  IF NEW.service_price  IS DISTINCT FROM OLD.service_price  THEN RAISE EXCEPTION 'Sem permissão (service_price)'  USING ERRCODE = '42501'; END IF;
  IF NEW.service_name   IS DISTINCT FROM OLD.service_name   THEN RAISE EXCEPTION 'Sem permissão (service_name)'   USING ERRCODE = '42501'; END IF;
  IF NEW.appointment_date IS DISTINCT FROM OLD.appointment_date THEN RAISE EXCEPTION 'Sem permissão (date)'       USING ERRCODE = '42501'; END IF;
  IF NEW.appointment_time IS DISTINCT FROM OLD.appointment_time THEN RAISE EXCEPTION 'Sem permissão (time)'       USING ERRCODE = '42501'; END IF;
  IF NEW.user_id        IS DISTINCT FROM OLD.user_id        THEN RAISE EXCEPTION 'Sem permissão (user_id)'        USING ERRCODE = '42501'; END IF;
  IF NEW.client_name    IS DISTINCT FROM OLD.client_name    THEN RAISE EXCEPTION 'Sem permissão (client_name)'    USING ERRCODE = '42501'; END IF;
  IF NEW.client_phone   IS DISTINCT FROM OLD.client_phone   THEN RAISE EXCEPTION 'Sem permissão (client_phone)'   USING ERRCODE = '42501'; END IF;

  -- Status só pode ir para 'cancelado'
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelado' THEN
    RAISE EXCEPTION 'Sem permissão (status)' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_appointment_columns ON public.appointments;
CREATE TRIGGER trg_protect_appointment_columns
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.protect_appointment_columns();

-- 4) Anti double-booking: índice único parcial em (date, time) para slots ATIVOS
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_appointment_slot
ON public.appointments (appointment_date, appointment_time)
WHERE status <> 'cancelado';

-- 5) Garantia de tipo no telefone/nome (defense in depth contra payloads gigantes)
ALTER TABLE public.appointments
  ADD CONSTRAINT chk_client_name_len  CHECK (char_length(client_name)  BETWEEN 2 AND 100)  NOT VALID;
ALTER TABLE public.appointments
  ADD CONSTRAINT chk_client_phone_len CHECK (char_length(client_phone) BETWEEN 8 AND 20)   NOT VALID;
ALTER TABLE public.appointments VALIDATE CONSTRAINT chk_client_name_len;
ALTER TABLE public.appointments VALIDATE CONSTRAINT chk_client_phone_len;

-- 6) Despesas: validação de tamanho
ALTER TABLE public.expenses
  ADD CONSTRAINT chk_expense_amount_pos CHECK (amount > 0)                                  NOT VALID;
ALTER TABLE public.expenses
  ADD CONSTRAINT chk_expense_desc_len   CHECK (char_length(description) BETWEEN 1 AND 200)  NOT VALID;
ALTER TABLE public.expenses VALIDATE CONSTRAINT chk_expense_amount_pos;
ALTER TABLE public.expenses VALIDATE CONSTRAINT chk_expense_desc_len;