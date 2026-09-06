"use client";

import { useCallback, useEffect, useState } from "react";

export function cls(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Today's date as YYYY-MM-DD (local time). */
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

export function money(n: number): string {
  return `TZS ${fmtNum(n)}`;
}

async function parseError(r: Response): Promise<string> {
  try {
    const body = (await r.json()) as { error?: string };
    return body?.error ?? r.statusText;
  } catch {
    return r.statusText || "Something went wrong";
  }
}

export async function postJSON<T = unknown>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await parseError(r));
  return (await r.json()) as T;
}

export async function putJSON<T = unknown>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await parseError(r));
  return (await r.json()) as T;
}

export async function delJSON(url: string): Promise<void> {
  const r = await fetch(url, { method: "DELETE" });
  if (!r.ok) throw new Error(await parseError(r));
}

/** Simple hook to fetch data from an API and refresh it. */
export function useFetch<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!url) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(await parseError(r));
        return (await r.json()) as T;
      })
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, refresh };
}

export function longDate(): string {
  try {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return new Date().toDateString();
  }
}

export function shortDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    const dt = new Date(`${d}T00:00:00`);
    return dt.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}
