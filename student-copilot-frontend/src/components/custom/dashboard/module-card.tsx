import React from 'react';
import { Doc } from '../../../../convex/_generated/dataModel';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, GraduationCap, Users } from "lucide-react";
import EditModuleCard from './edit-module-card';
import DeleteModuleDialog from './delete-dialog';

interface ModuleCardProps {
  module: Doc<"modules">;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ module }) => (
  <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg bg-card text-card-foreground">
    <CardContent className="p-0">
      <div
        className="h-48 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
        style={{ backgroundImage: `url(${module.image || '/images/default-module.jpg'})` }}
      />
      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <EditModuleCard module={module} />
        <DeleteModuleDialog moduleId={module._id} />
      </div>
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-2xl font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
            {module.name}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{module.department}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1 bg-secondary text-secondary-foreground py-1 px-2">
            <Clock className="h-3 w-3" />
            {module.semester} {module.year}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1 py-1 px-2">
            <GraduationCap className="h-3 w-3" />
            {module.credits} credits
          </Badge>
        </div>
        {module.instructors && module.instructors.length > 0 && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Users className="h-4 w-4 mr-2" />
            {module.instructors.join(", ")}
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

export default ModuleCard;

