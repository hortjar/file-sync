import { Copy } from "lucide-react";

import { toast } from "../../lib/toast";

type CodeBlockProperties = {
  /** The command/snippet to display and copy. */
  code: string;
  /** Optional caption shown above the snippet (e.g. the target platform). */
  label?: string;
};

/** A terminal-style snippet with a one-click copy button. */
export function CodeBlock({ code, label }: CodeBlockProperties) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy — select the text manually");
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[hsl(var(--surface))]">
      {label ? (
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2">
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
          </span>
          <span className="font-mono text-xs text-[hsl(var(--text-faint))]">{label}</span>
        </div>
      ) : undefined}
      <div className="flex items-start gap-3 px-4 py-3.5">
        <span className="select-none pt-0.5 font-mono text-sm text-[hsl(var(--brand-to))]">$</span>
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-sm text-[hsl(var(--text))]">
          {code}
        </code>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label="Copy command"
          className="shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.03] p-2 text-[hsl(var(--text-muted))] transition-colors hover:bg-white/[0.07] hover:text-[hsl(var(--text))]"
        >
          <Copy className="size-4" />
        </button>
      </div>
    </div>
  );
}
