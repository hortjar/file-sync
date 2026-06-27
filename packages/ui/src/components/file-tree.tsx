import { ChevronDown, ChevronRight, Download, File, FolderOpen } from "lucide-react";
import { useState } from "react";

export type TreeNode = {
  name: string;
  path: string;
  isDir: boolean;
  /** File-entry id for leaf files; undefined for directories. */
  id?: string | undefined;
  size: number;
  mtime: string;
  children: TreeNode[];
};

export type FileEntryForTree = {
  /** Server file-entry id, used to download the file. */
  id?: string | undefined;
  relativePath: string;
  size: number;
  mtime: string;
};

/** Optional download actions; when provided, hover affordances are rendered. */
export type TreeDownloadHandlers = {
  /** Download a single file leaf. */
  onDownloadFile?: ((node: TreeNode) => void) | undefined;
  /** Download a directory subtree (e.g. as a zip). */
  onDownloadFolder?: ((node: TreeNode) => void) | undefined;
};

function sortNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .toSorted((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .map((n) => ({ ...n, children: sortNodes(n.children) }));
}

export function buildTree(entries: FileEntryForTree[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const entry of entries) {
    const parts = entry.relativePath.split(/[/\\]/u).filter(Boolean);
    let current = root;

    for (let index = 0; index < parts.length; index++) {
      const part = parts[index] ?? "";
      const isLast = index === parts.length - 1;
      const nodePath = parts.slice(0, index + 1).join("/");

      let node = current.find((n) => n.name === part);
      if (!node) {
        node = isLast
          ? {
              name: part,
              path: nodePath,
              isDir: false,
              id: entry.id,
              size: entry.size,
              mtime: entry.mtime,
              children: [],
            }
          : { name: part, path: nodePath, isDir: true, size: 0, mtime: "", children: [] };
        current.push(node);
      }

      if (!isLast) {
        current = node.children;
      }
    }
  }

  return sortNodes(root);
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex] ?? "B"}`;
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Small hover-revealed download button shared by file and folder rows. */
function DownloadButton({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="shrink-0 cursor-pointer rounded p-1 text-[hsl(var(--text-faint))] opacity-0 transition-opacity hover:text-[hsl(var(--text))] group-hover:opacity-100 focus-visible:opacity-100"
    >
      <Download className="size-3.5" />
    </button>
  );
}

export function TreeItem({
  node,
  depth,
  onDownloadFile,
  onDownloadFolder,
}: { node: TreeNode; depth: number } & TreeDownloadHandlers) {
  const [isExpanded, setIsExpanded] = useState(true);
  const indent = 8 + depth * 16;

  if (node.isDir) {
    return (
      <div>
        <div
          className="group flex items-center gap-1 rounded pr-1 text-sm hover:bg-[hsl(var(--surface-2))]"
          style={{ paddingLeft: `${indent}px` }}
        >
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="flex flex-1 cursor-pointer items-center gap-2 py-1 text-left"
          >
            {isExpanded ? (
              <ChevronDown className="size-3.5 shrink-0 text-[hsl(var(--text-faint))]" />
            ) : (
              <ChevronRight className="size-3.5 shrink-0 text-[hsl(var(--text-faint))]" />
            )}
            <FolderOpen className="size-3.5 shrink-0 text-[hsl(var(--brand-from))]" />
            <span className="font-medium text-[hsl(var(--text))]">{node.name}</span>
          </button>
          {onDownloadFolder && (
            <DownloadButton title="Download as zip" onClick={() => onDownloadFolder(node)} />
          )}
        </div>
        {isExpanded &&
          node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              onDownloadFile={onDownloadFile}
              onDownloadFolder={onDownloadFolder}
            />
          ))}
      </div>
    );
  }

  return (
    <div
      className="group flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-[hsl(var(--surface-2))]"
      style={{ paddingLeft: `${indent}px` }}
    >
      <div className="size-3.5 shrink-0" />
      <File className="size-3.5 shrink-0 text-[hsl(var(--text-faint))]" />
      <span className="flex-1 truncate text-[hsl(var(--text))]">{node.name}</span>
      <span className="shrink-0 text-xs text-[hsl(var(--text-faint))]">
        {formatSize(node.size)}
      </span>
      <span className="hidden w-28 shrink-0 text-right text-xs text-[hsl(var(--text-faint))] sm:block">
        {formatDate(node.mtime)}
      </span>
      {onDownloadFile && node.id && (
        <DownloadButton title="Download" onClick={() => onDownloadFile(node)} />
      )}
    </div>
  );
}
