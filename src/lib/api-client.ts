"use client";

/**
 * Browser-side POST helper that handles the "server returned HTML
 * instead of JSON" failure mode gracefully.
 *
 * Without this, fetch().then(r => r.json()) on a 500 with HTML body
 * crashes with "Unexpected token '<', '<!DOCTYPE'..." which gives the
 * user no useful information. We instead surface the HTTP status and
 * a short body excerpt so they (and we) can debug.
 *
 * Returns a discriminated union — caller branches on `ok`.
 */

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string };

export async function apiPost<T = unknown>(
  url: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
  } catch (e) {
    // Network-layer failure — DNS, refused connection, blocked by extension.
    return {
      ok: false,
      status: 0,
      error: `Network error: ${(e as Error).message}`,
    };
  }

  const contentType = res.headers.get("content-type") ?? "";
  const looksJson = contentType.includes("application/json");

  if (!looksJson) {
    // Server returned HTML / text. Most common causes:
    //   - 404 (route doesn't exist) → Next.js error HTML
    //   - 500 (uncaught throw in route) → Next.js error HTML
    //   - middleware redirected to a login page (HTML)
    const text = await res.text().catch(() => "");
    const excerpt = text.slice(0, 240).replace(/\s+/g, " ").trim();
    return {
      ok: false,
      status: res.status,
      error:
        res.status === 404
          ? `Route ${url} not found (HTTP 404). Pull the latest main + restart the dev server.`
          : `Server returned ${res.status} ${res.statusText} (non-JSON response). First 240 chars: ${excerpt || "(empty)"}`,
    };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch (e) {
    return {
      ok: false,
      status: res.status,
      error: `Server returned malformed JSON: ${(e as Error).message}`,
    };
  }

  if (!res.ok) {
    const err =
      typeof json === "object" && json !== null && "error" in json
        ? String((json as { error: unknown }).error)
        : `Request failed with status ${res.status}`;
    return { ok: false, status: res.status, error: err };
  }

  return { ok: true, status: res.status, data: json as T };
}
