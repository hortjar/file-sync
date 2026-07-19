import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";

import { useAuthStore } from "../stores/auth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);

  // Wait for the startup shared-session (SSO) check before deciding, so a user
  // logged in on a sibling app isn't bounced to /login mid-adoption.
  if (!isAuthenticated && !bootstrapped) {
    return (
      <div className="flex min-h-full items-center justify-center p-8">
        <Loader2 className="size-6 animate-spin text-[hsl(var(--text-muted))]" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
