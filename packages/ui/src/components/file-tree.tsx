import { ChevronDown, ChevronRight, File, FolderOpen } from "lucide-react";
import { useState } from "react";

export type TreeNode = {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  mtime: string;
  children: TreeNode[];
};

export type FileEntryForTree = {
  relativePath: string;
  size: number;
  mtime: string;
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

export function TreeItem({ node, depth }: { node: TreeNode; depth: number }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const indent = 8 + depth * 16;

  if (node.isDir) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-[hsl(var(--surface-2))]"
          style={{ paddingLeft: `${indent}px` }}
        >
          {isExpanded ? (
            <ChevronDown className="size-3.5 shrink-0 text-[hsl(var(--text-faint))]" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-[hsl(var(--text-faint))]" />
          )}
          <FolderOpen className="size-3.5 shrink-0 text-[hsl(var(--brand-from))]" />
          <span className="font-medium text-[hsl(var(--text))]">{node.name}</span>
        </button>
        {isExpanded &&
          node.children.map((child) => (
            <TreeItem key={child.path} node={child} depth={depth + 1} />
          ))}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-[hsl(var(--surface-2))]"
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
    </div>
  );
}
