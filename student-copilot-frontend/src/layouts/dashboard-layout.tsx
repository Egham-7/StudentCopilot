import { Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/custom/sidebar";
import { IconHome, IconSettings, IconCrown } from "@tabler/icons-react";
import { UserButton } from "@clerk/clerk-react";
import { useConvexAuth } from "convex/react";
import LoadingPage from "../components/custom/loading";
import { Button } from "@/components/ui/button";
import TreeView from "@/components/ui/tree-view";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoading, isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!isAuthenticated) {
    console.log("Do something.");
  }

  const handleUpgrade = () => {
    navigate("/dashboard/upgrade-plan");
  };

  return (
    <div className="flex w-full ">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
        <SidebarBody className="flex flex-col justify-between md:h-full">
          <div>
            <SidebarLink
              link={{
                label: "Home",
                href: "/dashboard/home",
                icon: <IconHome size={24} />,
              }}
            />
            <TreeView isSidebarOpen={sidebarOpen} />
          </div>

          <div className="hidden md:flex flex-col md:justify-start md:items-start md:w-full md:gap-4">
            <SidebarLink
              link={{
                label: "Settings",
                href: "/settings",
                icon: <IconSettings size={24} />,
              }}
            />
            <div className="flex justify-start items-center w-full gap-4">
              <UserButton />
              {sidebarOpen && (
                <Button
                  onClick={handleUpgrade}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 flex-grow"
                >
                  <IconCrown size={20} className="mr-2" />
                  Upgrade to Pro
                </Button>
              )}
            </div>
          </div>
        </SidebarBody>
      </Sidebar>
      <div className="flex flex-col w-full h-full">
        <div className="flex justify-end items-center p-4 md:hidden">
          <UserButton />
        </div>
        <Outlet />
      </div>
    </div>
  );
}
