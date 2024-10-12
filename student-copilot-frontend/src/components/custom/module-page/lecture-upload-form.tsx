import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Id } from 'convex/_generated/dataModel';
import { useToast } from '@/components/ui/use-toast';
import AnimatedCircularProgressBar from '@/components/magicui/animated-circular-progress-bar';
import { formSchema } from '@/lib/ui_utils';
import * as z from 'zod';
import { useLectureUpload } from '@/hooks/use-lecture-upload';



interface LectureUploadFormProps {
  moduleId: Id<"modules">;
  fileType: 'pdf' | 'audio' | 'video';
  onBack: () => void;
  onComplete: () => void;
}

const LectureUploadForm: React.FC<LectureUploadFormProps> = ({ moduleId, fileType, onBack, onComplete }) => {
  const { toast } = useToast();
  const { isLoading, uploadProgress, uploadLecture } = useLectureUpload();


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      moduleId: moduleId,
    }
  });


  const onSubmit = async (values: z.infer<typeof formSchema>) => {

    const file = values.file;




    const fileType = file.type === "application/pdf" ? "pdf" :
      file.type.startsWith("audio/") ? "audio" :
        file.type.startsWith("video/") ? "video" :
          "unknown";

    if (fileType === "unknown") {
      toast({
        title: "Invalid file type.",
        description: "Please upload either a audio, pdf or video file."
      })

      return;
    }

    const success = await uploadLecture(values, moduleId, fileType);

    if (success) {
      toast({
        title: "Lecture uploaded successfully.",
        description: "Your lecture has been added to the module.",
      });

      onComplete();
      form.reset();
    } else {
      toast({
        title: "Lecture upload failed.",
        description: "Please wait for some time and try again."
      })
    }
  }


  return (
    <>
      <DialogHeader>
        <DialogTitle>Upload {fileType === 'pdf' ? 'PDF' : fileType === 'audio' ? 'Audio' : 'Video'}</DialogTitle>
      </DialogHeader>
      {!isLoading ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Lecture description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>File</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept={fileType === 'pdf' ? ".pdf" : fileType == "audio" ? "audio/*" : "video/mp4"}
                      onChange={(e) => field.onChange(e.target.files?.[0])}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={onBack}>
                Back
              </Button>
              <Button type="submit">Upload Lecture</Button>
            </div>
          </form>
        </Form>
      ) : (
        <div className="mt-4 flex flex-col items-center">
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
        </div>
      )}
    </>
  );
};

export default LectureUploadForm;

