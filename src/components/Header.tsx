import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Menu, X, Instagram } from "lucide-react";
import { useBrand } from "@/hooks/useBrand";

const Header = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const { tenant } = useBrand();

  const base = `/${slug}`;
  const navItems = [
    { label: "Início", href: `${base}` },
    { label: "Serviços", href: `${base}#servicos` },
    { label: "Sobre", href: `${base}#sobre` },
    { label: "Agendar", href: `${base}/agendar` },
  ];

  const handleNav = (href: string) => {
    setOpen(false);
    if (href.includes("#")) {
      const id = href.split("#")[1];
      if (location.pathname === base) {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      } else {
        window.location.href = href;
      }
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-dark border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to={base} className="flex items-center gap-2">
          {tenant.logo_url ? (
            <img src={tenant.logo_url} alt={`${tenant.name} logo`} className="h-10 w-10 object-contain" />
          ) : null}
          <span className="font-serif text-lg text-gradient-gold tracking-wide">
            {tenant.name}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href.includes("#") ? base : item.href}
              onClick={() => handleNav(item.href)}
              className="text-sm font-sans text-foreground/70 hover:text-primary transition-colors tracking-wide uppercase"
            >
              {item.label}
            </Link>
          ))}
          {tenant.instagram_handle && (
            <a
              href={`https://www.instagram.com/${tenant.instagram_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/70 hover:text-primary transition-colors"
            >
              <Instagram className="w-5 h-5" />
            </a>
          )}
        </nav>

        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-foreground"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden glass-dark border-t border-border/50 animate-fade-in">
          <nav className="flex flex-col p-4 gap-4">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.href.includes("#") ? base : item.href}
                onClick={() => handleNav(item.href)}
                className="text-sm font-sans text-foreground/70 hover:text-primary transition-colors tracking-wide uppercase py-2"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
