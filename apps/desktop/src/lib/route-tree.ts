import { createRootRoute, createRoute } from "@tanstack/react-router";

import { App } from "../App";
import { ConflictsPage } from "../routes/conflicts/Conflicts";
import { DevicesPage } from "../routes/devices/Devices";
import { FolderDetailPage } from "../routes/folders/FolderDetail";
import { LoginPage } from "../routes/login/Login";
import { LogDetailPage } from "../routes/logs/LogDetailPage";
import { LogsPage } from "../routes/logs/LogsPage";
import { NotificationsPage } from "../routes/notifications/NotificationsPage";
import { SettingsPage } from "../routes/settings/Settings";
import { SyncFoldersPage } from "../routes/sync-folders/SyncFolders";

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
