import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Search, X } from "lucide-react";
import { useState } from "react";

import { cn } from "../lib/cn";

export type LogLevel = "debug" | "info" | "warn" | "error" | "trace";

export type LogEntry = {
  id: string;
  ts: string;
  level: string;
  msg: string;
  source?: string;
  data?: unknown;
};

const LEVEL_COLOR: Record<string, string> = {
  debug: "text-[hsl(var(--text-faint))]",
  trace: "text-[hsl(var(--text-faint))]",
  info: "text-blue-400",
  warn: "text-amber-400",
  error: "text-[hsl(var(--danger))]",
};

const LEVEL_BG: Record<string, string> = {
  debug: "bg-[hsl(var(--surface-2))] text-[hsl(var(--text-faint))]",
  trace: "bg-[hsl(var(--surface-2))] text-[hsl(var(--text-faint))]",
  info: "bg-blue-500/10 text-blue-400",
  warn: "bg-amber-500/10 text-amber-400",
  error: "bg-[hsl(var(--danger)/.1)] text-[hsl(var(--danger))]",
};

// ── JSON tree renderer ───────────────────────────────────────────────────────

type JsonNodeProperties = { value: unknown; depth?: number };

function JsonNode({ value, depth = 0 }: JsonNodeProperties): React.ReactNode {
  if (value === null) return <span className="text-purple-400">null</span>;
  if (value === undefined) return <span className="text-[hsl(var(--text-faint))]">undefined</span>;
  if (typeof value === "boolean") return <span className="text-purple-400">{String(value)}</span>;
  if (typeof value === "number") return <span className="text-orange-400">{String(value)}</span>;
  if (typeof value === "string") return <span className="text-green-400">&quot;{value}&quot;</span>;

  const indent = "  ".repeat(depth);
  const childIndent = "  ".repeat(depth + 1);

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-[hsl(var(--text-faint))]">[]</span>;
    return (
      <>
        <span className="text-[hsl(var(--text-muted))]">{"["}</span>
        {"\n"}
        {(value as unknown[]).map((item, itemIndex) => (
          <span key={itemIndex}>
            {childIndent}
            <JsonNode value={item} depth={depth + 1} />
            {itemIndex < value.length - 1 && (
              <span className="text-[hsl(var(--text-faint))]">,</span>
            )}
            {"\n"}
          </span>
        ))}
        {indent}
        <span className="text-[hsl(var(--text-muted))]">{"]"}</span>
      </>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-[hsl(var(--text-faint))]">{"{}"}</span>;
    return (
      <>
        <span className="text-[hsl(var(--text-muted))]">{"{"}</span>
        {"\n"}
        {entries.map(([entryKey, entryValue], entryIndex) => (
          <span key={entryKey}>
            {childIndent}
            <span className="text-blue-400">&quot;{entryKey}&quot;</span>
            <span className="text-[hsl(var(--text-faint))]">: </span>
            <JsonNode value={entryValue} depth={depth + 1} />
            {entryIndex < entries.length - 1 && (
              <span className="text-[hsl(var(--text-faint))]">,</span>
            )}
            {"\n"}
          </span>
        ))}
        {indent}
        <span className="text-[hsl(var(--text-muted))]">{"}"}</span>
      </>
    );
  }

  return <span className="text-[hsl(var(--text))]">{JSON.stringify(value)}</span>;
}

// ── HTTP structured data helpers ─────────────────────────────────────────────

type HttpRequestPayload = { requestHeaders: unknown; requestBody: unknown };
type HttpResponsePayload = {
  status: number;
  ms: number;
  responseHeaders: unknown;
  responseBody: unknown;
};

function isHttpRequest(data: unknown): data is HttpRequestPayload {
  return typeof data === "object" && data !== null && "requestHeaders" in data;
}

function isHttpResponse(data: unknown): data is HttpResponsePayload {
  return typeof data === "object" && data !== null && "responseHeaders" in data;
}

function tryParseJsonString(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// ── Data block (labelled code box) ───────────────────────────────────────────

type DataBlockProperties = { label: string; value: unknown };

function DataBlock({ label, value }: DataBlockProperties) {
  const parsed = tryParseJsonString(value);
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--text-faint))]">
        {label}
      </p>
      <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))] p-4 font-mono text-xs leading-relaxed">
        <pre className="whitespace-pre-wrap break-all">
          {typeof parsed === "string" ? (
            <span className="text-[hsl(var(--text))]">{parsed}</span>
          ) : (
            <JsonNode value={parsed} />
          )}
        </pre>
      </div>
    </div>
  );
}

// ── Structured data renderer (request / response / generic) ──────────────────

