import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc } from "convex/_generated/dataModel";
import { StaticList } from "../static-list";

interface NotificationItemProps {
  message: string;
  type: string;
  createdAt: string;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ message, type, createdAt }) => {
  return (
    <div className="bg-card text-card-foreground shadow-md rounded-lg p-4 w-full max-w-md">
      <p className="text-foreground">{message}</p>
      <div className="flex justify-between mt-2 text-sm text-muted-foreground">
        <span>{type}</span>
        <span>{new Date(createdAt).toLocaleString()}</span>
      </div>
    </div>
  );
};

export const UserNotifications: React.FC = () => {
  const userNotifications = useQuery(api.notifications.getUserNotifications, {
    limit: 20
  }) || [];



  return (
    <StaticList className="w-full max-w-md lg:max-w-none space-y-4">
      {userNotifications.map((notification: Doc<"notifications">) => (
        <NotificationItem
          key={notification._id}
          message={notification.message}
          type={notification.type}
          createdAt={notification.createdAt}
        />
      ))}
    </StaticList>
  );
};

export default UserNotifications;

