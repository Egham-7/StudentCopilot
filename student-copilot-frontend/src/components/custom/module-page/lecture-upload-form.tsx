import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Id } from "convex/_generated/dataModel";
import AnimatedCircularProgressBar from "@/components/magicui/animated-circular-progress-bar";
import * as z from "zod";
import { useLectureUpload } from "@/hooks/use-lecture-upload";
import { IconAsterisk, IconAsteriskSimple } from "@tabler/icons-react";
import { useBackgroundUpload } from "@/hooks/use-background-lecture-upload";
import { toast } from "@/components/ui/use-toast";
import { createFormSchema } from "@/lib/ui_utils";
import { useUser } from "@clerk/clerk-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { IconInfoCircle } from "@tabler/icons-react";


const LoadingSkeleton = () => {
  return (
    <div className="space-y-8">
      {/* Title Field Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" /> {/* Label */}
        <Skeleton className="h-10 w-full" /> {/* Input */}
      </div>

      {/* Description Field Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" /> {/* Label */}
        <Skeleton className="h-32 w-full" /> {/* Textarea */}
      </div>

      {/* File Upload Field Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-12" /> {/* Label */}
        <Skeleton className="h-10 w-full" /> {/* Input */}
      </div>

      {/* Buttons Skeleton */}
      <div className="flex justify-between">
        <Skeleton className="h-10 w-20" /> {/* Back button */}
        <Skeleton className="h-10 w-32" /> {/* Upload button */}
      </div>
    </div>
  );
}

interface LectureUploadFormProps {
  moduleId: Id<"modules">;
  fileType: "pdf" | "audio" | "video" | "website";
  onBack: () => void;
  onComplete: () => void;
}

const fileTypeConfig = {
  pdf: { accept: ".pdf", label: "PDF" },
  audio: { accept: "audio/*", label: "Audio" },
  video: { accept: "video/*", label: "Video" },
  website: { accept: undefined, label: "Website Link" },
};

const LectureUploadForm: React.FC<LectureUploadFormProps> = ({
  moduleId,
  fileType,
  onBack,
  onComplete,
}) => {
  const { isLoading, uploadProgress, uploadLecture } = useLectureUpload();
  const { startBackgroundUpload } = useBackgroundUpload();

  const { user, isLoaded } = useUser();

  const form = useForm<z.infer<ReturnType<typeof createFormSchema>>>({
    resolver: zodResolver(createFormSchema(user)),
    defaultValues: {
      title: "",
      description: "",
      moduleId: moduleId,
      type: fileType === "website" ? "website" : "file",
      link: "",
    },
  });

  if (!isLoaded) {
    return (
      <>
        <DialogHeader>
          <Skeleton className="h-8 w-48" />
        </DialogHeader>
        <LoadingSkeleton />
      </>
    );
  }

  const handleBackgroundUpload = async (values: z.infer<ReturnType<typeof createFormSchema>>) => {
    await startBackgroundUpload(values, moduleId, fileType);

    toast({
      title: "Upload started in background",
      description: "You can close this window and the upload will continue.",
    });

    onComplete();
  };

  const onSubmit = async (values: z.infer<ReturnType<typeof createFormSchema>>) => {
    let success;
    if (values.type === "website") {
      success = await uploadLecture(values, moduleId, "website");
    } else if (values.type === "file" && values.file) {
      success = await uploadLecture(values, moduleId, fileType);
    } else {
      throw new Error("Invalid form data");
    }

    if (success) {
      onComplete();
      form.reset();
    } else {
      throw new Error("Upload failed");
    }
  };

  const renderFileType = (fileType: string) => {
    switch (fileType) {
      case "pdf":
        return "PDF";
      case "audio":
        return "Audio";
      case "video":
        return "Video";
      case "website":
        return "Website";
      default:
        return "File";
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Upload {renderFileType(fileType)}</DialogTitle>
      </DialogHeader>
      {!isLoading ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <div className="flex gap-x-1">
                    <FormLabel>Title</FormLabel>

                    <IconAsterisk className="w-3 h-3 text-destructive" />
                  </div>
                  <FormControl>
                    <Input placeholder="Lecture title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <div className="flex gap-x-1">
                    <FormLabel>Description</FormLabel>

                    <IconAsteriskSimple className="w-3 h-3 text-destructive" />
                  </div>
                  <FormControl>
                    <Textarea placeholder="Lecture description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {fileType === "website" ? (
              <FormField
                control={form.control}
                name="link"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <div className="flex gap-x-1 items-center mb-2">
                      <FormLabel>Website Link</FormLabel>
                      <IconAsterisk className="w-3 h-3 text-destructive" />

                      {fieldState.error && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <IconInfoCircle className="h-5 w-5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px] text-start space-y-2">
                              <p>Connect your Google account in a few simple steps:</p>
                              <ol className="list-decimal ml-4 mt-1">
                                <li>Click on your your profile picture in the sidebar</li>
                                <li>Select "Manage Account"</li>
                                <li>Navigate to "Social Accounts"</li>
                                <li>Click "Connect Google"</li>
                                <li>Follow Google's sign-in process</li>
                              </ol>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                    </div>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="file"
                render={({ field }) => (
                  <FormItem className="hover:cursor-pointer">
                    <div className="flex gap-x-1">
                      <FormLabel>File</FormLabel>
                      <IconAsterisk className="w-3 h-3 text-destructive" />
                    </div>
                    <FormControl>
                      <Input
                        type="file"
                        accept={fileTypeConfig[fileType].accept}
                        onChange={(e) => field.onChange(e.target.files?.[0])}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={onBack}>
                Back
              </Button>
              <Button type="submit">Upload Lecture</Button>
            </div>
          </form>
        </Form>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-4">
          <AnimatedCircularProgressBar
            max={100}
            min={0}
            value={uploadProgress}
            gaugePrimaryColor="rgb(79 70 229)"
            gaugeSecondaryColor="rgba(0, 0, 0, 0.1)"
          />
          <p className="mt-2 text-sm text-gray-500">
            Uploading: {uploadProgress}%
          </p>

          <Button onClick={() => form.handleSubmit(handleBackgroundUpload)()}
          >
            Upload in the background
          </Button>
        </div>
      )}
    </>
  );
};

export default LectureUploadForm;
