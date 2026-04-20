import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { safeErrorMessage } from "@/lib/safe-error";

const signupSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(100),
  phone: z.string().trim().min(8, "Telefone inválido").max(20),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});
const signinSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(1, "Informe a senha").max(72),
});

const AuthPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/agendar";
  const { user, loading } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate(redirect, { replace: true });
  }, [user, loading, navigate, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const parsed = signupSchema.safeParse({ name, phone, email, password });
        if (!parsed.success) {
          toast.error(parsed.error.errors[0].message);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: parsed.data.name, phone: parsed.data.phone },
          },
        });
        if (error) {
          toast.error(
            error.message.includes("registered")
              ? "E-mail já cadastrado"
              : safeErrorMessage(error, "Não foi possível criar a conta."),
          );
          return;
        }
        toast.success("Conta criada! 💖");
      } else {
        const parsed = signinSchema.safeParse({ email, password });
        if (!parsed.success) {
          toast.error(parsed.error.errors[0].message);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) {
          toast.error(
            error.message.includes("Invalid")
              ? "E-mail ou senha incorretos"
              : safeErrorMessage(error, "Não foi possível entrar."),
          );
          return;
        }
        toast.success("Bem-vinda de volta! 💖");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container mx-auto px-4 max-w-md flex-1 flex flex-col justify-center py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-sans mb-8">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <div className="text-center mb-8 space-y-2">
          <h1 className="font-serif text-3xl">
            {mode === "signin" ? "Entrar" : "Criar conta"}
          </h1>
          <p className="text-muted-foreground font-sans text-sm">
            {mode === "signin"
              ? "Acesse para agendar seu horário"
              : "Crie sua conta para agendar"}
          </p>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "signup" && (
                <>
                  <Input
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-secondary border-border/50 font-sans"
                    autoComplete="name"
                  />
                  <Input
                    placeholder="WhatsApp (ex: 11 99999-9999)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-secondary border-border/50 font-sans"
                    autoComplete="tel"
                  />
                </>
              )}
              <Input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-secondary border-border/50 font-sans"
                autoComplete="email"
              />
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-secondary border-border/50 font-sans"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-gold text-primary-foreground font-sans shadow-gold"
              >
                {submitting ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="w-full text-center text-sm text-muted-foreground hover:text-primary font-sans mt-4 transition-colors"
            >
              {mode === "signin"
                ? "Não tem conta? Criar conta"
                : "Já tem conta? Entrar"}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
