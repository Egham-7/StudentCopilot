
import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc } from "convex/_generated/dataModel";
import { AnimatedList } from "@/components/magicui/animated-list";

interface NotificationItemProps {
  message: string;
  type: string;
  createdAt: string;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ message, type, createdAt }) => {
  return (
    <div className="bg-white shadow-md rounded-lg p-4 w-full max-w-md">
      <p className="text-gray-800">{message}</p>
      <div className="flex justify-between mt-2 text-sm text-gray-500">
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
    <AnimatedList className="w-full max-w-md" delay={2000}>
      {userNotifications.map((notification: Doc<"notifications">) => (
        <NotificationItem
          key={notification._id}
          message={notification.message}
          type={notification.type}
          createdAt={notification.createdAt}
        />
      ))}
    </AnimatedList>
  );
};

