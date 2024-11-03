import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { UserButton } from "@clerk/clerk-react";
import { IconHome, IconSettings } from "@tabler/icons-react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/custom/sidebar";
import LoadingPage from "@/components/custom/loading";
import Logo from "@/components/custom/logo";
import TreeView from "@/components/ui/tree-view";
import { Separator } from "@/components/ui/separator";
import UpgradePlanModal from "@/components/custom/dashboard/upgrade-plan-modal";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!isAuthenticated && !isLoading) {
    console.log("Not authenticated");
  }

  return (
    <div className="flex w-full">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
        {/* Sidebar layout with scrollable top and sticky bottom */}
        <SidebarBody className="flex flex-col justify-between h-full">
          {/* Scrollable section */}
          <div className="flex-grow overflow-y-auto space-y-4">
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

          {/* Sticky bottom section */}
          <div className="flex-shrink-0 sticky bottom-0 ">
            <Separator className="mb-2" />

            {sidebarOpen && (
              <div className="w-full p-2">
                <UpgradePlanModal />

              </div>
            )}

            <div className="flex justify-between items-center w-full gap-4 p-2">
              <SidebarLink
                link={{
                  label: "Settings",
                  href: "/dashboard/settings",
                  icon: <IconSettings size={24} />,
                }}
              />
              <UserButton />
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex flex-col flex-grow ">
        <div className="flex justify-end items-center p-4 md:hidden">
          <UserButton />
        </div>
        <Outlet />
      </div>
    </div>
  );
}
