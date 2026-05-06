import { useEffect, useState } from "react";
import { format, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, CheckCircle, ArrowLeft, MessageCircle, Lock } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { safeErrorMessage } from "@/lib/safe-error";
import { useBrand } from "@/hooks/useBrand";

const timeSlots = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

const bookingSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(100, "Nome muito longo"),
  phone: z
    .string()
    .trim()
    .min(8, "Telefone inválido")
    .max(20, "Telefone muito longo")
    .regex(/^[\d\s()+\-]+$/, "Telefone inválido"),
});

const BookingPage = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenant, services } = useBrand();
  const { user, loading } = useAuth();
  const initialService = searchParams.get("service");
  const initialDateStr = searchParams.get("date");
  const initialTime = searchParams.get("time");
  const initialStep = Number(searchParams.get("step") || "1");
  const [step, setStep] = useState<number>(
    Number.isFinite(initialStep) && initialStep >= 1 && initialStep <= 4 ? initialStep : 1,
  );
  const [selectedService, setSelectedService] = useState<string | null>(initialService);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialDateStr ? new Date(`${initialDateStr}T00:00:00`) : undefined,
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(initialTime);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reseta estado ao trocar de marca (evita reservar para a marca errada)
  useEffect(() => {
    // Mantém estado se veio via query (retorno do login); caso contrário reseta
    if (!initialService && !initialDateStr && !initialTime) {
      setStep(1);
      setSelectedService(null);
      setSelectedDate(undefined);
      setSelectedTime(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (user) {
      // Pré-preenche com dados do perfil
      supabase
        .from("profiles")
        .select("display_name, phone")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.display_name) setName((n) => n || data.display_name!);
          if (data?.phone) setPhone((p) => p || data.phone!);
        });
    }
  }, [user]);

  // Limpa parâmetros da URL após restaurar o estado
  useEffect(() => {
    if (searchParams.get("service") || searchParams.get("date") || searchParams.get("time") || searchParams.get("step")) {
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToLogin = () => {
    const params = new URLSearchParams();
    if (selectedService) params.set("service", selectedService);
    if (selectedDate) params.set("date", format(selectedDate, "yyyy-MM-dd"));
    if (selectedTime) params.set("time", selectedTime);
    params.set("step", "3");
    const redirect = `/${slug}/agendar?${params.toString()}`;
    navigate(`/auth?redirect=${encodeURIComponent(redirect)}`);
  };

  const handleConfirm = async () => {
    if (!user || !selectedService || !selectedDate || !selectedTime || !slug) return;

    const parsed = bookingSchema.safeParse({ name, phone });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    const service = services.find((s) => s.id === selectedService);
    if (!service) return;

    setSubmitting(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    // Pré-checagem de conflito por marca (a constraint do banco é a fonte da verdade)
    const { count } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("tenant_slug", slug)
      .eq("appointment_date", dateStr)
      .eq("appointment_time", selectedTime)
      .neq("status", "cancelado");

    if ((count ?? 0) > 0) {
      setSubmitting(false);
      toast.error("Este horário acabou de ser reservado. Escolha outro.");
      setStep(2);
      return;
    }

    // service_price será SOBRESCRITO pelo trigger no banco (defesa server-side)
    const { error } = await supabase.from("appointments").insert({
      user_id: user.id,
      tenant_slug: slug,
      client_name: parsed.data.name,
      client_phone: parsed.data.phone,
      service_name: service.name,
      service_price: service.price,
      appointment_date: dateStr,
      appointment_time: selectedTime,
      status: "pendente",
    });
    setSubmitting(false);

    if (error) {
      toast.error(safeErrorMessage(error, "Não foi possível agendar. Tente novamente."));
      return;
    }
    setStep(4);
    toast.success("Agendamento realizado com sucesso! 💖");
  };

  const service = services.find((s) => s.id === selectedService);

  if (loading && step === 3 && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-sans text-sm">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-16 container mx-auto px-4 max-w-2xl">
        <Link to={`/${slug}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-sans mb-8">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <div className="text-center mb-10 space-y-2">
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl">
            Agende seu <span className="text-gradient-gold italic">horário</span>
          </h1>
          <p className="text-muted-foreground font-sans text-sm">Passo {step} de 4</p>
          <div className="flex gap-1 justify-center mt-3">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1 w-12 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-border"}`}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="font-serif text-lg text-center">Escolha o serviço</h3>
            {services.map((s) => (
              <Card
                key={s.id}
                onClick={() => { setSelectedService(s.id); setStep(2); }}
                className={`cursor-pointer border transition-all hover:border-primary/30 ${
                  selectedService === s.id ? "border-primary" : "border-border/50"
                }`}
              >
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="font-sans font-medium">{s.name}</p>
                    <p className="text-muted-foreground text-xs font-sans flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" /> {s.duration ?? "Sob consulta"}
                    </p>
                  </div>
                  <span className="text-primary font-sans font-medium text-sm">R$ {s.price}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="font-serif text-lg text-center">Escolha a data e horário</h3>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => isBefore(date, startOfDay(new Date())) || date.getDay() === 0}
                locale={ptBR}
                className="p-3 pointer-events-auto rounded-lg border border-border/50"
              />
            </div>
            {selectedDate && (
              <div className="space-y-3">
                <p className="text-sm font-sans text-center text-muted-foreground">
                  {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {timeSlots.map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setSelectedTime(time); setStep(3); }}
                      className={`font-sans text-xs ${
                        selectedTime === time
                          ? "bg-gradient-gold text-primary-foreground"
                          : "border-border/50 text-foreground/70 hover:border-primary/30"
                      }`}
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="font-serif text-lg text-center">Seus dados</h3>
            <Card className="border-border/50">
              <CardContent className="p-6 space-y-4">
                <div className="text-center space-y-1 pb-4 border-b border-border/50">
                  <p className="font-sans font-medium">{service?.name}</p>
                  <p className="text-muted-foreground text-xs font-sans">
                    {selectedDate && format(selectedDate, "dd/MM/yyyy")} às {selectedTime}
                  </p>
                </div>
                <Input
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-secondary border-border/50 font-sans"
                  maxLength={100}
                />
                <Input
                  placeholder="WhatsApp (ex: 11 99999-9999)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-secondary border-border/50 font-sans"
                  maxLength={20}
                />
                <Button
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="w-full bg-gradient-gold text-primary-foreground font-sans shadow-gold"
                >
                  {submitting ? "Agendando..." : "Confirmar Agendamento"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 4 && (
          <div className="text-center space-y-6 animate-fade-in py-12">
            <CheckCircle className="w-16 h-16 text-primary mx-auto" />
            <h3 className="font-serif text-2xl">Agendamento Confirmado!</h3>
            <div className="space-y-1 text-muted-foreground font-sans text-sm">
              <p>{service?.name}</p>
              <p>{selectedDate && format(selectedDate, "dd/MM/yyyy")} às {selectedTime}</p>
              <p>{name} — {phone}</p>
            </div>
            <p className="text-muted-foreground font-sans text-xs">
              Entraremos em contato pelo WhatsApp para confirmar 💖
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              {tenant.whatsapp_url && (
                <Button
                  asChild
                  className="bg-[#25D366] hover:bg-[#1FAE54] text-white font-sans"
                >
                  <a
                    href={buildWhatsAppLink(
                      tenant.whatsapp_url,
                      `Olá! Acabei de agendar ${service?.name} para ${
                        selectedDate ? format(selectedDate, "dd/MM/yyyy") : ""
                      } às ${selectedTime}. Meu nome é ${name}.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Falar no WhatsApp
                  </a>
                </Button>
              )}
              <Button asChild variant="outline" className="border-primary/30 text-primary font-sans">
                <Link to={`/${slug}`}>Voltar ao Início</Link>
              </Button>
            </div>
          </div>
        )}

        {step > 1 && step < 4 && (
          <Button
            variant="ghost"
            onClick={() => setStep(step - 1)}
            className="mt-6 text-muted-foreground font-sans text-sm"
          >
            ← Voltar
          </Button>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default BookingPage;

function buildWhatsAppLink(raw: string, message: string): string {
  const text = encodeURIComponent(message);
  const trimmed = raw.trim();
  // Already a full wa.me / api.whatsapp link
  if (/^https?:\/\//i.test(trimmed)) {
    const sep = trimmed.includes("?") ? "&" : "?";
    return /[?&]text=/.test(trimmed) ? trimmed : `${trimmed}${sep}text=${text}`;
  }
  // Otherwise treat as a phone number
  const digits = trimmed.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${text}`;
}
