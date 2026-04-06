import { Link } from "react-router-dom";
import { Eye, Paintbrush, Sparkles, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: Eye,
    title: "Extensão de Cílios",
    description: "Fio a fio, volume brasileiro e mega volume. Olhar poderoso e natural.",
    duration: "1h30 — 2h",
    price: "A partir de R$ 150",
  },
  {
    icon: Paintbrush,
    title: "Design de Sobrancelhas",
    description: "Modelagem perfeita com henna ou tintura para valorizar seu rosto.",
    duration: "40min",
    price: "A partir de R$ 60",
  },
  {
    icon: Sparkles,
    title: "Lash Lifting",
    description: "Curvatura e tintura dos cílios naturais para um efeito duradouro.",
    duration: "1h",
    price: "A partir de R$ 120",
  },
];

const ServicesSection = () => {
  return (
    <section id="servicos" className="py-20 sm:py-28">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-3">
          <span className="text-xs font-sans uppercase tracking-[0.3em] text-primary">
            Nossos Serviços
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl">
            O que oferecemos
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {services.map((service, i) => (
            <Card
              key={service.title}
              className="bg-card border-border/50 hover:border-primary/30 transition-all duration-500 group overflow-hidden"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <CardContent className="p-6 sm:p-8 space-y-5">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <service.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-serif text-xl">{service.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed font-sans">
                  {service.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-sans">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{service.duration}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-primary font-sans text-sm font-medium">
                    {service.price}
                  </span>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:bg-primary/10 p-0 h-auto font-sans"
                  >
                    <Link to="/agendar">
                      Agendar <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
