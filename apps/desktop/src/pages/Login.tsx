import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { FolderSync, Lock, Mail, Server } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "../components/ui/button";
import { postApiAuthLoginMutation } from "../generated/@tanstack/react-query.gen";
import { configureApiClient, setAuthHeader } from "../lib/api-client";
import { toast } from "../lib/toast";
import {
  setServerUrl,
  setTokens,
  setUserEmail,
  setUserId,
  useAuthStore,
} from "../stores/auth";

type LoginResponse = {
  user: { id: string; email: string; createdAt: string };
  accessToken: string;
  refreshToken: string;
};

export function LoginPage() {
  const { t } = useTranslation();
  const serverUrl = useAuthStore((s) => s.serverUrl);

  const loginMutation = useMutation({
    ...postApiAuthLoginMutation(),
    onSuccess: (data) => {
      const response = data as LoginResponse;
      setAuthHeader(response.accessToken);
      setTokens(response.accessToken, response.refreshToken);
      setUserId(response.user.id);
      setUserEmail(response.user.email);
    },
    onError: (loginError) => {
      const message = loginError instanceof Error ? loginError.message : t("auth.loginFailed");
      toast.error(t("auth.signInFailed"), { description: message });
    },
  });

  const form = useForm({
    defaultValues: { serverUrl, email: "", password: "" },
    onSubmit: ({ value }) => {
      const url = value.serverUrl || serverUrl;
      configureApiClient(url);
      setServerUrl(url);
      loginMutation.mutate({ body: { email: value.email, password: value.password } });
    },
  });

  return (
    <div
      className="flex h-screen items-center justify-center bg-[hsl(240,10%,7%)]"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 80% 50% at 50% -10%, hsl(262,83%,25%/.5) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 80% 100%, hsl(291,91%,20%/.3) 0%, transparent 60%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-[600px] rounded-full gradient-brand opacity-5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm px-4">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl gradient-brand shadow-lg shadow-[hsl(var(--brand-from)/.3)]">
            <FolderSync className="size-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">FileSync</h1>
            <p className="mt-1 text-sm text-white/50">{t("auth.signInSubtitle")}</p>
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
          className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_8px_40px_hsl(0,0%,0%/.4)]"
        >
          <form.Field name="serverUrl">
            {(field) => (
              <div className="relative">
                <Server className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/30" />
                <input
                  name={field.name}
                  type="url"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  required
                  placeholder={t("auth.serverUrl")}
                  className="h-9 w-full rounded-2xl border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[hsl(var(--brand-from)/.6)] focus:ring-2 focus:ring-[hsl(var(--brand-from)/.2)]"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="email">
            {(field) => (
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/30" />
                <input
                  name={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  required
                  autoComplete="email"
                  placeholder={t("auth.email")}
                  className="h-9 w-full rounded-2xl border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[hsl(var(--brand-from)/.6)] focus:ring-2 focus:ring-[hsl(var(--brand-from)/.2)]"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/30" />
                <input
                  name={field.name}
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder={t("auth.password")}
                  className="h-9 w-full rounded-2xl border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[hsl(var(--brand-from)/.6)] focus:ring-2 focus:ring-[hsl(var(--brand-from)/.2)]"
                />
              </div>
            )}
          </form.Field>

          <Button
            type="submit"
            loading={loginMutation.isPending}
            className="mt-1 h-10 text-sm font-semibold shadow-lg shadow-[hsl(var(--brand-from)/.3)]"
          >
            {t("auth.signIn")}
          </Button>
        </form>
      </div>
    </div>
  );
}
