import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { TypographyMap } from "@/lib/typography";

export const HUB_SLUG = "divas-plan";

export type Tenant = {
  slug: string;
  name: string;
  primary_color: string;
  background_color: string;
  whatsapp_url: string | null;
  instagram_handle: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  about_text: string | null;
  about_photo_url: string | null;
  logo_url: string | null;
  bio: string | null;
  hero_image_url: string | null;
  gallery: string[];
  badge1_icon: string;
  badge1_label: string;
  badge2_icon: string;
  badge2_label: string;
  typography: TypographyMap;
};

export type BrandService = {
  id: string;
  name: string;
  price: number;
  duration: string | null;
};

type BrandCtx = {
  tenant: Tenant;
  services: BrandService[];
  loading: false;
};

const Ctx = createContext<BrandCtx | null>(null);

const slugRe = /^[a-z0-9-]{2,50}$/;

export const BrandProvider = ({ children }: { children: ReactNode }) => {
  const { slug } = useParams<{ slug: string }>();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [services, setServices] = useState<BrandService[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setTenant(null);
    setServices([]);
    setNotFound(false);

    if (!slug || !slugRe.test(slug)) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    (async () => {
      const { data: t } = await supabase
        .from("tenants")
        .select("slug,name,primary_color,background_color,whatsapp_url,instagram_handle,hero_title,hero_subtitle,about_text,about_photo_url,logo_url,bio,hero_image_url,gallery,badge1_icon,badge1_label,badge2_icon,badge2_label,typography")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();

      if (!active) return;
      if (!t) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data: s } = await supabase
        .from("services")
        .select("id,name,price,duration")
        .eq("tenant_slug", slug)
        .eq("active", true)
        .order("price", { ascending: true });

      if (!active) return;
      setTenant(t as Tenant);
      setServices((s as BrandService[]) ?? []);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [slug]);

  // Inject brand color into CSS root (HSL conversion of hex)
  useEffect(() => {
    if (!tenant) return;
    const hsl = hexToHsl(tenant.primary_color);
    if (hsl) {
      document.documentElement.style.setProperty("--primary", hsl);
      document.documentElement.style.setProperty("--gold", hsl);
      document.documentElement.style.setProperty("--ring", hsl);
    }
    const bgHsl = hexToHsl(tenant.background_color);
    if (bgHsl) {
      document.documentElement.style.setProperty("--background", bgHsl);
    }
    document.title = tenant.name;
    return () => {
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--gold");
      document.documentElement.style.removeProperty("--ring");
      document.documentElement.style.removeProperty("--background");
    };
  }, [tenant]);

  if (notFound) return <Navigate to={`/${HUB_SLUG}`} replace />;

  if (loading || !tenant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-sans text-sm">Carregando...</p>
      </div>
    );
  }

  return (
    <Ctx.Provider value={{ tenant, services, loading: false }}>{children}</Ctx.Provider>
  );
};

export const useBrand = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useBrand must be used inside <BrandProvider>");
  return v;
};

function hexToHsl(hex: string): string | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}