import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Doc } from "convex/_generated/dataModel";
import { Users } from "lucide-react";
type ModuleHeaderProps = {
  moduleUser: Doc<"modules"> | undefined;
};

export default function ModuleHeader({ moduleUser }: ModuleHeaderProps) {
  return (
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-3xl font-bold">{moduleUser?.name}</h1>
        <p className="text-muted-foreground mt-2">{moduleUser?.description}</p>
        <div className="flex items-center mt-4 space-x-4">
          <Badge variant="secondary">
            {moduleUser?.semester} {moduleUser?.year}
          </Badge>
          <Badge variant="secondary">{moduleUser?.credits} Credits</Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="secondary" className="cursor-help">
                  <Users className="w-3 h-3 mr-1" />
                  {moduleUser?.instructors?.length || 0}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{moduleUser?.instructors?.join(", ")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
