import { Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/custom/sidebar";
import { IconHome, IconSettings, IconCrown } from '@tabler/icons-react';
import { UserButton } from "@clerk/clerk-react";
import { useConvexAuth } from "convex/react";
import LoadingPage from "../components/custom/loading";
import { Button } from "@/components/ui/button";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoading, isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return <LoadingPage />
  }

  if (!isAuthenticated) {
    console.log("Do something.");
  }

  const handleUpgrade = () => {
    navigate("/dashboard/upgrade-plan");
  };

  return (
    <div className="flex w-screen h-screen">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
        <SidebarBody className="flex flex-col justify-between h-full">
          <div className="flex-grow">
            <SidebarLink
              link={{
                label: "Home",
                href: "/dashboard/home",
                icon: <IconHome size={24} />
              }}
            />
            <SidebarLink
              link={{
                label: "Settings",
                href: "/settings",
                icon: <IconSettings size={24} />
              }}
            />

          </div>


          <div className="hidden md:flex  md:justify-start md:items-between md:w-full md:gap-4">
            <UserButton />



            {sidebarOpen && (

              <Button
                onClick={handleUpgrade}
                className=" bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <IconCrown size={20} className="mr-2" />
                Upgrade to Pro
              </Button>



            )}
          </div>
        </SidebarBody>
      </Sidebar>
      <div className="flex flex-col w-full">
        <div className="flex justify-between items-center p-4 md:hidden">
          <Button
            onClick={handleUpgrade}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <IconCrown size={20} className="mr-2" />
            Upgrade to Pro
          </Button>
          <UserButton />
        </div>
        <div className="flex-grow overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

