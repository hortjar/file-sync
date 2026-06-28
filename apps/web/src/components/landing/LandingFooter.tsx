import { FolderSync } from "lucide-react";
import { Link } from "react-router-dom";

import { APP_NAME, GITHUB_URL, RELEASES_URL, VERSION } from "../../lib/landing";

import { GithubIcon } from "./GithubIcon";

const EXTERNAL = { target: "_blank", rel: "noreferrer" } as const;
const LINK_CLASS =
  "text-sm text-[hsl(var(--text-muted))] transition-colors hover:text-[hsl(var(--text))]";

export function LandingFooter() {
  return (
    <footer className="relative border-t border-white/[0.06] px-5 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 sm:flex-row sm:justify-between">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl gradient-brand">
              <FolderSync className="size-4 text-white" />
            </span>
            <span className="text-base font-semibold tracking-tight">{APP_NAME}</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[hsl(var(--text-muted))]">
            Self-hosted, real-time file synchronization for all your devices.
          </p>
        </div>

        <div className="flex gap-16">
          <nav className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-faint))]">
              Product
            </span>
            <a href="/#features" className={LINK_CLASS}>
              Features
            </a>
            <Link to="/quick-start" className={LINK_CLASS}>
              Quick start
            </Link>
            <Link to="/downloads" className={LINK_CLASS}>
              Downloads
            </Link>
            <Link to="/admin" className={LINK_CLASS}>
              Dashboard
            </Link>
          </nav>

          <nav className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-faint))]">
              Source
            </span>
            <a
              href={GITHUB_URL}
              className={`${LINK_CLASS} inline-flex items-center gap-1.5`}
              {...EXTERNAL}
            >
              <GithubIcon className="size-3.5" />
              GitHub
            </a>
            <a href={RELEASES_URL} className={LINK_CLASS} {...EXTERNAL}>
              Releases
            </a>
            <a href={`${GITHUB_URL}/issues`} className={LINK_CLASS} {...EXTERNAL}>
              Issues
            </a>
          </nav>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-6xl flex-col gap-2 border-t border-white/[0.06] pt-6 text-xs text-[hsl(var(--text-faint))] sm:flex-row sm:items-center sm:justify-between">
        <span>
          © {new Date().getFullYear()} {APP_NAME} · Open source & self-hostable
        </span>
        <span>Built with Tauri, Elysia & Bun · v{VERSION}</span>
      </div>
    </footer>
  );
}
