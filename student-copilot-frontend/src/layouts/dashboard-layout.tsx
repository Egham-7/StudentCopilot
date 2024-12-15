import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { Outlet } from "react-router-dom";
import { Authenticated } from "convex/react";

export default function DashboardLayout() {
  return (
    <Authenticated>
      <SidebarProvider>
        <AppSidebar />
        <main className="h-full w-full">
          <div className="p-4">
            <SidebarTrigger className="fixed" />
          </div>
          <Outlet />
        </main>
      </SidebarProvider>
    </Authenticated>
  );
}
