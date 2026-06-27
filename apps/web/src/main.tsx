import "./globals.css";
import "./i18n/index";

import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";

import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { initApiClient, setAuthHeader } from "./lib/api-client";
import { queryClient } from "./lib/query";
import { Dashboard } from "./pages/Dashboard";
import { DeviceLogsPage } from "./pages/DeviceLogsPage";
import { DevicesPage } from "./pages/DevicesPage";
import { FolderDetailPage } from "./pages/FolderDetailPage";
import { FoldersPage } from "./pages/FoldersPage";
import { LogDetailPage } from "./pages/LogDetailPage";
import { Login } from "./pages/Login";
import { LogsPage } from "./pages/LogsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { authStore } from "./stores/auth";
import { initTheme } from "./stores/theme";

// Bootstrap the API client with persisted auth state.
const { serverUrl, accessToken } = authStore.state;
initApiClient(serverUrl);
if (accessToken) setAuthHeader(accessToken);
initTheme();

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
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
