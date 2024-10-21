import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, ChevronLeft, ChevronRight, Clock, User } from "lucide-react";

// Mock data for lectures
const lectures = Array(50)
  .fill(null)
  .map((_, i) => ({
    id: i + 1,
    title: `Lecture ${i + 1}`,
    description: `Description for Lecture ${i + 1}`,
    date: new Date(Date.now() + i * 86400000).toLocaleDateString(),
    time: "14:00 - 15:30",
    instructor: `Dr. Smith ${(i % 5) + 1}`,
  }));

export default function LecturesPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const lecturesPerPage = 6;
  const totalPages = Math.ceil(lectures.length / lecturesPerPage);

  const indexOfLastLecture = currentPage * lecturesPerPage;
  const indexOfFirstLecture = indexOfLastLecture - lecturesPerPage;
  const currentLectures = lectures.slice(
    indexOfFirstLecture,
    indexOfLastLecture,
  );

  const nextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  return (
    <div className="flex-1 overflow-auto bg-background">
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <h1 className="text-2xl font-bold text-foreground">My Lectures</h1>
          <Avatar>
            <AvatarImage src="/placeholder-avatar.jpg" alt="User" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </div>
      </header>
      <main className="container mx-auto py-6 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {currentLectures.map((lecture) => (
            <Card key={lecture.id}>
              <CardHeader>
                <CardTitle>{lecture.title}</CardTitle>
                <CardDescription>{lecture.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    {lecture.date}
                  </div>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    {lecture.time}
                  </div>
                  <div className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    {lecture.instructor}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-8 flex justify-between items-center">
          <Button
            onClick={prevPage}
            disabled={currentPage === 1}
            variant="outline"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            onClick={nextPage}
            disabled={currentPage === totalPages}
            variant="outline"
          >
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
