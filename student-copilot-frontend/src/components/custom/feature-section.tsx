import { cn } from "@/lib/utils";
import {
  IconUpload,
  IconRobot,
  IconQuestionMark,
  IconCards,
  IconBrain,
  IconChartBar,
  IconBook,
  IconNotebook,
} from "@tabler/icons-react";

export function FeaturesSection() {
  const features = [
    {
      title: "Lecture Upload",
      description:
        "Easily upload your lecture recordings or notes for AI analysis.",
      icon: <IconUpload />,
    },
    {
      title: "AI Conversation",
      description:
        "Engage in intelligent discussions about your lectures with our AI.",
      icon: <IconRobot />,
    },
    {
      title: "Quiz Generation",
      description:
        "Automatically generate quizzes to test your understanding.",
      icon: <IconQuestionMark />,
    },
    {
      title: "Mock Exams",
      description:
        "Prepare for your exams with AI-generated mock tests.",
      icon: <IconNotebook />,
    },
    {
      title: "Flashcards",
      description:
        "Create digital flashcards for efficient revision and memorization.",
      icon: <IconCards />,
    },
    {
      title: "Active Recall",
      description:
        "Utilize scientifically proven techniques to enhance your learning.",
      icon: <IconBrain />,
    },
    {
      title: "Progress Tracking",
      description:
        "Monitor your progress for each module and topic in real-time.",
      icon: <IconChartBar />,
    },
    {
      title: "Multi-Lecture Analysis",
      description:
        "Analyze and connect information across multiple lectures.",
      icon: <IconBook />,
    },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Features That Supercharge Your Learning</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
          {features.map((feature, index) => (
            <Feature key={feature.title} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

const Feature = ({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col p-6 rounded-lg transition-all duration-300 hover:shadow-lg",
        "bg-card text-card-foreground",
        "dark:bg-card dark:text-card-foreground",
        "hover:scale-105"
      )}
      key={index}
    >
      <div className="mb-4 text-primary">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
};

