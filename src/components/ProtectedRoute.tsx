import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

export function ProtectedRoute({ children }: { children: ReactElement }) {

  const { loading, session, profile } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] px-6">
        <div className="w-full max-w-md rounded-[2rem] border border-border/70 bg-card p-8 text-center shadow-[0_24px_80px_rgba(95,76,164,0.12)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Carregando acesso</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Estamos validando sua sessão e permissões no sistema.
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
