import { useState, useRef, useEffect, useCallback } from "react";
import {
  File,
  FileAudio,
  FileVideo,
  FileSpreadsheet,
  Play,
  Pause,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { DialogTitle, DialogTrigger } from "@radix-ui/react-dialog";
import { FaGlobe } from "react-icons/fa";
import { Id } from "convex/_generated/dataModel";
import Microlink from "@microlink/react";
import { toast } from "@/components/ui/use-toast";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
interface LecturePlayerProps {
  fileUrl: string | null;
  fileType: "audio" | "video" | "pdf" | "website";
  title: string;
  isCompleted: boolean;
  id: Id<"lectures">;
}

const iconMap = {
  audio: FileAudio,
  video: FileVideo,
  pdf: FileSpreadsheet,
  website: FaGlobe,
};

export default function LecturePlayer({
  isCompleted,
  fileUrl,
  fileType,
  title,
  id,
}: LecturePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [websiteUrl, setWebsiteUrl] = useState<string | null>(null);
  const markLectureComplete = useMutation(api.lectures.updateLectureCompletion);

  useEffect(() => {
    const fetchWebsiteUrl = async () => {
      if (fileType === "website" && fileUrl) {
        try {
          const response = await fetch(fileUrl);
          if (!response.ok) {
            throw new Error("Failed to fetch website URL");
          }
          const text = await response.text();
          setWebsiteUrl(text.trim());
        } catch (error) {
          console.error("Error fetching website URL:", error);
          toast({
            title: "Failed to fetch website URL",
            description: "Please wait and try again",
          });
        }
      }
    };

    fetchWebsiteUrl();
  }, [fileType, fileUrl]);

  const getMediaRef = useCallback(() => {
    return fileType === "audio" ? audioRef.current : videoRef.current;
  }, [fileType]);

  const handlePlayPause = useCallback(() => {
    const media = getMediaRef();
    if (media) {
      if (isPlaying) {
        media.pause();
      } else {
        media.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying, getMediaRef]);

  const handleTimeUpdate = useCallback(() => {
    const media = getMediaRef();
    if (media) {
      setCurrentTime(media.currentTime);
    }
  }, [getMediaRef, setCurrentTime]);

  const handleLoadedMetadata = useCallback(() => {
    const media = getMediaRef();
    if (media) {
      setDuration(media.duration);
    }
  }, [getMediaRef, setDuration]);

  const handleSeek = useCallback(
    (value: number[]) => {
      const media = getMediaRef();
      if (media) {
        media.currentTime = value[0];
        setCurrentTime(value[0]);
      }
    },
    [getMediaRef, setCurrentTime],
  );

  useEffect(() => {
    const media = getMediaRef();
    if (media) {
      media.addEventListener("timeupdate", handleTimeUpdate);
      media.addEventListener("loadedmetadata", handleLoadedMetadata);

      if (media.readyState >= 2) {
        setDuration(media.duration);
        setCurrentTime(media.currentTime);
      }

      return () => {
        media.removeEventListener("timeupdate", handleTimeUpdate);
        media.removeEventListener("loadedmetadata", handleLoadedMetadata);
      };
    }
  }, [
    handleTimeUpdate,
    handleLoadedMetadata,
    getMediaRef,
    setDuration,
    setCurrentTime,
  ]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const renderMediaPlayer = () => {
    switch (fileType) {
      case "audio":
        return (
          <audio ref={audioRef} src={fileUrl || undefined} className="w-full" />
        );
      case "video":
        return (
          <video
            ref={videoRef}
            src={fileUrl || undefined}
            className="w-full rounded-lg"
          />
        );
      case "pdf":
        return (
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl || "")}&embedded=true`}
            className="w-full h-[500px] rounded-lg"
            title={`PDF viewer for ${title}`}
          />
        );
      case "website":
        return websiteUrl ? (
          <Microlink url={websiteUrl} />
        ) : (
          <div>Loading website...</div>
        );
      default:
        return null;
    }
  };

  const Icon = iconMap[fileType] || File;

  if (!fileUrl) {
    return <div>No content found.</div>;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <BookOpen className="w-4 h-4 mr-2" />
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="p-6 h-96 overflow-y-auto">
        <DialogHeader className="text-2xl font-bold">
          <DialogTitle className="flex gap-2">
            <Icon className="w-6 h-6" aria-hidden="true" />
            {title}
          </DialogTitle>
        </DialogHeader>
        {renderMediaPlayer()}
        {fileType === "video" ||
          (fileType === "audio" && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <Slider
                value={[currentTime]}
                max={duration}
                step={0.1}
                onValueChange={handleSeek}
                className="w-full"
                aria-label="Seek"
              />
              <div className="flex justify-center mt-4">
                <Button
                  onClick={handlePlayPause}
                  className="px-8"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="mr-2" aria-hidden="true" />
                  ) : (
                    <Play className="mr-2" aria-hidden="true" />
                  )}
                  {isPlaying ? "Pause" : "Play"}
                </Button>
              </div>
            </div>
          ))}

        <DialogFooter>
          <Button
            onClick={() => {
              markLectureComplete({ id, completed: !isCompleted });
            }}
            disabled={isCompleted}
            className="w-full"
          >
            {isCompleted ? "Completed" : "Mark as Completed"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
