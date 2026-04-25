import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, LogOut, Plus, ExternalLink, ArrowLeft, Loader2, Trash2, UserPlus, RotateCcw, Archive, Users, KeyRound, Eye, EyeOff, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { safeErrorMessage } from "@/lib/safe-error";
import { useAuth } from "@/hooks/useAuth";
import BrandEditor from "@/components/admin/BrandEditor";

type TenantItem = {
  slug: string;
  name: string;
  primary_color: string;
  active: boolean;
  deleted_at: string | null;
};

const slugRe = /^[a-z0-9-]{2,50}$/;

const SuperAdminPage = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin, loading, signOut } = useAuth();
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState<TenantItem | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [ownerForTenant, setOwnerForTenant] = useState<TenantItem | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [purgingTenant, setPurgingTenant] = useState<TenantItem | null>(null);
  const [purgeConfirmText, setPurgeConfirmText] = useState("");
  const [purging, setPurging] = useState(false);
  const [view, setView] = useState<"tenants" | "owners">("tenants");

  // Reset tab title and any tenant-injected CSS vars from previous navigation
  useEffect(() => {
    document.title = editingSlug
      ? `Divas Plan · Editando /${editingSlug}`
      : "Divas Plan · Painel";
    document.documentElement.style.removeProperty("--primary");
    document.documentElement.style.removeProperty("--gold");
    document.documentElement.style.removeProperty("--ring");
    document.documentElement.style.removeProperty("--background");
  }, [editingSlug]);

  // Auth gate
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth?redirect=/divas-plan/admin", { replace: true });
    }
  }, [user, loading, navigate]);

  const reload = async () => {
    setListLoading(true);
    const { data, error } = await supabase
      .from("tenants")
      .select("slug,name,primary_color,active,deleted_at")
      .order("name");
    if (error) toast.error(safeErrorMessage(error, "Erro ao carregar marcas."));
    setTenants((data as TenantItem[]) ?? []);
    setListLoading(false);
  };

  useEffect(() => {
    if (user && isSuperAdmin) reload();
  }, [user, isSuperAdmin]);

  const activeTenants = tenants.filter((t) => !t.deleted_at);
  const trashedTenants = tenants.filter((t) => !!t.deleted_at);

  // Soft delete: move to trash (keeps all data, just hides from public/list)
  const handleDelete = async () => {
    if (!deletingTenant) return;
    if (deleteConfirmText.trim() !== deletingTenant.slug) {
      toast.error("Digite o slug exatamente para confirmar.");
      return;
    }
    setDeleting(true);
    const slugToDelete = deletingTenant.slug;
    const { error } = await supabase
      .from("tenants")
      .update({ deleted_at: new Date().toISOString(), active: false })
      .eq("slug", slugToDelete);
    if (error) {
      setDeleting(false);
      toast.error(safeErrorMessage(error, "Falha ao mover para a lixeira."));
      return;
    }
    setDeleting(false);
    setDeletingTenant(null);
    setDeleteConfirmText("");
    toast.success(`Marca /${slugToDelete} movida para a lixeira.`);
    reload();
  };

  const restoreTenant = async (t: TenantItem) => {
    // Optimistic
    setTenants((prev) => prev.map((x) =>
      x.slug === t.slug ? { ...x, deleted_at: null, active: true } : x,
    ));
    const { error } = await supabase
      .from("tenants")
      .update({ deleted_at: null, active: true })
      .eq("slug", t.slug);
    if (error) {
      toast.error(safeErrorMessage(error, "Falha ao restaurar."));
      reload();
      return;
    }
    toast.success(`Marca /${t.slug} restaurada.`);
  };

  // Hard delete: only from trash, with explicit slug confirmation
  const handlePurge = async () => {
    if (!purgingTenant) return;
    if (purgeConfirmText.trim() !== purgingTenant.slug) {
      toast.error("Digite o slug exatamente para confirmar.");
      return;
    }
    setPurging(true);
    const slugToPurge = purgingTenant.slug;
    const steps: Array<{ table: "appointments" | "expenses" | "services" | "user_roles" | "tenants"; label: string }> = [
      { table: "appointments", label: "agendamentos" },
      { table: "expenses", label: "despesas" },
      { table: "services", label: "serviços" },
      { table: "user_roles", label: "papéis de admin" },
      { table: "tenants", label: "marca" },
    ];
    for (const step of steps) {
      const q = step.table === "tenants"
        ? supabase.from("tenants").delete().eq("slug", slugToPurge)
        : supabase.from(step.table).delete().eq("tenant_slug", slugToPurge);
      const { error } = await q;
      if (error) {
        setPurging(false);
        toast.error(safeErrorMessage(error, `Falha ao remover ${step.label}.`));
        return;
      }
    }
    setPurging(false);
    setPurgingTenant(null);
    setPurgeConfirmText("");
    toast.success(`Marca /${slugToPurge} apagada definitivamente.`);
    reload();
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-sans text-sm">Carregando...</p>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md border-border/50">
          <CardContent className="p-8 text-center space-y-4">
            <h2 className="font-serif text-xl">Acesso negado</h2>
            <p className="text-sm text-muted-foreground font-sans">
              Esta área é exclusiva para responsáveis pelo projeto Divas Plan.
            </p>
            <Button asChild variant="outline" className="font-sans">
              <Link to="/divas-plan">Voltar à página inicial</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (editingSlug) {
    const t = tenants.find((x) => x.slug === editingSlug);
    return (
      <div className="min-h-screen bg-background">
        <header className="fixed top-0 left-0 right-0 z-50 glass-dark border-b border-border/50">
          <div className="container mx-auto flex items-center justify-between h-16 px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingSlug(null)}
              className="font-sans"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar às marcas
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-sans hidden sm:inline">
                Editando <span className="text-primary">/{editingSlug}</span>
              </span>
              <Button asChild variant="outline" size="sm" className="font-sans">
                <a href={`/${editingSlug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" /> Ver pública
                </a>
              </Button>
            </div>
          </div>
        </header>
        <main className="pt-24 pb-12 container mx-auto max-w-3xl px-4">
          <h1 className="font-serif text-2xl mb-6">
            {t?.name ?? editingSlug}
          </h1>
          <BrandEditor slug={editingSlug} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 glass-dark border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/divas-plan" className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-serif text-lg text-gradient-gold tracking-wide">
              Divas Plan · Painel
            </span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await signOut();
              navigate("/divas-plan", { replace: true });
            }}
            className="font-sans"
          >
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </header>

      <main className="pt-24 pb-12 container mx-auto max-w-5xl px-4">
        {/* Top tabs */}
        <div className="flex gap-2 mb-6 border-b border-border/50">
          <button
            onClick={() => { setView("tenants"); setShowTrash(false); }}
            className={`px-4 py-2 text-sm font-sans border-b-2 transition-colors ${
              view === "tenants"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="w-4 h-4 mr-2 inline" /> Marcas
          </button>
          <button
            onClick={() => setView("owners")}
            className={`px-4 py-2 text-sm font-sans border-b-2 transition-colors ${
              view === "owners"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4 mr-2 inline" /> Donas
          </button>
        </div>

        {view === "owners" ? (
          <OwnersPanel tenants={tenants} />
        ) : (
          <>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl">
              {showTrash ? "Lixeira" : "Marcas cadastradas"}
            </h1>
            <p className="text-xs text-muted-foreground font-sans mt-1">
              {showTrash
                ? "Restaure marcas excluídas ou apague definitivamente."
                : "Edite páginas existentes ou cadastre uma nova profissional."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTrash((v) => !v)}
              className="font-sans"
            >
              {showTrash ? (
                <><ArrowLeft className="w-4 h-4 mr-2" /> Voltar às marcas</>
              ) : (
                <><Archive className="w-4 h-4 mr-2" /> Lixeira{trashedTenants.length > 0 ? ` (${trashedTenants.length})` : ""}</>
              )}
            </Button>
            {!showTrash && (
              <CreateTenantDialog
                open={openCreate}
                onOpenChange={setOpenCreate}
                onCreated={(slug) => {
                  setOpenCreate(false);
                  reload().then(() => setEditingSlug(slug));
                }}
              />
            )}
          </div>
        </div>

        {listLoading ? (
          <p className="text-muted-foreground font-sans text-sm">Carregando marcas...</p>
        ) : showTrash ? (
          trashedTenants.length === 0 ? (
            <p className="text-muted-foreground font-sans text-sm">A lixeira está vazia.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {trashedTenants.map((t) => (
                <Card key={t.slug} className="border-border/50 opacity-80">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: t.primary_color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-serif text-lg truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">/{t.slug}</p>
                        {t.deleted_at && (
                          <p className="text-[10px] text-muted-foreground font-sans mt-0.5">
                            Excluída em {new Date(t.deleted_at).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restoreTenant(t)}
                        className="flex-1 font-sans text-xs"
                      >
                        <RotateCcw className="w-3 h-3 mr-1.5" /> Restaurar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setPurgingTenant(t); setPurgeConfirmText(""); }}
                        className="font-sans text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        aria-label={`Apagar definitivamente ${t.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : activeTenants.length === 0 ? (
          <p className="text-muted-foreground font-sans text-sm">
            Nenhuma marca cadastrada ainda.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTenants.map((t) => (
              <Card key={t.slug} className="border-border/50 hover:border-primary/40 transition-all">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: t.primary_color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-lg truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        /{t.slug}
                      </p>
                    </div>
                    {!t.active && (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">
                        inativa
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingSlug(t.slug)}
                      className="flex-1 font-sans text-xs"
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setOwnerForTenant(t)}
                      className="font-sans text-xs"
                      aria-label={`Adicionar dona em ${t.name}`}
                      title="Adicionar dona do salão"
                    >
                      <UserPlus className="w-3 h-3" />
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="font-sans text-xs">
                      <a href={`/${t.slug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setDeletingTenant(t); setDeleteConfirmText(""); }}
                      className="font-sans text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      aria-label={`Excluir ${t.name}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </>
        )}
      </main>

      <AlertDialog
        open={!!deletingTenant}
        onOpenChange={(o) => { if (!o) { setDeletingTenant(null); setDeleteConfirmText(""); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">
              Mover {deletingTenant?.name} para a lixeira?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans space-y-2">
              <span className="block">
                A marca ficará <strong>oculta</strong> do público e da lista principal,
                mas <strong>todos os dados são preservados</strong> (agendamentos, serviços, despesas e vínculos de admin).
              </span>
              <span className="block text-xs">
                Você pode <strong>restaurar a qualquer momento</strong> pela aba "Lixeira".
              </span>
              <span className="block pt-2">
                Para confirmar, digite o slug <span className="font-mono text-destructive">{deletingTenant?.slug}</span> abaixo:
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={deletingTenant?.slug}
            className="font-mono"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="font-sans">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting || deleteConfirmText.trim() !== deletingTenant?.slug}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-sans"
            >
              {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Mover para a lixeira
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!purgingTenant}
        onOpenChange={(o) => { if (!o) { setPurgingTenant(null); setPurgeConfirmText(""); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">
              Apagar {purgingTenant?.name} definitivamente?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans space-y-2">
              <span className="block">
                Esta ação é <strong>permanente e não pode ser desfeita</strong>. Serão removidos:
              </span>
              <span className="block text-xs">
                • Página pública /{purgingTenant?.slug}<br />
                • Todos os agendamentos, serviços e despesas<br />
                • Vínculo de admin (a conta do usuário continua existindo)
              </span>
              <span className="block pt-2">
                Para confirmar, digite o slug <span className="font-mono text-destructive">{purgingTenant?.slug}</span> abaixo:
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={purgeConfirmText}
            onChange={(e) => setPurgeConfirmText(e.target.value)}
            placeholder={purgingTenant?.slug}
            className="font-mono"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={purging} className="font-sans">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handlePurge(); }}
              disabled={purging || purgeConfirmText.trim() !== purgingTenant?.slug}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-sans"
            >
              {purging ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Apagar definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddOwnerDialog
        tenant={ownerForTenant}
        onClose={() => setOwnerForTenant(null)}
      />
    </div>
  );
};

const CreateTenantDialog = ({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (slug: string) => void;
}) => {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [color, setColor] = useState("#C9A96E");
  const [saving, setSaving] = useState(false);
  const [createOwner, setCreateOwner] = useState(true);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [ownerCpf, setOwnerCpf] = useState("");

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slug) {
      const auto = v.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50);
      setSlug(auto);
    }
  };

  const submit = async () => {
    const cleanSlug = slug.trim().toLowerCase();
    const cleanName = name.trim();
    if (!cleanName) return toast.error("Informe o nome da marca.");
    if (!slugRe.test(cleanSlug)) {
      return toast.error("Slug inválido. Use letras minúsculas, números e hífens (2-50 caracteres).");
    }
    if (cleanSlug === "divas-plan" || cleanSlug === "auth") {
      return toast.error("Este slug é reservado.");
    }
    if (createOwner) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail.trim())) {
        return toast.error("E-mail da dona inválido.");
      }
      if (ownerPassword.length < 6) {
        return toast.error("Senha da dona precisa de no mínimo 6 caracteres.");
      }
      if (!isValidCPF(ownerCpf)) {
        return toast.error("CPF da dona inválido.");
      }
    }
    setSaving(true);
    const { error } = await supabase.from("tenants").insert({
      slug: cleanSlug,
      name: cleanName,
      primary_color: color,
      active: true,
    });
    if (error) {
      setSaving(false);
      toast.error(safeErrorMessage(error, "Não foi possível criar a marca."));
      return;
    }
    if (createOwner) {
      const { data, error: fnErr } = await supabase.functions.invoke("create-salon-owner", {
        body: {
          email: ownerEmail.trim().toLowerCase(),
          password: ownerPassword,
          cpf: ownerCpf.replace(/\D/g, ""),
          tenant_slug: cleanSlug,
          display_name: cleanName,
        },
      });
      const errMsg = (data as { error?: string } | null)?.error ?? fnErr?.message;
      if (errMsg) {
        setSaving(false);
        toast.error(`Marca criada, mas falhou ao cadastrar a dona: ${errMsg}`);
        return;
      }
    }
    setSaving(false);
    toast.success(`Marca /${cleanSlug} criada!`);
    setName(""); setSlug(""); setColor("#C9A96E");
    setOwnerEmail(""); setOwnerPassword(""); setOwnerCpf(""); setCreateOwner(true);
    onCreated(cleanSlug);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-gold text-primary-foreground font-sans">
          <Plus className="w-4 h-4 mr-2" /> Nova marca
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">Cadastrar nova profissional</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-sans uppercase tracking-wide text-muted-foreground">
              Nome da marca
            </Label>
            <Input value={name} onChange={(e) => handleNameChange(e.target.value)} maxLength={100} placeholder="Ex: Giovanna Beauty" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-sans uppercase tracking-wide text-muted-foreground">
              Slug (link público /marca)
            </Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              maxLength={50}
              className="font-mono"
              placeholder="giovanna-beauty"
            />
            <p className="text-[11px] text-muted-foreground font-sans">
              Letras minúsculas, números e hífens. Será o link: divasplan.app/<span className="text-primary">{slug || "sua-marca"}</span>
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-sans uppercase tracking-wide text-muted-foreground">
              Cor primária
            </Label>
            <div className="flex items-center gap-2">
              <Input value={color} onChange={(e) => setColor(e.target.value)} maxLength={7} className="font-mono" />
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-12 rounded border border-border bg-transparent cursor-pointer"
                aria-label="Cor"
              />
            </div>
          </div>

          <div className="border-t border-border/50 pt-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createOwner}
                onChange={(e) => setCreateOwner(e.target.checked)}
                className="accent-primary"
              />
              <span className="text-sm font-sans">Criar conta da dona do salão agora</span>
            </label>
            {createOwner && (
              <div className="space-y-3 pl-6">
                <div className="space-y-1.5">
                  <Label className="text-xs font-sans uppercase tracking-wide text-muted-foreground">CPF</Label>
                  <Input
                    value={ownerCpf}
                    onChange={(e) => setOwnerCpf(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    className="font-mono"
                    inputMode="numeric"
                    maxLength={14}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-sans uppercase tracking-wide text-muted-foreground">E-mail</Label>
                  <Input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="dona@salao.com"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-sans uppercase tracking-wide text-muted-foreground">Senha temporária</Label>
                  <Input
                    type="text"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="off"
                  />
                  <p className="text-[11px] text-muted-foreground font-sans">
                    Envie esses dados para a dona — ela poderá trocar a senha depois.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-sans">
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving} className="bg-gradient-gold text-primary-foreground font-sans">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Criar marca
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SuperAdminPage;

// ===== CPF helpers =====
const formatCPF = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

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

// ===== Add Owner to existing tenant dialog =====
const AddOwnerDialog = ({
  tenant,
  onClose,
}: {
  tenant: TenantItem | null;
  onClose: () => void;
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cpf, setCpf] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenant) { setEmail(""); setPassword(""); setCpf(""); }
  }, [tenant]);

  const submit = async () => {
    if (!tenant) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return toast.error("E-mail inválido.");
    }
    if (password.length < 6) return toast.error("Senha precisa de no mínimo 6 caracteres.");
    if (!isValidCPF(cpf)) return toast.error("CPF inválido.");
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("create-salon-owner", {
      body: {
        email: email.trim().toLowerCase(),
        password,
        cpf: cpf.replace(/\D/g, ""),
        tenant_slug: tenant.slug,
        display_name: tenant.name,
      },
    });
    setSaving(false);
    const errMsg = (data as { error?: string } | null)?.error ?? error?.message;
    if (errMsg) return toast.error(errMsg);
    toast.success(`Dona cadastrada para /${tenant.slug}!`);
    onClose();
  };

  return (
    <Dialog open={!!tenant} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">
            Adicionar dona em {tenant?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-sans uppercase tracking-wide text-muted-foreground">CPF</Label>
            <Input
              value={cpf}
              onChange={(e) => setCpf(formatCPF(e.target.value))}
              placeholder="000.000.000-00"
              className="font-mono"
              inputMode="numeric"
              maxLength={14}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-sans uppercase tracking-wide text-muted-foreground">E-mail</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dona@salao.com"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-sans uppercase tracking-wide text-muted-foreground">Senha temporária</Label>
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete="off"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="font-sans" disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving} className="bg-gradient-gold text-primary-foreground font-sans">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
            Cadastrar dona
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};