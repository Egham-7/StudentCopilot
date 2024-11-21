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
  Calendar,
  Users,
  Book,
  Check,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams } from "react-router-dom";
import ErrorPage from "@/components/custom/error-page";
import { Id } from "convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import LecturePlayer from "@/components/custom/module-page/lecture-player";
import UploadLectureDialog from "@/components/custom/module-page/upload-lecture-dialog";
import { LectureSearchBar } from "@/components/custom/module-page/lecture-search-bar";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function LecturesPage() {
  const { moduleId } = useParams();
  const module = useQuery(
    api.modules.getById,
    moduleId ? { id: moduleId as Id<"modules"> } : "skip",
  );

  const lecturesQuery = useQuery(
    api.lectures.getLecturesByModuleId,
    moduleId ? { moduleId: moduleId as Id<"modules"> } : "skip",
  );

  const lectures = useMemo(() => lecturesQuery ?? [], [lecturesQuery]);

  const [currentPage, setCurrentPage] = useState(1);
  const lecturesPerPage = 6;

  const [searchResults, setSearchResults] = useState<Id<"lectures">[] | null>(
    null,
  );

  const filteredLectures = useMemo(() => {
    if (searchResults && searchResults.length > 0) {
      return lectures.filter((lecture) =>
        searchResults.includes(lecture._id),
      );
    }
    return lectures;
  }, [lectures, searchResults]);

  const totalPages = Math.ceil(filteredLectures.length / lecturesPerPage);

  const currentLectures = useMemo(() => {
    const indexOfLastLecture = currentPage * lecturesPerPage;
    const indexOfFirstLecture = indexOfLastLecture - lecturesPerPage;
    return filteredLectures.slice(indexOfFirstLecture, indexOfLastLecture);
  }, [filteredLectures, currentPage, lecturesPerPage]);


  const handleSearchResults = useCallback(
    (results: Id<"lectures">[]) => {
      setSearchResults(results);
      setCurrentPage(1); // Reset to first page when search results change
    },
    [],
  );

  if (!moduleId) {
    return <ErrorPage />;
  }

  if (!module || !lectures) {
    return <LoadingSkeleton />;
  }

  const completedLectures = lectures.filter(
    (lecture) => lecture.completed,
  ).length;
  const progress = (completedLectures / lectures.length) * 100;

  return (
    <div className="bg-background min-h-screen w-full overflow-hidden">
      <header className="bg-primary text-primary-foreground py-12 px-6">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold mb-4">{module.name}</h1>
          <p className="text-xl mb-6 opacity-90">{module.description}</p>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="text-sm py-1 px-3">
              <Book className="mr-2 h-4 w-4" />
              {lectures.length} Lectures
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
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Your Progress</h2>
          <Progress value={progress} className="w-full h-3" />
          <p className="text-sm text-muted-foreground mt-3">
            {completedLectures} of {lectures.length} lectures completed
          </p>
        </div>

        <LectureSearchBar
          moduleId={moduleId as Id<"modules">}
          onSearchResults={(results) =>
            handleSearchResults(results)
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {currentLectures.map((lecture) => (
            <Card
              key={lecture._id}
              className="flex flex-col hover:shadow-lg transition-shadow duration-300"
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-xl">
                  {lecture.title}
                  {lecture.completed && (
                    <div className="bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </CardTitle>
                <CardDescription className="text-sm">
                  {lecture.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="flex flex-col space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    {new Date(lecture._creationTime).toLocaleDateString()}
                  </div>
                  <div className="flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    {module.instructors.join(", ")}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <LecturePlayer
                    fileUrl={lecture.contentUrl}
                    fileType={lecture.fileType}
                    title={lecture.title}
                    id={lecture._id}
                    isCompleted={lecture.completed}
                  />
                </Button>
              </CardFooter>
            </Card>
          ))}

          <UploadLectureDialog moduleId={moduleId as Id<"modules">} />
        </div>

  <div className="mt-12">
  <Pagination>
    <PaginationContent>
      <PaginationItem>
        <PaginationPrevious
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
        />
      </PaginationItem>
      
      {[...Array(totalPages)].map((_, index) => {
        const pageNumber = index + 1;
        if (
          pageNumber === 1 ||
          pageNumber === totalPages ||
          (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
        ) {
          return (
            <PaginationItem key={pageNumber}>
              <PaginationLink
                onClick={() => setCurrentPage(pageNumber)}
                isActive={currentPage === pageNumber}
              >
                {pageNumber}
              </PaginationLink>
            </PaginationItem>
          );
        } else if (
          pageNumber === currentPage - 2 ||
          pageNumber === currentPage + 2
        ) {
          return (
            <PaginationItem key={pageNumber}>
              <PaginationEllipsis />
            </PaginationItem>
          );
        }
        return null;
      })}

      <PaginationItem>
        <PaginationNext
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
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
