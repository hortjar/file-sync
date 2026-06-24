import { FolderSync } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { postApiAuthLogin } from "../generated/sdk.gen";
import { initApiClient, setAuthHeader } from "../lib/api-client";
import { useAuthStore } from "../stores/auth";

type LoginResponse = { accessToken: string; refreshToken: string; userId: string; email: string };

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, setTokens, setServerUrl, setUserId, setUserEmail } = useAuthStore();
  const storedUrl = useAuthStore((s) => s.serverUrl);
  const [isPending, setIsPending] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = (formData.get("email") as string).trim();
    const password = formData.get("password") as string;
    const serverUrl = (formData.get("serverUrl") as string).trim();

    setIsPending(true);
    try {
      initApiClient(serverUrl);
      const { data, error } = await postApiAuthLogin({ body: { email, password } });

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
    } finally {
      setIsPending(false);
    }
  }

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

        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
          <Input
            name="serverUrl"
            type="url"
            label={t("auth.serverUrl")}
            defaultValue={storedUrl}
            placeholder="http://localhost:3001"
            required
          />
          <Input
            name="email"
            type="email"
            label={t("auth.email")}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
          <Input
            name="password"
            type="password"
            label={t("auth.password")}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
          <Button type="submit" loading={isPending} className="mt-2 w-full">
            {t(isPending ? "auth.signingIn" : "auth.signIn")}
          </Button>
        </form>
      </div>
    </div>
  );
}
