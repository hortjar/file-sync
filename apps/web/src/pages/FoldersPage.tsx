import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderSync, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  deleteApiSyncFoldersByIdMutation,
  getApiSyncFoldersOptions,
  getApiSyncFoldersQueryKey,
} from "../generated/@tanstack/react-query.gen";

type SyncFolder = {
  id: string;
  name: string;
  iconKey: string;
  iconColor: string | undefined;
  createdAt: string;
  devices: { name: string; platform: string }[];
};

export function FoldersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState<SyncFolder | undefined>(undefined);

  const { data: foldersRaw, isLoading } = useQuery(getApiSyncFoldersOptions());
  const folders = (foldersRaw as SyncFolder[] | undefined) ?? [];

  const folderDeletion = useMutation({
    ...deleteApiSyncFoldersByIdMutation(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getApiSyncFoldersQueryKey() });
      setConfirmDelete(undefined);
      toast.success(t("folders.deleteFolder"));
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[hsl(var(--text))]">{t("folders.title")}</h1>
        <p className="mt-1 text-sm text-[hsl(var(--text-muted))]">
          {t("folders.subtitle", { count: folders.length })}
        </p>
      </div>

      {folders.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <FolderSync className="mb-4 size-10 text-[hsl(var(--text-faint))]" />
          <p className="font-medium text-[hsl(var(--text))]">{t("folders.noFolders")}</p>
          <p className="mt-1 text-sm text-[hsl(var(--text-muted))]">{t("folders.noFoldersHint")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {folders.map((folder) => (
            <Card
              key={folder.id}
              className="group cursor-pointer transition-shadow hover:shadow-[var(--shadow-sm)]"
              onClick={() => void navigate(`/folders/${folder.id}`)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))]">
                  <FolderSync className="size-5 text-[hsl(var(--brand-from))]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[hsl(var(--text))]">
                    {folder.name}
                  </p>
                  <p className="text-xs text-[hsl(var(--text-faint))]">
                    {folder.devices.length > 0
                      ? folder.devices.map((d) => d.name).join(", ")
                      : t("folders.noDevices")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    setConfirmDelete(folder);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--danger))]"
                >
                  <Trash2 className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-6 shadow-[var(--shadow-lg)]">
            <h2 className="text-base font-semibold text-[hsl(var(--text))]">
              {t("folders.confirmDelete", { name: confirmDelete.name })}
            </h2>
            <p className="mt-2 text-sm text-[hsl(var(--text-muted))]">
              {t("folders.confirmDeleteHint")}
            </p>
            <div className="mt-5 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setConfirmDelete(undefined)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                loading={folderDeletion.isPending}
                onClick={() => folderDeletion.mutate({ path: { id: confirmDelete.id } })}
              >
                {t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
