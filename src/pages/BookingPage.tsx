import { useState } from "react";
import { format, addDays, isBefore, startOfDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Clock, CheckCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const services = [
  { id: "cilios", name: "Extensão de Cílios", duration: "1h30", price: 150 },
  { id: "sobrancelha", name: "Design de Sobrancelhas", duration: "40min", price: 60 },
  { id: "lifting", name: "Lash Lifting", duration: "1h", price: 120 },
];

const timeSlots = [
  "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00",
];

const BookingPage = () => {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleConfirm = () => {
    if (!name || !phone) {
      toast.error("Preencha seu nome e telefone.");
      return;
    }
    setStep(4);
    toast.success("Agendamento realizado com sucesso! 💖");
  };

  const service = services.find((s) => s.id === selectedService);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-16 container mx-auto px-4 max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-sans mb-8">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <div className="text-center mb-10 space-y-2">
          <h1 className="font-serif text-3xl sm:text-4xl">
            Agende seu <span className="text-gradient-gold italic">horário</span>
          </h1>
          <p className="text-muted-foreground font-sans text-sm">
            Passo {step} de 4
          </p>
          <div className="flex gap-1 justify-center mt-3">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1 w-12 rounded-full transition-colors ${
                  s <= step ? "bg-primary" : "bg-border"
                }`}
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
                      <Clock className="w-3 h-3" /> {s.duration}
                    </p>
                  </div>
                  <span className="text-primary font-sans font-medium text-sm">
                    R$ {s.price}
                  </span>
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
                <div className="grid grid-cols-4 gap-2">
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
                />
                <Input
                  placeholder="WhatsApp (ex: 11 99999-9999)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-secondary border-border/50 font-sans"
                />
                <Button
                  onClick={handleConfirm}
                  className="w-full bg-gradient-gold text-primary-foreground font-sans shadow-gold"
                >
                  Confirmar Agendamento
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
            <Button asChild variant="outline" className="border-primary/30 text-primary font-sans">
              <Link to="/">Voltar ao Início</Link>
            </Button>
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
