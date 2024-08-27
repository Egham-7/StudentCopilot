import { Outlet } from "react-router-dom";
import { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/custom/sidebar";
import { IconHome, IconSettings } from '@tabler/icons-react';
import { UserButton } from "@clerk/clerk-react";



export default function DashboardLayout() {

  const [sidebarOpen, setSidebarOpen] = useState(false);



  return (

    <div className="flex h-screen">


      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
        <SidebarBody className="flex flex-col justify-between items-start">

          <div>
            <SidebarLink
              link={{
                label: "Home",
                href: "/",
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


          <div>

            <UserButton />

          </div>

        </SidebarBody>

      </Sidebar>




      <Outlet />

    </div>






  )
}
