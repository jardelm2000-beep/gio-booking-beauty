import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, Trash2, Save, ImageIcon, Plus, Sparkles, Award, Heart, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { safeErrorMessage } from "@/lib/safe-error";

type TenantRow = {
  slug: string;
  name: string;
  primary_color: string;
  background_color: string;
  whatsapp_url: string | null;
  instagram_handle: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  about_text: string | null;
  bio: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  about_photo_url: string | null;
  gallery: string[];
  badge1_icon: string;
  badge1_label: string;
  badge2_icon: string;
  badge2_label: string;
};

type ServiceRow = {
  id: string;
  name: string;
  price: number;
  duration: string | null;
  active: boolean;
  tenant_slug: string;
  _isNew?: boolean;
  _dirty?: boolean;
};

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Props = { slug: string };

const BrandEditor = ({ slug }: Props) => {
  const [data, setData] = useState<TenantRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [savingServiceId, setSavingServiceId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase
      .from("tenants")
      .select("slug,name,primary_color,background_color,whatsapp_url,instagram_handle,hero_title,hero_subtitle,about_text,bio,logo_url,hero_image_url,about_photo_url,gallery,badge1_icon,badge1_label,badge2_icon,badge2_label")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data: t, error }) => {
        if (!active) return;
        if (error) toast.error(safeErrorMessage(error, "Não foi possível carregar a marca."));
        if (t) setData(t as TenantRow);
        setLoading(false);
      });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    let active = true;
    setServicesLoading(true);
    supabase
      .from("services")
      .select("id,name,price,duration,active,tenant_slug")
      .eq("tenant_slug", slug)
      .order("created_at", { ascending: true })
      .then(({ data: s, error }) => {
        if (!active) return;
        if (error) toast.error(safeErrorMessage(error, "Não foi possível carregar serviços."));
        setServices((s ?? []) as ServiceRow[]);
        setServicesLoading(false);
      });
    return () => { active = false; };
  }, [slug]);

  const set = <K extends keyof TenantRow>(key: K, value: TenantRow[K]) => {
    setData((d) => (d ? { ...d, [key]: value } : d));
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG, WEBP ou GIF.");
      return null;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Imagem muito grande (máximo 5MB).");
      return null;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${slug}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("tenant-assets").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) {
      toast.error(safeErrorMessage(error, "Falha ao enviar imagem."));
      return null;
    }
    const { data: pub } = supabase.storage.from("tenant-assets").getPublicUrl(path);
    return pub.publicUrl;
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "logo_url" | "hero_image_url" | "about_photo_url",
    folder: string,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingKey(field);
    const url = await uploadFile(file, folder);
    setUploadingKey(null);
    if (url) set(field, url);
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0 || !data) return;
    setUploadingKey("gallery");
    const uploaded: string[] = [];
    for (const f of files.slice(0, 8)) {
      const url = await uploadFile(f, "gallery");
      if (url) uploaded.push(url);
    }
    setUploadingKey(null);
    if (uploaded.length) set("gallery", [...(data.gallery ?? []), ...uploaded]);
  };

  const removeGalleryItem = (i: number) => {
    if (!data) return;
    set("gallery", data.gallery.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    const payload = {
      name: data.name?.trim().slice(0, 100),
      primary_color: data.primary_color,
      background_color: data.background_color,
      whatsapp_url: data.whatsapp_url?.trim() || null,
      instagram_handle: data.instagram_handle?.trim().replace(/^@/, "") || null,
      hero_title: data.hero_title?.trim().slice(0, 120) || null,
      hero_subtitle: data.hero_subtitle?.trim().slice(0, 200) || null,
      about_text: data.about_text?.trim().slice(0, 2000) || null,
      bio: data.bio?.trim().slice(0, 500) || null,
      logo_url: data.logo_url,
      hero_image_url: data.hero_image_url,
      about_photo_url: data.about_photo_url,
      gallery: data.gallery ?? [],
      badge1_icon: data.badge1_icon || "award",
      badge1_label: data.badge1_label?.trim().slice(0, 60) || "Profissional Certificada",
      badge2_icon: data.badge2_icon || "heart",
      badge2_label: data.badge2_label?.trim().slice(0, 60) || "+500 Clientes",
    };
    const { error } = await supabase.from("tenants").update(payload).eq("slug", slug);
    setSaving(false);
    if (error) {
      toast.error(safeErrorMessage(error, "Não foi possível salvar a página."));
      return;
    }
    toast.success("Página atualizada! ✨ Atualize a aba pública para ver as mudanças.");
  };

  if (loading) {
    return <p className="text-muted-foreground font-sans text-sm">Carregando editor...</p>;
  }
  if (!data) {
    return <p className="text-muted-foreground font-sans text-sm">Marca não encontrada.</p>;
  }

  const updateService = (id: string, patch: Partial<ServiceRow>) => {
    setServices((list) => list.map((s) => (s.id === id ? { ...s, ...patch, _dirty: true } : s)));
  };

  const addService = () => {
    const tempId = `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setServices((list) => [
      ...list,
      {
        id: tempId,
        name: "",
        price: 0,
        duration: "",
        active: true,
        tenant_slug: slug,
        _isNew: true,
        _dirty: true,
      },
    ]);
  };

  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "servico";

  const saveService = async (svc: ServiceRow) => {
    const name = svc.name?.trim();
    if (!name) { toast.error("Informe o nome do serviço."); return; }
    const price = Number(svc.price);
    if (!Number.isFinite(price) || price < 0) { toast.error("Preço inválido."); return; }
    setSavingServiceId(svc.id);
    if (svc._isNew) {
      const newId = `${slugify(name)}-${Date.now().toString(36)}`;
      const { data: inserted, error } = await supabase
        .from("services")
        .insert({
          id: newId,
          name: name.slice(0, 100),
          price,
          duration: svc.duration?.trim().slice(0, 50) || null,
          active: svc.active,
          tenant_slug: slug,
        })
        .select("id,name,price,duration,active,tenant_slug")
        .single();
      setSavingServiceId(null);
      if (error) { toast.error(safeErrorMessage(error, "Falha ao criar serviço.")); return; }
      setServices((list) => list.map((s) => (s.id === svc.id ? (inserted as ServiceRow) : s)));
      toast.success("Serviço criado!");
    } else {
      const { error } = await supabase
        .from("services")
        .update({
          name: name.slice(0, 100),
          price,
          duration: svc.duration?.trim().slice(0, 50) || null,
          active: svc.active,
        })
        .eq("id", svc.id)
        .eq("tenant_slug", slug);
      setSavingServiceId(null);
      if (error) { toast.error(safeErrorMessage(error, "Falha ao salvar serviço.")); return; }
      setServices((list) => list.map((s) => (s.id === svc.id ? { ...s, _dirty: false } : s)));
      toast.success("Serviço atualizado!");
    }
  };

  const deleteService = async (svc: ServiceRow) => {
    if (svc._isNew) {
      setServices((list) => list.filter((s) => s.id !== svc.id));
      return;
    }
    if (!confirm(`Remover o serviço "${svc.name}"?`)) return;
    setSavingServiceId(svc.id);
    const { error } = await supabase.from("services").delete().eq("id", svc.id).eq("tenant_slug", slug);
    setSavingServiceId(null);
    if (error) { toast.error(safeErrorMessage(error, "Falha ao remover. Pode haver agendamentos vinculados.")); return; }
    setServices((list) => list.filter((s) => s.id !== svc.id));
    toast.success("Serviço removido.");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground font-sans">
          Edite os textos e imagens da página pública <span className="text-primary">/{slug}</span>.
        </p>
        <Button
          onClick={save}
          disabled={saving}
          className="bg-gradient-gold text-primary-foreground font-sans"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar alterações
        </Button>
      </div>

      <Card className="border-border/50">
        <CardHeader><CardTitle className="font-serif text-lg">Identidade</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Nome da marca">
            <Input value={data.name ?? ""} onChange={(e) => set("name", e.target.value)} maxLength={100} />
          </Field>
          <Field label="Cor primária (HEX)">
            <div className="flex items-center gap-2">
              <Input
                value={data.primary_color ?? "#C9A96E"}
                onChange={(e) => set("primary_color", e.target.value)}
                maxLength={7}
                className="font-mono"
              />
              <input
                type="color"
                value={data.primary_color ?? "#C9A96E"}
                onChange={(e) => set("primary_color", e.target.value)}
                className="h-10 w-12 rounded border border-border bg-transparent cursor-pointer"
                aria-label="Selecionar cor"
              />
            </div>
          </Field>
          <Field label="Cor de fundo (HEX)">
            <div className="flex items-center gap-2">
              <Input
                value={data.background_color ?? "#0F0D0B"}
                onChange={(e) => set("background_color", e.target.value)}
                maxLength={7}
                className="font-mono"
              />
              <input
                type="color"
                value={data.background_color ?? "#0F0D0B"}
                onChange={(e) => set("background_color", e.target.value)}
                className="h-10 w-12 rounded border border-border bg-transparent cursor-pointer"
                aria-label="Selecionar cor de fundo"
              />
            </div>
          </Field>
          <ImageField
            label="Logo"
            url={data.logo_url}
            uploading={uploadingKey === "logo_url"}
            onUpload={(e) => handleImageUpload(e, "logo_url", "logo")}
            onClear={() => set("logo_url", null)}
          />
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader><CardTitle className="font-serif text-lg">Topo (Hero)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Título">
            <Input value={data.hero_title ?? ""} onChange={(e) => set("hero_title", e.target.value)} maxLength={120} />
          </Field>
          <Field label="Subtítulo">
            <Textarea
              value={data.hero_subtitle ?? ""}
              onChange={(e) => set("hero_subtitle", e.target.value)}
              maxLength={200}
              rows={2}
            />
          </Field>
          <ImageField
            label="Imagem de fundo"
            url={data.hero_image_url}
            uploading={uploadingKey === "hero_image_url"}
            onUpload={(e) => handleImageUpload(e, "hero_image_url", "hero")}
            onClear={() => set("hero_image_url", null)}
            ratio="aspect-[16/9]"
          />
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader><CardTitle className="font-serif text-lg">Sobre</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Bio curta (frase de destaque)">
            <Textarea
              value={data.bio ?? ""}
              onChange={(e) => set("bio", e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Ex: Especialista em alongamento de cílios há 5 anos."
            />
          </Field>
          <Field label="Texto longo">
            <Textarea
              value={data.about_text ?? ""}
              onChange={(e) => set("about_text", e.target.value)}
              maxLength={2000}
              rows={5}
            />
          </Field>
          <ImageField
            label="Foto de perfil"
            url={data.about_photo_url}
            uploading={uploadingKey === "about_photo_url"}
            onUpload={(e) => handleImageUpload(e, "about_photo_url", "about")}
            onClear={() => set("about_photo_url", null)}
            ratio="aspect-[3/4]"
          />
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader><CardTitle className="font-serif text-lg">Contato</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Link do WhatsApp (com https://)">
            <Input
              value={data.whatsapp_url ?? ""}
              onChange={(e) => set("whatsapp_url", e.target.value)}
              placeholder="https://wa.me/55..."
            />
          </Field>
          <Field label="Instagram (sem @)">
            <Input
              value={data.instagram_handle ?? ""}
              onChange={(e) => set("instagram_handle", e.target.value)}
              placeholder="suamarca"
            />
          </Field>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-serif text-lg">Galeria / Mostruário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <GalleryUploader
            uploading={uploadingKey === "gallery"}
            onUpload={handleGalleryUpload}
          />
          {data.gallery && data.gallery.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {data.gallery.map((url, i) => (
                <div key={`${url}-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-border/50 group">
                  <img src={url} alt={`Galeria ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  <button
                    type="button"
                    onClick={() => removeGalleryItem(i)}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remover"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground font-sans">Nenhuma imagem ainda.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="font-serif text-lg flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Serviços
            </CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={addService} className="font-sans">
              <Plus className="w-4 h-4 mr-1" /> Novo serviço
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {servicesLoading ? (
            <p className="text-xs text-muted-foreground font-sans">Carregando serviços...</p>
          ) : services.length === 0 ? (
            <p className="text-xs text-muted-foreground font-sans">
              Nenhum serviço cadastrado. Clique em "Novo serviço" para começar.
            </p>
          ) : (
            <div className="space-y-3">
              {services.map((svc) => (
                <div
                  key={svc.id}
                  className="rounded-lg border border-border/50 p-4 space-y-3 bg-secondary/30"
                >
                  <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr] gap-3">
                    <Field label="Nome">
                      <Input
                        value={svc.name}
                        onChange={(e) => updateService(svc.id, { name: e.target.value })}
                        maxLength={100}
                        placeholder="Ex: Alongamento de cílios"
                      />
                    </Field>
                    <Field label="Preço (R$)">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={svc.price}
                        onChange={(e) => updateService(svc.id, { price: Number(e.target.value) })}
                      />
                    </Field>
                    <Field label="Duração">
                      <Input
                        value={svc.duration ?? ""}
                        onChange={(e) => updateService(svc.id, { duration: e.target.value })}
                        placeholder="Ex: 2h"
                        maxLength={50}
                      />
                    </Field>
                  </div>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <label className="flex items-center gap-2 text-xs font-sans text-muted-foreground">
                      <Switch
                        checked={svc.active}
                        onCheckedChange={(v) => updateService(svc.id, { active: v })}
                      />
                      {svc.active ? "Ativo (visível na página)" : "Inativo (oculto)"}
                    </label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteService(svc)}
                        disabled={savingServiceId === svc.id}
                        className="font-sans text-xs text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Remover
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => saveService(svc)}
                        disabled={savingServiceId === svc.id || (!svc._dirty && !svc._isNew)}
                        className="bg-gradient-gold text-primary-foreground font-sans text-xs"
                      >
                        {savingServiceId === svc.id ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3 mr-1" />
                        )}
                        {svc._isNew ? "Criar" : "Salvar"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-sans uppercase tracking-wide text-muted-foreground">{label}</Label>
    {children}
  </div>
);

const ImageField = ({
  label, url, uploading, onUpload, onClear, ratio = "aspect-square",
}: {
  label: string;
  url: string | null;
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  ratio?: string;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <Label className="text-xs font-sans uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className={`${ratio} max-w-xs rounded-lg overflow-hidden border border-border/50 bg-secondary flex items-center justify-center relative`}>
        {url ? (
          <img src={url} alt={label} className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="w-8 h-8 text-muted-foreground" />
        )}
      </div>
      <div className="flex gap-2">
        <input ref={ref} type="file" accept="image/*" onChange={onUpload} className="hidden" />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="font-sans text-xs"
        >
          {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
          {url ? "Trocar" : "Enviar"}
        </Button>
        {url && (
          <Button type="button" size="sm" variant="ghost" onClick={onClear} className="font-sans text-xs">
            <Trash2 className="w-3 h-3 mr-1" /> Remover
          </Button>
        )}
      </div>
    </div>
  );
};

const GalleryUploader = ({
  uploading, onUpload,
}: { uploading: boolean; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input ref={ref} type="file" accept="image/*" multiple onChange={onUpload} className="hidden" />
      <Button
        type="button"
        variant="outline"
        onClick={() => ref.current?.click()}
        disabled={uploading}
        className="font-sans"
      >
        {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
        Adicionar imagens (até 8 por vez)
      </Button>
    </div>
  );
};

export default BrandEditor;