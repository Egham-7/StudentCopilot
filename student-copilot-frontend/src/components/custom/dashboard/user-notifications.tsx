import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Doc, Id } from "convex/_generated/dataModel";
import { Trash2Icon } from "lucide-react";
interface NotificationItemProps {
  notification: Doc<"notifications">;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
}) => {
  const deleteNotification = useMutation(api.notifications.deleteNotification);
  return (
    <div className="bg-card text-card-foreground  p-4 w-full max-w-md">
      <div className="flex items-center justify-between">
        <p className="text-foreground">{notification.message}</p>

        <Button
          onClick={() =>
            deleteNotification({
              notificationId: notification._id as Id<"notifications">,
            })
          }
          variant={"ghost"}
          className="text-destructive"
        >
          <Trash2Icon className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex justify-between mt-2 text-sm text-muted-foreground">
        <span>{notification.type}</span>
        <span>{new Date(notification.createdAt).toLocaleString()}</span>
      </div>
    </div>
  );
};

export default NotificationItem;
