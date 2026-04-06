import { Instagram, Award, Heart } from "lucide-react";
import aboutPhoto from "@/assets/about-photo.jpg";

const AboutSection = () => {
  return (
    <section id="sobre" className="py-20 sm:py-28 bg-card/50">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-border/50">
              <img
                src={aboutPhoto}
                alt="Giovanna Belizário"
                className="w-full h-full object-cover"
                loading="lazy"
                width={800}
                height={1024}
              />
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-gradient-gold flex items-center justify-center shadow-gold">
              <span className="font-serif text-primary-foreground text-xl">GB</span>
            </div>
          </div>

          <div className="space-y-6">
            <span className="text-xs font-sans uppercase tracking-[0.3em] text-primary">
              Sobre Mim
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl leading-snug">
              Giovanna <span className="text-gradient-gold italic">Belizário</span>
            </h2>
            <p className="text-muted-foreground font-sans leading-relaxed">
              Apaixonada pela arte de realçar a beleza natural de cada mulher. 
              Com técnicas refinadas e produtos de alta qualidade, meu objetivo é 
              fazer você se sentir confiante e deslumbrante.
            </p>
            <p className="text-muted-foreground font-sans leading-relaxed">
              Cada atendimento é personalizado, porque acredito que cada madame 
              merece um tratamento exclusivo e especial.
            </p>

            <div className="flex gap-6 pt-2">
              <div className="flex items-center gap-2 text-sm text-foreground/70 font-sans">
                <Award className="w-4 h-4 text-primary" />
                Profissional Certificada
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground/70 font-sans">
                <Heart className="w-4 h-4 text-primary" />
                +500 Clientes
              </div>
            </div>

            <a
              href="https://www.instagram.com/bygiovannabelizario"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:text-gold-light transition-colors font-sans text-sm"
            >
              <Instagram className="w-4 h-4" />
              @bygiovannabelizario
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
