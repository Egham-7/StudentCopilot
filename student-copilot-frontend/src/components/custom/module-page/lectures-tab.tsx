import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpen, Check } from "lucide-react";
import { Id, Doc } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import UploadLectureDialog from "./upload-lecture-dialog";
import DeleteLectureDialog from "./delete-lecture-dialog";

type LecturesTabProps = {
  moduleId: Id<"modules">;
  lectures: Doc<"lectures">[] | undefined;
  selectedLectures: Id<"lectures">[];
  setSelectedLectures: React.Dispatch<React.SetStateAction<Id<"lectures">[]>>;
};

export default function LecturesTab({ moduleId, lectures, selectedLectures, setSelectedLectures }: LecturesTabProps) {
  const updateLectureCompletion = useMutation(api.lectures.updateLectureCompletion);

  const handleLectureCompletion = async (lectureId: Id<"lectures">, completed: boolean) => {
    await updateLectureCompletion({ id: lectureId, completed });
  };

  const handleSelectLecture = (lectureId: Id<"lectures">) => {
    setSelectedLectures((prev) => {
      if (prev.includes(lectureId)) {
        return prev.filter(id => id !== lectureId);
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
            className={`relative ${selectedLectures.includes(lecture._id) ? 'border-primary border-2' : ''}`}
          >
            {selectedLectures.includes(lecture._id) && (
              <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                <Check className="w-4 h-4" />
              </div>
            )}
            <CardHeader className="flex justify-between items-center flex-row">
              <CardTitle>{lecture.title}</CardTitle>
              <div className="space-x-4">
                <Button variant="ghost" size="sm">
                  <BookOpen className="w-4 h-4 mr-2" />
                  View
                </Button>
                <DeleteLectureDialog lectureId={lecture._id} />
              </div>
            </CardHeader>
            <CardContent onClick={() => handleSelectLecture(lecture._id)} className="hover:cursor-pointer">
              <p className="text-muted-foreground">{lecture.description ?? ""}</p>
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
                onClick={() => handleLectureCompletion(lecture._id, !lecture.completed)}
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
