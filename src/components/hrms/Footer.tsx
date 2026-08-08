import * as React from "react";

/**
 * Footer — sticky (mt-auto) site footer. Left: copyright. Right: tech stack
 * and an emerald "System operational" status dot.
 *
 * Pure server component — no interactivity required.
 */
export function Footer() {
  return (
    <footer className="mt-auto border-t bg-card/50 py-4 px-6 text-xs text-muted-foreground backdrop-blur">
      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
        <p>© 2025 Implex Edu — HRMS v1.0</p>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline">
            Built with Next.js 16 · Prisma · shadcn/ui
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            System operational
          </span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
