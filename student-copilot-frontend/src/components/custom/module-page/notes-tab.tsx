import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpen } from "lucide-react";
import { Doc } from "convex/_generated/dataModel";
import { useNavigate } from "react-router-dom";

type NotesTabProps = {
  notes: Doc<"notes">[] | undefined;
};

export default function NotesTab({ notes }: NotesTabProps) {

  const navigate = useNavigate();

  const navigateToNote = (noteId: string) => {

    navigate(`/dashboard/notes/${noteId}`)

  }



  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes?.map((note, index) => (
          <Card key={note._id} className="relative" onClick={() => navigateToNote(note._id)}>
            <CardHeader className="flex justify-between items-center flex-row">
              <CardTitle>Note {index + 1}</CardTitle>
              <Button variant="ghost" size="sm">
                <BookOpen className="w-4 h-4 mr-2" />
                View
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Note {index}</p>
            </CardContent>
            <CardFooter className="flex justify-between items-center p-3 gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={`/placeholder-avatar-${note._id}.jpg`} />
                <AvatarFallback>{index + 1}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">
                Generated on {new Date(note._creationTime).toLocaleDateString()}
              </span>
            </CardFooter>
          </Card>
        ))}
        {notes == null || notes.length == 0 && (
          <Card className="col-span-full p-6 text-center">
            <p>No notes generated yet. Select lectures and use the "Generate Notes" action to create notes.</p>
          </Card>
        )}
      </div>
    </>
  );
}

