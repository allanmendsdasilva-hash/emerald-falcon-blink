import { Navigate, Link } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

export default function Login() {
  const { session } = useAuth();

  if (session) {
    return <Navigate to="/app" replace />;
  }

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
              <div key={item} className="rounded-[1.5rem] border border-border/70 bg-background/80 p-4 text-sm text-foreground">
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

            <Auth
              supabaseClient={supabase}
              providers={[]}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: "hsl(262 58% 56%)",
                      brandAccent: "hsl(262 58% 50%)",
                      inputBackground: "white",
                      inputBorder: "hsl(255 28% 86%)",
                      inputText: "hsl(252 18% 24%)",
                    },
                    radii: {
                      borderRadiusButton: "999px",
                      buttonBorderRadius: "999px",
                      inputBorderRadius: "18px",
                    },
                  },
                },
                className: {
                  anchor: "text-primary hover:text-primary/80",
                  button: "!rounded-full !h-11 !font-medium",
                  input: "!rounded-[18px] !h-11",
                  label: "!text-foreground",
                },
              }}
              localization={{
                variables: {
                  sign_in: {
                    email_label: "E-mail",
                    password_label: "Senha",
                    button_label: "Entrar",
                  },
                },
              }}
              theme="light"
              view="sign_in"
            />

            <p className="text-sm text-muted-foreground">
              Recebeu um convite? <Link className="font-semibold text-primary" to="/cadastro">Crie sua conta aqui</Link>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
