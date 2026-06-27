import {
  AlertCircle,
  ArrowRightLeft,
  Braces,
  Cable,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Fingerprint,
  Gauge,
  Globe,
  Hash,
  Languages,
  Link2,
  List,
  Lock,
  Mail,
  Monitor,
  Package,
  Search,
  Server,
  ShieldCheck,
  Tag,
  Timer,
  X,
  XCircle,
} from "lucide-react";
import { useState } from "react";

import { cn } from "../lib/cn";

import { PlatformIcon, formatPlatform } from "./platform";

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

// ── Key labels + icons ────────────────────────────────────────────────────────

const KEY_LABELS: Record<string, string> = {
  id: "ID",
  ms: "Duration",
  ts: "Time",
  url: "URL",
  status: "Status",
  method: "Method",
  name: "Name",
  email: "Email",
  platform: "Platform",
  appVersion: "App version",
  version: "Version",
  clientVersion: "Client version",
  serverVersion: "Server version",
  lastSeenAt: "Last seen",
  createdAt: "Created",
  updatedAt: "Updated",
  deletedAt: "Deleted",
  deviceId: "Device",
  syncFolderId: "Sync folder",
  userId: "User",
  relativePath: "Path",
  localPath: "Local path",
  contentHash: "Hash",
  size: "Size",
};

const KEY_ICON: Record<
  string,
  (properties: { className?: string | undefined }) => React.ReactNode
> = {
  authorization: Lock,
  cookie: Lock,
  "set-cookie": Lock,
  host: Server,
  origin: Globe,
  referer: Globe,
  "user-agent": Monitor,
  "content-type": FileText,
  "content-length": FileText,
  accept: ArrowRightLeft,
  "accept-encoding": Package,
  "accept-language": Languages,
  connection: Cable,
  vary: ArrowRightLeft,
  "access-control-allow-credentials": ShieldCheck,
  "access-control-allow-origin": Globe,
  "access-control-allow-methods": ArrowRightLeft,
  "access-control-allow-headers": List,
  "access-control-expose-headers": List,
  id: Hash,
  name: Tag,
  email: Mail,
  url: Link2,
  status: Gauge,
  ms: Timer,
  ts: Clock,
  lastSeenAt: Clock,
  createdAt: Calendar,
  updatedAt: Calendar,
  deletedAt: Calendar,
  appVersion: Package,
  version: Package,
  clientVersion: Package,
  serverVersion: Package,
  platform: Monitor,
  deviceId: Fingerprint,
  contentHash: Fingerprint,
  relativePath: FileText,
  localPath: FileText,
  size: FileText,
};

/** Subtle per-key icon colours so meaning reads at a glance. */
const KEY_ICON_TONE: Record<string, string> = {
  authorization: "text-amber-400",
  cookie: "text-amber-400",
  "set-cookie": "text-amber-400",
  host: "text-blue-400",
  origin: "text-blue-400",
  referer: "text-blue-400",
  "access-control-allow-origin": "text-blue-400",
  url: "text-blue-400",
  name: "text-blue-400",
  email: "text-blue-400",
  platform: "text-blue-400",
  "user-agent": "text-violet-400",
  id: "text-violet-400",
  deviceId: "text-violet-400",
  contentHash: "text-violet-400",
  "access-control-allow-methods": "text-violet-400",
  "content-type": "text-teal-400",
  "content-length": "text-teal-400",
  relativePath: "text-teal-400",
  localPath: "text-teal-400",
  accept: "text-cyan-400",
  "accept-encoding": "text-cyan-400",
  "accept-language": "text-cyan-400",
  "access-control-allow-headers": "text-cyan-400",
  "access-control-expose-headers": "text-cyan-400",
  vary: "text-cyan-400",
  "access-control-allow-credentials": "text-[hsl(var(--success))]",
  status: "text-[hsl(var(--success))]",
  ms: "text-amber-400",
  ts: "text-amber-400",
  lastSeenAt: "text-amber-400",
  createdAt: "text-amber-400",
  updatedAt: "text-amber-400",
  deletedAt: "text-amber-400",
  appVersion: "text-emerald-400",
  version: "text-emerald-400",
  clientVersion: "text-emerald-400",
  serverVersion: "text-emerald-400",
  size: "text-orange-400",
};

function capitalizeWord(word: string): string {
  return word.length === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1);
}

