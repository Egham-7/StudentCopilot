import { UserButton } from "@clerk/clerk-react";
import { IconHome, IconSettings } from "@tabler/icons-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Logo from "@/components/custom/logo";
import TreeView from "@/components/ui/tree-view";
import { Separator } from "@/components/ui/separator";
import UpgradePlanModal from "@/components/custom/dashboard/upgrade-plan-modal";
import NotificationsDropDownMenu from "@/components/custom/dashboard/notifications-dropdown-menu";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { useSidebar } from "@/components/ui/sidebar";
import { Link } from "react-router-dom";

const topMenuItems = [
  {
    title: "Home",
    url: "/dashboard/home",
    icon: IconHome,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: IconSettings,
  },
];

export function AppSidebar() {
  const { open, openMobile } = useSidebar();

  return (
    <Sidebar className="border-r border-border/50 shadow-sm scrollbar-thin scrollbar-track-background scrollbar-thumb-accent hover:scrollbar-thumb-accent/8">
      <SidebarContent className="flex flex-col h-full scrollbar-thin scrollbar-track-background scrollbar-thumb-accent hover:scrollbar-thumb-accent/8">
        {/* Logo Section */}
        <SidebarGroup className="p-4 ">
          <Link to="/dashboard/home" className="flex items-center space-x-2">
            <Logo size="lg" />
          </Link>
        </SidebarGroup>

        <Separator className="opacity-50" />

        {/* Main Navigation */}
        <SidebarGroup className="flex-1 py-4">
          <SidebarGroupLabel className="px-4 text-sm font-medium text-muted-foreground">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent className="space-y-2">
            <SidebarMenu>
              {topMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className="w-full transition-colors hover:bg-accent/50 active:bg-accent"
                  >
                    <Link
                      to={item.url}
                      className="flex items-center gap-3 px-4 py-2 text-foreground/80 hover:text-foreground"
                    >
                      <item.icon size={20} className="text-muted-foreground" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <TreeView isSidebarOpen={open || openMobile} />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom Section */}
        <SidebarGroup>
          <SidebarGroupContent>
            <Separator className="opacity-50" />
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <UpgradePlanModal />
                <NotificationsDropDownMenu />
              </div>
              <div className="flex items-center justify-between gap-2 pt-2">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "w-9 h-9",
                    },
                  }}
                />
                <ModeToggle />
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
