import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc } from "convex/_generated/dataModel";
import { StaticList } from "../static-list";
import { Button } from "@/components/ui/button";
import { Id } from "convex/_generated/dataModel";
import { Trash2Icon } from "lucide-react";
interface NotificationItemProps {
  message: string;
  type: string;
  createdAt: string;
  id: string;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  message,
  type,
  createdAt,
  id,
}) => {
  const deleteNotification = useMutation(api.notifications.deleteNotification);
  return (
    <div className="bg-card text-card-foreground shadow-md rounded-lg p-4 w-full max-w-md">
      <div className="flex items-center justify-between">
        <p className="text-foreground">{message}</p>

        <Button
          onClick={() =>
            deleteNotification({ notificationId: id as Id<"notifications"> })
          }
          variant={"ghost"}
          className="text-destructive"
        >
          <Trash2Icon className="w-6 h-6" />
        </Button>
      </div>
      <div className="flex justify-between mt-2 text-sm text-muted-foreground">
        <span>{type}</span>
        <span>{new Date(createdAt).toLocaleString()}</span>
      </div>
    </div>
  );
};

export const UserNotifications: React.FC = () => {
  const userNotifications =
    useQuery(api.notifications.getUserNotifications, {
      limit: 6,
    }) || [];

  return (
    <StaticList className="w-full max-w-md lg:max-w-none space-y-4">
      {userNotifications.map((notification: Doc<"notifications">) => (
        <NotificationItem
          key={notification._id}
          id={notification._id}
          message={notification.message}
          type={notification.type}
          createdAt={notification.createdAt}
        />
      ))}
    </StaticList>
  );
};

export default UserNotifications;
