import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { Outlet } from "react-router-dom";
import { Authenticated } from "convex/react";
import { useQuery } from "convex/react";
import { useToast } from "@/components/ui/use-toast";
import { api } from "../../convex/_generated/api";
import { useEffect } from "react";

export default function DashboardLayout() {
  const userNotifications = useQuery(api.notifications.getUserNotifications, {
    limit: 1,
  });
  const latestNotification = userNotifications?.at(0);
  const { toast } = useToast();

  useEffect(() => {
    if (latestNotification) {
      toast({
        title: "New Notification",
        description: latestNotification.message,
      });
    }
  }, [latestNotification, toast]);

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
