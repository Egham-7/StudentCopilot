import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type ModuleProgressProps = {
  progressPercentage: number;
  completedLectures: number;
  totalLectures: number;
};

export default function ModuleProgress({ progressPercentage, completedLectures, totalLectures }: ModuleProgressProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Module Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <Progress value={progressPercentage} className="w-full" />
        <p className="text-sm text-muted-foreground mt-2">
          {completedLectures} of {totalLectures} lectures completed
        </p>
      </CardContent>
    </Card>
  );
}

