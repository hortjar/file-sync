import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { join } from "@tauri-apps/api/path";
import { writeFile } from "@tauri-apps/plugin-fs";
import i18n from "i18next";
import { CheckCircle2, FolderSync, GitMerge, Laptop, Server } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";
import {
  getApiConflictsOptions,
  getApiConflictsQueryKey,
} from "../../generated/@tanstack/react-query.gen";
import { postApiConflictsByIdResolve } from "../../generated/sdk.gen";
import { toast } from "../../lib/toast";
import { downloadFile } from "../../services/downloader";
import { uploadLocalFile } from "../../services/uploader";
import { authStore } from "../../stores/auth";
import { getFileVersion, setFileVersion } from "../../stores/file-versions";
import { linksStore } from "../../stores/links";

type ConflictItem = {
  id: string;
  fileEntryId: string;
  syncFolderId: string;
  syncFolderName: string;
  relativePath: string;
  localHash: string;
  remoteHash: string;
  localMtime: string;
  remoteMtime: string;
  localDeviceName: string;
  remoteDeviceName: string;
  createdAt: string;
};

type ResolveResult = {
  ok: boolean;
  resolution: "keep_local" | "keep_remote" | "keep_both";
  fileEntryId: string;
  syncFolderId: string;
  relativePath: string;
  remoteHash: string;
};

function toMessage(thrown: unknown): string {
  return thrown instanceof Error ? thrown.message : i18n.t("common.unknownError");
}

function addConflictSuffix(relativePath: string, deviceName: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const suffix = ` (conflict from ${deviceName} on ${date})`;
  const lastSlash = relativePath.lastIndexOf("/");
  const directory = lastSlash === -1 ? "" : relativePath.slice(0, lastSlash + 1);
  const filename = lastSlash === -1 ? relativePath : relativePath.slice(lastSlash + 1);
  const lastDot = filename.lastIndexOf(".");
  if (lastDot > 0) {
    const base = filename.slice(0, lastDot);
    const extension = filename.slice(lastDot);
    return `${directory}${base}${suffix}${extension}`;
  }

  return `${directory}${filename}${suffix}`;
}

async function callResolveConflict(
  conflictId: string,
  resolution: "keep_local" | "keep_remote" | "keep_both",
): Promise<ResolveResult> {
  const { data } = await postApiConflictsByIdResolve({
    path: { id: conflictId },
    body: { resolution },
    throwOnError: true,
  });
  return data as ResolveResult;
}

type ConflictCardProperties = {
  conflict: ConflictItem;
  onResolve: (id: string, resolution: "keep_local" | "keep_remote" | "keep_both") => void;
  isPending: boolean;
};

