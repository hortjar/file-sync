import { ArrowUpRight, FolderSync } from "lucide-react";
import { Link } from "react-router-dom";

import { APP_NAME, GITHUB_URL } from "../../lib/landing";
import { Button } from "../ui/button";

import { GithubIcon } from "./GithubIcon";

const LINK_CLASS =
  "rounded-full px-3.5 py-2 text-sm text-[hsl(var(--text-muted))] transition-colors hover:text-[hsl(var(--text))]";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[hsl(var(--bg)/0.72)] backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-xl gradient-brand shadow-md shadow-[hsl(var(--brand-from)/.45)]">
            <FolderSync className="size-4 text-white" />
          </span>
          <span className="text-base font-semibold tracking-tight">{APP_NAME}</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <a href="/#features" className={LINK_CLASS}>
            Features
          </a>
          <Link to="/quick-start" className={LINK_CLASS}>
            Quick start
          </Link>
          <Link to="/downloads" className={LINK_CLASS}>
            Download
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className={`${LINK_CLASS} inline-flex items-center gap-1.5`}
          >
            <GithubIcon className="size-4" />
            GitHub
          </a>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="flex size-9 items-center justify-center rounded-full text-[hsl(var(--text-muted))] transition-colors hover:bg-white/[0.06] hover:text-[hsl(var(--text))] md:hidden"
          >
            <GithubIcon className="size-5" />
          </a>
          <Button asChild size="sm" className="gap-1.5">
            <Link to="/admin">
              Dashboard
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
