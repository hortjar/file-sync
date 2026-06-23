import { createRootRoute, createRoute } from "@tanstack/react-router";

import { App } from "../App";
import { ConflictsPage } from "../pages/Conflicts";
import { LoginPage } from "../pages/Login";
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

export const routeTree = rootRoute.addChildren([
  loginRoute,
  syncFoldersRoute,
  conflictsRoute,
  settingsRoute,
]);
