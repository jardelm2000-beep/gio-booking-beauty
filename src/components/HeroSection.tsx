import { Link, useParams } from "react-router-dom";
import { CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";
import { useBrand } from "@/hooks/useBrand";

const HeroSection = () => {
  const { slug } = useParams<{ slug: string }>();
  const { tenant } = useBrand();
  const title = tenant.hero_title ?? "Agende seu horário";
  const subtitle = tenant.hero_subtitle ?? "Bem-vinda";
  const titleParts = title.split(" ");
  const titleHead = titleParts.slice(0, -1).join(" ");
  const titleTail = titleParts.slice(-1)[0];
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />

      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-sans uppercase tracking-[0.3em]">
              {tenant.name}
            </span>
            <Sparkles className="w-4 h-4" />
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl leading-tight">
            {titleHead}{" "}
            <span className="text-gradient-gold italic">{titleTail}</span>
          </h1>

          <p className="text-foreground/60 font-sans text-sm sm:text-lg max-w-md mx-auto leading-relaxed px-2">
            {subtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 px-4">
            <Button
              asChild
              size="lg"
              className="bg-gradient-gold hover:bg-gradient-gold-hover text-primary-foreground font-sans shadow-gold tracking-wide w-full sm:w-auto"
            >
              <Link to={`/${slug}/agendar`}>
                <CalendarDays className="w-5 h-5 mr-2" />
                Agendar Horário
              </Link>
            </Button>
          {tenant.whatsapp_url && (
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-primary/30 text-primary hover:bg-primary/10 font-sans w-full sm:w-auto"
            >
              <a
                href={tenant.whatsapp_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Falar no WhatsApp
              </a>
            </Button>
          )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-primary/30 rounded-full flex justify-center pt-2">
          <div className="w-1 h-3 bg-primary/50 rounded-full" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
