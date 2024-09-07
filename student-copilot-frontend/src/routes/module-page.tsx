import { useState, KeyboardEvent } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BookOpen, MoreVertical, Search, Users, Plus } from "lucide-react";
import { Doc, Id } from "convex/_generated/dataModel";
import { useParams } from "react-router-dom";
import UploadLectureForm from "@/components/custom/module-page/upload-lecture-form";
import DeleteLectureDialog from "@/components/custom/module-page/delete-lecture-dialog";

type SearchableKeys = 'title' | 'description' | 'transcription';

export default function ModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBy, setSearchBy] = useState<SearchableKeys>('title');
  const [isVectorSearching, setIsVectorSearching] = useState(false);
  const [filteredLectures, setFilteredLectures] = useState<Id<"lectures">[]>([]);
  const [showAllLectures, setShowAllLectures] = useState(false);

  const moduleUser = useQuery(api.modules.getById, moduleId ? { id: moduleId as Id<"modules"> } : "skip");
  const lectures = useQuery(api.lectures.getLecturesByModuleId, moduleId ? { moduleId: moduleId as Id<"modules"> } : "skip");
  const completedLectures = lectures?.filter(lecture => lecture.completed) || [];
  const progressPercentage = lectures ? (completedLectures.length / lectures.length) * 100 : 0;

  const updateLectureCompletion = useMutation(api.lectures.updateLectureCompletion);
  const searchLecturesByTranscription = useAction(api.lectures.searchLecturesByTranscription);

  const handleLectureCompletion = async (lectureId: Id<"lectures">, completed: boolean) => {
    await updateLectureCompletion({ id: lectureId, completed });
  };



  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setFilteredLectures([]);
      return;
    }

    if (searchBy === 'transcription') {
      setIsVectorSearching(true);
      try {
        const results = await searchLecturesByTranscription({
          moduleId: moduleId! as Id<"modules">,
          query: searchTerm
        });
        setFilteredLectures(results.map(result => result._id));
      } catch (error) {
        console.error("Vector search failed:", error);
      } finally {
        setIsVectorSearching(false);
      }
    } else {
      const filtered = lectures?.filter((lecture: Doc<"lectures">) =>
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

  const visibleLectures = showAllLectures ? displayLectures : displayLectures.slice(0, 3);

  return (
    <div className="container mx-auto p-3 md:p-6 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{moduleUser?.name}</h1>
          <p className="text-muted-foreground mt-2">{moduleUser?.description}</p>
          <div className="flex items-center mt-4 space-x-4">
            <Badge variant="secondary">{moduleUser?.semester} {moduleUser?.year}</Badge>
            <Badge variant="secondary">{moduleUser?.credits} Credits</Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="secondary" className="cursor-help">
                    <Users className="w-3 h-3 mr-1" />
                    {moduleUser?.instructors?.length || 0}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{moduleUser?.instructors?.join(", ")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit Module</DropdownMenuItem>
            <DropdownMenuItem>Duplicate Module</DropdownMenuItem>
            <DropdownMenuItem>Delete Module</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
            <DropdownMenuItem onSelect={() => setSearchBy("transcription")}>Transcription</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={handleSearch} disabled={isVectorSearching}>
          {isVectorSearching ? "Searching..." : "Search"}
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 aspect-video relative overflow-hidden rounded-lg" style={{ backgroundImage: `url(${moduleUser?.image || '/images/default-module.jpg'})` }}>
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <h3 className="text-white text-xl font-bold">Module Cover Image</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Module Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercentage} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">
              {completedLectures.length} of {lectures?.length || 0} lectures completed
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <Tabs defaultValue="lectures">
          <TabsList>
            <TabsTrigger value="lectures">Lectures</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="discussions">Discussions</TabsTrigger>
          </TabsList>
          <TabsContent value="lectures" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleLectures.map((lecture) => (
                <Card key={lecture._id}>
                  <CardHeader className="flex justify-between items-center flex-row">
                    <CardTitle>{lecture.title}</CardTitle>


                    <div className="space-x-4">
                      <Button variant="ghost" size="sm">
                        <BookOpen className="w-4 h-4 mr-2" />
                        View

                      </Button>

                      <DeleteLectureDialog lectureId={lecture._id} />
                    </div>

                  </CardHeader>

                  <CardContent>
                    <p className="text-muted-foreground">{lecture.description ?? ""}</p>
                  </CardContent>
                  <CardFooter className="flex justify-between items-center p-3 gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={`/placeholder-avatar-${lecture._id}.jpg`} />
                      <AvatarFallback>{lecture.title[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">Professor</span>
                    <Button
                      variant={lecture.completed ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => handleLectureCompletion(lecture._id, !lecture.completed)}
                    >
                      {lecture.completed ? "Completed" : "Mark as Complete"}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
              {!showAllLectures && displayLectures.length > 3 && (
                <Card className="flex items-center justify-center p-6 cursor-pointer" onClick={() => setShowAllLectures(true)}>
                  <CardContent className="text-center">
                    <Plus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="font-semibold">View More Lectures</p>
                  </CardContent>
                </Card>
              )}
              <Card className="flex items-center justify-center p-6">
                <UploadLectureForm moduleId={moduleId as Id<"modules">} />
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="resources">Resources content here</TabsContent>
          <TabsContent value="discussions">Discussions content here</TabsContent>
        </Tabs>
        <div className="flex justify-between items-center mt-4">
          <Button variant="link" className="px-0" onClick={() => setShowAllLectures(!showAllLectures)}>
            {showAllLectures ? "Show Less" : "View All Lectures"}
          </Button>
          <div className="text-sm text-muted-foreground">Showing {visibleLectures.length} of {displayLectures.length} lectures</div>
        </div>
      </div>
    </div>
  );
}

