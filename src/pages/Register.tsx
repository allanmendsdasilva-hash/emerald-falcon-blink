import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { KeyRound, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (session) {
    return <Navigate to="/app" replace />;
  }

  const handleRegister = async () => {
    if (!token.trim() || !nome.trim() || !email.trim() || password.length < 6) {
      toast.error("Preencha token, nome, e-mail e uma senha com pelo menos 6 caracteres.");
      return;
    }

    try {
      setIsSubmitting(true);

      const { data, error } = await supabase.functions.invoke("register-with-invite", {
        body: {
          token: token.trim(),
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          password,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.message ?? "Não foi possível concluir o cadastro.");
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      toast.success("Conta criada com sucesso.");
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
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_440px] lg:items-center">
        <div className="space-y-6 rounded-[2rem] border border-border/70 bg-card p-8 shadow-[0_28px_90px_rgba(95,76,164,0.08)] sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <UserPlus className="h-4 w-4" />
            Cadastro por convite
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Ative seu acesso ao sistema
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">
              O cadastro é permitido apenas com token válido. O vínculo de categoria ou unidade é
              aplicado automaticamente conforme o convite recebido.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              "Admin cria convites",
              "Chefe aprova folgas",
              "Gerente solicita por equipe",
            ].map((item) => (
              <div key={item} className="rounded-[1.5rem] border border-border/70 bg-background/80 p-4 text-sm text-foreground">
                {item}
              </div>
            ))}
          </div>
        </div>

        <Card className="rounded-[2rem] border-border/70 bg-card shadow-[0_28px_90px_rgba(95,76,164,0.08)]">
          <CardContent className="space-y-4 p-6 sm:p-8">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Criar conta</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Informe os dados abaixo e conclua o cadastro usando seu convite.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Token do convite</label>
                <Input
                  className="h-11 rounded-2xl border-border/70"
                  placeholder="Cole o token recebido"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                />
              </div>
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
                  placeholder="voce@empresa.com"
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
              <KeyRound className="mr-2 h-4 w-4" />
              {isSubmitting ? "Criando conta..." : "Criar conta com convite"}
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
