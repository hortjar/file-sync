/**
 * Base URL the dashboard uses for every API / WebSocket / health request.
 *
 * In production the dashboard is served from the **same origin** as the API (behind
 * Caddy), so it always uses the current origin — there is nothing to configure and no
 * URL to ask the user for. In dev the Vite server runs on a different port than the API,
 * so fall back to `VITE_SERVER_URL` or the local server.
 */
export const SERVER_URL = import.meta.env.PROD
  ? globalThis.location.origin
  : (import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001");
