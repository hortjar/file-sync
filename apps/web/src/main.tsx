import "./globals.css";
import "./i18n/index";

import { DEFAULT_APP_NAME } from "@file-sync/shared";
import { setAppName } from "@file-sync/ui";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  ScrollRestoration,
} from "react-router-dom";
import { Toaster } from "sonner";

import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { initApiClient, setAuthHeader } from "./lib/api-client";
import { queryClient } from "./lib/query";
import { bootstrapSharedSession } from "./lib/token-refresh";
import { Dashboard } from "./routes/dashboard/Dashboard";
import { DeviceLogsPage } from "./routes/device-logs/DeviceLogsPage";
import { DevicesPage } from "./routes/devices/DevicesPage";
import { DownloadsPage } from "./routes/downloads/DownloadsPage";
import { FolderDetailPage } from "./routes/folders/FolderDetailPage";
import { FoldersPage } from "./routes/folders/FoldersPage";
import { LandingPage } from "./routes/landing/LandingPage";
import { Login } from "./routes/login/Login";
import { LogDetailPage } from "./routes/logs/LogDetailPage";
import { LogsPage } from "./routes/logs/LogsPage";
import { NotificationsPage } from "./routes/notifications/NotificationsPage";
import { QuickStartPage } from "./routes/quick-start/QuickStartPage";
import { SettingsPage } from "./routes/settings/SettingsPage";
import { authStore } from "./stores/auth";
import { initTheme } from "./stores/theme";

// Bootstrap the API client (base URL = current origin) with persisted auth state.
const { accessToken } = authStore.state;
initApiClient();
if (accessToken) setAuthHeader(accessToken);
initTheme();
// Startup SSO: adopt a shared cross-subdomain session once (resets the transient
// `bootstrapped` flag first so protected routes wait for this to finish).
authStore.setState((s) => ({ ...s, bootstrapped: false }));
void bootstrapSharedSession();
const appName = import.meta.env.VITE_APP_NAME ?? DEFAULT_APP_NAME;
setAppName(appName);
document.title = appName;

// Root layout: resets window scroll to the top on every push navigation (and
// restores it on back/forward), so public pages always open at the top.
function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/downloads", element: <DownloadsPage /> },
      { path: "/quick-start", element: <QuickStartPage /> },
      { path: "/admin/login", element: <Login /> },
      {
        path: "/admin",
        element: (
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },
          { path: "dashboard", element: <Dashboard /> },
          { path: "folders", element: <FoldersPage /> },
          { path: "folders/:id", element: <FolderDetailPage /> },
          { path: "devices", element: <DevicesPage /> },
          { path: "logs", element: <LogsPage /> },
          { path: "logs/:id", element: <LogDetailPage /> },
          { path: "device-logs", element: <DeviceLogsPage /> },
          { path: "notifications", element: <NotificationsPage /> },
          { path: "settings", element: <SettingsPage /> },
        ],
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

const root = document.querySelector("#root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" richColors />
    </QueryClientProvider>
  </StrictMode>,
);
