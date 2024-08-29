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

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(step);
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(step + 1);
    }
  };
  const prevStep = () => setStep(step - 1)

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
    // Handle form submission
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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Onboarding</CardTitle>
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
                <h3 className="text-lg font-semibold">Welcome! Let's get started.</h3>
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
                <h3 className="text-lg font-semibold">What best describes your level of study?</h3>
                <FormField
                  control={form.control}
                  name="levelOfStudy"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-2 gap-4"
                        >
                          {levelOfStudyOptions.map(({ value, icon: Icon, label }) => (
                            <FormItem key={value}>
                              <FormLabel className="flex flex-col items-center space-y-2 cursor-pointer">
                                <FormControl>
                                  <RadioGroupItem value={value} className="sr-only" />
                                </FormControl>
                                <Icon size={48} />
                                <span>{label}</span>
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
                <h3 className="text-lg font-semibold">Choose your preferred note-taking style:</h3>
                <FormField
                  control={form.control}
                  name="noteTakingStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                          {noteTakingStyles.map((style) => (
                            <FormItem key={style.id}>
                              <FormLabel className="cursor-pointer [&:has([data-state=checked])>div]:border-primary [&:has([data-state=checked])>div]:shadow-lg">
                                <FormControl>
                                  <RadioGroupItem value={style.id} className="sr-only" />
                                </FormControl>
                                <Card className="relative overflow-hidden border-2 hover:border-primary transition-all">
                                  <CardContent className="flex flex-col items-center p-6">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                      <style.icon className="w-8 h-8 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-lg mb-2">{style.title}</h3>
                                    <p className="text-muted-foreground text-sm text-center">
                                      {style.description}
                                    </p>
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
                <h3 className="text-lg font-semibold">What's your primary learning style?</h3>
                <FormField
                  control={form.control}
                  name="learningStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                          {learningStyles.map((style) => (
                            <FormItem key={style.id}>
                              <FormLabel className="cursor-pointer [&:has([data-state=checked])>div]:border-primary [&:has([data-state=checked])>div]:shadow-lg">
                                <FormControl>
                                  <RadioGroupItem value={style.id} className="sr-only" />
                                </FormControl>
                                <Card className="relative overflow-hidden border-2 hover:border-primary transition-all">
                                  <CardContent className="flex flex-col items-center p-6">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                      <style.icon className="w-8 h-8 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-lg mb-2">{style.title}</h3>
                                    <p className="text-muted-foreground text-sm text-center">
                                      {style.description}
                                    </p>
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

