import "./globals.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { configureApiClient, initApiClient, setAuthHeader } from "./lib/api-client";
import { queryClient } from "./lib/query";
import { router } from "./lib/router";
import { registerDevice, startHeartbeat } from "./services/device";
import { initLogger } from "./services/logger";
import { startSyncEngine } from "./services/sync-engine";
import { scheduleTokenRefresh, stopTokenRefresh } from "./services/token-refresh";
import { loadAndRestoreLinks, startWsClient } from "./services/ws-client";
import { authStore } from "./stores/auth";
import { setFolderPaths } from "./stores/links";
import { initTheme } from "./stores/theme";

initApiClient();
// Apply the persisted server URL immediately so the generated API client has a base URL
// before any requests fire. Without this the client has no baseUrl until the user
// manually saves the URL in Settings.
configureApiClient(authStore.state.serverUrl);
initTheme();
void initLogger();

type AuthState = typeof authStore.state;

const services = {
  stopSyncEngine: undefined as (() => void) | undefined,
  stopWsClient: undefined as (() => void) | undefined,
  stopHeartbeat: undefined as (() => void) | undefined,
  isRunning: false,
};

function startServices(state: AuthState): void {
  if (!state.isAuthenticated || services.isRunning) return;
  services.isRunning = true;

  // Re-apply the server URL in case Zustand hydration was async and the call
  // at module load ran before the persisted value was available.
  configureApiClient(state.serverUrl);

  if (state.accessToken) {
    setAuthHeader(state.accessToken);
    scheduleTokenRefresh(state.accessToken);
  }

  void registerDevice().then((deviceId) => {
    services.stopHeartbeat = startHeartbeat(deviceId);

    void loadAndRestoreLinks().catch((error: unknown) => {
      console.error("Failed to load folder links on startup", error);
    });

    void startSyncEngine().then((stop) => {
      services.stopSyncEngine = stop;
    });

    services.stopWsClient = startWsClient();
  });
}

function stopServices(): void {
  if (!services.isRunning) return;
  services.isRunning = false;
  stopTokenRefresh();
  services.stopHeartbeat?.();
  services.stopSyncEngine?.();
  services.stopWsClient?.();
  services.stopHeartbeat = undefined;
  services.stopSyncEngine = undefined;
  services.stopWsClient = undefined;
  setFolderPaths({});
}

authStore.subscribe(() => {
  const state = authStore.state;
  if (state.isAuthenticated) {
    startServices(state);
  } else {
    stopServices();
  }
});

// Handle the case where persist already hydrated synchronously before subscribe was set up
startServices(authStore.state);

const rootElement = document.querySelector("#root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
