
import { cn } from "@/lib/utils";
import { AnimatedList } from "@/components/magicui/animated-list";

interface StudentEvent {
  name: string;
  description: string;
  icon: string;
  color: string;
  time: string;
}

let studentEvents: StudentEvent[] = [
  {
    name: "Lecture Recorded",
    description: "Introduction to Machine Learning",
    time: "15m ago",
    icon: "🎥",
    color: "#00C9A7",
  },
  {
    name: "Assignment Due",
    description: "Data Structures and Algorithms",
    time: "2d left",
    icon: "📝",
    color: "#FFB800",
  },
  {
    name: "Study Group Formed",
    description: "Quantum Computing Basics",
    time: "1h ago",
    icon: "👥",
    color: "#FF3D71",
  },
  {
    name: "Quiz Completed",
    description: "Web Development Fundamentals",
    time: "30m ago",
    icon: "✅",
    color: "#1E86FF",
  },
  {
    name: "New Course Available",
    description: "Artificial Intelligence Ethics",
    time: "Just now",
    icon: "🆕",
    color: "#8A2BE2",
  },
];

// Repeat the events to have more items
studentEvents = Array.from({ length: 3 }, () => studentEvents).flat();

const StudentEventItem = ({ name, description, icon, color, time }: StudentEvent) => {
  return (
    <figure
      className={cn(
        "relative mx-auto min-h-fit w-full max-w-[400px] cursor-pointer overflow-hidden rounded-2xl p-4",
        "transition-all duration-200 ease-in-out hover:scale-[103%]",
        "bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
        "transform-gpu dark:bg-transparent dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
      )}
    >
      <div className="flex flex-row items-center gap-3">
        <div
          className="flex size-10 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: color,
          }}
        >
          <span className="text-lg">{icon}</span>
        </div>
        <div className="flex flex-col overflow-hidden">
          <figcaption className="flex flex-row items-center whitespace-pre text-lg font-medium dark:text-white ">
            <span className="text-sm sm:text-lg">{name}</span>
            <span className="mx-1">·</span>
            <span className="text-xs text-gray-500">{time}</span>
          </figcaption>
          <p className="text-sm font-normal dark:text-white/60">
            {description}
          </p>
        </div>
      </div>
    </figure>
  );
};

export function StudentEventsList({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-[500px] w-full flex-col p-6 overflow-hidden rounded-lg border bg-background md:shadow-xl",
        className,
      )}
    >
      <AnimatedList>
        {studentEvents.map((item, idx) => (
          <StudentEventItem {...item} key={idx} />
        ))}
      </AnimatedList>
    </div>
  );
}

