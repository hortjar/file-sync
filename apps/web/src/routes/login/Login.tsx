import { useForm } from "@tanstack/react-form";
import { FolderSync, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { postApiAuthLogin } from "../../generated/sdk.gen";
import { setAuthHeader } from "../../lib/api-client";
import { SERVER_URL } from "../../lib/server-url";
import { toast } from "../../lib/toast";
import { setTokens, setUserEmail, setUserId, useAuthStore } from "../../stores/auth";

/** Whether this server delegates identity to the shared Universal Admin server. */
function useSharedAuth(): boolean {
  const [shared, setShared] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch(`${SERVER_URL}/api/auth/mode`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setShared(d?.mode === "universal"))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return shared;
}

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string };
};

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const sharedAuth = useSharedAuth();

  const form = useForm({
    defaultValues: { email: "", password: "" },
    onSubmit: async ({ value }) => {
      const email = value.email.trim();
      try {
        const { data, error } = await postApiAuthLogin({
          body: { email, password: value.password },
        });

        if (error || !data) {
          toast.error(t("auth.invalidCredentials"));
          return;
        }

        const response = data as LoginResponse;
        setTokens(response.accessToken, response.refreshToken);
        setUserId(response.user.id);
        setUserEmail(response.user.email);
        setAuthHeader(response.accessToken);
        void navigate("/admin/dashboard");
      } catch {
        toast.error(t("auth.connectionError"));
      }
    },
  });

  // Only redirect once the startup session check has settled, so a stale
  // session that's about to be evicted can't bounce us to the dashboard.
  if (bootstrapped && isAuthenticated) return <Navigate to="/admin/dashboard" replace />;

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl gradient-brand">
            <FolderSync className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[hsl(var(--text))]">FileSync</h1>
            <p className="mt-1 text-sm text-[hsl(var(--text-muted))]">{t("auth.signIn")}</p>
          </div>
        </div>

        {sharedAuth && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-[hsl(var(--brand)/0.35)] bg-[hsl(var(--brand)/0.08)] px-3 py-2.5 text-xs leading-relaxed text-[hsl(var(--text))]">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-[hsl(var(--brand))]" />
            <span>{t("auth.sharedLogin")}</span>
          </div>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
          className="flex flex-col gap-4"
        >
          <form.Field name="email">
            {(field) => (
              <Input
                name={field.name}
                type="email"
                label={t("auth.email")}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <Input
                name={field.name}
                type="password"
                label={t("auth.password")}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            )}
          </form.Field>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
                {t(isSubmitting ? "auth.signingIn" : "auth.signIn")}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </div>
    </div>
  );
}
