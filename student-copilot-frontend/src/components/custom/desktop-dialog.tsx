import {
  Dialog,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";

interface DesktopDialogProps {
  content: React.ReactNode;
  triggerText: string;
}

const DesktopDialog = ({ content, triggerText }: DesktopDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default">{triggerText}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Choose Your Plan</DialogTitle>
          <DialogDescription>
            Select the plan that best fits your needs
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default DesktopDialog;
