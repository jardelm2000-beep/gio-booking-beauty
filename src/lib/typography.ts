export type TypographyConfig = {
  font?: string;
  size?: string;
};

export type TypographyMap = Record<string, TypographyConfig>;

export const TYPOGRAPHY_FIELDS = [
  { key: "brand_name", label: "Nome da marca (topo)", defaultFont: "playfair", defaultSize: "sm" },
  { key: "hero_title", label: "Título do Hero", defaultFont: "playfair", defaultSize: "xl" },
  { key: "hero_subtitle", label: "Subtítulo do Hero", defaultFont: "inter", defaultSize: "md" },
  { key: "about_heading", label: "Título da seção Sobre", defaultFont: "playfair", defaultSize: "lg" },
  { key: "bio", label: "Bio (frase de destaque)", defaultFont: "inter", defaultSize: "sm" },
  { key: "about_text", label: "Texto longo do Sobre", defaultFont: "inter", defaultSize: "md" },
  { key: "badges", label: "Selos de destaque", defaultFont: "inter", defaultSize: "sm" },
] as const;

export const FONT_OPTIONS = [
  { value: "playfair", label: "Playfair Display (serifada)", css: "'Playfair Display', serif" },
  { value: "inter", label: "Inter (moderna)", css: "'Inter', sans-serif" },
  { value: "cormorant", label: "Cormorant (elegante)", css: "'Cormorant Garamond', serif" },
  { value: "montserrat", label: "Montserrat (clean)", css: "'Montserrat', sans-serif" },
  { value: "dancing", label: "Dancing Script (manuscrita)", css: "'Dancing Script', cursive" },
  { value: "vibes", label: "Great Vibes (caligrafia)", css: "'Great Vibes', cursive" },
] as const;

export const SIZE_OPTIONS = [
  { value: "xs", label: "Muito pequeno" },
  { value: "sm", label: "Pequeno" },
  { value: "md", label: "Médio" },
  { value: "lg", label: "Grande" },
  { value: "xl", label: "Enorme" },
  { value: "xxl", label: "Gigante" },
] as const;

// Map size preset -> Tailwind class (responsive friendly)
const SIZE_CLASS: Record<string, Record<string, string>> = {
  hero_title: {
    xs: "text-xl sm:text-2xl",
    sm: "text-2xl sm:text-3xl",
    md: "text-3xl sm:text-4xl md:text-5xl",
    lg: "text-3xl sm:text-5xl md:text-6xl",
    xl: "text-4xl sm:text-6xl md:text-7xl",
    xxl: "text-5xl sm:text-7xl md:text-8xl",
  },
  hero_subtitle: {
    xs: "text-xs sm:text-sm",
    sm: "text-sm sm:text-base",
    md: "text-sm sm:text-lg",
    lg: "text-base sm:text-xl",
    xl: "text-lg sm:text-2xl",
    xxl: "text-xl sm:text-3xl",
  },
  about_heading: {
    xs: "text-lg sm:text-xl",
    sm: "text-xl sm:text-2xl",
    md: "text-2xl sm:text-3xl",
    lg: "text-3xl sm:text-4xl",
    xl: "text-4xl sm:text-5xl",
    xxl: "text-5xl sm:text-6xl",
  },
  bio: {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    xxl: "text-2xl",
  },
  about_text: {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    xxl: "text-2xl",
  },
  brand_name: {
    xs: "text-[10px]",
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
    xxl: "text-xl",
  },
  badges: {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    xxl: "text-2xl",
  },
};

export function fontFamily(value?: string): string | undefined {
  if (!value) return undefined;
  return FONT_OPTIONS.find((f) => f.value === value)?.css;
}

export function sizeClass(field: string, value?: string): string {
  const map = SIZE_CLASS[field];
  if (!map) return "";
  return map[value ?? ""] ?? "";
}

export function getTypo(typography: TypographyMap | null | undefined, field: string) {
  const def = TYPOGRAPHY_FIELDS.find((f) => f.key === field);
  const cfg = typography?.[field] ?? {};
  const font = cfg.font || def?.defaultFont;
  const size = cfg.size || def?.defaultSize;
  return {
    className: sizeClass(field, size),
    style: { fontFamily: fontFamily(font) } as React.CSSProperties,
  };
}
