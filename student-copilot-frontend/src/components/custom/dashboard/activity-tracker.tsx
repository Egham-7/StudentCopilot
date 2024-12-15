import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { GitCommit, GitPullRequest, Star } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Doc } from "convex/_generated/dataModel";

export default function ActivityTracker() {
  const currentYear = new Date().getFullYear();

  const activities: Doc<"activities">[] | undefined = useQuery(
    api.activities.getYearlyActivity,
    {
      year: currentYear,
    },
  );

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const calculateStreak = (activities: Doc<"activities">[]) => {
    let currentStreak = 0;
    const today = new Date().toISOString().split("T")[0];
    const sortedDates = activities
      .filter((a) => a.count > 0)
      .map((a) => a.date)
      .sort((a, b) => b.localeCompare(a));

    if (sortedDates.length === 0) return 0;
    if (sortedDates[0] !== today) return 0;

    for (let i = 0; i < sortedDates.length - 1; i++) {
      const current = new Date(sortedDates[i]);
      const prev = new Date(sortedDates[i + 1]);
      const diffDays = Math.floor(
        (current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }

    return currentStreak + 1;
  };

  const getActivityCount = (date: Date) => {
    if (!activities) return 0;
    const dateStr = date.toISOString().split("T")[0];
    return activities
      .filter((a) => a.date === dateStr)
      .reduce((sum, activity) => sum + activity.count, 0);
  };

  const getActivityColor = (count: number) => {
    if (count === 0) return "bg-muted hover:bg-muted/80";
    if (count < 3) return "bg-primary/30 hover:bg-primary/40";
    if (count < 6) return "bg-primary/60 hover:bg-primary/70";
    return "bg-primary hover:bg-primary/90";
  };

  const getWeeksArray = () => {
    const weeks = [];
    let currentWeek = [];
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31);

    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();

      if (dayOfWeek === 1 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        currentWeek.push({
          date: new Date(currentDate),
          count: getActivityCount(currentDate),
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  };

  const weeks = getWeeksArray();

  const totalActivities =
    activities?.reduce((sum, activity) => sum + activity.count, 0) || 0;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!activities) {
    return <Skeleton className="w-full h-[400px] rounded-lg" />;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">
              Activity Tracker
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {totalActivities.toLocaleString()} contributions in {currentYear}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <TooltipProvider>
          <div className="space-y-8">
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="flex mb-2">
                  <div className="w-10"></div>
                  {months.map((month, index) => (
                    <div
                      key={index}
                      className="flex-1 text-center text-xs text-muted-foreground"
                    >
                      {month}
                    </div>
                  ))}
                </div>
                <div className="flex">
                  <div className="w-10 mr-2">
                    {weekdays.map((day, index) => (
                      <div
                        key={index}
                        className="h-4 text-xs text-muted-foreground text-right pr-2"
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1">
                    <div className="flex">
                      {weeks.map((week, weekIndex) => (
                        <div key={weekIndex} className="flex-1 flex flex-col">
                          {weekdays.map((_, dayIndex) => {
                            const day = week[dayIndex];
                            return (
                              <Tooltip key={dayIndex}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`w-4 h-4 m-px rounded-sm transition-colors ${
                                      day
                                        ? getActivityColor(day.count)
                                        : "bg-muted"
                                    }`}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  {day ? (
                                    <div className="text-sm space-y-1">
                                      <p className="font-semibold">
                                        {formatDate(day.date)}
                                      </p>
                                      <p>
                                        {day.count} contribution
                                        {day.count !== 1 ? "s" : ""}
                                      </p>
                                      {activities
                                        .filter(
                                          (a) =>
                                            a.date ===
                                            day.date
                                              .toISOString()
                                              .split("T")[0],
                                        )
                                        .map((activity, index) => (
                                          <p
                                            key={index}
                                            className="text-xs text-muted-foreground"
                                          >
                                            {activity.type}: {activity.count}
                                          </p>
                                        ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm">No contributions</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-3">
                    <GitCommit className="text-primary h-5 w-5" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Activities
                      </p>
                      <h3 className="text-2xl font-bold">
                        {totalActivities.toLocaleString()}
                      </h3>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-3">
                    <GitPullRequest className="text-primary h-5 w-5" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Active Days
                      </p>
                      <h3 className="text-2xl font-bold">
                        {activities.filter((a) => a.count > 0).length}
                      </h3>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-3">
                    <Star className="text-primary h-5 w-5" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Current Streak
                      </p>
                      <h3 className="text-2xl font-bold">
                        {calculateStreak(activities)} days
                      </h3>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