/** Human label for a data key: known names, HTTP Header-Case, or sentence case. */
function formatKey(key: string): string {
  const known = KEY_LABELS[key];
  if (known) return known;
  if (key.includes("-"))
    return key
      .split("-")
      .map((word) => capitalizeWord(word))
      .join("-");
  const spaced = key
    .replaceAll("_", " ")
    .replaceAll(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .toLowerCase()
    .trim();
  return capitalizeWord(spaced);
}

function KeyIcon({ keyName, className }: { keyName: string; className?: string }) {
  const Icon = KEY_ICON[keyName] ?? Braces;
  const tone = KEY_ICON_TONE[keyName] ?? "text-[hsl(var(--text-faint))]";
  return <Icon className={cn(tone, className)} />;
}

/** Label row for a field: a meaning-hinting icon plus the formatted key. */
function FieldLabel({ keyName }: { keyName: string }) {
  return (
    <span className="mb-1 flex items-center gap-1.5">
      <KeyIcon keyName={keyName} className="size-3.5 shrink-0" />
      <span className="break-all font-mono text-[11px] font-semibold text-[hsl(var(--text-muted))]">
        {formatKey(keyName)}
      </span>
    </span>
  );
}

function isLeafValue(value: unknown): boolean {
  const parsed = tryParseJsonString(value);
  return parsed === null || parsed === undefined || typeof parsed !== "object";
}

/** A single field: leaf values sit in a row beside the label; nested values stack. */
function Field({ keyName, value }: { keyName: string; value: unknown }) {
  if (!isLeafValue(value)) {
    return (
      <div>
        <FieldLabel keyName={keyName} />
        <PrettyValue keyName={keyName} value={value} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
      <span className="flex shrink-0 items-center gap-1.5 sm:w-48">
        <KeyIcon keyName={keyName} className="size-3.5 shrink-0" />
        <span className="break-all font-mono text-[11px] font-semibold text-[hsl(var(--text-muted))]">
          {formatKey(keyName)}
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        <PrettyValue keyName={keyName} value={value} />
      </span>
    </div>
  );
}

/** Numeric index label for array items. */
function IndexLabel({ index }: { index: number }) {
  return (
    <span className="mb-1 flex items-center gap-1.5">
      <Hash className="size-3.5 shrink-0 text-[hsl(var(--text-faint))]" />
      <span className="font-mono text-[11px] font-semibold text-[hsl(var(--text-muted))]">
        {index}
      </span>
    </span>
  );
}

// ── Value detection + formatting ──────────────────────────────────────────────

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/u;
const VERSION_KEYS = new Set(["appVersion", "version", "clientVersion", "serverVersion"]);

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE_RE.test(value);
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const deltaSeconds = Math.round((Date.now() - then) / 1000);
  const magnitude = Math.abs(deltaSeconds);
  const suffix = deltaSeconds >= 0 ? "ago" : "from now";
  if (magnitude < 60) return `${magnitude}s ${suffix}`;
  const minutes = Math.round(magnitude / 60);
  if (minutes < 60) return `${minutes}m ${suffix}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ${suffix}`;
  return `${Math.round(hours / 24)}d ${suffix}`;
}

function statusTone(code: number): string {
  if (code >= 200 && code < 300) {
    return "border-[hsl(var(--success)/.4)] bg-[hsl(var(--success)/.1)] text-[hsl(var(--success))]";
  }
  if (code >= 300 && code < 400) return "border-amber-500/40 bg-amber-500/10 text-amber-400";
  return "border-[hsl(var(--danger)/.4)] bg-[hsl(var(--danger)/.1)] text-[hsl(var(--danger))]";
}

/** Status-code glyph: success tick, redirect alert, or error cross. */
function StatusGlyph({ code, className }: { code: number; className?: string }) {
  if (code >= 200 && code < 300) return <CheckCircle2 className={className} />;
  if (code >= 300 && code < 400) return <AlertCircle className={className} />;
  return <XCircle className={className} />;
}

// ── Value chips/boxes ─────────────────────────────────────────────────────────

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 break-all rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 font-mono text-[11px] text-[hsl(var(--text-muted))]",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A boolean rendered as a labelled checkbox. */
function BooleanValue({ value }: { value: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
        value
          ? "border-[hsl(var(--success)/.4)] bg-[hsl(var(--success)/.1)] text-[hsl(var(--success))]"
          : "border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] text-[hsl(var(--text-faint))]",
      )}
    >
      <span
        className={cn(
          "flex size-3.5 items-center justify-center rounded-[3px] border",
          value
            ? "border-[hsl(var(--success))] bg-[hsl(var(--success))]"
            : "border-[hsl(var(--text-faint))]",
        )}
      >
        {value && <Check className="size-2.5 text-white" />}
      </span>
      {value ? "True" : "False"}
    </span>
  );
}

