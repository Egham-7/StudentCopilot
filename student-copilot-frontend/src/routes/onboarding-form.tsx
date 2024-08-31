import { useState } from 'react'
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { UserCircle, Briefcase, Palette, Code, Check, List, Network, LayoutPanelTop, PenTool, Eye, Ear, Hand, Brain } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { useToast } from "@/components/ui/use-toast"
import { Navigate, useNavigate } from 'react-router-dom'

const formSchema = z.object({
  course: z.string().min(10, {
    message: "Course must be at least 10 characters long.",
  }),
  levelOfStudy: z.enum(["Associate", "Bachelors", "Masters", "PhD"]),
  noteTakingStyle: z.enum(["bullet", "mindmap", "cornell", "sketch"]),
  learningStyle: z.enum(["visual", "auditory", "kinesthetic", "analytical"])
})

const noteTakingStyles = [
  {
    id: "bullet",
    title: "Bullet Points",
    description: "Concise and organized lists for quick reference",
    icon: List,
  },
  {
    id: "mindmap",
    title: "Mind Mapping",
    description: "Visual diagrams to connect ideas and concepts",
    icon: Network,
  },
  {
    id: "cornell",
    title: "Cornell Method",
    description: "Structured format for effective review and summary",
    icon: LayoutPanelTop,
  },
  {
    id: "sketch",
    title: "Sketch Notes",
    description: "Combine drawings and text for visual learning",
    icon: PenTool,
  },
]

const learningStyles = [
  {
    id: "visual",
    title: "Visual Learner",
    description: "You prefer using images, diagrams, and spatial understanding",
    icon: Eye,
  },
  {
    id: "auditory",
    title: "Auditory Learner",
    description: "You learn best through listening and speaking",
    icon: Ear,
  },
  {
    id: "kinesthetic",
    title: "Kinesthetic Learner",
    description: "You learn by doing and prefer hands-on experiences",
    icon: Hand,
  },
  {
    id: "analytical",
    title: "Analytical Learner",
    description: "You enjoy logic, reasoning, and systems thinking",
    icon: Brain,
  },
]

const levelOfStudyOptions = [
  { value: "Associate", icon: Palette, label: "Associate" },
  { value: "Bachelors", icon: Code, label: "Bachelors" },
  { value: "Masters", icon: Briefcase, label: "Masters" },
  { value: "PhD", icon: UserCircle, label: "PhD" },
]

type FormField = keyof z.infer<typeof formSchema>;

