import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  Building2,
  CalendarClock,
  CalendarPlus2,
  ClipboardCheck,
  ClipboardList,
  Copy,
  LogOut,
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
  PedidoFolga,
  Role,
  Unidade,
  Usuario,
} from "@/lib/app-types";
import { roleLabels } from "@/lib/app-types";
import { useAuth } from "@/providers/AuthProvider";

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

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users2;
  label: string;
  value: string | number;
}) {
  return (
    <Card className="rounded-[1.75rem] border-border/70 bg-card/95 shadow-[0_24px_80px_rgba(95,76,164,0.08)]">
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

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function ManagementDashboard() {
  const queryClient = useQueryClient();
  const { user, profile, signOut } = useAuth();
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
    const nextDrafts = Object.fromEntries(funcionarios.map((item) => [item.id, item.unidade_id]));
    setTransferDrafts(nextDrafts);
  }, [funcionarios]);

  useEffect(() => {
    const nextDrafts = Object.fromEntries(
      usuarios.map((item) => [item.id, item.unidade_id ?? item.categoria_id ?? ""]),
    );
    setUserScopeDrafts(nextDrafts);
  }, [usuarios]);

  const unidadesById = useMemo(
    () => Object.fromEntries(unidades.map((item) => [item.id, item])),
    [unidades],
  );
  const categoriasById = useMemo(
    () => Object.fromEntries(categorias.map((item) => [item.id, item])),
    [categorias],
  );
  const funcionariosById = useMemo(
    () => Object.fromEntries(funcionarios.map((item) => [item.id, item])),
    [funcionarios],
  );
  const usuariosById = useMemo(
    () => Object.fromEntries(usuarios.map((item) => [item.id, item])),
    [usuarios],
  );

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
        const payload = {
          nivel: inviteRole,
          unidade_id: inviteRole === "gerente" ? inviteUnitId : null,
          categoria_id: inviteRole === "chefe" ? inviteCategoryId : null,
          criado_por: user?.id ?? null,
        };

        const { error } = await supabase.from("convites").insert(payload);
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
        ? "Escala extra criada e crédito de +2 folgas lançado."
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
      "Pedido de folga registrado como pendente.",
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
        ? "Pedido aprovado e débito de -1 folga lançado."
        : "Pedido de folga negado.",
    );
  };

  const transferEmployee = async (employeeId: string) => {
    const unidadeId = transferDrafts[employeeId];
    if (!unidadeId) {
      toast.error("Selecione a nova unidade.");
      return;
    }

    const employee = funcionariosById[employeeId];
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
        const payload = {
          categoria_id: targetUser.nivel === "chefe" ? draftValue || null : null,
          unidade_id: targetUser.nivel === "gerente" ? draftValue || null : null,
        };

        const { error } = await supabase.from("usuarios").update(payload).eq("id", targetUserId);
        if (error) throw error;
      },
      "Vínculo do usuário atualizado com sucesso.",
    );
  };

  const copyInviteLink = async (token: string) => {
    const url = `${window.location.origin}/cadastro?token=${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link de convite copiado.");
  };

  const isLoading = [
    unidadesQuery,
    categoriasQuery,
    usuariosQuery,
    convitesQuery,
    funcionariosQuery,
    escalasQuery,
    folgasQuery,
    pedidosQuery,
    historicoQuery,
  ].some((query) => query.isLoading);

  const queryError = [
    unidadesQuery.error,
    categoriasQuery.error,
    usuariosQuery.error,
    convitesQuery.error,
    funcionariosQuery.error,
    escalasQuery.error,
    folgasQuery.error,
    pedidosQuery.error,
    historicoQuery.error,
  ].find(Boolean);

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
            <h1 className="text-2xl font-semibold">Carregando dados do sistema</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Buscando escalas, folgas, usuários e permissões do seu ambiente.
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

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="overflow-hidden rounded-[2rem] border-border/70 bg-card shadow-[0_28px_90px_rgba(95,76,164,0.08)]">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  <Shield className="h-4 w-4" />
                  Gestão de escalas com Supabase
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    Olá, {profile.nome}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                    Controle escalas, extras, folgas e vínculos operacionais com acesso filtrado por
                    nível.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <RoleBadge role={profile.nivel} />
                  <div className="rounded-full border border-border/70 bg-secondary/80 px-4 py-2 text-sm text-secondary-foreground">
                    {profile.email}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
                <MetricCard icon={Users2} label="Funcionários visíveis" value={employeeRows.length} />
                <MetricCard icon={ClipboardList} label="Pedidos pendentes" value={pendingRequests.length} />
                <MetricCard icon={CalendarClock} label="Extras lançados" value={extraScales.length} />
                <MetricCard icon={ClipboardCheck} label="Saldo acumulado" value={totalSaldo} />
              </div>
            </div>

            <Separator className="my-6" />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 sm:gap-6">
                <span>
                  <strong className="text-foreground">Unidade:</strong>{" "}
                  {profile.unidade_id ? unidadesById[profile.unidade_id]?.nome ?? "-" : "-"}
                </span>
                <span>
                  <strong className="text-foreground">Categoria:</strong>{" "}
                  {profile.categoria_id ? categoriasById[profile.categoria_id]?.nome ?? "-" : "-"}
                </span>
              </div>
              <Button
                className="rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90"
                variant="default"
                onClick={() => void signOut()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>

        {canManageStructure && (
          <section className="grid gap-6 lg:grid-cols-3">
            <Card className="rounded-[1.75rem] border-border/70 bg-card">
              <CardHeader>
                <CardTitle>Nova unidade</CardTitle>
                <CardDescription>Cadastre os locais de operação da equipe.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  className="h-11 rounded-2xl border-border/70"
                  placeholder="Ex.: Unidade Centro"
                  value={newUnitName}
                  onChange={(event) => setNewUnitName(event.target.value)}
                />
                <Button
                  className="w-full rounded-full"
                  disabled={submittingKey === "create-unit"}
                  onClick={() => void createUnit()}
                >
                  Criar unidade
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-[1.75rem] border-border/70 bg-card">
              <CardHeader>
                <CardTitle>Nova categoria</CardTitle>
                <CardDescription>Organize funcionários e chefias por categoria.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  className="h-11 rounded-2xl border-border/70"
                  placeholder="Ex.: Enfermagem"
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                />
                <Button
                  className="w-full rounded-full"
                  disabled={submittingKey === "create-category"}
                  onClick={() => void createCategory()}
                >
                  Criar categoria
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-[1.75rem] border-border/70 bg-card">
              <CardHeader>
                <CardTitle>Novo convite</CardTitle>
                <CardDescription>Crie acessos de admin, RH, chefe ou gerente.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as Role)}>
                  <SelectTrigger className="h-11 rounded-2xl border-border/70 bg-background/80">
                    <SelectValue placeholder="Selecione o nível" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border/70 bg-popover">
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="rh">RH</SelectItem>
                    <SelectItem value="chefe">Chefe de categoria</SelectItem>
                    <SelectItem value="gerente">Gerente de unidade</SelectItem>
                  </SelectContent>
                </Select>

                {inviteRole === "chefe" && (
                  <Select value={inviteCategoryId} onValueChange={setInviteCategoryId}>
                    <SelectTrigger className="h-11 rounded-2xl border-border/70 bg-background/80">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border/70 bg-popover">
                      {categorias.map((categoria) => (
                        <SelectItem key={categoria.id} value={categoria.id}>
                          {categoria.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {inviteRole === "gerente" && (
                  <Select value={inviteUnitId} onValueChange={setInviteUnitId}>
                    <SelectTrigger className="h-11 rounded-2xl border-border/70 bg-background/80">
                      <SelectValue placeholder="Selecione a unidade" />
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

                <Button
                  className="w-full rounded-full"
                  disabled={submittingKey === "create-invite"}
                  onClick={() => void createInvite()}
                >
                  Criar convite
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {canManageStructure && (
          <Card className="rounded-[1.75rem] border-border/70 bg-card">
            <CardHeader>
              <CardTitle>Convites ativos</CardTitle>
              <CardDescription>
                Compartilhe o link ou o token com o novo usuário para cadastro via convite.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {convites.filter((invite) => !invite.usado).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum convite ativo no momento.</p>
              ) : (
                convites
                  .filter((invite) => !invite.usado)
                  .map((invite) => (
                    <div
                      key={invite.id}
                      className="flex flex-col gap-3 rounded-[1.5rem] border border-border/70 bg-background/80 p-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <RoleBadge role={invite.nivel} />
                          <span className="text-sm text-muted-foreground">
                            Token: <strong className="text-foreground">{invite.token}</strong>
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {invite.unidade_id
                            ? `Unidade: ${unidadesById[invite.unidade_id]?.nome ?? "-"}`
                            : invite.categoria_id
                              ? `Categoria: ${categoriasById[invite.categoria_id]?.nome ?? "-"}`
                              : "Escopo global"}
                        </p>
                      </div>
                      <Button
                        className="rounded-full"
                        variant="secondary"
                        onClick={() => void copyInviteLink(invite.token)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar link
                      </Button>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        )}

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-[1.75rem] border-border/70 bg-card">
            <CardHeader>
              <SectionHeader
                title="Funcionários e saldos"
                description="O saldo é calculado pela soma das folgas positivas e negativas registradas no banco."
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
                  <Button
                    className="rounded-full md:col-span-4"
                    disabled={submittingKey === "create-employee"}
                    onClick={() => void createEmployee()}
                  >
                    Cadastrar funcionário
                  </Button>
                </div>
              )}

              <div className="space-y-3">
                {employeeRows.length === 0 ? (
                  <p className="rounded-[1.5rem] border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                    Nenhum funcionário disponível para o seu nível de acesso.
                  </p>
                ) : (
                  employeeRows.map((employee) => (
                    <div
                      key={employee.id}
                      className="grid gap-3 rounded-[1.5rem] border border-border/70 bg-background/70 p-4 xl:grid-cols-[1.3fr_0.9fr_0.9fr_0.7fr_auto] xl:items-center"
                    >
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
                            onValueChange={(value) =>
                              setTransferDrafts((current) => ({ ...current, [employee.id]: value }))
                            }
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
                          <Button
                            className="rounded-full"
                            disabled={submittingKey === `transfer-${employee.id}`}
                            onClick={() => void transferEmployee(employee.id)}
                            variant="secondary"
                          >
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

          <div className="space-y-6">
            {canCreateScales && (
              <Card className="rounded-[1.75rem] border-border/70 bg-card">
                <CardHeader>
                  <CardTitle>Criar escala</CardTitle>
                  <CardDescription>
                    Escalas extras geram automaticamente +2 créditos de folga.
                  </CardDescription>
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
                  <Input
                    className="h-11 rounded-2xl border-border/70"
                    type="date"
                    value={scaleDate}
                    onChange={(event) => setScaleDate(event.target.value)}
                  />
                  <Select value={scaleType} onValueChange={(value) => setScaleType(value as "normal" | "extra")}>
                    <SelectTrigger className="h-11 rounded-2xl border-border/70 bg-background/80">
                      <SelectValue placeholder="Tipo de escala" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border/70 bg-popover">
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="extra">Extra (+2 folgas)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    className="w-full rounded-full"
                    disabled={submittingKey === "create-scale"}
                    onClick={() => void createScale()}
                  >
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
                  <CardDescription>
                    O pedido entra como pendente e depende da aprovação do chefe.
                  </CardDescription>
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
                  <Button
                    className="w-full rounded-full"
                    disabled={submittingKey === "create-leave-request"}
                    onClick={() => void createLeaveRequest()}
                  >
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Enviar pedido
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className="rounded-[1.75rem] border-border/70 bg-card">
              <CardHeader>
                <CardTitle>Escalas recentes</CardTitle>
                <CardDescription>Visualização simples das últimas escalas cadastradas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {scaleRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma escala registrada.</p>
                ) : (
                  scaleRows.slice(0, 6).map((scale) => (
                    <div
                      key={scale.id}
                      className="flex items-center justify-between rounded-[1.25rem] border border-border/70 bg-background/70 p-3"
                    >
                      <div>
                        <p className="font-medium text-foreground">{scale.funcionarioNome}</p>
                        <p className="text-sm text-muted-foreground">
                          {scale.unidadeNome} · {formatDate(scale.data)}
                        </p>
                      </div>
                      <div className="rounded-full border border-border/70 px-3 py-1 text-sm text-foreground">
                        {scale.tipo === "extra" ? "Extra" : "Normal"}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="rounded-[1.75rem] border-border/70 bg-card">
            <CardHeader>
              <SectionHeader
                title="Pedidos de folga"
                description="Gerentes criam pedidos e chefes aprovam ou negam conforme a categoria permitida."
              />
            </CardHeader>
            <CardContent className="space-y-4">
              {requestRows.length === 0 ? (
                <p className="rounded-[1.5rem] border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                  Nenhum pedido de folga encontrado.
                </p>
              ) : (
                requestRows.map((request) => (
                  <div
                    key={request.id}
                    className="grid gap-3 rounded-[1.5rem] border border-border/70 bg-background/70 p-4 lg:grid-cols-[1.2fr_0.9fr_0.7fr_auto] lg:items-center"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{request.funcionarioNome}</p>
                      <p className="text-sm text-muted-foreground">
                        Solicitado por {request.solicitadoPorNome} em {formatDate(request.created_at)}
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
                        <Button
                          className="rounded-full"
                          disabled={submittingKey === `leave-request-${request.id}`}
                          onClick={() => void updateLeaveRequest(request.id, "aprovado")}
                        >
                          Aprovar
                        </Button>
                        <Button
                          className="rounded-full"
                          disabled={submittingKey === `leave-request-${request.id}`}
                          onClick={() => void updateLeaveRequest(request.id, "negado")}
                          variant="secondary"
                        >
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

          <Card className="rounded-[1.75rem] border-border/70 bg-card">
            <CardHeader>
              <SectionHeader
                title="Histórico de transferências"
                description="Toda mudança de unidade é registrada automaticamente pelo banco." 
              />
            </CardHeader>
            <CardContent className="space-y-3">
              {transferRows.length === 0 ? (
                <p className="rounded-[1.5rem] border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                  Ainda não há transferências registradas.
                </p>
              ) : (
                transferRows.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[1.5rem] border border-border/70 bg-background/70 p-4"
                  >
                    <p className="font-semibold text-foreground">{item.funcionarioNome}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.origemNome} → {item.destinoNome}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                      {formatDate(item.data_transferencia)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        {(canManageUsers || isRH) && (
          <Card className="rounded-[1.75rem] border-border/70 bg-card">
            <CardHeader>
              <SectionHeader
                title="Usuários do sistema"
                description={
                  canManageUsers
                    ? "Admin pode transferir gerentes de unidade e ajustar chefes por categoria."
                    : "RH possui acesso total de leitura, sem permissão de alteração."
                }
              />
            </CardHeader>
            <CardContent className="space-y-4">
              {usuarios.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
              ) : (
                usuarios.map((systemUser) => (
                  <div
                    key={systemUser.id}
                    className="grid gap-3 rounded-[1.5rem] border border-border/70 bg-background/70 p-4 lg:grid-cols-[1.2fr_0.8fr_1fr_auto] lg:items-center"
                  >
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
                      {systemUser.nivel === "admin" && <span>Escopo global</span>}
                      {systemUser.nivel === "rh" && <span>Leitura global</span>}
                    </div>
                    {canManageUsers && (systemUser.nivel === "gerente" || systemUser.nivel === "chefe") ? (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Select
                          value={userScopeDrafts[systemUser.id] ?? ""}
                          onValueChange={(value) =>
                            setUserScopeDrafts((current) => ({ ...current, [systemUser.id]: value }))
                          }
                        >
                          <SelectTrigger className="h-10 min-w-[200px] rounded-2xl border-border/70 bg-background/80">
                            <SelectValue placeholder="Selecione o novo vínculo" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-border/70 bg-popover">
                            {(systemUser.nivel === "gerente" ? unidades : categorias).map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          className="rounded-full"
                          disabled={submittingKey === `user-scope-${systemUser.id}`}
                          onClick={() => void updateUserScope(systemUser.id)}
                          variant="secondary"
                        >
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
            <SectionHeader
              title="Regras aplicadas pelo backend"
              description="A lógica principal roda no banco com gatilhos e políticas RLS do Supabase."
            />
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              "Escala extra gera +2 folgas automaticamente.",
              "Pedido aprovado lança -1 folga automaticamente.",
              "RH visualiza tudo, mas não altera dados.",
              `Seu nível atual: ${role ? roleLabels[role] : "-"}.`,
            ].map((rule) => (
              <div
                key={rule}
                className="rounded-[1.5rem] border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground"
              >
                {rule}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
