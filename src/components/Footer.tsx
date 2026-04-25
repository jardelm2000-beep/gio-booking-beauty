import { Instagram, Heart } from "lucide-react";
import { useBrand } from "@/hooks/useBrand";

const Footer = () => {
  const { tenant } = useBrand();
  return (
  <footer className="py-12 border-t border-border/50">
    <div className="container mx-auto px-4 text-center space-y-4">
      {tenant.logo_url ? (
        <img src={tenant.logo_url} alt={tenant.name} className="h-8 w-8 mx-auto opacity-60 object-contain" loading="lazy" />
      ) : null}
      <p className="text-muted-foreground text-xs font-sans">
        {tenant.name} © {new Date().getFullYear()}
      </p>
      <div className="flex justify-center gap-4">
        {tenant.instagram_handle && (
          <a
            href={`https://www.instagram.com/${tenant.instagram_handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Instagram className="w-4 h-4" />
          </a>
        )}
      </div>
      <p className="text-muted-foreground/50 text-[10px] font-sans flex items-center justify-center gap-1">
        Feito com <Heart className="w-3 h-3 text-primary/50" /> para você
      </p>
    </div>
  </footer>
  );
};

export default Footer;