export default function OnboardingFormPage() {
  const [step, setStep] = useState(1)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      course: "",
      levelOfStudy: "Bachelors",
      noteTakingStyle: "bullet",
      learningStyle: "analytical"
    },
  })
  const { toast } = useToast()
  const { user } = useUser();
  const navigate = useNavigate();


  const storeUser = useMutation(api.users.store);

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(step);
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(step + 1);
    }
  };



  const prevStep = () => setStep(step - 1)

  if (!user) {

    return <Navigate to="/" replace />
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
    try {

      const databaseUser = {
        ...values
      };

      console.log("Database User: ", databaseUser);

      const id = await storeUser(databaseUser);


      if (!id) {
        toast({
          title: "Failed to get your info!",
          description: "Please ensure all info is correct and try again.",
        })

        return
      }

      console.log("User ID: ", id);

      navigate('/dashboard', { replace: true });



    } catch (error: unknown) {

      console.error("Error storing user:", error);
      toast({
        title: "An error occurred",
        description: "Please try again later.",
      });



    }
  }

  function getFieldsForStep(step: number): FormField[] {
    switch (step) {
      case 1:
        return ["course"]
      case 2:
        return ["levelOfStudy"]
      case 3:
        return ["noteTakingStyle"]
      case 4:
        return ["learningStyle"]
      default:
        return []
    }
  }

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl font-bold text-center">Onboarding</CardTitle>
        <div className="flex justify-between mt-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`w-1/4 h-2 rounded ${i <= step ? 'bg-primary' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold">Welcome! Let's get started.</h3>
                <FormField
                  control={form.control}
                  name="course"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What course are you taking?</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter the course you are taking" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="button" onClick={nextStep} className="w-full">Next</Button>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold">What best describes your level of study?</h3>
                <FormField
                  control={form.control}
                  name="levelOfStudy"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-2 gap-2 sm:gap-4"
                        >
                          {levelOfStudyOptions.map(({ value, icon: Icon, label }) => (
                            <FormItem key={value}>
                              <FormLabel className="flex flex-col items-center space-y-2 cursor-pointer">
                                <FormControl>
                                  <RadioGroupItem value={value} className="sr-only" />
                                </FormControl>
                                <Icon size={36} />
                                <span className="text-sm sm:text-base">{label}</span>
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-between">
                  <Button type="button" onClick={prevStep} variant="outline">Back</Button>
                  <Button type="button" onClick={nextStep}>Next</Button>
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold">Choose your preferred note-taking style:</h3>
                <FormField
                  control={form.control}
                  name="noteTakingStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-1 gap-4 md:gap-2 md:grid-cols-2"
                        >
                          {noteTakingStyles.map((style) => (
                            <FormItem key={style.id}>
                              <FormLabel className="cursor-pointer [&:has([data-state=checked])>div]:border-primary [&:has([data-state=checked])>div]:shadow-lg">
                                <FormControl>
                                  <RadioGroupItem value={style.id} className="sr-only" />
                                </FormControl>
                                <Card className="relative overflow-hidden border-2 hover:border-primary transition-all">
                                  <CardContent className="flex flex-row sm:flex-col items-center max-h-sm p-6 md:p-3 md:max-h-md  ">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-0 sm:mb-4 mr-4 sm:mr-0">
                                      <style.icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                      <h3 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2">{style.title}</h3>
                                      <p className="text-muted-foreground text-xs sm:text-sm">
                                        {style.description}
                                      </p>
                                    </div>
                                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center opacity-0 transition-opacity [input:checked~&]:opacity-100">
                                      <Check className="w-3 h-3 text-primary-foreground" />
                                    </div>
                                  </CardContent>
                                </Card>
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-between">
                  <Button type="button" onClick={prevStep} variant="outline">Back</Button>
                  <Button type="button" onClick={nextStep}>Next</Button>
                </div>
              </div>
            )}
            {step === 4 && (
              <div className='space-y-4'>
                <h3 className="text-base sm:text-lg font-semibold">What's your primary learning style?</h3>
                <FormField
                  control={form.control}
                  name="learningStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-1 gap-4 md:grid-cols-2 "
                        >
                          {learningStyles.map((style) => (
                            <FormItem key={style.id}>
                              <FormLabel className="cursor-pointer [&:has([data-state=checked])>div]:border-primary [&:has([data-state=checked])>div]:shadow-lg">
                                <FormControl>
                                  <RadioGroupItem value={style.id} className="sr-only" />
                                </FormControl>
                                <Card className="relative overflow-hidden border-2 hover:border-primary transition-all">
                                  <CardContent className="flex flex-row sm:flex-col items-center p-6 max-h-sm md:p-3 md:max-h-md">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-0 sm:mb-4 mr-4 sm:mr-0">
                                      <style.icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                      <h3 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2">{style.title}</h3>
                                      <p className="text-muted-foreground text-xs sm:text-sm">
                                        {style.description}
                                      </p>
                                    </div>
                                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center opacity-0 transition-opacity [input:checked~&]:opacity-100">
                                      <Check className="w-3 h-3 text-primary-foreground" />
                                    </div>
                                  </CardContent>
                                </Card>
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-between">
                  <Button type="button" onClick={prevStep} variant="outline">Back</Button>
                  <Button type="submit">Submit</Button>
                </div>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

