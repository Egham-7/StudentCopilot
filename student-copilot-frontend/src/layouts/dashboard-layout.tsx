import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { Outlet } from "react-router-dom";
import { Authenticated } from "convex/react";

export default function DashboardLayout() {
  return (
    <Authenticated>
      <SidebarProvider>
        <AppSidebar />
        <main className="min-h-full min-w-full">
          <SidebarTrigger />
          <Outlet />
        </main>
      </SidebarProvider>
    </Authenticated>
  );
}
