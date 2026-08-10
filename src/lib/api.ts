"use client";

/**
 * Client-side fetch wrapper for the HRMS demo.
 *
 * Problem: on the absolute coldest load (no session cookie), `GET /api/session`
 * bootstraps a demo session and returns it via `Set-Cookie`. The dashboard then
 * mounts and fires its own fetches (`/api/overview`, `/api/notifications`, …).
 * In dev / HMR scenarios the dashboard's requests sometimes leave the browser
 * before the cookie jar is fully updated, producing a 401 flash and an empty
 * dashboard state until a manual refresh.
 *
 * Fix: if a request returns 401 AND we have not yet ensured the session cookie,
 * transparently bootstrap the session (`GET /api/session`) and retry the
 * original request exactly once. The `sessionEnsured` flag guarantees we never
 * loop — a second 401 after bootstrap is a genuine auth failure and is thrown.
 *
 * Dashboards are NOT refactored to use this helper yet (per W1-A scope), but it
 * is exported here so future fetch sites can opt in for free.
 */

let sessionEnsured = false;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    body: string,
  ) {
    super(`API ${status}: ${body.slice(0, 120)}`);
    this.name = "ApiError";
  }
}

export async function apiFetch<T = unknown>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const doFetch = () => fetch(input, { ...init, credentials: "same-origin" });

  let res = await doFetch();

  if (res.status === 401 && !sessionEnsured) {
    // Bootstrap the session cookie, then retry once.
    sessionEnsured = true;
    try {
      await fetch("/api/session", { credentials: "same-origin" });
    } catch {
      /* ignore — the retry below will surface any real failure */
    }
    res = await doFetch();
  }

  if (!res.ok) {
    throw new ApiError(res.status, await res.text().catch(() => ""));
  }
  return res.json() as Promise<T>;
}

/**
 * Test-only escape hatch: resets the `sessionEnsured` flag so a fresh cold
 * start can be simulated. Not used in production code paths.
 */
export function __resetSessionEnsuredForTests(): void {
  sessionEnsured = false;
}
