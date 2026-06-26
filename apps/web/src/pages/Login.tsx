import { useForm } from "@tanstack/react-form";
import { FolderSync } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { postApiAuthLogin } from "../generated/sdk.gen";
import { initApiClient, setAuthHeader } from "../lib/api-client";
import { toast } from "../lib/toast";
import {
  setServerUrl,
  setTokens,
  setUserEmail,
  setUserId,
  useAuthStore,
} from "../stores/auth";

type LoginResponse = { accessToken: string; refreshToken: string; userId: string; email: string };

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const storedUrl = useAuthStore((s) => s.serverUrl);

  const form = useForm({
    defaultValues: { serverUrl: storedUrl, email: "", password: "" },
    onSubmit: async ({ value }) => {
      const serverUrl = value.serverUrl.trim();
      const email = value.email.trim();
      try {
        initApiClient(serverUrl);
        const { data, error } = await postApiAuthLogin({
          body: { email, password: value.password },
        });

        if (error || !data) {
          toast.error(t("auth.invalidCredentials"));
          return;
        }

        const response = data as LoginResponse;
        setServerUrl(serverUrl);
        setTokens(response.accessToken, response.refreshToken);
        setUserId(response.userId);
        setUserEmail(response.email);
        setAuthHeader(response.accessToken);
        void navigate("/dashboard");
      } catch {
        toast.error(t("auth.connectionError"));
      }
    },
  });

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

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

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
          className="flex flex-col gap-4"
        >
          <form.Field name="serverUrl">
            {(field) => (
              <Input
                name={field.name}
                type="url"
                label={t("auth.serverUrl")}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="http://localhost:3001"
                required
              />
            )}
          </form.Field>
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
