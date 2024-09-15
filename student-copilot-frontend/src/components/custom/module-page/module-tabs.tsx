import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileText, Loader2 } from "lucide-react";
import { Id, Doc } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "@/components/ui/use-toast";
import SearchBar from "./search-bar";
import LecturesTab from "./lectures-tab";
import NotesTab from "./notes-tab";

import { SearchResults } from "@/lib/ui_utils";


type ModuleTabsProps = {
  moduleId: Id<"modules">;
  lectures: Doc<"lectures">[];
  notes: Doc<"notes">[] | undefined;
  selectedLectures: Id<"lectures">[];
  setSelectedLectures: React.Dispatch<React.SetStateAction<Id<"lectures">[]>>;
};


export default function ModuleTabs({ moduleId, lectures, notes, selectedLectures, setSelectedLectures }: ModuleTabsProps) {
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [activeTab, setActiveTab] = useState("lectures");


  const [filteredLectures, setFilteredLectures] = useState(lectures);
  const [filteredNotes, setFilteredNotes] = useState(notes);

  const generateNotes = useMutation(api.notes.storeClient);

  const handleGenerateNotes = async () => {
    setIsGeneratingNotes(true);
    try {
      await generateNotes({
        lectureIds: selectedLectures,
        moduleId
      });
      toast({
        title: "Generated notes successfully.",
        description: "We are just generating your notes! We will let you know when it's done."
      });
    } catch (error) {
      console.error("Failed to generate notes:", error);
      toast({
        title: "Failed to generate notes",
        description: "An error occurred while generating notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingNotes(false);
      setSelectedLectures([]);
    }
  };

  const handleSearchResults = useCallback((type: 'lectures' | 'notes', results: SearchResults) => {
    if (type === 'lectures') {
      setFilteredLectures(lectures.filter(lecture => results.lectures.includes(lecture._id)));
    } else if (type === 'notes') {
      setFilteredNotes(notes?.filter(note => results.notes.includes(note._id)));
    }
  }, [lectures, notes]);




  return (
    <Tabs defaultValue="lectures" onValueChange={setActiveTab} className="space-y-4">
      <div className="flex flex-col justify-between items-start   md:flex-row md:items-center">
        <TabsList>
          <TabsTrigger value="lectures">Lectures</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="discussions">Discussions</TabsTrigger>
        </TabsList>
        {selectedLectures.length > 0 && activeTab === "lectures" && (
          <div className="flex space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Actions</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleGenerateNotes}>
                  {isGeneratingNotes ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Notes
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <TabsContent value="lectures">
        <SearchBar type="lectures" moduleId={moduleId} onSearchResults={(results) => handleSearchResults('lectures', results)} />

        <LecturesTab
          moduleId={moduleId}
          lectures={filteredLectures}
          selectedLectures={selectedLectures}
          setSelectedLectures={setSelectedLectures}
        />
      </TabsContent>

      <TabsContent value="notes">
        <SearchBar type="notes" moduleId={moduleId} onSearchResults={() => setFilteredNotes} />
        <NotesTab notes={filteredNotes} />
      </TabsContent>

      <TabsContent value="resources">Resources content here</TabsContent>
      <TabsContent value="discussions">Discussions content here</TabsContent>
    </Tabs>
  );
}

