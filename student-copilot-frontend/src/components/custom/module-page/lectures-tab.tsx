import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check } from "lucide-react";
import { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import UploadLectureDialog from "./upload-lecture-dialog";
import DeleteLectureDialog from "./delete-lecture-dialog";
import LecturePlayer from "./lecture-player";
import { LecturesData } from "@/lib/ui_utils";
import { Checkbox } from "@/components/ui/checkbox";

type LecturesTabProps = {
  moduleId: Id<"modules">;
  lectures: LecturesData[] | undefined;
  selectedLectures: Id<"lectures">[];
  setSelectedLectures: React.Dispatch<React.SetStateAction<Id<"lectures">[]>>;
};

export default function LecturesTab({
  moduleId,
  lectures,
  selectedLectures,
  setSelectedLectures,
}: LecturesTabProps) {
  const updateLectureCompletion = useMutation(
    api.lectures.updateLectureCompletion,
  );

  const handleLectureCompletion = async (
    lectureId: Id<"lectures">,
    completed: boolean,
  ) => {
    await updateLectureCompletion({ id: lectureId, completed });
  };

  const handleSelectLecture = (lectureId: Id<"lectures">) => {
    setSelectedLectures((prev) => {
      if (prev.includes(lectureId)) {
        return prev.filter((id) => id !== lectureId);
      } else {
        return [...prev, lectureId];
      }
    });
  };

  const visibleLectures = lectures?.slice(0, 6);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleLectures?.map((lecture) => (
          <Card
            key={lecture._id}
            className={`relative ${selectedLectures.includes(lecture._id) ? "border-primary border-2" : ""}`}
          >
            <div className="p-3">
              <Checkbox
                checked={selectedLectures.includes(lecture._id)}
                onCheckedChange={() => handleSelectLecture(lecture._id)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full active:text-primary"
              />
            </div>
            <CardHeader className="flex justify-between items-center flex-row text-center">
              <CardTitle className="truncate">{lecture.title}</CardTitle>
              <div className="space-x-2 w-full flex items-center justify-end ">
                <LecturePlayer
                  fileType={lecture.fileType}
                  fileUrl={lecture.contentUrl}
                  title={lecture.title}
                  id={lecture._id}
                  isCompleted={lecture.completed}
                />
                <DeleteLectureDialog lectureId={lecture._id} />
              </div>
            </CardHeader>
            <CardContent
              className="hover:cursor-pointer"
              onClick={() => handleSelectLecture(lecture._id)}
            >
              <p className="text-muted-foreground">
                {lecture.description ?? ""}
              </p>
            </CardContent>
            <CardFooter className="flex justify-between items-center p-3 gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={`/placeholder-avatar-${lecture._id}.jpg`} />
                <AvatarFallback>{lecture.title[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">Professor</span>
              <Button
                variant={lecture.completed ? "secondary" : "outline"}
                size="sm"
                onClick={() =>
                  handleLectureCompletion(lecture._id, !lecture.completed)
                }
              >
                {lecture.completed ? "Completed" : "Mark as Complete"}
              </Button>
            </CardFooter>
          </Card>
        ))}
        <Card className="flex items-center justify-center p-6">
          <UploadLectureDialog moduleId={moduleId} />
        </Card>
      </div>
    </>
  );
}
