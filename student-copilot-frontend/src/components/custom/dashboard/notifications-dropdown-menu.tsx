import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import NotificationItem from "./user-notifications";
import DeleteNotificationsDialog from "./delete-notifications-dialog";
import { BellIcon } from "lucide-react";

const NotificationsDropDownMenu = () => {
  const userNotifications =
    useQuery(api.notifications.getUserNotifications, {
      limit: 10,
    }) || [];
  const markAsRead = useMutation(api.notifications.markAsRead);
  const unreadCount = userNotifications.filter((n) => !n.isRead).length;

  const handleOpenChange = (open: boolean) => {
    if (open && unreadCount > 0) {
      const unreadIds = userNotifications
        .filter((n) => !n.isRead)
        .map((n) => n._id);
      markAsRead({ notificationIds: unreadIds });
    }
  };

  return (
    <DropdownMenu onOpenChange={handleOpenChange} dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <BellIcon className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <h4 className="font-heading text-sm">Notifications</h4>
          <DeleteNotificationsDialog />
        </div>
        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto">
          {userNotifications.map((notification) => (
            <DropdownMenuItem
              key={notification._id}
              className="p-0 focus:bg-accent"
            >
              <NotificationItem notification={notification} />
            </DropdownMenuItem>
          ))}
          {userNotifications.length === 0 && (
            <div className="py-3 px-4 text-sm text-muted-foreground text-center">
              No notifications
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationsDropDownMenu;
