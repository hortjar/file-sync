import { createRootRoute, createRoute } from "@tanstack/react-router";

import { App } from "../App";
import { ConflictsPage } from "../pages/Conflicts";
import { DevicesPage } from "../pages/Devices";
import { FolderDetailPage } from "../pages/FolderDetail";
import { LogDetailPage } from "../pages/LogDetailPage";
import { LoginPage } from "../pages/Login";
import { LogsPage } from "../pages/LogsPage";
import { NotificationsPage } from "../pages/NotificationsPage";
import { SettingsPage } from "../pages/Settings";
import { SyncFoldersPage } from "../pages/SyncFolders";

const rootRoute = createRootRoute({ component: App });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const syncFoldersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: SyncFoldersPage,
});

const folderDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/folders/$id",
  component: FolderDetailPage,
});

const conflictsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/conflicts",
  component: ConflictsPage,
});

const devicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/devices",
  component: DevicesPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const logsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/logs",
  component: LogsPage,
});

const logDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/logs/$id",
  component: LogDetailPage,
});

const notificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notifications",
  component: NotificationsPage,
});

export const routeTree = rootRoute.addChildren([
  loginRoute,
  syncFoldersRoute,
  folderDetailRoute,
  conflictsRoute,
  devicesRoute,
  settingsRoute,
  logsRoute,
  logDetailRoute,
  notificationsRoute,
]);
