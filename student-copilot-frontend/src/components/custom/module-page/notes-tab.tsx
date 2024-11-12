import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpen, TrashIcon } from "lucide-react";
import { Doc, Id } from "convex/_generated/dataModel";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";

type NotesTabProps = {
  notes: Doc<"notes">[] | undefined;
};

export default function NotesTab({ notes }: NotesTabProps) {
  const navigate = useNavigate();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Id<"notes"> | null>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const navigateToNote = (noteId: string) => {
    navigate(`/dashboard/note/${noteId}`);
  };

  const deleteNote = useMutation(api.notes.deleteNote);

  const handleDeleteNote = async (noteId: Id<"notes">) => {
    await deleteNote({
      noteId,
    });
    setOpenDeleteDialog(false);
    setNoteToDelete(null);
  };

  const DeleteConfirmation = () => (
    <>
      <DialogHeader>
        <DialogTitle>Are you sure you want to delete this note?</DialogTitle>
        <DialogDescription>This action cannot be undone.</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={() => setOpenDeleteDialog(false)}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={() => noteToDelete && handleDeleteNote(noteToDelete)}
        >
          Delete
        </Button>
      </DialogFooter>
    </>
  );

  const visibleNotes = notes?.slice(0, 6);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleNotes?.map((note, index) => (
          <Card key={note._id} className="relative">
            <CardHeader className="flex justify-between items-center flex-row">
              <CardTitle>Note {index + 1}</CardTitle>
              <div className="space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateToNote(note._id)}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  View
                </Button>
                {isDesktop ? (
                  <Dialog
                    open={openDeleteDialog}
                    onOpenChange={setOpenDeleteDialog}
                  >
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-x-2"
                        onClick={() => setNoteToDelete(note._id)}
                      >
                        <TrashIcon className="w-4 h-4" />
                        Delete Note
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DeleteConfirmation />
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Drawer
                    open={openDeleteDialog}
                    onOpenChange={setOpenDeleteDialog}
                  >
                    <DrawerTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-x-2"
                        onClick={() => setNoteToDelete(note._id)}
                      >
                        <TrashIcon className="w-4 h-4" />
                        Delete Note
                      </Button>
                    </DrawerTrigger>
                    <DrawerContent>
                      <DeleteConfirmation />
                    </DrawerContent>
                  </Drawer>
                )}
              </div>
            </CardHeader>
            <CardContent onClick={() => navigateToNote(note._id)}>
              <p className="text-muted-foreground">Note {index}</p>
            </CardContent>
            <CardFooter
              className="flex justify-between items-center p-3 gap-2"
              onClick={() => navigateToNote(note._id)}
            >
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
        {(notes == null || notes.length === 0) && (
          <Card className="col-span-full p-6 text-center">
            <p>
              No notes generated yet. Select lectures and use the "Generate
              Notes" action to create notes.
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
