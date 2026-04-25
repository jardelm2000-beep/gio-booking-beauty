import { Instagram, Award, Heart } from "lucide-react";
import aboutPhoto from "@/assets/about-photo.jpg";
import { useBrand } from "@/hooks/useBrand";

const AboutSection = () => {
  const { tenant } = useBrand();
  const photo = tenant.about_photo_url || aboutPhoto;
  const nameParts = tenant.name.split(" ");
  const head = nameParts.slice(0, -1).join(" ");
  const tail = nameParts.slice(-1)[0];
  return (
    <section id="sobre" className="py-20 sm:py-28 bg-card/50">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-border/50">
              <img
                src={photo}
                alt={tenant.name}
                className="w-full h-full object-cover"
                loading="lazy"
                width={800}
                height={1024}
              />
            </div>
          </div>

          <div className="space-y-6">
            <span className="text-xs font-sans uppercase tracking-[0.3em] text-primary">
              Sobre
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl leading-snug">
              {head} <span className="text-gradient-gold italic">{tail}</span>
            </h2>
            <p className="text-muted-foreground font-sans leading-relaxed">
              {tenant.about_text}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 pt-2">
              <div className="flex items-center gap-2 text-sm text-foreground/70 font-sans">
                <Award className="w-4 h-4 text-primary flex-shrink-0" />
                Profissional Certificada
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground/70 font-sans">
                <Heart className="w-4 h-4 text-primary flex-shrink-0" />
                +500 Clientes
              </div>
            </div>

            {tenant.instagram_handle && (
              <a
                href={`https://www.instagram.com/${tenant.instagram_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:text-gold-light transition-colors font-sans text-sm"
              >
                <Instagram className="w-4 h-4" />
                @{tenant.instagram_handle}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
