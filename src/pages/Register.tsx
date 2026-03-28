import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Building2, KeyRound, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

type RegisterMode = "municipio" | "convite";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const initialToken = searchParams.get("token") ?? "";
  const [mode, setMode] = useState<RegisterMode>(initialToken ? "convite" : "municipio");
  const [municipioNome, setMunicipioNome] = useState("");
  const [token, setToken] = useState(initialToken);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isInviteMode = mode === "convite";

  const submitLabel = useMemo(() => {
    return isInviteMode ? "Criar conta com convite" : "Criar município e administrador";
  }, [isInviteMode]);

  if (session) {
    return <Navigate to="/app" replace />;
  }

  const signInAfterRegister = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      throw error;
    }
  };

  const handleRegister = async () => {
    if (!nome.trim() || !email.trim() || password.length < 6) {
      toast.error("Preencha nome, e-mail e uma senha com pelo menos 6 caracteres.");
      return;
    }

    if (!isInviteMode && !municipioNome.trim()) {
      toast.error("Informe o nome do município para iniciar o ambiente SaaS.");
      return;
    }

    if (isInviteMode && !token.trim()) {
      toast.error("Informe o token do convite.");
      return;
    }

    try {
      setIsSubmitting(true);

      const { data, error } = await supabase.functions.invoke(
        isInviteMode ? "register-with-invite" : "register-municipio-admin",
        {
          body: isInviteMode
            ? {
                token: token.trim(),
                nome: nome.trim(),
                email: email.trim().toLowerCase(),
                password,
              }
            : {
                municipioNome: municipioNome.trim(),
                nome: nome.trim(),
                email: email.trim().toLowerCase(),
                password,
              },
        },
      );

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.message ?? "Não foi possível concluir o cadastro.");
      }

      await signInAfterRegister();
      toast.success(isInviteMode ? "Conta criada com sucesso." : "Município criado com sucesso.");
      navigate("/app", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao criar a conta.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] px-4 py-10 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_460px] lg:items-center">
        <div className="space-y-6 rounded-[2rem] border border-border/70 bg-card p-8 shadow-[0_28px_90px_rgba(95,76,164,0.08)] sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Building2 className="h-4 w-4" />
            SaaS para municípios
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Cadastre um novo município ou entre por convite
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">
              Sem login especial de admin. Cada município pode iniciar seu próprio ambiente e convidar
              a equipe depois.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              "Ambiente isolado por município",
              "Admin inicial no primeiro cadastro",
              "Convites para RH, chefes e gerentes",
            ].map((item) => (
              <div key={item} className="rounded-[1.5rem] border border-border/70 bg-background/80 p-4 text-sm text-foreground">
                {item}
              </div>
            ))}
          </div>
        </div>

        <Card className="rounded-[2rem] border-border/70 bg-card shadow-[0_28px_90px_rgba(95,76,164,0.08)]">
          <CardContent className="space-y-5 p-6 sm:p-8">
            <div className="grid grid-cols-2 gap-2 rounded-[1.25rem] bg-secondary/70 p-1.5">
              <button
                className={`rounded-[1rem] px-4 py-3 text-sm font-semibold transition ${
                  !isInviteMode ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
                onClick={() => setMode("municipio")}
                type="button"
              >
                Novo município
              </button>
              <button
                className={`rounded-[1rem] px-4 py-3 text-sm font-semibold transition ${
                  isInviteMode ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
                onClick={() => setMode("convite")}
                type="button"
              >
                Usar convite
              </button>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                {isInviteMode ? "Criar conta com convite" : "Criar ambiente do município"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {isInviteMode
                  ? "Use o token recebido do administrador do município."
                  : "O primeiro cadastro cria o município e já define o usuário como administrador local."}
              </p>
            </div>

            <div className="space-y-3">
              {!isInviteMode ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Nome do município</label>
                  <Input
                    className="h-11 rounded-2xl border-border/70"
                    placeholder="Ex.: Prefeitura de Exemplo"
                    value={municipioNome}
                    onChange={(event) => setMunicipioNome(event.target.value)}
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Token do convite</label>
                  <Input
                    className="h-11 rounded-2xl border-border/70"
                    placeholder="Cole o token recebido"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Nome completo</label>
                <Input
                  className="h-11 rounded-2xl border-border/70"
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">E-mail</label>
                <Input
                  className="h-11 rounded-2xl border-border/70"
                  type="email"
                  placeholder="voce@municipio.gov.br"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Senha</label>
                <Input
                  className="h-11 rounded-2xl border-border/70"
                  type="password"
                  placeholder="Mínimo de 6 caracteres"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </div>

            <Button className="h-11 w-full rounded-full" disabled={isSubmitting} onClick={() => void handleRegister()}>
              {isInviteMode ? <KeyRound className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
              {isSubmitting ? "Processando..." : submitLabel}
            </Button>

            <p className="text-sm text-muted-foreground">
              Já possui acesso? <Link className="font-semibold text-primary" to="/login">Entrar no sistema</Link>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
