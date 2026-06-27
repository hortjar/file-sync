import { PlatformIcon, formatPlatform } from "@file-sync/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Monitor, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import {
  deleteApiDevicesByIdMutation,
  getApiDevicesOptions,
  getApiDevicesQueryKey,
} from "../generated/@tanstack/react-query.gen";
import { toast } from "../lib/toast";

const ONLINE_MS = 2 * 60 * 1000;

type Device = {
  id: string;
  name: string;
  platform: string;
  lastSeenAt: string;
  appVersion?: string;
};

function isDeviceOnline(lastSeenAt: string): boolean {
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_MS;
}

export function DevicesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [confirmRemove, setConfirmRemove] = useState<Device | undefined>(undefined);

  const { data: devicesRaw, isLoading, isError } = useQuery(getApiDevicesOptions());
  const devices = (devicesRaw as Device[] | undefined) ?? [];

  const deviceDeletion = useMutation({
    ...deleteApiDevicesByIdMutation(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getApiDevicesQueryKey() });
      setConfirmRemove(undefined);
      toast.success(t("devices.removeDevice"));
    },
    onError: () => toast.error(t("common.error")),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[hsl(var(--text-muted))]">
        <span className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        {t("common.loading")}
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[hsl(var(--text))]">{t("devices.title")}</h1>
        </div>
        <div className="flex flex-col items-center py-20 text-center">
          <Monitor className="mb-4 size-10 text-[hsl(var(--danger))]" />
          <p className="font-medium text-[hsl(var(--text))]">{t("common.error")}</p>
          <p className="mt-1 text-sm text-[hsl(var(--text-muted))]">
            Could not load devices. Check that your server URL is correct and you are signed in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[hsl(var(--text))]">{t("devices.title")}</h1>
        <p className="mt-1 text-sm text-[hsl(var(--text-muted))]">
          {t("devices.subtitle", { count: devices.length })}
        </p>
      </div>

      {devices.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Monitor className="mb-4 size-10 text-[hsl(var(--text-faint))]" />
          <p className="font-medium text-[hsl(var(--text))]">{t("devices.noDevices")}</p>
        </div>
      ) : (
        <Card>
          <div className="divide-y divide-[hsl(var(--border-subtle))]">
            {devices.map((device) => {
              const isOnline = isDeviceOnline(device.lastSeenAt);
              return (
                <div key={device.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--surface-2))]">
                    <PlatformIcon
                      platform={device.platform}
                      className="size-5 text-[hsl(var(--text-muted))]"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[hsl(var(--text))]">
                        {device.name}
                      </span>
                      {device.appVersion && (
                        <span className="rounded-full bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[10px] text-[hsl(var(--text-faint))]">
                          v{device.appVersion}
                        </span>
                      )}
                    </div>
                    <p className="flex items-center gap-1 text-xs text-[hsl(var(--text-faint))]">
                      <PlatformIcon platform={device.platform} className="size-3" />
                      {formatPlatform(device.platform)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`size-1.5 rounded-full ${isOnline ? "bg-green-500" : "bg-[hsl(var(--text-faint))]"}`}
                        />
                        <span className="text-xs text-[hsl(var(--text-faint))]">
                          {t(isOnline ? "devices.isOnline" : "devices.offline")}
                        </span>
                      </div>
                      <p
                        className={`mt-0.5 text-[10px] text-[hsl(var(--text-faint))] ${isOnline ? "invisible" : ""}`}
                      >
                        {new Date(device.lastSeenAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmRemove(device)}
                      className="text-[hsl(var(--text-muted))] hover:text-[hsl(var(--danger))]"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-6 shadow-[var(--shadow-lg)]">
            <h2 className="text-base font-semibold text-[hsl(var(--text))]">
              {t("devices.confirmRemove", { name: confirmRemove.name })}
            </h2>
            <p className="mt-2 text-sm text-[hsl(var(--text-muted))]">
              {t("devices.confirmRemoveHint")}
            </p>
            <div className="mt-5 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setConfirmRemove(undefined)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                loading={deviceDeletion.isPending}
                onClick={() => deviceDeletion.mutate({ path: { id: confirmRemove.id } })}
              >
                {t("common.remove")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
