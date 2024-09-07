import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from '@/hooks/use-media-query';
import { useMutation } from 'convex/react';
import { api } from "../../../../convex/_generated/api.js";
import { Id } from 'convex/_generated/dataModel';
import { Trash2 } from 'lucide-react';

interface DeleteModuleDialogProps {
  lectureId: Id<"lectures">
}

const DeleteLectureDialog: React.FC<DeleteModuleDialogProps> = ({ lectureId }) => {
  const isMobile = useMediaQuery("(max-width: 640px)");
  const deleteLecture = useMutation(api.lectures.deleteLecture);

  const onDelete = async () => {
    await deleteLecture({ id: lectureId });
  };

  const content = (
    <>
      <DialogHeader className="space-y-2">
        <DialogTitle className="text-2xl font-bold text-foreground">Are you absolutely sure?</DialogTitle>
        <DialogDescription className="text-muted-foreground">
          This action cannot be undone. This will permanently delete your lecture
          and remove your data from our servers.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-6">
        <DialogClose asChild>
          <Button type="button" variant="outline" className="w-full sm:w-auto">
            Cancel
          </Button>
        </DialogClose>
        <DialogClose asChild>
          <Button type="button" variant="destructive" onClick={onDelete} className="w-full sm:w-auto">
            Delete Module
          </Button>
        </DialogClose>
      </DialogFooter>
    </>
  );

  const triggerButton = (
    <Button
      className="p-2 bg-background hover:bg-muted transition-colors rounded-full shadow-md"
      aria-label="Delete module"
    >
      <Trash2 className="h-5 w-5 text-destructive" />
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
        <DrawerContent className="px-4 py-6 bg-background">
          <DrawerHeader className="space-y-2">
            <DrawerTitle className="text-2xl font-bold text-foreground">{content.props.children[0].props.children[0].props.children}</DrawerTitle>
            <DrawerDescription className="text-muted-foreground">{content.props.children[0].props.children[1].props.children}</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="flex flex-col space-y-2 pt-6">
            <Button type="button" variant="destructive" onClick={onDelete} className="w-full">
              Delete Module
            </Button>
            <DrawerClose asChild>
              <Button type="button" variant="outline" className="w-full">
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-background">
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default DeleteLectureDialog;


