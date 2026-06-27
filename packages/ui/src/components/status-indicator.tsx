import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "../lib/cn";

export type StatusDetail = { label: string; value: string };

export type StatusIndicatorProperties = {
  /** Whether the client is connected to the server. */
  online: boolean;
  /** Desktop-only "syncing" state — hides the steady Wi-Fi icon while active. */
  syncing?: boolean;
  /** Compact label shown inline in the sidebar row. */
  rowLabel: string;
  /** Large heading inside the hover detail card. */
  title: string;
  /** Detail rows (label/value) shown in the hover card. */
  details: StatusDetail[];
  /**
   * Optional reconnect action. When provided and the client is offline, a
   * reconnect button is rendered at the bottom of the hover card.
   */
  onReconnect?: () => void;
  /** Label for the reconnect button (required for it to render). */
  reconnectLabel?: string;
};

/**
 * Sidebar connection indicator: a status dot + label, with a hover card showing
 * detailed status and an optional reconnect action. Presentational only —
 * desktop and web supply the data and behaviour.
 *
 * Open/close is driven by JS hover intent with a short close delay rather than
 * pure CSS `:hover`. A CSS-only hover card drops `:hover` the instant the cursor
 * crosses the gap between the row and the card — on Windows/WebView2 with
 * fractional DPI scaling that gap can be a dead zone, leaving the card visible
 * but impossible to move into, click, or select text from. The delay bridges
 * that crossing reliably on every platform.
 */
export function StatusIndicator({
  online,
  syncing = false,
  rowLabel,
  title,
  details,
  onReconnect,
  reconnectLabel,
}: StatusIndicatorProperties) {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function open() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setIsOpen(true);
  }

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setIsOpen(false), 150);
  }

  return (
    <div className="relative" onMouseEnter={open} onMouseLeave={scheduleClose}>
      <div className="flex items-center px-3 py-1.5">
        {/* Dot centered in a size-4 box so it lines up with the nav row icons. */}
        <div className="mr-2.5 flex size-4 shrink-0 items-center justify-center">
          <div
            className={cn(
              "size-1.5 rounded-full",
              online ? "bg-[hsl(var(--success))]" : "bg-[hsl(var(--danger))]",
            )}
          />
        </div>
        <span className="flex-1 text-xs text-[hsl(var(--text-faint))]">{rowLabel}</span>
        {!online && <WifiOff className="size-3 text-[hsl(var(--danger))]" />}
        {online && !syncing && <Wifi className="size-3 text-[hsl(var(--success))] opacity-50" />}
      </div>

      {/* Detailed status card. The bottom padding (instead of a margin) keeps the
          gap between the row and the card inside the hover area; combined with
          the close delay the cursor can always travel up into the card to click
          or copy. */}
      <div
        className={cn(
          "absolute bottom-full left-2 z-50 w-max max-w-[80vw] pb-2 transition-opacity duration-150",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="whitespace-nowrap rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-3 shadow-[var(--shadow-lg)]">
          <p
            className={cn(
              "text-base font-semibold",
              online ? "text-[hsl(var(--success))]" : "text-[hsl(var(--danger))]",
            )}
          >
            {title}
          </p>
          <dl className="mt-2 flex flex-col gap-1.5 text-[11px]">
            {details.map((detail) => (
              <div key={detail.label} className="flex items-center justify-between gap-6">
                <dt className="text-[hsl(var(--text-faint))]">{detail.label}</dt>
                <dd className="select-text font-mono text-[hsl(var(--text-muted))]">
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>

          {!online && onReconnect && reconnectLabel && (
            <button
              type="button"
              onClick={onReconnect}
              className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[hsl(var(--border))] py-1.5 text-xs font-medium text-[hsl(var(--text-muted))] transition-colors hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--text))]"
            >
              <RefreshCw className="size-3" />
              {reconnectLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
