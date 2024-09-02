import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { CardContent, Card } from "@/components/ui/card";
import { Plus } from "lucide-react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const renderTriggerCard = (title: string, description: string) => (
  <Card className="cursor-pointer hover:bg-accent transition-colors duration-200 flex items-center justify-center h-full" >
    <CardContent className="flex flex-col items-center justify-center p-6 text-center" >
      <Plus className="w-12 h-12 mb-2 text-muted-foreground" />
      <h3 className="text-lg font-semibold text-foreground" > {title} </h3>
      < p className="text-sm text-muted-foreground mt-1" > {description} </p>
    </CardContent>
  </Card>
);

