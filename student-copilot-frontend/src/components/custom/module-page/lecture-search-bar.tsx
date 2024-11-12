import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { BaseSearchBar } from "../search-bar";

interface LectureSearchBarProps {
  moduleId: Id<"modules">;
  onSearchResults: (results: Id<"lectures">[]) => void;
}

const LECTURE_SEARCH_OPTIONS = [
  { value: "title", label: "Title" },
  { value: "description", label: "Description" },
  { value: "transcription", label: "Transcription" },
];

export function LectureSearchBar({ moduleId, onSearchResults }: LectureSearchBarProps) {
  const searchLecturesByTranscription = useAction(api.lectures.searchLecturesByTranscription);
  const lectures = useQuery(api.lectures.getLecturesByModuleId, { moduleId });

  const handleSearch = async (searchTerm: string, searchBy: string) => {
    if (!searchTerm.trim()) {
      const allLectures = lectures || [];
      onSearchResults(allLectures.map(l => l._id));
      return;
    }

    let results: Id<"lectures">[] = [];

    if (searchBy === 'transcription') {
      const searchResults = await searchLecturesByTranscription({
        moduleId,
        query: searchTerm
      });

      if (searchResults.length > 0) {
        const maxScoreResult = searchResults.reduce((max, current) =>
          current._score > max._score ? current : max
        );
        results = [maxScoreResult._id as Id<"lectures">];
      }
    } else {
      results = lectures
        ?.filter(lecture => {
          const searchField = lecture[searchBy as 'title' | 'description'] || '';
          return searchField.toLowerCase().includes(searchTerm.toLowerCase());
        })
        .map(lecture => lecture._id) || [];
    }

    onSearchResults(results);
  };

  return (
    <BaseSearchBar
      placeholder="Search lectures..."
      searchOptions={LECTURE_SEARCH_OPTIONS}
      onSearch={handleSearch}
    />
  );
}

