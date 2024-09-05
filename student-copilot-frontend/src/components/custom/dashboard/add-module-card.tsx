import React from 'react';
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
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation } from 'convex/react';
import { ModuleForm } from './module-form';
import { api } from "../../../../convex/_generated/api.js";
import { renderTriggerCard } from '@/lib/ui_utils.js';


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
    ),
  semester: z.enum(["Fall", "Spring", "Summer"]),
  year: z.string().regex(/^\d{4}$/, { message: "Year must be a 4-digit number." }),
  description: z.string().optional(),
  prerequisites: z.array(z.string()).optional(),
  instructors: z.array(z.string()).min(1, { message: "At least one instructor is required." }),
});

export type ModuleFormValues = z.infer<typeof formSchema>

const AddModuleCard: React.FC = () => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const storeModule = useMutation(api.modules.store);

  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      department: "",
      credits: 3,
      semester: "Fall",
      year: new Date().getFullYear().toString(),
      description: "",
      prerequisites: [],
      instructors: [""],
    },
  });

  const onSubmit = async (values: ModuleFormValues) => {
    try {
      let storageId = null;
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

      const storedId = await storeModule(moduleData);
      console.log("Module stored with ID:", storedId);
      // Add success notification or redirect here
    } catch (err: unknown) {
      console.error("Error: ", err);
      // Add error notification here
    }
  };

  const triggerCardTitle = "Add New Module"
  const triggerCardDescription = "Click to add a new module to your dashboard"


  if (isDesktop) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          {renderTriggerCard(triggerCardTitle, triggerCardDescription)}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Module</DialogTitle>
            <DialogDescription>
              Enter the details for the new module. Click add when you're done.
            </DialogDescription>
          </DialogHeader>
          <ModuleForm form={form} onSubmit={onSubmit} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        {renderTriggerCard(triggerCardTitle, triggerCardDescription)}
      </DrawerTrigger>
      <DrawerContent>
        <div className="max-h-[80vh] overflow-y-auto">
          <DrawerHeader className="text-left">
            <DrawerTitle>Add New Module</DrawerTitle>
            <DrawerDescription>
              Enter the details for the new module. Click add when you're done.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4">
            <ModuleForm form={form} onSubmit={onSubmit} />
          </div>
        </div>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default AddModuleCard;

