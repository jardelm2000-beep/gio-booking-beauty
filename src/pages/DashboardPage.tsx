import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays, DollarSign, TrendingUp, TrendingDown, Plus, Trash2,
  LayoutDashboard, Calendar as CalIcon, Wallet, LogOut, X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

type Transaction = {
  id: string;
  type: "income" | "expense";
  description: string;
  amount: number;
  date: Date;
};

type Appointment = {
  id: string;
  client: string;
  service: string;
  date: Date;
  time: string;
};

const mockAppointments: Appointment[] = [
  { id: "1", client: "Maria Silva", service: "Extensão de Cílios", date: new Date(), time: "09:00" },
  { id: "2", client: "Ana Costa", service: "Design de Sobrancelhas", date: new Date(), time: "11:00" },
  { id: "3", client: "Julia Santos", service: "Lash Lifting", date: new Date(), time: "14:00" },
];

const DashboardPage = () => {
  const [tab, setTab] = useState<"overview" | "agenda" | "finance">("overview");
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: "1", type: "income", description: "Extensão de Cílios — Maria", amount: 180, date: new Date() },
    { id: "2", type: "income", description: "Design de Sobrancelhas — Ana", amount: 70, date: new Date() },
    { id: "3", type: "expense", description: "Material — Cola de cílios", amount: 45, date: new Date() },
  ]);
  const [appointments] = useState<Appointment[]>(mockAppointments);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState<"income" | "expense">("income");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const addTransaction = () => {
    if (!newDesc || !newAmount) { toast.error("Preencha todos os campos"); return; }
    setTransactions([
      ...transactions,
      { id: Date.now().toString(), type: newType, description: newDesc, amount: Number(newAmount), date: new Date() },
    ]);
    setNewDesc(""); setNewAmount("");
    toast.success("Lançamento adicionado!");
  };

  const removeTransaction = (id: string) => {
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  const toggleBlockDate = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    const exists = blockedDates.some((d) => d.toDateString() === date.toDateString());
    if (exists) {
      setBlockedDates(blockedDates.filter((d) => d.toDateString() !== date.toDateString()));
      toast("Data desbloqueada");
    } else {
      setBlockedDates([...blockedDates, date]);
      toast("Data bloqueada");
    }
  };

  const navItems = [
    { key: "overview" as const, icon: LayoutDashboard, label: "Visão Geral" },
    { key: "agenda" as const, icon: CalIcon, label: "Agenda" },
    { key: "finance" as const, icon: Wallet, label: "Financeiro" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/50 p-6 hidden md:flex flex-col">
        <div className="flex items-center gap-2 mb-10">
          <img src={logo} alt="GB" className="h-8 w-8" />
          <span className="font-serif text-sm text-gradient-gold">Painel Admin</span>
        </div>
        <nav className="space-y-2 flex-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-sans transition-colors ${
                tab === item.key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <Button asChild variant="ghost" className="text-muted-foreground font-sans text-sm justify-start">
          <Link to="/"><LogOut className="w-4 h-4 mr-2" /> Sair</Link>
        </Button>
      </aside>

      {/* Mobile nav */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden glass-dark border-t border-border/50 z-50">
        <div className="flex justify-around py-3">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex flex-col items-center gap-1 text-[10px] font-sans ${
                tab === item.key ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 p-4 sm:p-8 pb-24 md:pb-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-serif text-2xl sm:text-3xl mb-8">
            {tab === "overview" && "Visão Geral"}
            {tab === "agenda" && "Agenda"}
            {tab === "finance" && "Fluxo de Caixa"}
          </h1>

          {tab === "overview" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-border/50">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground font-sans">Receitas</span>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-2xl font-sans font-semibold text-green-500">
                      R$ {income.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground font-sans">Despesas</span>
                      <TrendingDown className="w-4 h-4 text-destructive" />
                    </div>
                    <p className="text-2xl font-sans font-semibold text-destructive">
                      R$ {expense.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground font-sans">Saldo</span>
                      <DollarSign className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-2xl font-sans font-semibold text-primary">
                      R$ {balance.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="font-serif text-lg flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    Agendamentos de Hoje
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {appointments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <div>
                        <p className="font-sans text-sm font-medium">{a.client}</p>
                        <p className="text-xs text-muted-foreground font-sans">{a.service}</p>
                      </div>
                      <Badge variant="outline" className="border-primary/30 text-primary font-sans text-xs">
                        {a.time}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "agenda" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-serif text-lg mb-4">Calendário</h3>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={toggleBlockDate}
                    modifiers={{ blocked: blockedDates }}
                    modifiersClassNames={{ blocked: "bg-destructive/20 text-destructive" }}
                    locale={ptBR}
                    className="p-3 pointer-events-auto rounded-lg border border-border/50"
                  />
                  <p className="text-xs text-muted-foreground font-sans mt-3">
                    Clique em uma data para bloquear/desbloquear
                  </p>
                </div>

                <div>
                  <h3 className="font-serif text-lg mb-4">Próximos Agendamentos</h3>
                  <div className="space-y-3">
                    {appointments.map((a) => (
                      <Card key={a.id} className="border-border/50">
                        <CardContent className="p-4 flex justify-between items-center">
                          <div>
                            <p className="font-sans text-sm font-medium">{a.client}</p>
                            <p className="text-xs text-muted-foreground font-sans">{a.service} · {a.time}</p>
                          </div>
                          <Badge variant="outline" className="border-primary/30 text-primary font-sans text-xs">
                            {format(a.date, "dd/MM")}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "finance" && (
            <div className="space-y-6 animate-fade-in">
              {/* Add transaction */}
              <Card className="border-border/50">
                <CardContent className="p-5 space-y-4">
                  <h3 className="font-serif text-lg">Novo Lançamento</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={newType === "income" ? "default" : "outline"}
                      onClick={() => setNewType("income")}
                      className={`font-sans text-xs ${newType === "income" ? "bg-gradient-gold text-primary-foreground" : "border-border/50"}`}
                    >
                      Entrada
                    </Button>
                    <Button
                      size="sm"
                      variant={newType === "expense" ? "default" : "outline"}
                      onClick={() => setNewType("expense")}
                      className={`font-sans text-xs ${newType === "expense" ? "bg-destructive text-destructive-foreground" : "border-border/50"}`}
                    >
                      Saída
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Descrição"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="bg-secondary border-border/50 font-sans flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Valor"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      className="bg-secondary border-border/50 font-sans w-28"
                    />
                    <Button onClick={addTransaction} className="bg-gradient-gold text-primary-foreground">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Transactions list */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">Lançamentos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {transactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${t.type === "income" ? "bg-green-500" : "bg-destructive"}`} />
                        <div>
                          <p className="font-sans text-sm">{t.description}</p>
                          <p className="text-xs text-muted-foreground font-sans">
                            {format(t.date, "dd/MM/yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-sans text-sm font-medium ${t.type === "income" ? "text-green-500" : "text-destructive"}`}>
                          {t.type === "income" ? "+" : "-"} R$ {t.amount.toFixed(2)}
                        </span>
                        <button onClick={() => removeTransaction(t.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
