import { useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Scale } from "lucide-react";
const pricingPlans = [
  {
    title: "Basic",
    price: 0,
    description: "For individual students",
    features: [
      { name: "5 lectures per month", included: true },
      { name: "Basic note-taking", included: true },
      { name: "24/7 support", included: true },
      { name: "1 mock exam per module", included: true },
      { name: "Advanced note-taking", included: false },
      { name: "Collaboration tools", included: false },
    ],
    buttonText: "Get Started",
  },
  {
    title: "Pro",
    price: 10,
    description: "For serious learners",
    features: [
      { name: "Unlimited lectures", included: true },
      { name: "Advanced note-taking", included: true },
      { name: "Priority support", included: true },
      { name: "Collaboration tools", included: true },
      { name: "API access", included: false },
      { name: "Bulk licensing", included: false },
    ],
    buttonText: "Upgrade to Pro",
    isPopular: true,
  },
  {
    title: "Enterprise",
    price: 49,
    description: "For institutions",
    features: [
      { name: "Custom features", included: true },
      { name: "Dedicated account manager", included: true },
      { name: "API access", included: true },
      { name: "Bulk licensing", included: true },
      { name: "White-labeling", included: true },
      { name: "Advanced analytics", included: true },
    ],
    buttonText: "Contact Sales",
  },
];

const UpgradePlanModal = () => {
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [isAnnual, setIsAnnual] = useState(false);

  const content = (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex justify-center items-center mb-10">
        <span
          className={cn(
            "mr-3 transition-colors duration-200",
            isAnnual
              ? "text-muted-foreground"
              : "text-foreground font-semibold",
          )}
        >
          Monthly
        </span>
        <Switch
          checked={isAnnual}
          onCheckedChange={setIsAnnual}
          aria-label="Toggle annual billing"
        />
        <span
          className={cn(
            "ml-3 transition-colors duration-200",
            isAnnual
              ? "text-foreground font-semibold"
              : "text-muted-foreground",
          )}
        >
          Annual (Save 15%)
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {pricingPlans.map((plan) => (
          <Card
            key={plan.title}
            className={cn(
              "flex flex-col bg-card text-card-foreground relative transition-all duration-300 hover:shadow-lg",
              plan.isPopular && "border-primary shadow-lg md:scale-105",
            )}
          >
            {plan.isPopular && (
              <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">
                Most Popular
              </Badge>
            )}
            <CardHeader>
              <CardTitle
                className={cn(
                  "text-2xl font-bold",
                  plan.isPopular && "text-primary",
                )}
              >
                {plan.title}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {plan.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p
                className={cn(
                  "text-4xl font-bold mb-6",
                  plan.isPopular ? "text-primary" : "text-foreground",
                )}
              >
                ${isAnnual ? plan.price * 11 : plan.price}
                <span className="text-lg font-normal text-muted-foreground">
                  /{isAnnual ? "year" : "month"}
                </span>
              </p>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature.name} className="flex items-center">
                    {feature.included ? (
                      <Check
                        className={cn(
                          "mr-2 h-5 w-5",
                          plan.isPopular ? "text-primary" : "text-foreground",
                        )}
                      />
                    ) : (
                      <X className="mr-2 h-5 w-5 text-muted-foreground" />
                    )}
                    <span
                      className={cn(
                        "text-sm",
                        feature.included
                          ? "text-foreground"
                          : "text-muted-foreground line-through",
                      )}
                    >
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className={cn(
                  "w-full text-lg py-6",
                  plan.isPopular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/90",
                )}
              >
                {plan.buttonText}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );

  const triggerButton = (
    <Button
      variant="outline"
      className="text-lg py-6 px-8 bg-primary text-primary-foreground gap-x-2"
    >
      Compare Plans
      <Scale className="w-4 h-4" />
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
        <DrawerContent className="px-4 py-8 bg-background">
          <DrawerHeader className="text-center mb-6">
            <DrawerTitle className="text-3xl font-bold text-foreground">
              Upgrade Your Plan
            </DrawerTitle>
            <DrawerDescription className="text-muted-foreground mt-2">
              Choose the plan that best fits your needs
            </DrawerDescription>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="max-w-[80vw] max-h-[90vh] overflow-y-auto bg-background p-8">
        <DialogHeader className="mb-8">
          <DialogTitle className="text-3xl font-bold text-center text-foreground">
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground mt-2">
            Choose the plan that best fits your needs
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default UpgradePlanModal;
