import { useState, useCallback, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Id, Doc } from "convex/_generated/dataModel";
import LecturesTab from "./lectures-tab";
import NotesTab from "./notes-tab";
import { LecturesData } from "@/lib/ui_utils";
import { LectureSearchBar } from "./lecture-search-bar";
import { NotesSearchBar } from "./notes-search-bar";
import FlashcardSetsTab from "./flashcard-sets-tab";
import { LectureQuickActions } from "./lecture-quick-actions";
import { FlashcardQuickActions } from "./flashcard-quick-actions";

type ModuleTabsProps = {
  moduleId: Id<"modules">;
  lectures: LecturesData[] | undefined;
  notes: Doc<"notes">[] | undefined;
  flashCardSets: Doc<"flashCardSets">[] | undefined;
};

export default function ModuleTabs({
  moduleId,
  lectures,
  notes,
  flashCardSets,
}: ModuleTabsProps) {
  const [activeTab, setActiveTab] = useState("lectures");

  const [filteredLectures, setFilteredLectures] = useState(lectures);
  const [filteredNotes, setFilteredNotes] = useState(notes);

  const [selectedLectures, setSelectedLectures] = useState<Id<"lectures">[]>(
    [],
  );

  const [selectedFlashcards, setSelectedFlashcards] = useState<
    Id<"flashCardSets">[]
  >([]);

  const handleSelectFlashcards = (flashcardSetId: Id<"flashCardSets">) => {
    setSelectedFlashcards((prev) => {
      if (prev.includes(flashcardSetId)) {
        return prev.filter((id) => id !== flashcardSetId);
      } else {
        return [...prev, flashcardSetId];
      }
    });
  };

  useEffect(() => {
    setFilteredLectures(lectures);
  }, [lectures]);

  useEffect(() => {
    setFilteredNotes(notes);
  }, [notes]);

  const handleLectureSearchResults = useCallback(
    (results: Id<"lectures">[]) => {
      setFilteredLectures(
        lectures?.filter((lecture) => results.includes(lecture._id)),
      );
    },
    [lectures],
  );

  const handleNotesSearchResults = useCallback(
    (results: Id<"notes">[]) => {
      setFilteredNotes(notes?.filter((note) => results.includes(note._id)));
    },

    [notes],
  );

  return (
    <Tabs
      defaultValue="lectures"
      onValueChange={setActiveTab}
      className="space-y-4"
    >
      <div className="flex  gap-4 whitespace-nowrap justify-between items-center md:flex-row md:items-center">
        <TabsList>
          <TabsTrigger value="lectures">Lectures</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="flashcards">Flashcard Sets</TabsTrigger>
        </TabsList>
        {selectedLectures.length > 0 && activeTab === "lectures" && (
          <LectureQuickActions
            moduleId={moduleId}
            selectedLectures={selectedLectures}
            onActionComplete={() => setSelectedFlashcards([])}
          />
        )}

        {selectedFlashcards.length > 0 && activeTab === "flashcards" && (
          <FlashcardQuickActions
            moduleId={moduleId}
            selectedFlashcards={selectedFlashcards}
            onActionComplete={() => setSelectedFlashcards([])}
          />
        )}
      </div>

      <TabsContent value="lectures">
        <LectureSearchBar
          moduleId={moduleId}
          onSearchResults={handleLectureSearchResults}
        />

        <LecturesTab
          moduleId={moduleId}
          lectures={filteredLectures}
          selectedLectures={selectedLectures}
          setSelectedLectures={setSelectedLectures}
        />
      </TabsContent>

      <TabsContent value="notes">
        <NotesSearchBar
          moduleId={moduleId}
          onSearchResults={handleNotesSearchResults}
        />

        <NotesTab notes={filteredNotes} />
      </TabsContent>

      <TabsContent value="flashcards">
        <FlashcardSetsTab
          selectedFlashcards={selectedFlashcards}
          moduleId={moduleId}
          flashcardSets={flashCardSets}
          handleSelectFlashcards={handleSelectFlashcards}
        />
      </TabsContent>
      <TabsContent value="discussions">Discussions content here</TabsContent>
    </Tabs>
  );
}
