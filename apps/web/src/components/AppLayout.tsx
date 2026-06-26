import { Outlet } from "react-router-dom";

import { Sidebar } from "./app-layout/Sidebar";

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden gradient-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
