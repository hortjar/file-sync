import { Apple, Terminal } from "lucide-react";

import type { DesktopOs } from "../../lib/landing";

type OsGlyphProperties = { os: DesktopOs; className?: string };

function WindowsGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M0 3.449 9.75 2.1v9.451H0V3.449Zm10.949-1.51L24 0v11.4H10.949V1.939ZM0 12.6h9.75v9.451L0 20.699V12.6Zm10.949 0H24V24l-13.051-1.84V12.6Z" />
    </svg>
  );
}

/** Platform glyph for a desktop OS — Apple/Windows marks, terminal for Linux. */
export function OsGlyph({ os, className }: OsGlyphProperties) {
  if (os === "windows") return <WindowsGlyph className={className} />;
  if (os === "linux") return <Terminal className={className} />;
  return <Apple className={className} />;
}
