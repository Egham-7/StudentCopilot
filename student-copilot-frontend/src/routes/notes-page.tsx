import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Calendar, Users, FileText } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams } from "react-router-dom";
import ErrorPage from "@/components/custom/error-page";
import { Id } from "convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { NotesSearchBar } from "@/components/custom/module-page/notes-search-bar";
import CreateNotesDialog from "@/components/custom/notes-page/create-notes-dialog";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function NotesPage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const module = useQuery(
    api.modules.getById,
    moduleId ? { id: moduleId as Id<"modules"> } : "skip",
  );
  const notesQuery = useQuery(
    api.notes.getNotesForModule,
    moduleId ? { moduleId: moduleId as Id<"modules"> } : "skip",
  );

  const notes = useMemo(() => notesQuery ?? [], [notesQuery]);
  const [currentPage, setCurrentPage] = useState(1);
  const notesPerPage = 6;
  const [searchResults, setSearchResults] = useState<Id<"notes">[] | null>(
    null,
  );

  const filteredNotes = useMemo(() => {
    if (searchResults && searchResults.length > 0) {
      return notes.filter((note) => searchResults.includes(note._id));
    }
    return notes;
  }, [notes, searchResults]);

  const totalPages = Math.ceil(filteredNotes.length / notesPerPage);

  const currentNotes = useMemo(() => {
    const indexOfLastNote = currentPage * notesPerPage;
    const indexOfFirstNote = indexOfLastNote - notesPerPage;
    return filteredNotes.slice(indexOfFirstNote, indexOfLastNote);
  }, [filteredNotes, currentPage, notesPerPage]);

  const handleSearchResults = useCallback(
    (results: Id<"notes">[]) => {
      setSearchResults(results);
      setCurrentPage(1);
    },
    [setSearchResults, setCurrentPage],
  );

  const goToNote = (noteId: string) => {
    navigate(`/dashboard/note/${noteId}`, { replace: true });
  };

  if (!moduleId) {
    return <ErrorPage />;
  }

  if (!module || !notes) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="bg-background min-h-screen w-full overflow-hidden">
      <header className="bg-primary text-primary-foreground py-12 px-6">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold mb-4">{module.name} - Notes</h1>
          <p className="text-xl mb-6 opacity-90">{module.description}</p>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="text-sm py-1 px-3">
              <FileText className="mr-2 h-4 w-4" />
              {notes.length} Notes
            </Badge>
            <Badge variant="secondary" className="text-sm py-1 px-3">
              <Users className="mr-2 h-4 w-4" />
              {module.instructors.length} Instructor
              {module.instructors.length > 1 ? "s" : ""}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-12 px-6 max-w-6xl">
        <NotesSearchBar
          moduleId={moduleId as Id<"modules">}
          onSearchResults={(results) => handleSearchResults(results)}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {currentNotes.map((note) => (
            <Card
              key={note._id}
              className="flex flex-col hover:shadow-lg transition-shadow duration-300"
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-xl text-center truncate">
                  {note._id}
                </CardTitle>
                <CardDescription className="text-sm">
                  Associated with {note.lectureIds.length} lecture(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="flex flex-col space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    {new Date(note._creationTime).toLocaleDateString()}
                  </div>
                  <div className="flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    {note.textChunks.length} text chunks
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => goToNote(note._id)}>
                  View Note
                </Button>
              </CardFooter>
            </Card>
          ))}
          <CreateNotesDialog moduleId={moduleId as Id<"modules">} />
        </div>
        <div className="mt-12">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  className={cn(
                    "transition-all",
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer hover:bg-accent",
                  )}
                />
              </PaginationItem>

              {[...Array(totalPages)].map((_, index) => {
                const pageNumber = index + 1;
                const isFirstPage = pageNumber === 1;
                const isLastPage = pageNumber === totalPages;
                const isWithinRange =
                  pageNumber >= currentPage - 1 &&
                  pageNumber <= currentPage + 1;
                const needsLeftEllipsis = pageNumber === 2 && currentPage > 4;
                const needsRightEllipsis =
                  pageNumber === totalPages - 1 && currentPage < totalPages - 3;

                if (isFirstPage || isLastPage || isWithinRange) {
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNumber)}
                        className={cn(
                          "transition-all hover:bg-accent",
                          currentPage === pageNumber &&
                            "bg-primary text-primary-foreground hover:bg-primary/90",
                        )}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }

                if (needsLeftEllipsis || needsRightEllipsis) {
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationEllipsis className="text-muted-foreground" />
                    </PaginationItem>
                  );
                }

                return null;
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  className={cn(
                    "transition-all",
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer hover:bg-accent",
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </main>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="bg-background min-h-screen w-full overflow-hidden">
      <header className="bg-primary text-primary-foreground py-8 px-4">
        <div className="container mx-auto">
          <Skeleton className="h-8 w-1/2 mb-2" />
          <Skeleton className="h-4 w-3/4 mb-4" />
          <div className="flex items-center space-x-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
      </header>
      <main className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <Skeleton className="h-6 w-1/4 mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="flex flex-col">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent className="flex-grow">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
