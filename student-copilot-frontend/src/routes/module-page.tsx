import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "convex/_generated/dataModel";

import ModuleHeader from "@/components/custom/module-page/module-header";
import ModuleProgress from "@/components/custom/module-page/module-progress";
import ModuleTabs from "@/components/custom/module-page/module-tabs";

export default function ModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [selectedLectures, setSelectedLectures] = useState<Id<"lectures">[]>([]);

  const moduleUser = useQuery(api.modules.getById, moduleId ? { id: moduleId as Id<"modules"> } : "skip");
  const lectures = useQuery(api.lectures.getLecturesByModuleId, moduleId ? { moduleId: moduleId as Id<"modules"> } : "skip");
  const notes = useQuery(api.notes.getNotesForModule, moduleId ? { moduleId: moduleId as Id<"modules"> } : "skip");

  const completedLectures = lectures?.filter(lecture => lecture.completed) || [];
  const progressPercentage = lectures ? (completedLectures.length / lectures.length) * 100 : 0;

  if (!moduleId) {
    return <div>Invalid module ID</div>;
  }




  return (
    <div className="container mx-auto p-3 md:p-6 space-y-8">
      <ModuleHeader moduleUser={moduleUser} />

      <div className="space-y-6">
        <ModuleProgress
          progressPercentage={progressPercentage}
          completedLectures={completedLectures.length}
          totalLectures={lectures?.length || 0}
        />
      </div>

      {lectures && notes && (
        <ModuleTabs
          moduleId={moduleId as Id<"modules">}
          lectures={lectures}
          notes={notes}
          selectedLectures={selectedLectures}
          setSelectedLectures={setSelectedLectures}
        />

      )}

    </div>
  );
}

