import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  Building2,
  CalendarClock,
  CalendarPlus2,
  ClipboardCheck,
  ClipboardList,
  Copy,
  LayoutDashboard,
  LogOut,
  Settings2,
  Shield,
  Sparkles,
  Users2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { RoleBadge } from "@/components/role-badge";
import { supabase } from "@/integrations/supabase/client";
import type {
  Categoria,
  Convite,
  Escala,
  FolgaLancamento,
  Funcionario,
  HistoricoTransferencia,
  Municipio,
  PedidoFolga,
  Role,
  Unidade,
  Usuario,
} from "@/lib/app-types";
import { roleLabels } from "@/lib/app-types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";

type DashboardSection = "overview" | "registry" | "operations" | "access";

async function fetchCollection<T>(table: string, orderBy: string, ascending = true) {
  const { data, error } = await supabase.from(table).select("*").order(orderBy, { ascending });

  if (error) {
    throw error;
  }

  return (data ?? []) as T[];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function SidebarLink({
  icon: Icon,
  active,
  title,
  description,
  onClick,
}: {
  icon: LucideIcon;
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-start gap-3 rounded-[1.4rem] border px-4 py-4 text-left transition",
        active
          ? "border-primary/20 bg-primary text-primary-foreground shadow-[0_20px_50px_rgba(95,76,164,0.22)]"
          : "border-transparent bg-transparent text-foreground hover:border-border/60 hover:bg-background/70",
      )}
      onClick={onClick}
      type="button"
    >
      <div
        className={cn(
          "mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl",
          active ? "bg-white/20 text-white" : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className={cn("text-sm font-semibold", active ? "text-white" : "text-foreground")}>{title}</p>
        <p className={cn("mt-1 text-xs leading-5", active ? "text-white/80" : "text-muted-foreground")}>
          {description}
        </p>
      </div>
    </button>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <Card className="rounded-[1.75rem] border-border/70 bg-card shadow-[0_24px_80px_rgba(95,76,164,0.06)]">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-background/70 px-4 py-6 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

export function ManagementDashboard() {
  const queryClient = useQueryClient();
  const { user, profile, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState<DashboardSection>("overview");
  const [newUnitName, setNewUnitName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("gerente");
  const [inviteUnitId, setInviteUnitId] = useState("");
  const [inviteCategoryId, setInviteCategoryId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [employeeCategoryId, setEmployeeCategoryId] = useState("");
  const [employeeUnitId, setEmployeeUnitId] = useState("");
  const [scaleEmployeeId, setScaleEmployeeId] = useState("");
  const [scaleDate, setScaleDate] = useState("");
  const [scaleType, setScaleType] = useState<"normal" | "extra">("normal");
  const [leaveEmployeeId, setLeaveEmployeeId] = useState("");
  const [transferDrafts, setTransferDrafts] = useState<Record<string, string>>({});
  const [userScopeDrafts, setUserScopeDrafts] = useState<Record<string, string>>({});
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);

  const role = profile?.nivel;
  const isAdmin = role === "admin";
  const isRH = role === "rh";
  const isChefe = role === "chefe";
  const isGerente = role === "gerente";
  const canManageStructure = isAdmin;
  const canCreateEmployees = isAdmin || isGerente;
  const canCreateScales = isAdmin || isChefe;
  const canRequestLeave = isAdmin || isGerente;
  const canApproveLeave = isAdmin || isChefe;
  const canTransferEmployees = isAdmin || isChefe;
  const canManageUsers = isAdmin;

  const municipiosQuery = useQuery({
    queryKey: ["municipios"],
    queryFn: () => fetchCollection<Municipio>("municipios", "nome"),
  });
  const unidadesQuery = useQuery({
    queryKey: ["unidades"],
    queryFn: () => fetchCollection<Unidade>("unidades", "nome"),
  });
  const categoriasQuery = useQuery({
    queryKey: ["categorias"],
    queryFn: () => fetchCollection<Categoria>("categorias", "nome"),
  });
  const usuariosQuery = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => fetchCollection<Usuario>("usuarios", "nome"),
  });
  const convitesQuery = useQuery({
    queryKey: ["convites"],
    queryFn: () => fetchCollection<Convite>("convites", "created_at", false),
  });
  const funcionariosQuery = useQuery({
    queryKey: ["funcionarios"],
    queryFn: () => fetchCollection<Funcionario>("funcionarios", "nome"),
  });
  const escalasQuery = useQuery({
    queryKey: ["escalas"],
    queryFn: () => fetchCollection<Escala>("escalas", "data", false),
  });
  const folgasQuery = useQuery({
    queryKey: ["folgas"],
    queryFn: () => fetchCollection<FolgaLancamento>("folgas", "created_at", false),
  });
  const pedidosQuery = useQuery({
    queryKey: ["pedidos_folga"],
    queryFn: () => fetchCollection<PedidoFolga>("pedidos_folga", "created_at", false),
  });
  const historicoQuery = useQuery({
    queryKey: ["historico_transferencias"],
    queryFn: () => fetchCollection<HistoricoTransferencia>("historico_transferencias", "data_transferencia", false),
  });

  const municipios = municipiosQuery.data ?? [];
  const unidades = unidadesQuery.data ?? [];
  const categorias = categoriasQuery.data ?? [];
  const usuarios = usuariosQuery.data ?? [];
  const convites = convitesQuery.data ?? [];
  const funcionarios = funcionariosQuery.data ?? [];
  const escalas = escalasQuery.data ?? [];
  const folgas = folgasQuery.data ?? [];
  const pedidos = pedidosQuery.data ?? [];
  const historico = historicoQuery.data ?? [];

  useEffect(() => {
    setTransferDrafts(Object.fromEntries(funcionarios.map((item) => [item.id, item.unidade_id])));
  }, [funcionarios]);

  useEffect(() => {
    setUserScopeDrafts(
      Object.fromEntries(usuarios.map((item) => [item.id, item.unidade_id ?? item.categoria_id ?? ""])),
    );
  }, [usuarios]);

  const municipioAtual = useMemo(
    () => municipios.find((item) => item.id === profile?.municipio_id) ?? null,
    [municipios, profile?.municipio_id],
  );
  const unidadesById = useMemo(() => Object.fromEntries(unidades.map((item) => [item.id, item])), [unidades]);
  const categoriasById = useMemo(
    () => Object.fromEntries(categorias.map((item) => [item.id, item])),
    [categorias],
  );
  const funcionariosById = useMemo(
    () => Object.fromEntries(funcionarios.map((item) => [item.id, item])),
    [funcionarios],
  );
  const usuariosById = useMemo(() => Object.fromEntries(usuarios.map((item) => [item.id, item])), [usuarios]);

  const saldoByEmployee = useMemo(() => {
    return folgas.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.funcionario_id] = (accumulator[item.funcionario_id] ?? 0) + item.quantidade;
      return accumulator;
    }, {});
  }, [folgas]);

  const employeeRows = useMemo(
    () =>
      funcionarios.map((item) => ({
        ...item,
        categoriaNome: categoriasById[item.categoria_id]?.nome ?? "Sem categoria",
        unidadeNome: unidadesById[item.unidade_id]?.nome ?? "Sem unidade",
        saldo: saldoByEmployee[item.id] ?? 0,
      })),
    [categoriasById, funcionarios, saldoByEmployee, unidadesById],
  );

  const scaleRows = useMemo(
    () =>
      escalas.map((item) => ({
        ...item,
        funcionarioNome: funcionariosById[item.funcionario_id]?.nome ?? "Funcionário removido",
        unidadeNome: unidadesById[item.unidade_id]?.nome ?? "Unidade removida",
      })),
    [escalas, funcionariosById, unidadesById],
  );

  const requestRows = useMemo(
    () =>
      pedidos.map((item) => ({
        ...item,
        funcionarioNome: funcionariosById[item.funcionario_id]?.nome ?? "Funcionário removido",
        solicitadoPorNome: usuariosById[item.solicitado_por]?.nome ?? "Usuário removido",
      })),
    [funcionariosById, pedidos, usuariosById],
  );

  const transferRows = useMemo(
    () =>
      historico.map((item) => ({
        ...item,
        funcionarioNome: funcionariosById[item.funcionario_id]?.nome ?? "Funcionário removido",
        origemNome: unidadesById[item.unidade_origem]?.nome ?? "Origem removida",
        destinoNome: unidadesById[item.unidade_destino]?.nome ?? "Destino removido",
      })),
    [funcionariosById, historico, unidadesById],
  );

  const pendingRequests = requestRows.filter((item) => item.status === "pendente");
  const extraScales = scaleRows.filter((item) => item.tipo === "extra");
  const activeInvites = convites.filter((item) => !item.usado);
  const totalSaldo = Object.values(saldoByEmployee).reduce((sum, amount) => sum + amount, 0);

  const refreshData = async () => {
    await queryClient.invalidateQueries();
  };

  const performAction = async (key: string, action: () => Promise<void>, successMessage: string) => {
    try {
      setSubmittingKey(key);
      await action();
      await refreshData();
      toast.success(successMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível concluir a operação.";
      toast.error(message);
    } finally {
      setSubmittingKey(null);
    }
  };

  const createUnit = async () => {
    const nome = newUnitName.trim();
    if (!nome) {
      toast.error("Informe o nome da unidade.");
      return;
    }

    await performAction(
      "create-unit",
      async () => {
        const { error } = await supabase.from("unidades").insert({ nome });
        if (error) throw error;
        setNewUnitName("");
      },
      "Unidade criada com sucesso.",
    );
  };

  const createCategory = async () => {
    const nome = newCategoryName.trim();
    if (!nome) {
      toast.error("Informe o nome da categoria.");
      return;
    }

    await performAction(
      "create-category",
      async () => {
        const { error } = await supabase.from("categorias").insert({ nome });
        if (error) throw error;
        setNewCategoryName("");
      },
      "Categoria criada com sucesso.",
    );
  };

  const createInvite = async () => {
    if (inviteRole === "gerente" && !inviteUnitId) {
      toast.error("Selecione a unidade do gerente.");
      return;
    }

    if (inviteRole === "chefe" && !inviteCategoryId) {
      toast.error("Selecione a categoria do chefe.");
      return;
    }

    await performAction(
      "create-invite",
      async () => {
        const { error } = await supabase.from("convites").insert({
          nivel: inviteRole,
          unidade_id: inviteRole === "gerente" ? inviteUnitId : null,
          categoria_id: inviteRole === "chefe" ? inviteCategoryId : null,
          criado_por: user?.id ?? null,
        });
        if (error) throw error;
      },
      "Convite criado com sucesso.",
    );
  };

  const createEmployee = async () => {
    const nome = employeeName.trim();
    const categoriaId = employeeCategoryId;
    const unidadeId = isGerente ? profile?.unidade_id ?? "" : employeeUnitId;

    if (!nome || !categoriaId || !unidadeId) {
      toast.error("Preencha nome, categoria e unidade do funcionário.");
      return;
    }

    await performAction(
      "create-employee",
      async () => {
        const { error } = await supabase.from("funcionarios").insert({
          nome,
          categoria_id: categoriaId,
          unidade_id: unidadeId,
        });
        if (error) throw error;
        setEmployeeName("");
        setEmployeeCategoryId("");
        if (!isGerente) setEmployeeUnitId("");
      },
      "Funcionário cadastrado com sucesso.",
    );
  };

  const createScale = async () => {
    const selectedEmployee = funcionariosById[scaleEmployeeId];
    if (!selectedEmployee || !scaleDate) {
      toast.error("Selecione um funcionário e uma data.");
      return;
    }

    await performAction(
      "create-scale",
      async () => {
        const { error } = await supabase.from("escalas").insert({
          funcionario_id: selectedEmployee.id,
          data: scaleDate,
          tipo: scaleType,
          unidade_id: selectedEmployee.unidade_id,
          criado_por: user?.id ?? null,
        });
        if (error) throw error;
        setScaleEmployeeId("");
        setScaleDate("");
        setScaleType("normal");
      },
      scaleType === "extra"
        ? "Escala extra criada com crédito automático de +2 folgas."
        : "Escala criada com sucesso.",
    );
  };

  const createLeaveRequest = async () => {
    if (!leaveEmployeeId) {
      toast.error("Selecione um funcionário.");
      return;
    }

    await performAction(
      "create-leave-request",
      async () => {
        const { error } = await supabase.from("pedidos_folga").insert({
          funcionario_id: leaveEmployeeId,
          solicitado_por: user?.id ?? null,
        });
        if (error) throw error;
        setLeaveEmployeeId("");
      },
      "Pedido de folga enviado como pendente.",
    );
  };

  const updateLeaveRequest = async (pedidoId: string, status: "aprovado" | "negado") => {
    await performAction(
      `leave-request-${pedidoId}`,
      async () => {
        const { error } = await supabase
          .from("pedidos_folga")
          .update({ status, analisado_por: user?.id ?? null })
          .eq("id", pedidoId);
        if (error) throw error;
      },
      status === "aprovado"
        ? "Pedido aprovado com débito automático de -1 folga."
        : "Pedido de folga negado.",
    );
  };

  const transferEmployee = async (employeeId: string) => {
    const unidadeId = transferDrafts[employeeId];
    const employee = funcionariosById[employeeId];

    if (!unidadeId) {
      toast.error("Selecione a nova unidade.");
      return;
    }

    if (!employee || employee.unidade_id === unidadeId) {
      toast.error("Escolha uma unidade diferente da atual.");
      return;
    }

    await performAction(
      `transfer-${employeeId}`,
      async () => {
        const { error } = await supabase
          .from("funcionarios")
          .update({ unidade_id: unidadeId })
          .eq("id", employeeId);
        if (error) throw error;
      },
      "Funcionário transferido com histórico preservado.",
    );
  };

  const updateUserScope = async (targetUserId: string) => {
    const targetUser = usuariosById[targetUserId];
    if (!targetUser) return;

    const draftValue = userScopeDrafts[targetUserId] || "";

    await performAction(
      `user-scope-${targetUserId}`,
      async () => {
        const { error } = await supabase
          .from("usuarios")
          .update({
            categoria_id: targetUser.nivel === "chefe" ? draftValue || null : null,
            unidade_id: targetUser.nivel === "gerente" ? draftValue || null : null,
          })
          .eq("id", targetUserId);
        if (error) throw error;
      },
      "Vínculo do usuário atualizado com sucesso.",
    );
  };

  const copyInviteLink = async (token: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/cadastro?token=${token}`);
    toast.success("Link de convite copiado.");
  };

  const allQueries = [
    municipiosQuery,
    unidadesQuery,
    categoriasQuery,
    usuariosQuery,
    convitesQuery,
    funcionariosQuery,
    escalasQuery,
    folgasQuery,
    pedidosQuery,
    historicoQuery,
  ];

  const isLoading = allQueries.some((query) => query.isLoading);
  const queryError = allQueries.map((query) => query.error).find(Boolean);

  if (!profile) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-16">
        <Card className="w-full max-w-lg rounded-[2rem] border-border/70 bg-card shadow-[0_24px_80px_rgba(95,76,164,0.08)]">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold">Carregando ambiente do município</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Buscando dados operacionais, usuários, escalas e permissões do seu município.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (queryError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-16">
        <Card className="w-full max-w-lg rounded-[2rem] border-destructive/20 bg-card shadow-[0_24px_80px_rgba(95,76,164,0.08)]">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-semibold">Não foi possível carregar o painel</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {queryError instanceof Error ? queryError.message : "Erro inesperado ao consultar o Supabase."}
            </p>
            <Button className="mt-6 rounded-full" onClick={() => void refreshData()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const navItems = [
    {
      key: "overview" as const,
      title: "Visão geral",
      description: "Indicadores, saldos e atividade recente.",
      icon: LayoutDashboard,
    },
    {
      key: "registry" as const,
      title: "Cadastros",
      description: "Município, unidades, categorias e funcionários.",
      icon: Users2,
    },
    {
      key: "operations" as const,
      title: "Escalas e folgas",
      description: "Lançamentos operacionais e aprovações.",
      icon: CalendarClock,
    },
    {
      key: "access" as const,
      title: "Acessos e histórico",
      description: "Convites, vínculos e transferências.",
      icon: Settings2,
    },
  ];

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="hidden w-full max-w-[320px] shrink-0 lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-2rem)] lg:flex-col">
          <Card className="flex h-full flex-col rounded-[2rem] border-border/70 bg-card shadow-[0_28px_90px_rgba(95,76,164,0.08)]">
            <CardContent className="flex h-full flex-col p-5">
              <div className="rounded-[1.7rem] bg-primary p-5 text-primary-foreground">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Município</p>
                    <h1 className="text-lg font-semibold">{municipioAtual?.nome ?? "Ambiente"}</h1>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <RoleBadge role={profile.nivel} />
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80">
                    {profile.nome}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {navItems.map((item) => (
                  <SidebarLink
                    key={item.key}
                    active={activeSection === item.key}
                    description={item.description}
                    icon={item.icon}
                    onClick={() => setActiveSection(item.key)}
                    title={item.title}
                  />
                ))}
              </div>

              <div className="mt-auto rounded-[1.5rem] border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-semibold text-foreground">Acesso padronizado SaaS</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Sem login especial global. Cada município opera isolado no mesmo produto.
                </p>
                <Button className="mt-4 w-full rounded-full" onClick={() => void signOut()} variant="secondary">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>

        <div className="flex-1 space-y-4">
          <Card className="rounded-[2rem] border-border/70 bg-card shadow-[0_28px_90px_rgba(95,76,164,0.08)] lg:hidden">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Município</p>
                  <h1 className="text-2xl font-semibold text-foreground">{municipioAtual?.nome ?? "Ambiente"}</h1>
                </div>
                <RoleBadge role={profile.nivel} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {navItems.map((item) => (
                  <button
                    key={item.key}
                    className={cn(
                      "rounded-[1.25rem] border px-3 py-3 text-left text-sm font-semibold transition",
                      activeSection === item.key
                        ? "border-primary/20 bg-primary text-primary-foreground"
                        : "border-border/70 bg-background/70 text-foreground",
                    )}
                    onClick={() => setActiveSection(item.key)}
                    type="button"
                  >
                    {item.title}
                  </button>
                ))}
              </div>
              <Button className="w-full rounded-full" onClick={() => void signOut()} variant="secondary">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-border/70 bg-card shadow-[0_28px_90px_rgba(95,76,164,0.08)]">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                  {navItems.find((item) => item.key === activeSection)?.title}
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                  Olá, {profile.nome}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Painel operacional com navegação lateral esquerda e dados isolados por município.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
                <MetricCard icon={Users2} label="Funcionários visíveis" value={employeeRows.length} />
                <MetricCard icon={ClipboardList} label="Pedidos pendentes" value={pendingRequests.length} />
              </div>
            </CardContent>
          </Card>

          {activeSection === "overview" && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={Building2} label="Unidades" value={unidades.length} />
                <MetricCard icon={Shield} label="Usuários ativos" value={usuarios.length} />
                <MetricCard icon={CalendarClock} label="Escalas extras" value={extraScales.length} />
                <MetricCard icon={ClipboardCheck} label="Saldo total de folgas" value={totalSaldo} />
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <Card className="rounded-[1.75rem] border-border/70 bg-card">
                  <CardHeader>
                    <SectionHeading
                      title="Resumo operacional"
                      description="Visão consolidada da operação diária do município atual."
                    />
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2">
                    {[
                      `Município atual: ${municipioAtual?.nome ?? "-"}`,
                      `Seu nível de acesso: ${role ? roleLabels[role] : "-"}`,
                      `${employeeRows.length} funcionários visíveis na sua visão.`,
                      `${pendingRequests.length} pedidos aguardando decisão.`,
                    ].map((item) => (
                      <div key={item} className="rounded-[1.5rem] border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                        {item}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="rounded-[1.75rem] border-border/70 bg-card">
                  <CardHeader>
                    <SectionHeading
                      title="Últimos pedidos"
                      description="Solicitações mais recentes do município."
                    />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {requestRows.length === 0 ? (
                      <EmptyState text="Ainda não há pedidos de folga registrados." />
                    ) : (
                      requestRows.slice(0, 5).map((request) => (
                        <div key={request.id} className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                          <p className="font-semibold text-foreground">{request.funcionarioNome}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {request.status} · solicitado por {request.solicitadoPorNome}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                            {formatDateTime(request.created_at)}
                          </p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-[1.75rem] border-border/70 bg-card">
                <CardHeader>
                  <SectionHeading
                    title="Regras automáticas do backend"
                    description="A lógica crítica está protegida no Supabase com RLS e triggers."
                  />
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    "Escala extra gera +2 folgas automaticamente.",
                    "Pedido aprovado gera -1 folga automaticamente.",
                    "Chefe pode transferir funcionários e o histórico é gravado no banco.",
                    "Cada município opera isolado no mesmo produto SaaS.",
                  ].map((rule) => (
                    <div key={rule} className="rounded-[1.5rem] border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                      {rule}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "registry" && (
            <div className="space-y-4">
              <Card className="rounded-[1.75rem] border-border/70 bg-card">
                <CardHeader>
                  <SectionHeading
                    title="Estrutura do município"
                    description="Cadastros base do ambiente SaaS atual."
                  />
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-[1.5rem] border border-border/70 bg-background/70 p-4">
                    <p className="text-sm text-muted-foreground">Município</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{municipioAtual?.nome ?? "-"}</p>
                    <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                      Ambiente isolado por cliente
                    </p>
                  </div>

                  {canManageStructure && (
                    <Card className="rounded-[1.5rem] border-border/70 bg-background/70 shadow-none">
                      <CardContent className="space-y-3 p-4">
                        <div>
                          <p className="font-semibold text-foreground">Nova unidade</p>
                          <p className="text-sm text-muted-foreground">Cadastre unidades deste município.</p>
                        </div>
                        <Input
                          className="h-11 rounded-2xl border-border/70"
                          placeholder="Ex.: UBS Centro"
                          value={newUnitName}
                          onChange={(event) => setNewUnitName(event.target.value)}
                        />
                        <Button className="w-full rounded-full" disabled={submittingKey === "create-unit"} onClick={() => void createUnit()}>
                          Criar unidade
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {canManageStructure && (
                    <Card className="rounded-[1.5rem] border-border/70 bg-background/70 shadow-none">
                      <CardContent className="space-y-3 p-4">
                        <div>
                          <p className="font-semibold text-foreground">Nova categoria</p>
                          <p className="text-sm text-muted-foreground">Organize chefias e funcionários.</p>
                        </div>
                        <Input
                          className="h-11 rounded-2xl border-border/70"
                          placeholder="Ex.: Enfermagem"
                          value={newCategoryName}
                          onChange={(event) => setNewCategoryName(event.target.value)}
                        />
                        <Button className="w-full rounded-full" disabled={submittingKey === "create-category"} onClick={() => void createCategory()}>
                          Criar categoria
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[1.75rem] border-border/70 bg-card">
                <CardHeader>
                  <SectionHeading
                    title="Funcionários"
                    description="Cadastro e gestão da equipe vinculada ao município."
                  />
                </CardHeader>
                <CardContent className="space-y-4">
                  {canCreateEmployees && (
                    <div className="grid gap-3 rounded-[1.5rem] border border-border/70 bg-background/70 p-4 md:grid-cols-4">
                      <Input
                        className="h-11 rounded-2xl border-border/70 md:col-span-2"
                        placeholder="Nome do funcionário"
                        value={employeeName}
                        onChange={(event) => setEmployeeName(event.target.value)}
                      />
                      <Select value={employeeCategoryId} onValueChange={setEmployeeCategoryId}>
                        <SelectTrigger className="h-11 rounded-2xl border-border/70 bg-background/80">
                          <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border/70 bg-popover">
                          {categorias.map((categoria) => (
                            <SelectItem key={categoria.id} value={categoria.id}>
                              {categoria.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isGerente ? (
                        <div className="flex h-11 items-center rounded-2xl border border-border/70 bg-secondary/80 px-4 text-sm text-secondary-foreground">
                          {profile.unidade_id ? unidadesById[profile.unidade_id]?.nome ?? "Unidade" : "Sem unidade"}
                        </div>
                      ) : (
                        <Select value={employeeUnitId} onValueChange={setEmployeeUnitId}>
                          <SelectTrigger className="h-11 rounded-2xl border-border/70 bg-background/80">
                            <SelectValue placeholder="Unidade" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-border/70 bg-popover">
                            {unidades.map((unidade) => (
                              <SelectItem key={unidade.id} value={unidade.id}>
                                {unidade.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Button className="rounded-full md:col-span-4" disabled={submittingKey === "create-employee"} onClick={() => void createEmployee()}>
                        Cadastrar funcionário
                      </Button>
                    </div>
                  )}

                  <div className="space-y-3">
                    {employeeRows.length === 0 ? (
                      <EmptyState text="Nenhum funcionário disponível para o seu nível de acesso." />
                    ) : (
                      employeeRows.map((employee) => (
                        <div key={employee.id} className="grid gap-3 rounded-[1.5rem] border border-border/70 bg-background/70 p-4 xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto] xl:items-center">
                          <div>
                            <p className="text-base font-semibold text-foreground">{employee.nome}</p>
                            <p className="text-sm text-muted-foreground">{employee.categoriaNome}</p>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <span className="block text-xs uppercase tracking-wide">Unidade</span>
                            <span className="text-foreground">{employee.unidadeNome}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <span className="block text-xs uppercase tracking-wide">Saldo</span>
                            <span className="text-lg font-semibold text-foreground">{employee.saldo}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <span className="block text-xs uppercase tracking-wide">Cadastro</span>
                            <span className="text-foreground">{formatDate(employee.created_at)}</span>
                          </div>
                          {canTransferEmployees ? (
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Select
                                value={transferDrafts[employee.id] ?? employee.unidade_id}
                                onValueChange={(value) => setTransferDrafts((current) => ({ ...current, [employee.id]: value }))}
                              >
                                <SelectTrigger className="h-10 min-w-[180px] rounded-2xl border-border/70 bg-background/80">
                                  <SelectValue placeholder="Nova unidade" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-border/70 bg-popover">
                                  {unidades.map((unidade) => (
                                    <SelectItem key={unidade.id} value={unidade.id}>
                                      {unidade.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button className="rounded-full" disabled={submittingKey === `transfer-${employee.id}`} onClick={() => void transferEmployee(employee.id)} variant="secondary">
                                <ArrowRightLeft className="mr-2 h-4 w-4" />
                                Transferir
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "operations" && (
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-4">
                  {canCreateScales && (
                    <Card className="rounded-[1.75rem] border-border/70 bg-card">
                      <CardHeader>
                        <CardTitle>Criar escala</CardTitle>
                        <CardDescription>Escalas extras geram +2 folgas automaticamente.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Select value={scaleEmployeeId} onValueChange={setScaleEmployeeId}>
                          <SelectTrigger className="h-11 rounded-2xl border-border/70 bg-background/80">
                            <SelectValue placeholder="Selecione o funcionário" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-border/70 bg-popover">
                            {employeeRows.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.nome} · {employee.unidadeNome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input className="h-11 rounded-2xl border-border/70" type="date" value={scaleDate} onChange={(event) => setScaleDate(event.target.value)} />
                        <Select value={scaleType} onValueChange={(value) => setScaleType(value as "normal" | "extra") }>
                          <SelectTrigger className="h-11 rounded-2xl border-border/70 bg-background/80">
                            <SelectValue placeholder="Tipo de escala" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-border/70 bg-popover">
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="extra">Extra (+2 folgas)</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button className="w-full rounded-full" disabled={submittingKey === "create-scale"} onClick={() => void createScale()}>
                          <CalendarPlus2 className="mr-2 h-4 w-4" />
                          Registrar escala
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {canRequestLeave && (
                    <Card className="rounded-[1.75rem] border-border/70 bg-card">
                      <CardHeader>
                        <CardTitle>Solicitar folga</CardTitle>
                        <CardDescription>O pedido entra pendente e depende de aprovação.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Select value={leaveEmployeeId} onValueChange={setLeaveEmployeeId}>
                          <SelectTrigger className="h-11 rounded-2xl border-border/70 bg-background/80">
                            <SelectValue placeholder="Selecione o funcionário" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-border/70 bg-popover">
                            {employeeRows.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.nome} · saldo {employee.saldo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button className="w-full rounded-full" disabled={submittingKey === "create-leave-request"} onClick={() => void createLeaveRequest()}>
                          <ClipboardList className="mr-2 h-4 w-4" />
                          Enviar pedido
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <Card className="rounded-[1.75rem] border-border/70 bg-card">
                  <CardHeader>
                    <SectionHeading
                      title="Pedidos de folga"
                      description="Aprovações e negativas seguem o escopo permitido para seu perfil."
                    />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {requestRows.length === 0 ? (
                      <EmptyState text="Nenhum pedido de folga encontrado." />
                    ) : (
                      requestRows.map((request) => (
                        <div key={request.id} className="grid gap-3 rounded-[1.5rem] border border-border/70 bg-background/70 p-4 lg:grid-cols-[1.15fr_0.8fr_0.8fr_auto] lg:items-center">
                          <div>
                            <p className="font-semibold text-foreground">{request.funcionarioNome}</p>
                            <p className="text-sm text-muted-foreground">
                              Solicitado por {request.solicitadoPorNome} em {formatDateTime(request.created_at)}
                            </p>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <span className="block text-xs uppercase tracking-wide">Status</span>
                            <span className="text-foreground">{request.status}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <span className="block text-xs uppercase tracking-wide">Saldo atual</span>
                            <span className="text-foreground">{saldoByEmployee[request.funcionario_id] ?? 0}</span>
                          </div>
                          {canApproveLeave && request.status === "pendente" ? (
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Button className="rounded-full" disabled={submittingKey === `leave-request-${request.id}`} onClick={() => void updateLeaveRequest(request.id, "aprovado")}>
                                Aprovar
                              </Button>
                              <Button className="rounded-full" disabled={submittingKey === `leave-request-${request.id}`} onClick={() => void updateLeaveRequest(request.id, "negado")} variant="secondary">
                                Negar
                              </Button>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">Ação indisponível</div>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-[1.75rem] border-border/70 bg-card">
                <CardHeader>
                  <SectionHeading
                    title="Escalas recentes"
                    description="Últimos lançamentos operacionais do município visíveis para o seu perfil."
                  />
                </CardHeader>
                <CardContent className="grid gap-3 lg:grid-cols-2">
                  {scaleRows.length === 0 ? (
                    <EmptyState text="Nenhuma escala registrada até o momento." />
                  ) : (
                    scaleRows.slice(0, 8).map((scale) => (
                      <div key={scale.id} className="rounded-[1.5rem] border border-border/70 bg-background/70 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{scale.funcionarioNome}</p>
                            <p className="text-sm text-muted-foreground">{scale.unidadeNome}</p>
                          </div>
                          <div className="rounded-full border border-border/70 px-3 py-1 text-sm text-foreground">
                            {scale.tipo === "extra" ? "Extra" : "Normal"}
                          </div>
                        </div>
                        <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                          {formatDate(scale.data)}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "access" && (
            <div className="space-y-4">
              {canManageStructure && (
                <Card className="rounded-[1.75rem] border-border/70 bg-card">
                  <CardHeader>
                    <SectionHeading
                      title="Convites do município"
                      description="Admin local cria acessos para RH, chefes e gerentes sem depender de admin global."
                    />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 rounded-[1.5rem] border border-border/70 bg-background/70 p-4 md:grid-cols-4">
                      <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as Role)}>
                        <SelectTrigger className="h-11 rounded-2xl border-border/70 bg-background/80 md:col-span-1">
                          <SelectValue placeholder="Nível" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border/70 bg-popover">
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="rh">RH</SelectItem>
                          <SelectItem value="chefe">Chefe</SelectItem>
                          <SelectItem value="gerente">Gerente</SelectItem>
                        </SelectContent>
                      </Select>

                      {inviteRole === "chefe" ? (
                        <Select value={inviteCategoryId} onValueChange={setInviteCategoryId}>
                          <SelectTrigger className="h-11 rounded-2xl border-border/70 bg-background/80 md:col-span-2">
                            <SelectValue placeholder="Categoria do chefe" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-border/70 bg-popover">
                            {categorias.map((categoria) => (
                              <SelectItem key={categoria.id} value={categoria.id}>
                                {categoria.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : inviteRole === "gerente" ? (
                        <Select value={inviteUnitId} onValueChange={setInviteUnitId}>
                          <SelectTrigger className="h-11 rounded-2xl border-border/70 bg-background/80 md:col-span-2">
                            <SelectValue placeholder="Unidade do gerente" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-border/70 bg-popover">
                            {unidades.map((unidade) => (
                              <SelectItem key={unidade.id} value={unidade.id}>
                                {unidade.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex h-11 items-center rounded-2xl border border-border/70 bg-secondary/70 px-4 text-sm text-secondary-foreground md:col-span-2">
                          Acesso sem vínculo específico
                        </div>
                      )}

                      <Button className="rounded-full md:col-span-1" disabled={submittingKey === "create-invite"} onClick={() => void createInvite()}>
                        Gerar convite
                      </Button>
                    </div>

                    {activeInvites.length === 0 ? (
                      <EmptyState text="Nenhum convite ativo neste município." />
                    ) : (
                      activeInvites.map((invite) => (
                        <div key={invite.id} className="flex flex-col gap-3 rounded-[1.5rem] border border-border/70 bg-background/70 p-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <RoleBadge role={invite.nivel} />
                              <span className="text-sm text-muted-foreground">
                                Token: <strong className="text-foreground">{invite.token}</strong>
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {invite.unidade_id
                                ? `Unidade: ${unidadesById[invite.unidade_id]?.nome ?? "-"}`
                                : invite.categoria_id
                                  ? `Categoria: ${categoriasById[invite.categoria_id]?.nome ?? "-"}`
                                  : "Escopo municipal geral"}
                            </p>
                          </div>
                          <Button className="rounded-full" onClick={() => void copyInviteLink(invite.token)} variant="secondary">
                            <Copy className="mr-2 h-4 w-4" />
                            Copiar link
                          </Button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )}

              {(canManageUsers || isRH) && (
                <Card className="rounded-[1.75rem] border-border/70 bg-card">
                  <CardHeader>
                    <SectionHeading
                      title="Usuários do sistema"
                      description={
                        canManageUsers
                          ? "Admin local pode ajustar vínculos de chefes e gerentes dentro do município."
                          : "RH tem leitura ampla do município, sem permissão de alteração."
                      }
                    />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {usuarios.length === 0 ? (
                      <EmptyState text="Nenhum usuário encontrado." />
                    ) : (
                      usuarios.map((systemUser) => (
                        <div key={systemUser.id} className="grid gap-3 rounded-[1.5rem] border border-border/70 bg-background/70 p-4 lg:grid-cols-[1.2fr_0.8fr_1fr_auto] lg:items-center">
                          <div>
                            <p className="font-semibold text-foreground">{systemUser.nome}</p>
                            <p className="text-sm text-muted-foreground">{systemUser.email}</p>
                          </div>
                          <RoleBadge role={systemUser.nivel} />
                          <div className="text-sm text-muted-foreground">
                            {systemUser.nivel === "gerente" && (
                              <span>Unidade: {unidadesById[systemUser.unidade_id ?? ""]?.nome ?? "-"}</span>
                            )}
                            {systemUser.nivel === "chefe" && (
                              <span>Categoria: {categoriasById[systemUser.categoria_id ?? ""]?.nome ?? "-"}</span>
                            )}
                            {systemUser.nivel === "admin" && <span>Escopo municipal</span>}
                            {systemUser.nivel === "rh" && <span>Leitura municipal</span>}
                          </div>
                          {canManageUsers && (systemUser.nivel === "gerente" || systemUser.nivel === "chefe") ? (
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Select
                                value={userScopeDrafts[systemUser.id] ?? ""}
                                onValueChange={(value) => setUserScopeDrafts((current) => ({ ...current, [systemUser.id]: value }))}
                              >
                                <SelectTrigger className="h-10 min-w-[210px] rounded-2xl border-border/70 bg-background/80">
                                  <SelectValue placeholder="Novo vínculo" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-border/70 bg-popover">
                                  {(systemUser.nivel === "gerente" ? unidades : categorias).map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                      {item.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button className="rounded-full" disabled={submittingKey === `user-scope-${systemUser.id}`} onClick={() => void updateUserScope(systemUser.id)} variant="secondary">
                                Salvar vínculo
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="rounded-[1.75rem] border-border/70 bg-card">
                <CardHeader>
                  <SectionHeading
                    title="Histórico de transferências"
                    description="Toda mudança de unidade é registrada automaticamente no backend."
                  />
                </CardHeader>
                <CardContent className="space-y-3">
                  {transferRows.length === 0 ? (
                    <EmptyState text="Ainda não há transferências registradas neste município." />
                  ) : (
                    transferRows.map((item) => (
                      <div key={item.id} className="rounded-[1.5rem] border border-border/70 bg-background/70 p-4">
                        <p className="font-semibold text-foreground">{item.funcionarioNome}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.origemNome} → {item.destinoNome}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                          {formatDateTime(item.data_transferencia)}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
