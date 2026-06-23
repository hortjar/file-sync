import "./globals.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { initApiClient, setAuthHeader } from "./lib/api-client";
import { queryClient } from "./lib/query";
import { router } from "./lib/router";
import { registerDevice, startHeartbeat } from "./services/device";
import { startSyncEngine } from "./services/sync-engine";
import { scheduleTokenRefresh, stopTokenRefresh } from "./services/token-refresh";
import { startWsClient } from "./services/ws-client";
import { useAuthStore } from "./stores/auth";
import { useLinksStore } from "./stores/links";
import { useThemeStore } from "./stores/theme";

initApiClient();

// Restore auth header and token refresh if already authenticated (hot-reload / app restart)
const { accessToken } = useAuthStore.getState();
if (accessToken) {
  setAuthHeader(accessToken);
  scheduleTokenRefresh(accessToken);
}

useThemeStore.getState().initTheme();

const services = {
  stopSyncEngine: undefined as (() => void) | undefined,
  stopWsClient: undefined as (() => void) | undefined,
  stopHeartbeat: undefined as (() => void) | undefined,
  isRunning: false,
};

useAuthStore.subscribe((state) => {
  if (state.isAuthenticated && !services.isRunning) {
    services.isRunning = true;

    if (state.accessToken) scheduleTokenRefresh(state.accessToken);

    void registerDevice().then((deviceId) => {
      services.stopHeartbeat = startHeartbeat(deviceId);
      void startSyncEngine().then((stop) => {
        services.stopSyncEngine = stop;
      });
      services.stopWsClient = startWsClient();
    });
  } else if (!state.isAuthenticated && services.isRunning) {
    services.isRunning = false;
    stopTokenRefresh();
    services.stopHeartbeat?.();
    services.stopSyncEngine?.();
    services.stopWsClient?.();
    services.stopHeartbeat = undefined;
    services.stopSyncEngine = undefined;
    services.stopWsClient = undefined;
    useLinksStore.getState().setFolderPaths({});
  }
});

const rootElement = document.querySelector("#root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
