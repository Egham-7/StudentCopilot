import React, { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation } from 'convex/react';
import { ModuleForm } from './module-form';
import { api } from "../../../../convex/_generated/api.js";
import { Id } from 'convex/_generated/dataModel.js';
import { Edit } from 'lucide-react';
import { ModuleFormValues } from './add-module-card.js';


const MAX_FILE_SIZE = 5000000; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const formSchema = z.object({
  name: z.string().min(2, { message: "Module name must be at least 2 characters." }),
  department: z.string().min(2, { message: "Department must be at least 2 characters." }),
  credits: z.number().min(1, { message: "Credits must be at least 1." }),
  image: z.any()
    .refine((files) => files?.length == 1, "Image is required.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      ".jpg, .jpeg, .png and .webp files are accepted."
    ).optional(),
  semester: z.enum(["Fall", "Spring", "Summer"]),
  year: z.string().regex(/^\d{4}$/, { message: "Year must be a 4-digit number." }),
  description: z.string().optional(),
  prerequisites: z.array(z.string()).optional(),
  instructors: z.array(z.string()).min(1, { message: "At least one instructor is required." }),
});

interface EditModuleCardProps {
  module: z.infer<typeof formSchema> & { _id: Id<"modules"> };
}

const EditModuleCard: React.FC<EditModuleCardProps> = ({ module }) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const updateModule = useMutation(api.modules.update);

  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...module,
      credits: module.credits || 0,
      image: undefined,
    },
  });

  const [open, setOpen] = useState(false);

  const onSubmit = async (values: ModuleFormValues) => {
    try {
      let storageId: Id<"_storage"> | undefined = undefined;

      if (values.image instanceof FileList) {
        const postUrl = await generateUploadUrl();
        const imageResult = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": values.image[0].type },
          body: values.image[0]
        });
        if (!imageResult.ok) {
          throw new Error('Failed to upload image');
        }
        const uploadResult = await imageResult.json();
        storageId = uploadResult.storageId;
      }

      const moduleData = {
        ...values,
        image: storageId,
      };

      await updateModule({ id: module._id, ...moduleData });
      setOpen(false);
      console.log("Module updated successfully");
    } catch (err: unknown) {
      console.error("Error: ", err);
    }
  };

  const triggerButton = (
    <Button
      variant="ghost"
      size="icon"
      className="p-2 bg-primary text-white hover:bg-muted rounded-full transition-colors"
      aria-label="Edit module"
    >
      <Edit className="h-5 w-5 " />
    </Button>
  );

  const content = (
    <>

      <ModuleForm form={form} onSubmit={onSubmit} />
    </>
  );

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{triggerButton}</DialogTrigger>
        <DialogContent className="sm:max-w-[425px] bg-background">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Edit Module</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update the details for this module. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
      <DrawerContent className="bg-background">
        <div className="max-h-[80vh] overflow-y-auto px-4 py-6">
          <DrawerHeader className="text-left mb-4">
            <DrawerTitle className="text-xl font-bold text-foreground">Edit Module</DrawerTitle>
            <DrawerDescription className="text-muted-foreground">
              Update the details for this module. Click save when you're done.
            </DrawerDescription>
          </DrawerHeader>
          {content}
        </div>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default EditModuleCard;

