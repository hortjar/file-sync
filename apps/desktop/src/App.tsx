import { Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";

import { Sidebar } from "./components/Sidebar";
import { TooltipProvider } from "./components/ui/tooltip";
import { LoginPage } from "./pages/Login";
import { useAuthStore } from "./stores/auth";

export function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <Toaster richColors position="bottom-right" />
      </>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen overflow-hidden gradient-bg">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </div>
        </main>
        <Toaster richColors position="bottom-right" />
      </div>
    </TooltipProvider>
  );
}