function TimestampValue({ iso }: { iso: string }) {
  const relative = formatRelative(iso);
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Clock className="size-3.5 shrink-0 text-[hsl(var(--text-faint))]" />
      <span className="font-mono text-xs text-[hsl(var(--text))]">{formatTimestamp(iso)}</span>
      {relative && <span className="text-[11px] text-[hsl(var(--text-faint))]">· {relative}</span>}
    </span>
  );
}

function StatusValue({ code }: { code: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold",
        statusTone(code),
      )}
    >
      <StatusGlyph code={code} className="size-3.5" />
      {code}
    </span>
  );
}

function DurationValue({ durationMs }: { durationMs: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-2 py-1 text-xs text-[hsl(var(--text-muted))]">
      <Timer className="size-3.5 text-[hsl(var(--text-faint))]" />
      {durationMs} ms
    </span>
  );
}

function VersionValue({ value }: { value: string | number }) {
  const text = String(value);
  return (
    <Chip>
      <Package className="size-3 text-[hsl(var(--text-faint))]" />
      {text.startsWith("v") ? text : `v${text}`}
    </Chip>
  );
}

function PlatformValue({ platform }: { platform: string }) {
  return (
    <Chip>
      <PlatformIcon platform={platform} className="size-3 text-[hsl(var(--text-muted))]" />
      {formatPlatform(platform)}
    </Chip>
  );
}

/** A read-only field box showing an italic placeholder for empty/absent values. */
function EmptyValue({ label }: { label: string }) {
  return (
    <span className="inline-block rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--bg))] px-2 py-0.5 font-mono text-xs italic text-[hsl(var(--text-faint))]">
      {label}
    </span>
  );
}

function ScalarValue({ value }: { value: string | number | boolean | null | undefined }) {
  if (value === undefined) return <EmptyValue label="—" />;
  if (value === "") return <EmptyValue label="(empty string)" />;

  let display: string;
  let tone: string;

  if (value === null) {
    display = "null";
    tone = "text-purple-400 italic";
  } else if (typeof value === "boolean") {
    display = String(value);
    tone = "text-purple-400";
  } else if (typeof value === "number") {
    display = String(value);
    tone = "text-orange-400";
  } else {
    display = value;
    tone = "text-green-400";
  }

  return (
    <span
      className={cn(
        "inline-block max-w-full whitespace-pre-wrap break-all rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--bg))] px-2 py-0.5 font-mono text-xs",
        tone,
      )}
    >
      {display}
    </span>
  );
}

/** Key-aware leaf rendering: timestamps, booleans, status, version, platform, etc. */
function LeafValue({
  keyName,
  value,
}: {
  keyName?: string | undefined;
  value: unknown;
}): React.ReactNode {
  if (keyName === "platform" && typeof value === "string") {
    return <PlatformValue platform={value} />;
  }
  if (keyName === "status" && typeof value === "number") return <StatusValue code={value} />;
  if ((keyName === "ms" || keyName === "duration") && typeof value === "number") {
    return <DurationValue durationMs={value} />;
  }
  if (keyName === "method" && typeof value === "string") {
    return <MethodBadge method={value.toUpperCase()} className="px-2 py-0.5 text-xs" />;
  }
  if (
    keyName !== undefined &&
    VERSION_KEYS.has(keyName) &&
    (typeof value === "string" || typeof value === "number")
  ) {
    return <VersionValue value={value} />;
  }

  const boolean = asBoolean(value);
  if (boolean !== undefined) return <BooleanValue value={boolean} />;
  if (isIsoDate(value)) return <TimestampValue iso={value} />;

  return <ScalarValue value={value as string | number | boolean | null | undefined} />;
}

