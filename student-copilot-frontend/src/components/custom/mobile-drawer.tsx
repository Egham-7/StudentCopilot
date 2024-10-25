import {
  Drawer,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
} from "../ui/drawer";
import { Button } from "../ui/button";

interface MobileDrawerProps {
  content: React.ReactNode;
  triggerText: string;
}

const MobileDrawer = ({ content, triggerText }: MobileDrawerProps) => {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="default">{triggerText}</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Choose Your Plan</DrawerTitle>
          <DrawerDescription>
            Select the plan that best fits your needs
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4">{content}</div>
      </DrawerContent>
    </Drawer>
  );
};

export default MobileDrawer;
