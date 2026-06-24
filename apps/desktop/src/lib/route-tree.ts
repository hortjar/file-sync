import { createRootRoute, createRoute } from "@tanstack/react-router";

import { App } from "../App";
import { ConflictsPage } from "../pages/Conflicts";
import { FolderDetailPage } from "../pages/FolderDetail";
import { LogDetailPage } from "../pages/LogDetailPage";
import { LoginPage } from "../pages/Login";
import { LogsPage } from "../pages/LogsPage";
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

export const routeTree = rootRoute.addChildren([
  loginRoute,
  syncFoldersRoute,
  folderDetailRoute,
  conflictsRoute,
  settingsRoute,
  logsRoute,
  logDetailRoute,
]);
