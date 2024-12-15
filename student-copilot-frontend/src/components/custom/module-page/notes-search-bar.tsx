import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { BaseSearchBar } from "../search-bar";

interface NotesSearchBarProps {
  moduleId: Id<"modules">;
  onSearchResults: (results: Id<"notes">[]) => void;
}

const NOTES_SEARCH_OPTIONS = [
  { value: "title", label: "Title" },
  { value: "content", label: "Content" },
];

export function NotesSearchBar({
  moduleId,
  onSearchResults,
}: NotesSearchBarProps) {
  const searchNotesByContent = useAction(api.notes.searchNotesByContent);
  const notes = useQuery(api.notes.getNotesForModule, { moduleId });

  const handleSearch = async (searchTerm: string, searchBy: string) => {
    if (!searchTerm.trim()) {
      const allNotes = notes || [];
      onSearchResults(allNotes.map((n) => n._id));
      return;
    }

    let results: Id<"notes">[] = [];

    if (searchBy === "content") {
      const searchResults = await searchNotesByContent({
        moduleId,
        query: searchTerm,
      });

      if (searchResults.length > 0) {
        const maxScoreResult = searchResults.reduce((max, current) =>
          current._score > max._score ? current : max,
        );
        results = [maxScoreResult._id as Id<"notes">];
      }
    } else {
      // Handle other search fields
    }

    onSearchResults(results);
  };

  return (
    <BaseSearchBar
      placeholder="Search notes..."
      searchOptions={NOTES_SEARCH_OPTIONS}
      onSearch={handleSearch}
    />
  );
}
