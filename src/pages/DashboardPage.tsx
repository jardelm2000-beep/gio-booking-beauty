import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays, DollarSign, TrendingUp, TrendingDown, Plus, Trash2,
  LayoutDashboard, Calendar as CalIcon, Wallet, LogOut, CheckCircle2, Tag, Lock, Palette,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { safeErrorMessage } from "@/lib/safe-error";
import { useBrand } from "@/hooks/useBrand";
import BrandEditor from "@/components/admin/BrandEditor";

type AppointmentRow = {
  id: string;
  client_name: string;
  client_phone: string;
  service_name: string;
  service_price: number;
  appointment_date: string;
  appointment_time: string;
  paid: boolean;
  status: string;
};

type ExpenseRow = {
  id: string;
  description: string;
  category: string;
  amount: number;
  expense_date: string;
};

const expenseCategories = ["Materiais", "Aluguel", "Marketing", "Equipamentos", "Outros"];

const DashboardPage = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { tenant } = useBrand();
  const { user, isAdmin, isSuperAdmin, isAdminOf, loading, signOut } = useAuth();
  const hasTenantAccess = isAdminOf(slug);
  const [tab, setTab] = useState<"overview" | "agenda" | "finance" | "page">("overview");
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState(expenseCategories[0]);

  // Auth gate
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(`/auth?redirect=/${slug}/admin`, { replace: true });
    }
  }, [user, loading, navigate, slug]);

  // Carrega dados + realtime
  useEffect(() => {
    if (!user || !hasTenantAccess || !slug) return;
    let active = true;

    const load = async () => {
      const [{ data: ap }, { data: ex }] = await Promise.all([
        supabase.from("appointments").select("*").eq("tenant_slug", slug).order("appointment_date", { ascending: true }),
        supabase.from("expenses").select("*").eq("tenant_slug", slug).order("expense_date", { ascending: false }),
      ]);
      if (!active) return;
      setAppointments((ap as AppointmentRow[]) || []);
      setExpenses((ex as ExpenseRow[]) || []);
      setDataLoading(false);
    };
    load();

    const channel = supabase
      .channel(`admin-realtime-${slug}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, load)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin, slug]);

  const togglePaid = async (a: AppointmentRow) => {
    // Atualização otimista: UI responde imediatamente
    const newPaid = !a.paid;
    setAppointments((prev) =>
      prev.map((x) => (x.id === a.id ? { ...x, paid: newPaid } : x)),
    );
    const { error } = await supabase
      .from("appointments")
      .update({ paid: !a.paid })
      .eq("id", a.id);
    if (error) {
      // Reverte em caso de erro
      setAppointments((prev) =>
        prev.map((x) => (x.id === a.id ? { ...x, paid: a.paid } : x)),
      );
      toast.error(safeErrorMessage(error, "Não foi possível atualizar o pagamento."));
    } else {
      toast.success(a.paid ? "Pagamento removido" : "Marcado como pago 💖");
    }
  };

  const deleteAppointment = async (a: AppointmentRow) => {
    // Atualização otimista
    const prev = appointments;
    setAppointments((p) => p.filter((x) => x.id !== a.id));
    const { error } = await supabase.from("appointments").delete().eq("id", a.id);
    if (error) {
      setAppointments(prev);
      toast.error(safeErrorMessage(error, "Não foi possível excluir o agendamento."));
    } else {
      toast.success("Agendamento excluído");
    }
  };

  const addExpense = async () => {
    if (!slug) return;
    if (!newDesc.trim() || !newAmount) {
      toast.error("Preencha descrição e valor");
      return;
    }
    const amount = Number(newAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Valor inválido");
      return;
    }
    const { error } = await supabase.from("expenses").insert({
      tenant_slug: slug,
      description: newDesc.trim().slice(0, 200),
      category: newCategory,
      amount,
      expense_date: format(new Date(), "yyyy-MM-dd"),
      created_by: user?.id,
    });
    if (error) {
      toast.error(safeErrorMessage(error, "Não foi possível registrar a despesa."));
      return;
    }
    setNewDesc("");
    setNewAmount("");
    toast.success("Despesa registrada!");
  };

  const removeExpense = async (id: string) => {
    const prev = expenses;
    setExpenses((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) {
      setExpenses(prev);
      toast.error(safeErrorMessage(error, "Não foi possível remover a despesa."));
    }
  };

  // Cálculos derivados
  const incomeTransactions = useMemo(
    () => appointments.filter((a) => a.paid).map((a) => ({
      id: `inc-${a.id}`,
      type: "income" as const,
      description: `${a.service_name} — ${a.client_name}`,
      category: "Atendimento",
      amount: Number(a.service_price),
      date: parseISO(a.appointment_date),
      fromAppointmentId: a.id,
    })),
    [appointments],
  );
  const expenseTransactions = useMemo(
    () => expenses.map((e) => ({
      id: e.id,
      type: "expense" as const,
      description: e.description,
      category: e.category,
      amount: Number(e.amount),
      date: parseISO(e.expense_date),
    })),
    [expenses],
  );
  const transactions = useMemo(
    () => [...incomeTransactions, ...expenseTransactions],
    [incomeTransactions, expenseTransactions],
  );

  const income = incomeTransactions.reduce((s, t) => s + t.amount, 0);
  const expense = expenseTransactions.reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const monthInterval = { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };
  const monthIncome = incomeTransactions
    .filter((t) => isWithinInterval(t.date, monthInterval))
    .reduce((s, t) => s + t.amount, 0);
  const monthExpense = expenseTransactions
    .filter((t) => isWithinInterval(t.date, monthInterval))
    .reduce((s, t) => s + t.amount, 0);

  const pendingPayments = appointments
    .filter((a) => !a.paid)
    .reduce((s, a) => s + Number(a.service_price), 0);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todaysAppointments = appointments.filter((a) => a.appointment_date === todayStr);

  const chartData = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(new Date(), 5 - i);
      const interval = { start: startOfMonth(d), end: endOfMonth(d) };
      const inc = incomeTransactions.filter((t) => isWithinInterval(t.date, interval)).reduce((s, t) => s + t.amount, 0);
      const exp = expenseTransactions.filter((t) => isWithinInterval(t.date, interval)).reduce((s, t) => s + t.amount, 0);
      return { month: format(d, "MMM", { locale: ptBR }), Receitas: inc, Despesas: exp };
    });
  }, [incomeTransactions, expenseTransactions]);

  const handleSignOut = async () => {
    await signOut();
    navigate(`/${slug ?? ""}`, { replace: true });
  };

  const navItems = [
    { key: "overview" as const, icon: LayoutDashboard, label: "Visão Geral" },
    { key: "agenda" as const, icon: CalIcon, label: "Agenda" },
    { key: "finance" as const, icon: Wallet, label: "Financeiro" },
    ...(isSuperAdmin
      ? [{ key: "page" as const, icon: Palette, label: "Página" }]
      : []),
  ];

  // Garante que admin comum nunca fique preso na aba "page"
  useEffect(() => {
    if (tab === "page" && !isSuperAdmin) setTab("overview");
  }, [tab, isSuperAdmin]);

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-sans text-sm">Carregando...</p>
      </div>
    );
  }

  // Sem permissão
  if (user && !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="border-border/50 max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <Lock className="w-12 h-12 text-primary mx-auto" />
            <h2 className="font-serif text-2xl">Acesso restrito</h2>
            <p className="text-muted-foreground font-sans text-sm">
              Esta área é exclusiva para o admin de {tenant.name}. Sua conta não tem permissão.
            </p>
            <div className="flex gap-2 justify-center">
              <Button asChild variant="outline" className="font-sans"><Link to={`/${slug}`}>Voltar</Link></Button>
              <Button onClick={handleSignOut} className="bg-gradient-gold text-primary-foreground font-sans">Sair</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/50 p-6 hidden md:flex flex-col">
        <div className="flex items-center gap-2 mb-10">
          <img src={logo} alt="GB" className="h-8 w-8" />
          <span className="font-serif text-sm text-gradient-gold">{tenant.name}</span>
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
        <Button onClick={handleSignOut} variant="ghost" className="text-muted-foreground font-sans text-sm justify-start">
          <LogOut className="w-4 h-4 mr-2" /> Sair
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
            {tab === "page" && "Editar Página"}
          </h1>

          {tab === "page" && slug && isSuperAdmin && <BrandEditor slug={slug} />}

          {dataLoading && (
            <p className="text-muted-foreground font-sans text-sm">Carregando dados...</p>
          )}

          {!dataLoading && tab === "overview" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-sans uppercase tracking-wide">Receitas (mês)</span>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-xl sm:text-2xl font-sans font-semibold text-green-500">R$ {monthIncome.toFixed(0)}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-sans uppercase tracking-wide">Despesas (mês)</span>
                      <TrendingDown className="w-4 h-4 text-destructive" />
                    </div>
                    <p className="text-xl sm:text-2xl font-sans font-semibold text-destructive">R$ {monthExpense.toFixed(0)}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-sans uppercase tracking-wide">Saldo total</span>
                      <DollarSign className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-xl sm:text-2xl font-sans font-semibold text-primary">R$ {balance.toFixed(0)}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-sans uppercase tracking-wide">A receber</span>
                      <CalendarDays className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-xl sm:text-2xl font-sans font-semibold text-foreground/80">R$ {pendingPayments.toFixed(0)}</p>
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
                  {todaysAppointments.length === 0 && (
                    <p className="text-sm text-muted-foreground font-sans text-center py-4">
                      Nenhum agendamento para hoje.
                    </p>
                  )}
                  {todaysAppointments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0 gap-3">
                      <div className="min-w-0">
                        <p className="font-sans text-sm font-medium truncate">{a.client_name}</p>
                        <p className="text-xs text-muted-foreground font-sans truncate">{a.service_name} · R$ {Number(a.service_price).toFixed(0)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="border-primary/30 text-primary font-sans text-xs">
                          {a.appointment_time}
                        </Badge>
                        <Button
                          size="sm"
                          variant={a.paid ? "default" : "outline"}
                          onClick={() => togglePaid(a)}
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

          {!dataLoading && tab === "agenda" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-serif text-lg mb-4">Calendário</h3>
                  <Calendar
                    mode="single"
                    locale={ptBR}
                    className="p-3 pointer-events-auto rounded-lg border border-border/50"
                  />
                </div>

                <div>
                  <h3 className="font-serif text-lg mb-4">Próximos Agendamentos</h3>
                  <div className="space-y-3">
                    {appointments.length === 0 && (
                      <p className="text-sm text-muted-foreground font-sans">Nenhum agendamento ainda.</p>
                    )}
                    {appointments.map((a) => (
                      <Card key={a.id} className="border-border/50">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <p className="font-sans text-sm font-medium truncate">{a.client_name}</p>
                              <p className="text-xs text-muted-foreground font-sans">{a.service_name} · {a.appointment_time}</p>
                              <a
                                href={`https://wa.me/${a.client_phone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:text-primary font-sans underline-offset-2 hover:underline inline-block"
                                title="Abrir conversa no WhatsApp"
                              >
                                {a.client_phone}
                              </a>
                              <p className="text-xs text-primary font-sans mt-1">R$ {Number(a.service_price).toFixed(2)}</p>
                            </div>
                            <Badge variant="outline" className="border-primary/30 text-primary font-sans text-xs shrink-0">
                              {format(parseISO(a.appointment_date), "dd/MM")}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant={a.paid ? "default" : "outline"}
                            onClick={() => togglePaid(a)}
                            className={`w-full font-sans text-xs ${a.paid ? "bg-green-600 hover:bg-green-700 text-white" : "border-border/50"}`}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {a.paid ? "Pagamento confirmado" : "Marcar como pago"}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-full font-sans text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Excluir agendamento
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="font-serif">Excluir agendamento?</AlertDialogTitle>
                                <AlertDialogDescription className="font-sans">
                                  Tem certeza que deseja excluir o agendamento de{" "}
                                  <strong>{a.client_name}</strong> em{" "}
                                  {format(parseISO(a.appointment_date), "dd/MM")} às {a.appointment_time}?
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="font-sans">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteAppointment(a)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-sans"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!dataLoading && tab === "finance" && (
            <div className="space-y-6 animate-fade-in">
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

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">Adicionar Despesa</CardTitle>
                  <p className="text-xs text-muted-foreground font-sans">
                    💡 As receitas são geradas automaticamente quando você marca um atendimento como pago.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      placeholder="Descrição (ex: Cola de cílios)"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="bg-secondary border-border/50 font-sans"
                      maxLength={200}
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
                          {t.type === "expense" && (
                            <button
                              onClick={() => removeExpense(t.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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
