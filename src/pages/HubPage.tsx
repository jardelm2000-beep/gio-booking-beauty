import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Heart, Rocket, Users, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const HubPage = () => {
  useEffect(() => {
    document.title = "Divas Plan | Plataforma para micro-empresárias da beleza";
    // Reset any tenant-injected CSS vars from previous navigation
    document.documentElement.style.removeProperty("--primary");
    document.documentElement.style.removeProperty("--gold");
    document.documentElement.style.removeProperty("--ring");
    document.documentElement.style.removeProperty("--background");
  }, []);
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-dark border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-serif text-lg text-gradient-gold tracking-wide">
              Divas Plan
            </span>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-primary/30 text-primary hover:bg-primary/10 font-sans"
          >
            <Link to="/auth?redirect=/divas-plan/admin">
              <Lock className="w-4 h-4 mr-2" />
              Acesso restrito
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-3xl text-center space-y-6 animate-fade-in">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-sans uppercase tracking-[0.3em]">
              O projeto
            </span>
            <Sparkles className="w-4 h-4" />
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl leading-tight">
            Divas Plan: tecnologia para{" "}
            <span className="text-gradient-gold italic">micro-empresárias</span>{" "}
            do universo da beleza
          </h1>
          <p className="text-foreground/70 font-sans text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Damos a cada profissional uma página própria, com agendamento online,
            controle financeiro e identidade visual — sem precisar de site, app
            ou conhecimento técnico.
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-16 bg-card/40">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-border/50">
              <CardContent className="p-6 space-y-3">
                <Rocket className="w-6 h-6 text-primary" />
                <h3 className="font-serif text-xl">Página própria</h3>
                <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                  Cada cliente recebe um link único (ex: divasplan.app/sua-marca)
                  pronto para colocar na bio do Instagram.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-6 space-y-3">
                <Users className="w-6 h-6 text-primary" />
                <h3 className="font-serif text-xl">Agenda inteligente</h3>
                <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                  Clientes agendam direto pelo link, sem conversas longas no
                  WhatsApp e sem horários duplicados.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-6 space-y-3">
                <Heart className="w-6 h-6 text-primary" />
                <h3 className="font-serif text-xl">Apoio real</h3>
                <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                  Cuidamos da tecnologia para que a profissional cuide do que
                  faz de melhor: encantar a cliente.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center space-y-6">
          <span className="text-xs font-sans uppercase tracking-[0.3em] text-primary">
            Missão
          </span>
          <h2 className="font-serif text-2xl sm:text-4xl leading-snug">
            Profissionalizar o atendimento de quem{" "}
            <span className="text-gradient-gold italic">empreende sozinha</span>
          </h2>
          <p className="text-muted-foreground font-sans leading-relaxed">
            Acreditamos que toda micro-empresária da beleza merece ter as mesmas
            ferramentas que grandes salões usam — sem mensalidades caras e sem
            precisar entender de tecnologia. O Divas Plan nasceu para isso.
          </p>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-xs text-muted-foreground font-sans">
        © {new Date().getFullYear()} Divas Plan
      </footer>
    </div>
  );
};

export default HubPage;