function ConflictCard({ conflict, onResolve, isPending }: ConflictCardProperties) {
  const { t } = useTranslation();
  const filename = conflict.relativePath.split("/").at(-1) ?? conflict.relativePath;
  const localDate = new Date(conflict.localMtime).toLocaleString();
  const remoteDate = new Date(conflict.remoteMtime).toLocaleString();

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[hsl(var(--text))]">{filename}</p>
            <p className="mt-0.5 text-xs text-[hsl(var(--text-faint))]">
              {conflict.relativePath !== filename && (
                <span className="mr-1 opacity-60">{conflict.relativePath}</span>
              )}
              {t("conflicts.inFolder")}{" "}
              <span className="font-medium text-[hsl(var(--text-muted))]">
                {conflict.syncFolderName}
              </span>
            </p>
          </div>
          <Badge variant="danger" className="shrink-0 text-[10px]">
            {t("conflicts.conflictBadge")}
          </Badge>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Laptop className="size-3 text-[hsl(var(--text-faint))]" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--text-faint))]">
                {t("conflicts.yourVersion")}
              </span>
            </div>
            <p className="text-xs font-medium text-[hsl(var(--text))]">
              {conflict.localDeviceName}
            </p>
            <p className="mt-0.5 text-[11px] text-[hsl(var(--text-faint))]">{localDate}</p>
            <p className="mt-1 font-mono text-[10px] text-[hsl(var(--text-faint))] opacity-60">
              {conflict.localHash.slice(0, 12)}…
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Server className="size-3 text-[hsl(var(--text-faint))]" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--text-faint))]">
                {t("conflicts.theirVersion")}
              </span>
            </div>
            <p className="text-xs font-medium text-[hsl(var(--text))]">
              {conflict.remoteDeviceName}
            </p>
            <p className="mt-0.5 text-[11px] text-[hsl(var(--text-faint))]">{remoteDate}</p>
            <p className="mt-1 font-mono text-[10px] text-[hsl(var(--text-faint))] opacity-60">
              {conflict.remoteHash.slice(0, 12)}…
            </p>
          </div>
        </div>

        <Separator className="mb-3 bg-white/[0.06]" />

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            loading={isPending}
            onClick={() => onResolve(conflict.id, "keep_local")}
            className="flex-1 text-xs"
          >
            {t("conflicts.keepMine")}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            loading={isPending}
            onClick={() => onResolve(conflict.id, "keep_remote")}
            className="flex-1 text-xs"
          >
            {t("conflicts.keepTheirs")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            loading={isPending}
            onClick={() => onResolve(conflict.id, "keep_both")}
            className="flex-1 text-xs"
          >
            <GitMerge className="size-3.5" />
            {t("conflicts.keepBoth")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ConflictsPage() {
  const { t } = useTranslation();
  const queryClientHook = useQueryClient();

  const { data: rawConflicts, isLoading, isError } = useQuery(getApiConflictsOptions());
  const conflictList = (rawConflicts as ConflictItem[] | undefined) ?? [];

  const resolveMutation = useMutation({
    mutationFn: async ({
      conflictId,
      resolution,
      conflict,
    }: {
      conflictId: string;
      resolution: "keep_local" | "keep_remote" | "keep_both";
      conflict: ConflictItem;
    }): Promise<void> => {
      const result = await callResolveConflict(conflictId, resolution);
      const { accessToken, serverUrl, deviceId } = authStore.state;
      const { folderPaths } = linksStore.state;
      const localBase = folderPaths[conflict.syncFolderId];

      if (resolution === "keep_local" && localBase && accessToken && deviceId) {
        const localPath = await join(localBase, conflict.relativePath);
        const nextVersion = getFileVersion(conflict.syncFolderId, conflict.relativePath) + 1;
        await uploadLocalFile(
          localPath,
          conflict.syncFolderId,
          conflict.relativePath,
          deviceId,
          nextVersion,
          serverUrl,
          accessToken,
        );
        setFileVersion(conflict.syncFolderId, conflict.relativePath, nextVersion);
      }

      if (resolution === "keep_remote" && localBase) {
        const nextVersion = getFileVersion(conflict.syncFolderId, conflict.relativePath) + 1;
        await downloadFile(
          result.fileEntryId,
          conflict.syncFolderId,
          localBase,
          conflict.relativePath,
          result.remoteHash,
          nextVersion,
          serverUrl,
        );
      }

      if (resolution === "keep_both" && localBase && accessToken) {
        const conflictRelativePath = addConflictSuffix(
          conflict.relativePath,
          conflict.remoteDeviceName,
        );
        const conflictLocalPath = await join(localBase, conflictRelativePath);
        const response = await fetch(`${serverUrl}/api/sync/download/${result.fileEntryId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.ok) {
          await writeFile(conflictLocalPath, new Uint8Array(await response.arrayBuffer()));
        }
      }
    },
    onSuccess: () => {
      void queryClientHook.invalidateQueries({ queryKey: getApiConflictsQueryKey() });
      toast.success(t("conflicts.resolved"));
    },
    onError: (thrown) => {
      toast.error(t("conflicts.resolveFailed"), { description: toMessage(thrown) });
    },
  });

  function handleResolve(
    conflictId: string,
    resolution: "keep_local" | "keep_remote" | "keep_both",
    conflict: ConflictItem,
  ) {
    resolveMutation.mutate({ conflictId, resolution, conflict });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[hsl(var(--text-muted))]">
        <div className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        {t("conflicts.loading")}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="mb-1 text-sm font-medium text-[hsl(var(--text))]">
          {t("conflicts.loadError")}
        </p>
        <p className="text-xs text-[hsl(var(--text-muted))]">{t("conflicts.loadErrorHint")}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[hsl(var(--text))]">{t("conflicts.title")}</h1>
        <p className="mt-0.5 text-sm text-[hsl(var(--text-muted))]">
          {conflictList.length === 0
            ? t("conflicts.allInSync")
            : t("conflicts.needAttention", { count: conflictList.length })}
        </p>
      </div>

      {conflictList.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-[hsl(var(--success)/.2)] bg-[hsl(var(--success)/.1)]">
            <CheckCircle2 className="size-7 text-[hsl(var(--success))]" />
          </div>
          <h3 className="mb-1 text-base font-semibold text-[hsl(var(--text))]">
            {t("conflicts.noConflicts")}
          </h3>
          <p className="max-w-xs text-sm text-[hsl(var(--text-muted))]">
            {t("conflicts.noConflictsHint")}
          </p>
        </div>
      )}

      {conflictList.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="mb-1 flex items-center gap-2">
            <FolderSync className="size-3.5 text-[hsl(var(--text-faint))]" />
            <p className="text-xs text-[hsl(var(--text-faint))]">{t("conflicts.keepBothHint")}</p>
          </div>
          {conflictList.map((conflict) => (
            <ConflictCard
              key={conflict.id}
              conflict={conflict}
              isPending={resolveMutation.isPending}
              onResolve={(id, resolution) => handleResolve(id, resolution, conflict)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