function DetailDataSection({ data }: { data: unknown }) {
  if (isHttpRequest(data)) {
    return (
      <>
        <DataBlock label="Request Headers" value={data.requestHeaders} />
        <DataBlock label="Request Body" value={data.requestBody} />
      </>
    );
  }

  if (isHttpResponse(data)) {
    return (
      <>
        <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] p-4 font-mono text-xs">
          <span className="text-[hsl(var(--text-faint))]">Status</span>
          <span className="text-[hsl(var(--text))]">{String(data.status)}</span>
          <span className="text-[hsl(var(--text-faint))]">Duration</span>
          <span className="text-[hsl(var(--text))]">{String(data.ms)}ms</span>
        </div>
        <DataBlock label="Response Headers" value={data.responseHeaders} />
        <DataBlock label="Response Body" value={data.responseBody} />
      </>
    );
  }

  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--text-faint))]">
        Data
      </p>
      <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))] p-4 font-mono text-xs leading-relaxed">
        <pre className="whitespace-pre-wrap break-all">
          <JsonNode value={data} />
        </pre>
      </div>
    </div>
  );
}

// ── Log detail ────────────────────────────────────────────────────────────────

export type LogDetailProperties = {
  entry: LogEntry;
  onClose: () => void;
  /** Page mode: renders as a full page with a ← Back button instead of an ✕ close button. */
  showBack?: boolean;
};

export function LogDetail({ entry, onClose, showBack = false }: LogDetailProperties) {
  const level = (entry.level ?? "info").toLowerCase();
  const levelColor = LEVEL_COLOR[level] ?? LEVEL_COLOR["info"];
  const levelBg = LEVEL_BG[level] ?? LEVEL_BG["info"];

  const hasData = entry.data !== undefined && entry.data !== null && entry.data !== "";
  let displayMessage = entry.msg;
  let expandableData = entry.data;

  const jsonIndex = hasData ? -1 : entry.msg.search(/\s(\{|\[)/u);
  if (jsonIndex !== -1) {
    try {
      expandableData = JSON.parse(entry.msg.slice(jsonIndex).trim());
      displayMessage = entry.msg.slice(0, jsonIndex).trim();
    } catch {
      // not JSON — leave as-is
    }
  }

  const metaGrid = (
    <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] p-4 font-mono text-xs">
      <span className="text-[hsl(var(--text-faint))]">Time</span>
      <span className="text-[hsl(var(--text))]">{entry.ts}</span>
      <span className="text-[hsl(var(--text-faint))]">Level</span>
      <span className={levelColor}>{level.toUpperCase()}</span>
      {entry.source && (
        <>
          <span className="text-[hsl(var(--text-faint))]">Source</span>
          <span className="text-[hsl(var(--brand-from))]">{entry.source}</span>
        </>
      )}
    </div>
  );

  const messageBlock = (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--text-faint))]">
        Message
      </p>
      <p className="break-all rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] p-4 font-mono text-xs text-[hsl(var(--text))]">
        {displayMessage}
      </p>
    </div>
  );

  const dataBlock =
    expandableData !== undefined && expandableData !== null ? (
      <DetailDataSection data={expandableData} />
    ) : undefined;

  // ── Page mode ──────────────────────────────────────────────────────────────
  if (showBack) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-[hsl(var(--text-muted))] transition-colors hover:text-[hsl(var(--text))]"
        >
          <ChevronLeft className="size-4" />
          Back to Logs
        </button>

        <div>
          <h1 className="text-2xl font-semibold text-[hsl(var(--text))]">Log Entry</h1>
          <div className="mt-2 flex items-center gap-3">
            <span className={cn("rounded px-2 py-0.5 text-xs font-bold uppercase", levelBg)}>
              {level}
            </span>
            <span className="font-mono text-xs text-[hsl(var(--text-faint))]">{entry.ts}</span>
          </div>
        </div>

        {metaGrid}
        {messageBlock}
        {dataBlock}
      </div>
    );
  }

  // ── Panel mode ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-[hsl(var(--border))] px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[hsl(var(--text-muted))] transition-colors hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text))]"
        >
          <X className="size-4" />
        </button>
        <span className={cn("rounded px-2 py-0.5 text-xs font-bold uppercase", levelBg)}>
          {level}
        </span>
        <span className="flex-1 truncate font-mono text-xs text-[hsl(var(--text-faint))]">
          {entry.ts}
        </span>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {metaGrid}
        {messageBlock}
        {dataBlock}
      </div>
    </div>
  );
}

// ── Single log row ───────────────────────────────────────────────────────────

type LogRowProperties = {
  entry: LogEntry;
  onViewDetail: (entry: LogEntry) => void;
};

