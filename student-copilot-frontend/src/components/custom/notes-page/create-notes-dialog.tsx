import React, { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useToast } from "@/components/ui/use-toast";
import { renderTriggerCard } from "@/lib/ui_utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
interface CreateNotesDialogProps {
  moduleId: Id<"modules">;
}

const CreateNotesDialog: React.FC<CreateNotesDialogProps> = ({ moduleId }) => {
  const generateNotes = useMutation(api.notes.storeClient);
  const lectures = useQuery(api.lectures.getLecturesByModuleId, { moduleId });
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [selectedLectures, setSelectedLectures] = useState<Id<"lectures">[]>(
    [],
  );

  console.log("lectures", lectures);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleGenerateNotes = async () => {
    if (selectedLectures.length === 0) {
      toast({
        title: "No lectures selected",
        description: "Please select at least one lecture to generate notes.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingNotes(true);
    try {
      await generateNotes({
        lectureIds: selectedLectures,
        moduleId,
      });
      toast({
        title: "Generating notes",
        description:
          "We are generating your notes. We'll notify you when it's done.",
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Failed to generate notes:", error);
      toast({
        title: "Failed to generate notes",
        description:
          "An error occurred while generating notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingNotes(false);
      setSelectedLectures([]);
    }
  };

  const handleLectureToggle = (lectureId: Id<"lectures">) => {
    setSelectedLectures((prev) =>
      prev.includes(lectureId)
        ? prev.filter((id) => id !== lectureId)
        : [...prev, lectureId],
    );
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <div className="w-full">
          {renderTriggerCard("Create Notes", "Create notes from your lectures")}
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Lectures for Note Generation</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-8">
          {lectures?.map((lecture) => (
            <Card
              key={lecture._id}
              className="relative overflow-hidden h-48 cursor-pointer"
              onClick={() => handleLectureToggle(lecture._id)}
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${lecture.image})` }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <CardContent className="text-white">
                  <h3 className="text-xl font-semibold mb-2">
                    {lecture.title}
                  </h3>
                  <p className="text-sm">
                    {new Date(lecture._creationTime).toLocaleDateString()}
                  </p>
                </CardContent>
              </div>
              <div className="absolute top-2 right-2">
                <Checkbox
                  checked={selectedLectures.includes(lecture._id)}
                  onCheckedChange={() => handleLectureToggle(lecture._id)}
                  className="h-6 w-6 border-2 border-white"
                />
              </div>
            </Card>
          ))}
        </div>
        <Button
          onClick={handleGenerateNotes}
          disabled={isGeneratingNotes || selectedLectures.length === 0}
        >
          {isGeneratingNotes ? "Generating..." : "Generate Notes"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default CreateNotesDialog;