/** Renders any value: smart leaves as chips/boxes, objects/arrays as nested groups. */
function PrettyValue({
  keyName,
  value,
}: {
  keyName?: string | undefined;
  value: unknown;
}): React.ReactNode {
  const parsed = tryParseJsonString(value);

  if (parsed === null || parsed === undefined || typeof parsed !== "object") {
    return <LeafValue keyName={keyName} value={parsed} />;
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return <EmptyValue label="(empty array)" />;
    return (
      <div className="space-y-2 border-l-2 border-[hsl(var(--border))] pl-3">
        {(parsed as unknown[]).map((item, itemIndex) => (
          <div key={itemIndex}>
            <IndexLabel index={itemIndex} />
            <PrettyValue value={item} />
          </div>
        ))}
      </div>
    );
  }

  const entries = Object.entries(parsed as Record<string, unknown>);
  if (entries.length === 0) return <EmptyValue label="(empty object)" />;
  return (
    <div className="space-y-2 border-l-2 border-[hsl(var(--border))] pl-3">
      {entries.map(([childKey, childValue]) => (
        <Field key={childKey} keyName={childKey} value={childValue} />
      ))}
    </div>
  );
}

/** Top-level pretty form: object/array entries become fields without the nesting border. */
function PrettyForm({ value }: { value: unknown }) {
  const parsed = tryParseJsonString(value);

  if (isPlainObject(parsed)) {
    const entries = Object.entries(parsed);
    if (entries.length === 0) return <EmptyValue label="(empty object)" />;
    return (
      <div className="space-y-2.5">
        {entries.map(([childKey, childValue]) => (
          <Field key={childKey} keyName={childKey} value={childValue} />
        ))}
      </div>
    );
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return <EmptyValue label="(empty array)" />;
    return (
      <div className="space-y-2">
        {(parsed as unknown[]).map((item, itemIndex) => (
          <div
            key={itemIndex}
            className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] p-3"
          >
            <IndexLabel index={itemIndex} />
            <PrettyValue value={item} />
          </div>
        ))}
      </div>
    );
  }

  return <PrettyValue value={parsed} />;
}

// ── Header + URL specialised renderers ─────────────────────────────────────────

/** Render a header value as chips (comma-split), a checkbox, a timestamp, or method badges. */
function HeaderValue({ keyName, value }: { keyName: string; value: unknown }) {
  const boolean = asBoolean(value);
  if (boolean !== undefined) return <BooleanValue value={boolean} />;
  if (isIsoDate(value)) return <TimestampValue iso={value} />;
  if (typeof value !== "string") return <PrettyValue keyName={keyName} value={value} />;

  const items = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (items.length === 0) return <EmptyValue label="(empty)" />;

  if (keyName === "access-control-allow-methods") {
    return (
      <>
        {items.map((method) => (
          <MethodBadge
            key={method}
            method={method.toUpperCase()}
            className="px-1.5 py-0.5 text-[10px]"
          />
        ))}
      </>
    );
  }

  return (
    <>
      {items.map((item, itemIndex) => (
        <Chip key={`${item}-${itemIndex}`}>{item}</Chip>
      ))}
    </>
  );
}

/** A header object rendered as label/value rows. */
function HeadersBlock({ value }: { value: unknown }) {
  if (!isPlainObject(value)) return <PrettyForm value={value} />;
  const entries = Object.entries(value);
  if (entries.length === 0) return <EmptyValue label="(no headers)" />;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))] p-3">
      {entries.map(([headerKey, headerValue]) => (
        <div key={headerKey} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
          <span className="flex shrink-0 items-center gap-1.5 sm:w-52">
            <KeyIcon
              keyName={headerKey}
              className="size-3.5 shrink-0 text-[hsl(var(--text-faint))]"
            />
            <span className="break-all font-mono text-[11px] font-semibold text-[hsl(var(--text-muted))]">
              {formatKey(headerKey)}
            </span>
          </span>
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            <HeaderValue keyName={headerKey} value={headerValue} />
          </span>
        </div>
      ))}
    </div>
  );
}

function UrlValue({ value }: { value: unknown }) {
  if (typeof value !== "string") return <PrettyForm value={value} />;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg))] px-3 py-1.5">
      <Link2 className="size-3.5 shrink-0 text-[hsl(var(--text-faint))]" />
      <span className="break-all font-mono text-xs text-[hsl(var(--text))]">{value}</span>
    </div>
  );
}

type DataKind = "headers" | "url" | "form";

