import { useState, KeyboardEvent } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useParams } from "react-router-dom";
import { BookOpen, Search } from "lucide-react";
import { Id } from "convex/_generated/dataModel";

export default function MoreLecturesPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBy, setSearchBy] = useState<'title' | 'description' | 'transcription'>('title');
  const [filteredLectures, setFilteredLectures] = useState<Id<"lectures">[]>([]);

  const lectures = useQuery(api.lectures.getLecturesByModuleId, moduleId ? { moduleId: moduleId as Id<"modules"> } : "skip");

  const searchLecturesByTranscription = useAction(api.lectures.searchLecturesByTranscription);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setFilteredLectures([]);
      return;
    }

    if (searchBy === 'transcription') {
      try {
        const results = await searchLecturesByTranscription({
          moduleId: moduleId! as Id<"modules">,
          query: searchTerm
        });
        setFilteredLectures(results.map(result => result._id));
      } catch (error) {
        console.error("Vector search failed:", error);
      }
    } else {
      const filtered = lectures?.filter(lecture =>
        ((lecture[searchBy] as string) || '').toLowerCase().includes(searchTerm.toLowerCase())
      ) || [];
      setFilteredLectures(filtered.map(lecture => lecture._id));
    }
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const displayLectures = filteredLectures.length > 0
    ? lectures?.filter(lecture => filteredLectures.includes(lecture._id)) || []
    : lectures || [];

  return (
    <div className="container mx-auto p-3 md:p-6 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">More Lectures</h1>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-grow">
          <Input
            placeholder="Search lectures..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyPress}
          />
        </div>
        <Button onClick={handleSearch}>
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {displayLectures.map((lecture) => (
          <Card key={lecture._id} className="relative">
            <CardHeader className="flex justify-between items-center flex-row">
              <CardTitle>{lecture.title}</CardTitle>
              <Badge variant="secondary">{lecture.category}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{lecture.description ?? ""}</p>
            </CardContent>
            <CardFooter className="flex justify-between items-center p-3 gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={`/placeholder-avatar-${lecture._id}.jpg`} />
                <AvatarFallback>{lecture.title[0]}</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="sm">
                <BookOpen className="w-4 h-4 mr-2" />
                View
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
