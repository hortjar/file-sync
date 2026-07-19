import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";

import { useAuthStore } from "../stores/auth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);

  // Always wait for the startup session check to finish before deciding. This
  // is deliberately gated on `bootstrapped` alone (not `!isAuthenticated`): a
  // persisted-but-stale session reports isAuthenticated=true, and rendering the
  // dashboard before that session is validated/evicted is what caused the
  // dashboard↔login redirect loop.
  if (!bootstrapped) {
    return (
      <div className="flex min-h-full items-center justify-center p-8">
        <Loader2 className="size-6 animate-spin text-[hsl(var(--text-muted))]" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
