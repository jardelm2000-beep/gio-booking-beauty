import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isValidCPF = (raw: string) => {
  const cpf = raw.replace(/\D/g, "");
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (factor: number) => {
    let total = 0;
    for (let i = 0; i < factor - 1; i++) total += parseInt(cpf[i]) * (factor - i);
    const r = (total * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(10) === parseInt(cpf[9]) && calc(11) === parseInt(cpf[10]);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supaUser = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supaUser.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);

    const callerId = claimsData.claims.sub as string;
    const admin = createClient(url, service);

    // Caller must be super_admin
    const { data: isSuper, error: roleErr } = await admin.rpc("is_super_admin", {
      _user_id: callerId,
    });
    if (roleErr || !isSuper) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const cpf = String(body.cpf ?? "").replace(/\D/g, "");
    const tenantSlug = String(body.tenant_slug ?? "").trim().toLowerCase();
    const displayName = (body.display_name ? String(body.display_name) : "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255)
      return json({ error: "E-mail inválido" }, 400);
    if (password.length < 6 || password.length > 72)
      return json({ error: "Senha deve ter entre 6 e 72 caracteres" }, 400);
    if (!isValidCPF(cpf)) return json({ error: "CPF inválido" }, 400);
    if (!/^[a-z0-9-]{2,50}$/.test(tenantSlug))
      return json({ error: "Slug de marca inválido" }, 400);

    // Tenant must exist
    const { data: tenant, error: tErr } = await admin
      .from("tenants").select("slug,name").eq("slug", tenantSlug).maybeSingle();
    if (tErr) return json({ error: tErr.message }, 500);
    if (!tenant) return json({ error: "Marca não encontrada" }, 404);

    // CPF must be unique
    const { data: existingCpf } = await admin
      .from("profiles").select("user_id").eq("cpf", cpf).maybeSingle();
    if (existingCpf) return json({ error: "CPF já cadastrado" }, 409);

    // Create auth user (auto-confirm so ela já entra)
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName || tenant.name },
    });
    if (cErr || !created.user) {
      const msg = cErr?.message?.includes("registered")
        ? "E-mail já cadastrado"
        : cErr?.message ?? "Falha ao criar usuário";
      return json({ error: msg }, 400);
    }

    const newUserId = created.user.id;

    // Update profile (created by handle_new_user trigger) with cpf + name
    const { error: pErr } = await admin
      .from("profiles")
      .update({
        cpf,
        display_name: displayName || tenant.name,
      })
      .eq("user_id", newUserId);
    if (pErr) {
      await admin.auth.admin.deleteUser(newUserId);
      return json({ error: "Falha ao salvar perfil: " + pErr.message }, 500);
    }

    // Promote to admin of tenant (replace 'cliente' default)
    await admin.from("user_roles")
      .delete().eq("user_id", newUserId).eq("role", "cliente");

    const { error: rErr } = await admin.from("user_roles").insert({
      user_id: newUserId,
      role: "admin",
      tenant_slug: tenantSlug,
    });
    if (rErr) {
      await admin.auth.admin.deleteUser(newUserId);
      return json({ error: "Falha ao atribuir admin: " + rErr.message }, 500);
    }

    return json({ ok: true, user_id: newUserId });
  } catch (e) {
    return json({ error: (e as Error).message ?? "Erro inesperado" }, 500);
  }
});
