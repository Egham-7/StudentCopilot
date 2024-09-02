import { Navigate, Outlet } from "react-router-dom";
import { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/custom/sidebar";
import { IconHome, IconSettings } from '@tabler/icons-react';
import { UserButton } from "@clerk/clerk-react";
import { useConvexAuth } from "convex/react";
import LoadingPage from "../components/custom/loading";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) {
    return <LoadingPage />
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex w-screen h-screen">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
        <SidebarBody className="flex flex-col justify-between h-full">
          <div className="flex-grow">
            <SidebarLink
              link={{
                label: "Home",
                href: "/dashboard",
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
          <div className="hidden md:block">
            <UserButton />
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex flex-col w-full">
        <div className="flex justify-end items-center  p-4 md:hidden md:p-0">
          <UserButton />
        </div>
        <div className="flex-grow overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

