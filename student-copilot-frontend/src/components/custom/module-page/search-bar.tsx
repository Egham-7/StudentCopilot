import { useState, KeyboardEvent } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search } from "lucide-react";
import { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { SearchResults } from "@/lib/ui_utils";


type SearchableKeys = 'title' | 'description' | 'transcription' | 'content';

type SearchBarProps = {
  type: 'lectures' | 'notes';
  moduleId: Id<"modules">;
  onSearchResults: (results: SearchResults) => void;
};

export default function SearchBar({ type, moduleId, onSearchResults }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBy, setSearchBy] = useState<SearchableKeys>('title');
  const [isSearching, setIsSearching] = useState(false);

  const searchLecturesByTranscription = useAction(api.lectures.searchLecturesByTranscription);
  const searchNotesByContent = useAction(api.notes.searchNotesByContent);
  const lectures = useQuery(api.lectures.getLecturesByModuleId, { moduleId });
  const notes = useQuery(api.notes.getNotesForModule, { moduleId });


  const handleSearch = async () => {
    if (!searchTerm.trim()) {

      const allLectures = lectures || [];
      const allNotes = notes || [];
      onSearchResults({ lectures: allLectures.map(l => l._id), notes: allNotes.map(n => n._id) });
      return;
    }

    setIsSearching(true);
    try {
      const results: SearchResults = { lectures: [], notes: [] };
      if (type === 'lectures') {
        if (searchBy === 'transcription') {
          const searchResults = await searchLecturesByTranscription({
            moduleId,
            query: searchTerm
          });

          console.log("Search Results: ", searchResults);


          if (searchResults.length > 0) {
            const maxScoreResult = searchResults.reduce((max, current) =>
              current._score > max._score ? current : max
            );
            results.lectures = [maxScoreResult._id as Id<"lectures">];
          } else {
            results.lectures = [];
          }



        } else {

          results.lectures = lectures
            ?.filter(lecture => {
              const searchField = lecture[searchBy as 'title' | 'description'] || '';
              return searchField.toLowerCase().includes(searchTerm.toLowerCase());
            })
            .map(lecture => lecture._id) || [];


        }
      } else if (type === 'notes') {

        if (searchBy == "content") {
          // Do vector search on notes content field.

          const searchResults = await searchNotesByContent({
            moduleId,
            query: searchTerm
          })

          if (searchResults.length > 0) {
            const maxScoreResult = searchResults.reduce((max, current) =>
              current._score > max._score ? current : max);

            results.notes = [maxScoreResult._id as Id<"notes">]
          }
        } else {

          // Need more attrs

        }
      }
      onSearchResults(results);
    } catch (error) {
      console.error(`${type} search failed:`, error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex items-center space-x-4 mb-4">
      <div className="flex-grow">
        <Input
          placeholder={`Search ${type}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyPress}
        />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Search className="w-4 h-4 mr-2" />
            Search by {searchBy.charAt(0).toUpperCase() + searchBy.slice(1)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => setSearchBy("title")}>Title</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSearchBy("description")}>Description</DropdownMenuItem>
          {type === 'lectures' && (
            <DropdownMenuItem onSelect={() => setSearchBy("transcription")}>Transcription</DropdownMenuItem>
          )}
          {type === 'notes' && (
            <DropdownMenuItem onSelect={() => setSearchBy("content")}>Content</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button onClick={handleSearch} disabled={isSearching}>
        {isSearching ? "Searching..." : "Search"}
      </Button>
    </div>
  );
}