function LogRow({ entry, onViewDetail }: LogRowProperties) {
  const [isExpanded, setIsExpanded] = useState(false);
  const level = (entry.level ?? "info").toLowerCase();
  const levelColor = LEVEL_COLOR[level] ?? LEVEL_COLOR["info"];
  const levelBg = LEVEL_BG[level] ?? LEVEL_BG["info"];

  const hasData = entry.data !== undefined && entry.data !== null && entry.data !== "";

  let displayMessage = entry.msg;
  let embeddedData: unknown;

  const jsonIndex = hasData ? -1 : entry.msg.search(/\s(\{|\[)/u);
  if (jsonIndex !== -1) {
    try {
      embeddedData = JSON.parse(entry.msg.slice(jsonIndex).trim());
      displayMessage = entry.msg.slice(0, jsonIndex).trim();
    } catch {
      // not valid JSON
    }
  }

  const expandableData = entry.data ?? embeddedData;
  const canExpand = expandableData !== undefined && expandableData !== null;

  const time = new Date(entry.ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="border-b border-[hsl(var(--border-subtle))] last:border-0">
      {/* Entire row is clickable to expand; detail button stops propagation */}
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[hsl(var(--surface-2))]"
        onClick={() => canExpand && setIsExpanded((previous) => !previous)}
      >
        {/* Chevron */}
        <span className="flex size-3.5 shrink-0 items-center justify-center text-[hsl(var(--text-faint))]">
          {canExpand &&
            (isExpanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            ))}
        </span>

        {/* Time — no wrap, uses only as much space as needed */}
        <span className="shrink-0 whitespace-nowrap text-[10px] tabular-nums text-[hsl(var(--text-faint))]">
          {time}
        </span>

        {/* Level badge */}
        <span
          className={cn(
            "w-[5ch] shrink-0 rounded px-1 py-0.5 text-center text-[9px] font-bold uppercase leading-none",
            levelBg,
          )}
        >
          {level.slice(0, 5)}
        </span>

        {/* Source tag */}
        {entry.source && (
          <span className="shrink-0 rounded bg-[hsl(var(--brand-from)/.1)] px-1.5 py-0.5 text-[9px] font-medium leading-none text-[hsl(var(--brand-from))]">
            {entry.source}
          </span>
        )}

        {/* Message */}
        <span className="min-w-0 flex-1 break-all text-left text-[hsl(var(--text))]">
          {displayMessage}
        </span>

        {/* Detail button */}
        <span
          role="button"
          tabIndex={0}
          title="View detail"
          aria-label="View detail"
          className="flex size-6 shrink-0 items-center justify-center rounded text-[hsl(var(--text-faint))] transition-colors hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--brand-from))]"
          onClick={(event) => {
            event.stopPropagation();
            onViewDetail(entry);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.stopPropagation();
            onViewDetail(entry);
          }}
        >
          <ExternalLink className="size-3.5" />
        </span>
      </button>

      {/* Expanded inline data */}
      {isExpanded && canExpand && (
        <div className="ml-9 border-l-2 border-[hsl(var(--border))] pb-3 pl-4 pt-2">
          <div className="mb-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[11px]">
            <span className="text-[hsl(var(--text-faint))]">Time</span>
            <span className="font-mono text-[hsl(var(--text-muted))]">{entry.ts}</span>
            <span className="text-[hsl(var(--text-faint))]">Level</span>
            <span className={cn("font-mono font-semibold uppercase", levelColor)}>{level}</span>
            {entry.source && (
              <>
                <span className="text-[hsl(var(--text-faint))]">Source</span>
                <span className="font-mono font-medium text-[hsl(var(--brand-from))]">
                  {entry.source}
                </span>
              </>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg bg-[hsl(var(--bg))] p-3 font-mono text-[11px] leading-relaxed">
            <pre className="whitespace-pre-wrap break-all">
              <JsonNode value={expandableData} />
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Public LogViewer ─────────────────────────────────────────────────────────

export type LogViewerProperties = {
  entries: LogEntry[];
  newestFirst?: boolean;
  className?: string;
  onViewDetail?: (entry: LogEntry) => void;
};

export function LogViewer({
  entries,
  newestFirst = true,
  className,
  onViewDetail,
}: LogViewerProperties) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? entries.filter(
        (entry) =>
          entry.msg.toLowerCase().includes(search.toLowerCase()) ||
          (entry.source ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : entries;

  const ordered = newestFirst ? filtered.toReversed() : filtered;

  const handleDetail = onViewDetail ?? (() => {});

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Search bar */}
      <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-4 py-2.5">
        <div className="flex items-center gap-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-1.5">
          <Search className="size-3.5 shrink-0 text-[hsl(var(--text-faint))]" />
          <input
            type="text"
            placeholder="Search messages or sources…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-0 flex-1 bg-transparent font-mono text-xs text-[hsl(var(--text))] placeholder:text-[hsl(var(--text-faint))] focus:outline-none"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="shrink-0 text-[hsl(var(--text-faint))] transition-colors hover:text-[hsl(var(--text))]"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <span className="shrink-0 font-mono text-[10px] text-[hsl(var(--text-faint))]">
              {ordered.length}
            </span>
          )}
        </div>
      </div>

      {/* Entries */}
      <div className="font-mono text-xs">
        {ordered.length === 0 ? (
          <p className="py-10 text-center text-sm text-[hsl(var(--text-muted))]">
            {search ? "No entries match your search." : "No log entries."}
          </p>
        ) : (
          ordered.map((entry) => (
            <LogRow key={entry.id} entry={entry} onViewDetail={handleDetail} />
          ))
        )}
      </div>
    </div>
  );
}

// Legacy name alias
export type { LogViewerProperties as LogViewerProps };
