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

const PAGE_SIZE = 50;

// ── JSON tree renderer (raw mode) ────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function tryParseJsonString(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ── HTTP method badge ──────────────────────────────────────────────────────────

const METHOD_COLOR: Record<string, string> = {
  GET: "bg-blue-500/10 text-blue-400",
  POST: "bg-green-500/10 text-green-400",
  PUT: "bg-amber-500/10 text-amber-400",
  PATCH: "bg-violet-500/10 text-violet-400",
  DELETE: "bg-[hsl(var(--danger)/.1)] text-[hsl(var(--danger))]",
  HEAD: "bg-[hsl(var(--surface-2))] text-[hsl(var(--text-faint))]",
  OPTIONS: "bg-[hsl(var(--surface-2))] text-[hsl(var(--text-faint))]",
};

const METHOD_RE = /^\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/u;

/** Resolve the HTTP method from the entry's structured data or message prefix. */
function getHttpMethod(entry: LogEntry): string | undefined {
  if (isPlainObject(entry.data) && typeof entry.data["method"] === "string") {
    const method = entry.data["method"].toUpperCase();
    if (Object.hasOwn(METHOD_COLOR, method)) return method;
  }
  const match = METHOD_RE.exec(entry.msg);
  return match ? match[1] : undefined;
}

function MethodBadge({ method, className }: { method: string; className?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded px-1.5 py-0.5 text-center font-bold uppercase leading-none",
        METHOD_COLOR[method] ?? "bg-[hsl(var(--surface-2))] text-[hsl(var(--text-faint))]",
        className,
      )}
    >
      {method}
    </span>
  );
}

// ── Pretty (structured form) renderer ─────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 break-all font-mono text-[10px] font-medium text-[hsl(var(--text-faint))]">
      {children}
    </p>
  );
}

function ScalarValue({ value }: { value: string | number | boolean | null | undefined }) {
  let display: string;
  let tone: string;

  if (value === null) {
    display = "null";
    tone = "text-purple-400 italic";
  } else if (value === undefined) {
    display = "—";
    tone = "text-[hsl(var(--text-faint))] italic";
  } else if (typeof value === "boolean") {
    display = String(value);
    tone = "text-purple-400";
  } else if (typeof value === "number") {
    display = String(value);
    tone = "text-orange-400";
  } else if (value === "") {
    display = "(empty string)";
    tone = "text-[hsl(var(--text-faint))] italic";
  } else {
    display = value;
    tone = "text-[hsl(var(--text))]";
  }

  return (
    <div
      className={cn(
        "whitespace-pre-wrap break-all rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg))] px-3 py-1.5 font-mono text-xs",
        tone,
      )}
    >
      {display}
    </div>
  );
}

/** Renders any value: scalars as read-only fields, objects/arrays as nested field groups. */
function PrettyValue({ value }: { value: unknown }): React.ReactNode {
  const parsed = tryParseJsonString(value);

  if (parsed === null || parsed === undefined || typeof parsed !== "object") {
    return <ScalarValue value={parsed as string | number | boolean | null | undefined} />;
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      return (
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg))] px-3 py-1.5 font-mono text-xs italic text-[hsl(var(--text-faint))]">
          (empty array)
        </div>
      );
    }
    return (
      <div className="space-y-2 border-l-2 border-[hsl(var(--border))] pl-3">
        {(parsed as unknown[]).map((item, itemIndex) => (
          <div key={itemIndex}>
            <FieldLabel>[{itemIndex}]</FieldLabel>
            <PrettyValue value={item} />
          </div>
        ))}
      </div>
    );
  }

  const entries = Object.entries(parsed as Record<string, unknown>);
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg))] px-3 py-1.5 font-mono text-xs italic text-[hsl(var(--text-faint))]">
        (empty object)
      </div>
    );
  }
  return (
    <div className="space-y-2 border-l-2 border-[hsl(var(--border))] pl-3">
      {entries.map(([entryKey, entryValue]) => (
        <div key={entryKey}>
          <FieldLabel>{entryKey}</FieldLabel>
          <PrettyValue value={entryValue} />
        </div>
      ))}
    </div>
  );
}

