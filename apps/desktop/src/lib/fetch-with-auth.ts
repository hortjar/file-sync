import { logger } from "../services/logger";
import { tryRefreshToken } from "../services/token-refresh";
import { authStore } from "../stores/auth";
import { logLevelStore } from "../stores/log-level";

function authHeaders(): Record<string, string> {
  const { accessToken } = authStore.state;
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

function redactedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has("token")) parsed.searchParams.set("token", "[redacted]");
    return parsed.href;
  } catch {
    return url;
  }
}

function isDebugMode(): boolean {
  return logLevelStore.state.logLevel === "debug";
}

function serializeHeaders(headers: Headers | Record<string, string> | undefined): string {
  if (!headers) return "{}";
  const result: Record<string, string> = {};
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      result[key] = key.toLowerCase() === "authorization" ? "Bearer [redacted]" : value;
    });
  } else {
    for (const [key, value] of Object.entries(headers)) {
      result[key] = key.toLowerCase() === "authorization" ? "Bearer [redacted]" : value;
    }
  }
  return JSON.stringify(result);
}

function serializeRequestBody(init: RequestInit | undefined): string {
  if (!init?.body) return "(none)";
  if (typeof init.body === "string") {
    try {
      return JSON.stringify(JSON.parse(init.body), undefined, 2);
    } catch {
      return init.body.slice(0, 500);
    }
  }
  return "(binary)";
}

// Clones the response before reading so the original stream is still consumable.
async function peekResponseBody(response: Response): Promise<[string, Response]> {
  const cloned = response.clone();
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const text = await cloned.text();
      const pretty = JSON.stringify(JSON.parse(text), undefined, 2);
      return [pretty.slice(0, 2000), response];
    } catch {
      return ["(could not parse JSON body)", response];
    }
  }

  if (contentType.startsWith("text/")) {
    const text = await cloned.text();
    return [text.slice(0, 500), response];
  }

  const buffer = await cloned.arrayBuffer();
  return [`(binary ${buffer.byteLength} bytes)`, response];
}

async function fetchOnce(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { ...(init?.headers as Record<string, string> | undefined), ...authHeaders() },
  });
}

function logRequestDebug(method: string, safe: string, init?: RequestInit): void {
  const requestHeaders = serializeHeaders(init?.headers as Record<string, string> | undefined);
  const requestBody = serializeRequestBody(init);
  logger.debug(`[http] → ${method} ${safe}`, { requestHeaders, requestBody });
}

async function logResponseDebug(
  label: string,
  safe: string,
  response: Response,
  elapsed: number,
): Promise<Response> {
  const responseHeaders = serializeHeaders(response.headers);
  const [responseBody, original] = await peekResponseBody(response);
  logger.debug(`[http] ${label} ${safe} ${response.status} (${elapsed}ms)`, {
    status: response.status,
    ms: elapsed,
    responseHeaders,
    responseBody,
  });
  return original;
}

export async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  const method = init?.method ?? "GET";
  const safe = redactedUrl(url);
  const t0 = Date.now();
  const shouldLogDebug = isDebugMode();

  if (shouldLogDebug) {
    logRequestDebug(method, safe, init);
  } else {
    logger.debug(`[http] → ${method} ${safe}`);
  }

  let response = await fetchOnce(url, init);
  const elapsed = Date.now() - t0;

  if (response.ok) {
    if (shouldLogDebug) {
      response = await logResponseDebug(`← ${method}`, safe, response, elapsed);
    } else {
      logger.debug(`[http] ← ${method} ${safe} ${response.status} (${elapsed}ms)`);
    }
    return response;
  }

  if (response.status !== 401) {
    if (shouldLogDebug) {
      response = await logResponseDebug(`← ${method}`, safe, response, elapsed);
    } else {
      logger.warn(`[http] ← ${method} ${safe} ${response.status} (${elapsed}ms)`);
    }
    return response;
  }

  logger.debug(`[http] 401 on ${safe} — attempting token refresh`);
  const isRefreshed = await tryRefreshToken();
  if (!isRefreshed) {
    logger.warn(`[http] token refresh failed — returning 401 for ${safe}`);
    return response;
  }

  const retryT0 = Date.now();
  let retryResponse = await fetchOnce(url, init);
  const retryElapsed = Date.now() - retryT0;

  if (shouldLogDebug) {
    retryResponse = await logResponseDebug(`← retry ${method}`, safe, retryResponse, retryElapsed);
  } else {
    logger.debug(`[http] ← retry ${method} ${safe} ${retryResponse.status} (${retryElapsed}ms)`);
  }
  return retryResponse;
}
