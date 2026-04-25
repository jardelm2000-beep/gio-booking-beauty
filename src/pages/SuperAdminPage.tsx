import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, LogOut, Plus, ExternalLink, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
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
};

const slugRe = /^[a-z0-9-]{2,50}$/;

const SuperAdminPage = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin, loading, signOut } = useAuth();
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);

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
      .select("slug,name,primary_color,active")
      .order("name");
    if (error) toast.error(safeErrorMessage(error, "Erro ao carregar marcas."));
    setTenants((data as TenantItem[]) ?? []);
    setListLoading(false);
  };

  useEffect(() => {
    if (user && isSuperAdmin) reload();
  }, [user, isSuperAdmin]);

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
        <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl">Marcas cadastradas</h1>
            <p className="text-xs text-muted-foreground font-sans mt-1">
              Edite páginas existentes ou cadastre uma nova profissional.
            </p>
          </div>
          <CreateTenantDialog
            open={openCreate}
            onOpenChange={setOpenCreate}
            onCreated={(slug) => {
              setOpenCreate(false);
              reload().then(() => setEditingSlug(slug));
            }}
          />
        </div>

        {listLoading ? (
          <p className="text-muted-foreground font-sans text-sm">Carregando marcas...</p>
        ) : tenants.length === 0 ? (
          <p className="text-muted-foreground font-sans text-sm">
            Nenhuma marca cadastrada ainda.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map((t) => (
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
                    <Button asChild size="sm" variant="ghost" className="font-sans text-xs">
                      <a href={`/${t.slug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
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
    setSaving(true);
    const { error } = await supabase.from("tenants").insert({
      slug: cleanSlug,
      name: cleanName,
      primary_color: color,
      active: true,
    });
    setSaving(false);
    if (error) {
      toast.error(safeErrorMessage(error, "Não foi possível criar a marca."));
      return;
    }
    toast.success(`Marca /${cleanSlug} criada!`);
    setName(""); setSlug(""); setColor("#C9A96E");
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