/** Top-level pretty form: object/array entries become fields without the nesting border. */
function PrettyForm({ value }: { value: unknown }) {
  const parsed = tryParseJsonString(value);

  if (isPlainObject(parsed)) {
    const entries = Object.entries(parsed);
    if (entries.length === 0) return <ScalarValue value="" />;
    return (
      <div className="space-y-3">
        {entries.map(([entryKey, entryValue]) => (
          <div key={entryKey}>
            <FieldLabel>{entryKey}</FieldLabel>
            <PrettyValue value={entryValue} />
          </div>
        ))}
      </div>
    );
  }

  if (Array.isArray(parsed)) {
    return (
      <div className="space-y-3">
        {(parsed as unknown[]).map((item, itemIndex) => (
          <div key={itemIndex}>
            <FieldLabel>[{itemIndex}]</FieldLabel>
            <PrettyValue value={item} />
          </div>
        ))}
      </div>
    );
  }

  return <PrettyValue value={parsed} />;
}

// ── Data block (labelled, switches between pretty form and raw JSON) ───────────

type DataBlockProperties = { label: string; value: unknown; pretty: boolean };

function DataBlock({ label, value, pretty }: DataBlockProperties) {
  const parsed = tryParseJsonString(value);

  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--text-faint))]">
        {label}
      </p>
      {pretty ? (
        <PrettyForm value={parsed} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))] p-4 font-mono text-xs leading-relaxed">
          <pre className="whitespace-pre-wrap break-all">
            {typeof parsed === "string" ? (
              <span className="text-[hsl(var(--text))]">{parsed}</span>
            ) : (
              <JsonNode value={parsed} />
            )}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── HTTP structured data ───────────────────────────────────────────────────────

function hasAnyKey(data: unknown, keys: string[]): boolean {
  return isPlainObject(data) && keys.some((key) => Object.hasOwn(data, key));
}

const REQUEST_KEYS = ["requestHeaders", "requestBody", "method", "url"];
const RESPONSE_KEYS = ["responseHeaders", "responseBody", "status", "ms"];

function StatusGrid({ data }: { data: Record<string, unknown> }) {
  const rows: [string, string][] = [];
  if ("status" in data) rows.push(["Status", String(data["status"])]);
  if ("ms" in data) rows.push(["Duration", `${String(data["ms"])}ms`]);
  if (rows.length === 0) return <></>;

  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] p-4 font-mono text-xs">
      {rows.map(([key, value]) => (
        <span key={key} className="contents">
          <span className="text-[hsl(var(--text-faint))]">{key}</span>
          <span className="text-[hsl(var(--text))]">{value}</span>
        </span>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-[hsl(var(--text-muted))]">{title}</p>
      {children}
    </div>
  );
}

function DetailDataSection({ data, pretty }: { data: unknown; pretty: boolean }) {
  const hasRequest = hasAnyKey(data, REQUEST_KEYS);
  const hasResponse = hasAnyKey(data, RESPONSE_KEYS);

  if ((hasRequest || hasResponse) && isPlainObject(data)) {
    const handled = new Set([...REQUEST_KEYS, ...RESPONSE_KEYS]);
    const extra = Object.fromEntries(Object.entries(data).filter(([key]) => !handled.has(key)));

    return (
      <div className="space-y-6">
        {hasRequest && (
          <Section title="Request">
            {"method" in data && typeof data["method"] === "string" && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--text-faint))]">
                  Method
                </p>
                <MethodBadge
                  method={data["method"].toUpperCase()}
                  className="px-2 py-0.5 text-xs"
                />
              </div>
            )}
            {"url" in data && <DataBlock label="URL" value={data["url"]} pretty={pretty} />}
            {"requestHeaders" in data && (
              <DataBlock label="Request Headers" value={data["requestHeaders"]} pretty={pretty} />
            )}
            {"requestBody" in data && (
              <DataBlock label="Request Body" value={data["requestBody"]} pretty={pretty} />
            )}
          </Section>
        )}

        {hasResponse && (
          <Section title="Response">
            <StatusGrid data={data} />
            {"responseHeaders" in data && (
              <DataBlock label="Response Headers" value={data["responseHeaders"]} pretty={pretty} />
            )}
            {"responseBody" in data && (
              <DataBlock label="Response Body" value={data["responseBody"]} pretty={pretty} />
            )}
          </Section>
        )}

        {Object.keys(extra).length > 0 && <DataBlock label="Other" value={extra} pretty={pretty} />}
      </div>
    );
  }

  return <DataBlock label="Data" value={data} pretty={pretty} />;
}

// ── Pretty switch ──────────────────────────────────────────────────────────────

