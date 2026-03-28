import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseMedical,
  CalendarCheck2,
  ClipboardCheck,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";

const highlights = [
  {
    icon: ShieldCheck,
    title: "Controle por nível",
    description: "Admin, RH, chefes e gerentes enxergam somente o que o RLS permite.",
  },
  {
    icon: CalendarCheck2,
    title: "Escalas e extras",
    description: "Extras geram +2 folgas automaticamente direto no backend do Supabase.",
  },
  {
    icon: ClipboardCheck,
    title: "Folgas auditáveis",
    description: "Pedidos pendentes, aprovação por chefe e saldo calculado pela movimentação.",
  },
  {
    icon: UserCog,
    title: "Convites e vínculos",
    description: "Cadastro apenas por convite, com categoria ou unidade definida no acesso.",
  },
];

export default function Index() {
  const { session } = useAuth();

  if (session) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="overflow-hidden rounded-[2rem] border-border/70 bg-card shadow-[0_28px_90px_rgba(95,76,164,0.08)]">
          <CardContent className="grid gap-8 p-8 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <BriefcaseMedical className="h-4 w-4" />
                Sistema web de gestão operacional
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                  Gestão de escalas, extras e folgas com backend funcional em Supabase
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Plataforma simples para operar equipes por unidade e categoria, com autenticação,
                  convites, aprovação de folgas e histórico de transferências.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-11 rounded-full px-6">
                  <Link to="/login">
                    Entrar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild className="h-11 rounded-full px-6" variant="secondary">
                  <Link to="/cadastro">Cadastrar com convite</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {highlights.map((item) => (
                <div key={item.title} className="rounded-[1.75rem] border border-border/70 bg-background/80 p-5">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {[
            {
              title: "Admin",
              body: "Cria unidades, categorias, convites e transfere funcionários ou gerentes.",
            },
            {
              title: "Chefe + Gerente",
              body: "Chefe monta escalas e aprova folgas; gerente cadastra funcionários e solicita folgas.",
            },
            {
              title: "RH",
              body: "Acesso total de leitura para acompanhar equipes, pedidos, escalas e histórico.",
            },
          ].map((card) => (
            <Card key={card.title} className="rounded-[1.75rem] border-border/70 bg-card shadow-[0_18px_60px_rgba(95,76,164,0.06)]">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-foreground">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{card.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
