import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
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

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!isAuthenticated && !isLoading) {
    console.log("Not authenticated");
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

            <Separator />

            <SidebarLink
              link={{
                label: "Home",
                href: "/dashboard/home",
                icon: <IconHome size={24} />,
              }}
            />
            <TreeView isSidebarOpen={sidebarOpen} />
          </div>

          <Separator />

          {sidebarOpen && (
            <Button
              onClick={handleUpgrade}
              className=" bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <IconCrown size={20} className="mr-2" />
              Upgrade to Pro
            </Button>
          )}

          <div className="hidden md:flex md:justify-between md:items-center md:w-full md:gap-4 md:mt-6">
            <SidebarLink
              link={{
                label: "Settings",
                href: "/dashboard/home",
                icon: <IconSettings size={24} />,
              }}
            />
            <UserButton />
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
