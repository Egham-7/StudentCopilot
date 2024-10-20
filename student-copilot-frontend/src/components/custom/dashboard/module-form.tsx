import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ModuleFormValues } from './add-module-card';
import { MultiSelect } from '@/components/ui/multi-select';
import { Button } from '@/components/ui/button';
import { IconAsterisk } from '@tabler/icons-react';


interface ModuleFormProps {
  form: UseFormReturn<ModuleFormValues>;
  onSubmit: (values: ModuleFormValues) => Promise<void>;
  className?: string;
}

export const ModuleForm: React.FC<ModuleFormProps> = ({ form, onSubmit, className }) => (
  <Form {...form}>
    <div className="max-h-[70vh] overflow-y-auto pr-4">
      <form onSubmit={form.handleSubmit(onSubmit)} className={`space-y-4 ${className}`}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className='flex gap-2'>

                Module Name
                <IconAsterisk className='w-3 h-3 text-destructive' />
              </FormLabel>
              <FormControl>
                <Input placeholder="Introduction to Computer Science" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel className='flex gap-2'>
                Department
                <IconAsterisk className='w-3 h-3 text-destructive' />

              </FormLabel>
              <FormControl>
                <Input placeholder="Computer Science" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />


        <FormField
          control={form.control}
          name="credits"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Credits</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                  min="0"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Module Image</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => field.onChange(e.target.files)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="semester"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Semester</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Fall">Fall</SelectItem>
                  <SelectItem value="Spring">Spring</SelectItem>
                  <SelectItem value="Summer">Summer</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="year"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Year</FormLabel>
              <FormControl>
                <Input placeholder="2023" {...field} />
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
                <Textarea placeholder="Enter module description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="prerequisites"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prerequisites</FormLabel>
              <FormControl>
                <MultiSelect
                  selected={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="Type a prerequisite and press Enter"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="instructors"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instructors</FormLabel>
              <FormControl>
                <MultiSelect
                  selected={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="Type an instructor and press Enter"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />



        <div className="mt-4">
          <Button type='submit'>
            {form.formState.isSubmitting ? 'Adding Module...' : 'Add Module'}
          </Button>
        </div>


      </form>

    </div>
  </Form>
);

