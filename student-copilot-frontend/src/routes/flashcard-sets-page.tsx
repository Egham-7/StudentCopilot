import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Calendar, Book } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Id } from "convex/_generated/dataModel";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useState } from "react";
import CreateFlashCardsForm from "@/components/custom/module-page/create-flashcards-form";

const ITEMS_PER_PAGE = 9;

export default function FlashcardSetsPage() {
  const { moduleId } = useParams();
  const [currentPage, setCurrentPage] = useState(1);

  const flashcardSets = useQuery(
    api.flashcards.getFlashcardsByModuleId,
    moduleId ? { moduleId: moduleId as Id<"modules"> } : "skip",
  );

  if (!flashcardSets) {
    return <LoadingSkeleton />;
  }

  const totalPages = Math.ceil(flashcardSets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = flashcardSets.slice(startIndex, endIndex);

  return (
    <div className="bg-background min-h-screen w-full overflow-hidden">
      <header className="bg-primary text-primary-foreground py-12 px-6">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold mb-4">Flashcard Sets</h1>
          <p className="text-xl mb-6 opacity-90">
            Review and manage your flashcard collections
          </p>
        </div>
      </header>

      <main className="container mx-auto py-12 px-6 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-8">
          {currentItems.map((set) => (
            <Card
              key={set._id}
              className="flex flex-col hover:shadow-lg transition-shadow duration-300"
            >
              <CardHeader>
                <CardTitle className="text-xl">{set.title}</CardTitle>
                <CardDescription>{set.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="flex flex-col space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    {new Date(set._creationTime).toLocaleDateString()}
                  </div>
                  <div className="flex items-center">
                    <Book className="mr-2 h-4 w-4" />
                    {set.totalCards || 0} cards
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/dashboard/flashcards/${moduleId}/${set._id}`}>
                    Review Cards
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
          {moduleId && (
            <CreateFlashCardsForm moduleId={moduleId as Id<"modules">} />
          )}
        </div>

        <Pagination className="justify-center">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1;
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
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
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
        </div>
      </header>
      <main className="container mx-auto py-8 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="flex flex-col">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent className="flex-grow">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
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
