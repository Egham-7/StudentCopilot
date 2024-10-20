import { useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { UserButton } from "@clerk/clerk-react";
import { IconHome, IconSettings, IconCrown } from "@tabler/icons-react";

import { Sidebar, SidebarBody, SidebarLink } from "@/components/custom/sidebar";
import LoadingPage from "@/components/custom/loading";
import Logo from "@/components/custom/logo";
import { Button } from "@/components/ui/button";
import TreeView from "@/components/ui/tree-view";
import { Separator } from "@/components/ui/separator";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoading, isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();

  if (isLoading || !isAuthenticated) {
    return <LoadingPage />;
  }

  if (isAuthenticated === null) {
    return <Navigate to="/" />;
  }

  const handleUpgrade = () => {
    navigate("/dashboard/upgrade-plan");
  };

  return (
    <div className="flex w-full">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
        <SidebarBody className="flex flex-col justify-between h-full">
          <div className="space-y-4">
            <SidebarLink
              link={{
                label: "",
                href: "/dashboard/home",
                icon: <Logo size="lg" />,
              }}
            />

            <SidebarLink
              link={{
                label: "Home",
                href: "/dashboard/home",
                icon: <IconHome size={24} />,
              }}
            />

            <Separator />

            <TreeView isSidebarOpen={sidebarOpen} />
          </div>

          <div className="space-y-4">
            <SidebarLink
              link={{
                label: "Settings",
                href: "/settings",
                icon: <IconSettings size={24} />,
              }}
            />
            <div className="flex items-center gap-2">
              <UserButton />
              {sidebarOpen && (
                <Button
                  onClick={handleUpgrade}
                  className="flex-grow text-xs"
                  size="sm"
                >
                  <IconCrown size={20} className="mr-1" />
                  Upgrade to Pro
                </Button>
              )}
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex flex-col flex-grow">
        <div className="flex justify-end items-center p-4 md:hidden">
          <UserButton />
        </div>
        <Outlet />
      </div>
    </div>
  );
}