function PrettyBody({ kind, value }: { kind: DataKind; value: unknown }) {
  if (kind === "headers") return <HeadersBlock value={value} />;
  if (kind === "url") return <UrlValue value={value} />;
  return <PrettyForm value={value} />;
}

// ── Data block (labelled, switches between pretty form and raw JSON) ───────────

/** A sub-section header (e.g. "Request Headers", "Message", "Payload"). */
function BlockLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("py-1 text-xs font-semibold text-[hsl(var(--text-muted))]", className)}>
      {children}
    </p>
  );
}

type DataBlockProperties = { label: string; value: unknown; pretty: boolean; kind?: DataKind };

function DataBlock({ label, value, pretty, kind = "form" }: DataBlockProperties) {
  const parsed = tryParseJsonString(value);

  return (
    <div>
      <BlockLabel className="mb-1.5">{label}</BlockLabel>
      {pretty ? (
        <PrettyBody kind={kind} value={parsed} />
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

/** Status code + duration shown side by side, each with an icon. */
function ResponseMeta({ data }: { data: Record<string, unknown> }) {
  const hasStatus = data["status"] !== undefined && data["status"] !== null;
  const hasDuration = data["ms"] !== undefined && data["ms"] !== null;
  if (!hasStatus && !hasDuration) return <></>;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      {hasStatus && (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-[hsl(var(--text-muted))]">
            <Gauge className="size-3.5 text-[hsl(var(--text-faint))]" />
            Status
          </span>
          <StatusValue code={Number(data["status"])} />
        </div>
      )}
      {hasDuration && (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-[hsl(var(--text-muted))]">
            <Timer className="size-3.5 text-[hsl(var(--text-faint))]" />
            Duration
          </span>
          <DurationValue durationMs={Number(data["ms"])} />
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="border-b border-[hsl(var(--border))] pb-1.5 text-base font-semibold text-[hsl(var(--text))]">
        {title}
      </h3>
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
                <BlockLabel className="mb-1.5">Method</BlockLabel>
                <MethodBadge
                  method={data["method"].toUpperCase()}
                  className="px-2 py-0.5 text-xs"
                />
              </div>
            )}
            {"url" in data && (
              <DataBlock label="URL" value={data["url"]} pretty={pretty} kind="url" />
            )}
            {"requestHeaders" in data && (
              <DataBlock
                label="Request Headers"
                value={data["requestHeaders"]}
                pretty={pretty}
                kind="headers"
              />
            )}
            {"requestBody" in data && (
              <DataBlock label="Request Body" value={data["requestBody"]} pretty={pretty} />
            )}
          </Section>
        )}

        {hasResponse && (
          <Section title="Response">
            <ResponseMeta data={data} />
            {"responseHeaders" in data && (
              <DataBlock
                label="Response Headers"
                value={data["responseHeaders"]}
                pretty={pretty}
                kind="headers"
              />
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
  const [pretty, setPretty] = useState(false);

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
      <span className="flex items-center gap-1.5 font-semibold text-[hsl(var(--text-muted))]">
        <Clock className="size-3.5 text-[hsl(var(--text-faint))]" />
        Time
      </span>
      <span className="text-[hsl(var(--text))]">
        {formatTimestamp(entry.ts)}
        {formatRelative(entry.ts) && (
          <span className="ml-1.5 text-[hsl(var(--text-faint))]">· {formatRelative(entry.ts)}</span>
        )}
      </span>
      <span className="font-semibold text-[hsl(var(--text-muted))]">Level</span>
      <span className={levelColor}>{level.toUpperCase()}</span>
      {method && (
        <>
          <span className="font-semibold text-[hsl(var(--text-muted))]">Method</span>
          <span>
            <MethodBadge method={method} className="text-[10px]" />
          </span>
        </>
      )}
      {entry.source && (
        <>
          <span className="font-semibold text-[hsl(var(--text-muted))]">Source</span>
          <span className="text-[hsl(var(--brand-from))]">{entry.source}</span>
        </>
      )}
    </div>
  );

  const messageBlock = (
    <div>
      <BlockLabel className="mb-2">Message</BlockLabel>
      <p className="break-all rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] p-4 font-mono text-xs text-[hsl(var(--text))]">
        {displayMessage}
      </p>
    </div>
  );

  const dataBlock =
    expandableData !== undefined && expandableData !== null ? (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <BlockLabel>Payload</BlockLabel>
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
