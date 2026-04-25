import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

type T = { slug: string; name: string; primary_color: string };

const HubPage = () => {
  const [tenants, setTenants] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("tenants")
      .select("slug,name,primary_color")
      .eq("active", true)
      .order("name")
      .then(({ data }) => {
        setTenants((data as T[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full text-center space-y-8 animate-fade-in">
        <div className="flex items-center justify-center gap-2 text-primary">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-sans uppercase tracking-[0.3em]">Divas Plan</span>
          <Sparkles className="w-4 h-4" />
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl">
          Escolha sua <span className="text-gradient-gold italic">marca</span>
        </h1>
        <p className="text-muted-foreground font-sans text-sm max-w-md mx-auto">
          Selecione o estabelecimento para conhecer e agendar seu horário.
        </p>

        {loading ? (
          <p className="text-muted-foreground font-sans text-sm">Carregando...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            {tenants.map((t) => (
              <Link key={t.slug} to={`/${t.slug}`}>
                <Card className="border-border/50 hover:border-primary/40 transition-all cursor-pointer">
                  <CardContent className="p-6 text-left space-y-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: t.primary_color }}
                    />
                    <p className="font-serif text-xl">{t.name}</p>
                    <p className="text-muted-foreground text-xs font-sans">/{t.slug}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HubPage;