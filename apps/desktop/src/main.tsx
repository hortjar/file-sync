import "./globals.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { initApiClient, setAuthHeader } from "./lib/api-client";
import { queryClient } from "./lib/query";
import { router } from "./lib/router";
import { registerDevice, startHeartbeat } from "./services/device";
import { initLogger } from "./services/logger";
import { startSyncEngine } from "./services/sync-engine";
import { scheduleTokenRefresh, stopTokenRefresh } from "./services/token-refresh";
import { loadAndRestoreLinks, startWsClient } from "./services/ws-client";
import { useAuthStore } from "./stores/auth";
import { useLinksStore } from "./stores/links";
import { useThemeStore } from "./stores/theme";

initApiClient();
useThemeStore.getState().initTheme();
void initLogger();

type AuthState = ReturnType<typeof useAuthStore.getState>;

const services = {
  stopSyncEngine: undefined as (() => void) | undefined,
  stopWsClient: undefined as (() => void) | undefined,
  stopHeartbeat: undefined as (() => void) | undefined,
  isRunning: false,
};

function startServices(state: AuthState): void {
  if (!state.isAuthenticated || services.isRunning) return;
  services.isRunning = true;

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
  useLinksStore.getState().setFolderPaths({});
}

useAuthStore.subscribe((state) => {
  if (state.isAuthenticated) {
    startServices(state);
  } else {
    stopServices();
  }
});

// Handle the case where persist already hydrated synchronously before subscribe was set up
startServices(useAuthStore.getState());

const rootElement = document.querySelector("#root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