function PrettyToggle({
  pretty,
  onChange,
}: {
  pretty: boolean;
  onChange: (isPretty: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pretty}
      onClick={() => onChange(!pretty)}
      className="inline-flex shrink-0 items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--text-faint))] transition-colors hover:text-[hsl(var(--text-muted))]"
    >
      Pretty
      <span
        className={cn(
          "relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors",
          pretty ? "bg-[hsl(var(--brand-from))]" : "bg-[hsl(var(--border))]",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
            pretty ? "translate-x-4" : "translate-x-0",
          )}
        />
      </span>
    </button>
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
  const [pretty, setPretty] = useState(true);

  const level = (entry.level ?? "info").toLowerCase();
  const levelColor = LEVEL_COLOR[level] ?? LEVEL_COLOR["info"];
  const levelBg = LEVEL_BG[level] ?? LEVEL_BG["info"];
  const method = getHttpMethod(entry);

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
      {method && (
        <>
          <span className="text-[hsl(var(--text-faint))]">Method</span>
          <span>
            <MethodBadge method={method} className="text-[10px]" />
          </span>
        </>
      )}
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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--text-faint))]">
            Payload
          </p>
          <PrettyToggle pretty={pretty} onChange={setPretty} />
        </div>
        <DetailDataSection data={expandableData} pretty={pretty} />
      </div>
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
            {method && <MethodBadge method={method} className="px-2 py-0.5 text-xs" />}
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
        {method && <MethodBadge method={method} className="px-2 py-0.5 text-xs" />}
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
  const method = getHttpMethod(entry);

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

        {/* HTTP method badge */}
        {method && <MethodBadge method={method} className="text-[9px]" />}

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

// ── Pagination controls ────────────────────────────────────────────────────────

type PaginationProperties = {
  page: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  total: number;
  onPage: (next: number) => void;
};

function Pagination({
  page,
  totalPages,
  rangeStart,
  rangeEnd,
  total,
  onPage,
}: PaginationProperties) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-4 py-2 text-[11px] text-[hsl(var(--text-faint))]">
      <span className="tabular-nums">
        {rangeStart}–{rangeEnd} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
          className="flex items-center gap-1 rounded-md border border-[hsl(var(--border))] px-2 py-1 transition-colors hover:text-[hsl(var(--text))] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="size-3" />
          Prev
        </button>
        <span className="tabular-nums">
          {page + 1} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages - 1}
          onClick={() => onPage(page + 1)}
          className="flex items-center gap-1 rounded-md border border-[hsl(var(--border))] px-2 py-1 transition-colors hover:text-[hsl(var(--text))] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="size-3" />
        </button>
      </div>
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
  const [page, setPage] = useState(0);

  const filtered = search
    ? entries.filter(
        (entry) =>
          entry.msg.toLowerCase().includes(search.toLowerCase()) ||
          (entry.source ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : entries;

  const ordered = newestFirst ? filtered.toReversed() : filtered;

  const totalPages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  // Clamp during render so the page stays valid after filtering/refetch without an effect.
  const currentPage = Math.min(page, totalPages - 1);
  const rangeStart = currentPage * PAGE_SIZE;
  const visible = ordered.slice(rangeStart, rangeStart + PAGE_SIZE);

  const handleDetail = onViewDetail ?? (() => {});

  function handleSearch(next: string) {
    setSearch(next);
    setPage(0);
  }

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
            onChange={(event) => handleSearch(event.target.value)}
            className="min-w-0 flex-1 bg-transparent font-mono text-xs text-[hsl(var(--text))] placeholder:text-[hsl(var(--text-faint))] focus:outline-none"
          />
          {search ? (
            <button
              type="button"
              onClick={() => handleSearch("")}
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
      <div className="min-h-0 flex-1 overflow-y-auto font-mono text-xs">
        {ordered.length === 0 ? (
          <p className="py-10 text-center text-sm text-[hsl(var(--text-muted))]">
            {search ? "No entries match your search." : "No log entries."}
          </p>
        ) : (
          visible.map((entry) => (
            <LogRow key={entry.id} entry={entry} onViewDetail={handleDetail} />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          rangeStart={rangeStart + 1}
          rangeEnd={Math.min(rangeStart + PAGE_SIZE, ordered.length)}
          total={ordered.length}
          onPage={setPage}
        />
      )}
    </div>
  );
}

// Legacy name alias
export type { LogViewerProperties as LogViewerProps };
