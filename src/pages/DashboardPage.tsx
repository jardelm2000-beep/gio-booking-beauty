import { useState, useMemo, useEffect } from "react";
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays, DollarSign, TrendingUp, TrendingDown, Plus, Trash2,
  LayoutDashboard, Calendar as CalIcon, Wallet, LogOut, CheckCircle2, Tag,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

type Transaction = {
  id: string;
  type: "income" | "expense";
  description: string;
  category: string;
  amount: number;
  date: Date;
  fromAppointmentId?: string;
};

type Appointment = {
  id: string;
  client: string;
  service: string;
  price: number;
  date: Date;
  time: string;
  paid: boolean;
};

const expenseCategories = ["Materiais", "Aluguel", "Marketing", "Equipamentos", "Outros"];

const initialAppointments: Appointment[] = [
  { id: "a1", client: "Maria Silva", service: "Extensão de Cílios", price: 150, date: new Date(), time: "09:00", paid: true },
  { id: "a2", client: "Ana Costa", service: "Design de Sobrancelhas", price: 60, date: new Date(), time: "11:00", paid: false },
  { id: "a3", client: "Julia Santos", service: "Lash Lifting", price: 120, date: new Date(), time: "14:00", paid: false },
];

const DashboardPage = () => {
  const [tab, setTab] = useState<"overview" | "agenda" | "finance">("overview");
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: "t0", type: "expense", description: "Cola de cílios premium", category: "Materiais", amount: 45, date: new Date() },
  ]);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  // Expense form
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState(expenseCategories[0]);

  // Auto-generate income transactions from paid appointments
  useEffect(() => {
    setTransactions((prev) => {
      const existingIds = new Set(prev.filter((t) => t.fromAppointmentId).map((t) => t.fromAppointmentId));
      const newOnes: Transaction[] = appointments
        .filter((a) => a.paid && !existingIds.has(a.id))
        .map((a) => ({
          id: `inc-${a.id}`,
          type: "income",
          description: `${a.service} — ${a.client}`,
          category: "Atendimento",
          amount: a.price,
          date: a.date,
          fromAppointmentId: a.id,
        }));
      // Remove income transactions whose appointment was unpaid
      const stillValid = prev.filter((t) => {
        if (!t.fromAppointmentId) return true;
        const appt = appointments.find((a) => a.id === t.fromAppointmentId);
        return appt?.paid;
      });
      return [...stillValid, ...newOnes];
    });
  }, [appointments]);

  const togglePaid = (id: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, paid: !a.paid } : a)),
    );
    const appt = appointments.find((a) => a.id === id);
    toast.success(appt?.paid ? "Pagamento removido" : "Atendimento marcado como pago 💖");
  };

  const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  // Current month metrics
  const monthInterval = { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };
  const monthIncome = transactions
    .filter((t) => t.type === "income" && isWithinInterval(t.date, monthInterval))
    .reduce((s, t) => s + t.amount, 0);
  const monthExpense = transactions
    .filter((t) => t.type === "expense" && isWithinInterval(t.date, monthInterval))
    .reduce((s, t) => s + t.amount, 0);

  const pendingPayments = appointments
    .filter((a) => !a.paid)
    .reduce((s, a) => s + a.price, 0);

  // Chart data — last 6 months
  const chartData = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(new Date(), 5 - i);
      const interval = { start: startOfMonth(d), end: endOfMonth(d) };
      const inc = transactions
        .filter((t) => t.type === "income" && isWithinInterval(t.date, interval))
        .reduce((s, t) => s + t.amount, 0);
      const exp = transactions
        .filter((t) => t.type === "expense" && isWithinInterval(t.date, interval))
        .reduce((s, t) => s + t.amount, 0);
      return {
        month: format(d, "MMM", { locale: ptBR }),
        Receitas: inc,
        Despesas: exp,
      };
    });
  }, [transactions]);

  const addExpense = () => {
    if (!newDesc || !newAmount) {
      toast.error("Preencha descrição e valor");
      return;
    }
    setTransactions((prev) => [
      ...prev,
      {
        id: `exp-${Date.now()}`,
        type: "expense",
        description: newDesc,
        category: newCategory,
        amount: Number(newAmount),
        date: new Date(),
      },
    ]);
    setNewDesc("");
    setNewAmount("");
    toast.success("Despesa registrada!");
  };

  const removeTransaction = (id: string, fromAppt?: string) => {
    if (fromAppt) {
      toast.error("Receitas vêm dos atendimentos. Desmarque o pagamento na Agenda.");
      return;
    }
    setTransactions((prev) => prev.filter((t) => t.id !== id));
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-sans uppercase tracking-wide">Receitas (mês)</span>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-xl sm:text-2xl font-sans font-semibold text-green-500">
                      R$ {monthIncome.toFixed(0)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-sans uppercase tracking-wide">Despesas (mês)</span>
                      <TrendingDown className="w-4 h-4 text-destructive" />
                    </div>
                    <p className="text-xl sm:text-2xl font-sans font-semibold text-destructive">
                      R$ {monthExpense.toFixed(0)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-sans uppercase tracking-wide">Saldo total</span>
                      <DollarSign className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-xl sm:text-2xl font-sans font-semibold text-primary">
                      R$ {balance.toFixed(0)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-sans uppercase tracking-wide">A receber</span>
                      <CalendarDays className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-xl sm:text-2xl font-sans font-semibold text-foreground/80">
                      R$ {pendingPayments.toFixed(0)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">Faturamento — últimos 6 meses</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="Receitas" fill="hsl(var(--gold))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="font-serif text-lg flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    Agendamentos de Hoje
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {appointments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0 gap-3">
                      <div className="min-w-0">
                        <p className="font-sans text-sm font-medium truncate">{a.client}</p>
                        <p className="text-xs text-muted-foreground font-sans truncate">{a.service} · R$ {a.price}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="border-primary/30 text-primary font-sans text-xs">
                          {a.time}
                        </Badge>
                        <Button
                          size="sm"
                          variant={a.paid ? "default" : "outline"}
                          onClick={() => togglePaid(a.id)}
                          className={`font-sans text-xs h-7 ${a.paid ? "bg-green-600 hover:bg-green-700 text-white" : "border-border/50"}`}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {a.paid ? "Pago" : "Receber"}
                        </Button>
                      </div>
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
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <p className="font-sans text-sm font-medium truncate">{a.client}</p>
                              <p className="text-xs text-muted-foreground font-sans">{a.service} · {a.time}</p>
                              <p className="text-xs text-primary font-sans mt-1">R$ {a.price.toFixed(2)}</p>
                            </div>
                            <Badge variant="outline" className="border-primary/30 text-primary font-sans text-xs shrink-0">
                              {format(a.date, "dd/MM")}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant={a.paid ? "default" : "outline"}
                            onClick={() => togglePaid(a.id)}
                            className={`w-full font-sans text-xs ${a.paid ? "bg-green-600 hover:bg-green-700 text-white" : "border-border/50"}`}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {a.paid ? "Pagamento confirmado" : "Marcar como pago"}
                          </Button>
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
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <p className="text-[10px] text-muted-foreground font-sans uppercase tracking-wide mb-1">Receitas</p>
                    <p className="text-lg sm:text-xl font-sans font-semibold text-green-500">R$ {income.toFixed(0)}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <p className="text-[10px] text-muted-foreground font-sans uppercase tracking-wide mb-1">Despesas</p>
                    <p className="text-lg sm:text-xl font-sans font-semibold text-destructive">R$ {expense.toFixed(0)}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <p className="text-[10px] text-muted-foreground font-sans uppercase tracking-wide mb-1">Saldo</p>
                    <p className="text-lg sm:text-xl font-sans font-semibold text-primary">R$ {balance.toFixed(0)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Add expense */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">Adicionar Despesa</CardTitle>
                  <p className="text-xs text-muted-foreground font-sans">
                    💡 As receitas são geradas automaticamente quando você marca um atendimento como pago na Agenda.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      placeholder="Descrição (ex: Cola de cílios)"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="bg-secondary border-border/50 font-sans"
                    />
                    <Select value={newCategory} onValueChange={setNewCategory}>
                      <SelectTrigger className="bg-secondary border-border/50 font-sans">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Valor (R$)"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      className="bg-secondary border-border/50 font-sans flex-1"
                    />
                    <Button onClick={addExpense} className="bg-gradient-gold text-primary-foreground font-sans">
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
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
                  {transactions.length === 0 && (
                    <p className="text-sm text-muted-foreground font-sans text-center py-6">
                      Nenhum lançamento ainda.
                    </p>
                  )}
                  {transactions
                    .slice()
                    .sort((a, b) => b.date.getTime() - a.date.getTime())
                    .map((t) => (
                      <div key={t.id} className="flex items-center justify-between py-3 border-b border-border/30 last:border-0 gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${t.type === "income" ? "bg-green-500" : "bg-destructive"}`} />
                          <div className="min-w-0">
                            <p className="font-sans text-sm truncate">{t.description}</p>
                            <p className="text-xs text-muted-foreground font-sans flex items-center gap-1.5">
                              <Tag className="w-3 h-3" /> {t.category} · {format(t.date, "dd/MM/yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`font-sans text-sm font-medium ${t.type === "income" ? "text-green-500" : "text-destructive"}`}>
                            {t.type === "income" ? "+" : "-"} R$ {t.amount.toFixed(2)}
                          </span>
                          <button
                            onClick={() => removeTransaction(t.id, t.fromAppointmentId)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
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
