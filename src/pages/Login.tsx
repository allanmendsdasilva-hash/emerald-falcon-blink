import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { ShieldCheck, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

export default function Login() {
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (session) {
    return <Navigate to="/app" replace />;
  }

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      toast.error("Informe e-mail e senha.");
      return;
    }

    try {
      setIsSubmitting(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        throw error;
      }

      toast.success("Login realizado com sucesso.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível entrar.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] px-4 py-10 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="space-y-6 rounded-[2rem] border border-border/70 bg-card p-8 shadow-[0_28px_90px_rgba(95,76,164,0.08)] sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <ShieldCheck className="h-4 w-4" />
            Acesso seguro
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Entre no sistema de escalas
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">
              Login via Supabase Auth com níveis de acesso para admin, RH, chefe de categoria e
              gerente de unidade.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              "Escalas e extras",
              "Folgas com saldo automático",
              "Permissões por nível",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[1.5rem] border border-border/70 bg-background/80 p-4 text-sm text-foreground"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <Card className="rounded-[2rem] border-border/70 bg-card shadow-[0_28px_90px_rgba(95,76,164,0.08)]">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Login</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Use seu e-mail e senha para acessar o painel.
              </p>
            </div>

            <div className="space-y-4">
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
                  placeholder="Sua senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <Button className="h-11 w-full rounded-full" disabled={isSubmitting} onClick={() => void handleLogin()}>
                <LogIn className="mr-2 h-4 w-4" />
                {isSubmitting ? "Entrando..." : "Entrar"}
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Recebeu um convite?{" "}
              <Link className="font-semibold text-primary" to="/cadastro">
                Crie sua conta aqui
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}