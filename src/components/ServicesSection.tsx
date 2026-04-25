import { Link, useParams } from "react-router-dom";
import { Clock, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBrand } from "@/hooks/useBrand";

const ServicesSection = () => {
  const { slug } = useParams<{ slug: string }>();
  const { services } = useBrand();
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
          {services.map((service, i) => (
            <Card
              key={service.id}
              className="bg-card border-border/50 hover:border-primary/30 transition-all duration-500 group overflow-hidden"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <CardContent className="p-6 sm:p-8 space-y-5">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-serif text-xl">{service.name}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-sans">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{service.duration ?? "Sob consulta"}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-primary font-sans text-sm font-medium">
                    A partir de R$ {Number(service.price).toFixed(0)}
                  </span>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:bg-primary/10 p-0 h-auto font-sans"
                  >
                    <Link to={`/${slug}/agendar`}>
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
