import { useState, useEffect } from "react";
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
import { Check, X, Scale } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/components/ui/use-toast";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export type PlanFeature = {
  name: string;
  included: boolean;
};

export type PlanPrice = {
  monthly: {
    id: string;
    amount: number;
  } | null;
  annual: {
    id: string;
    amount: number;
  } | null;
};

export type Plan = {
  id: string;
  title: string;
  description: string | null;
  features: PlanFeature[];
  prices: PlanPrice;
  buttonText: string;
};

const UpgradePlanModal = () => {
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [isAnnual, setIsAnnual] = useState(false);
  const { subscription, startSubscription, cancelSubscription } =
    useSubscription();
  const plansQuery = useAction(api.stripe.getPlans);
  const [plans, setPlans] = useState<Plan[] | null>(null);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const fetchedPlans = await plansQuery({});
        setPlans(fetchedPlans as Plan[]);
      } catch (error) {
        console.error("Error fetching plans:", error);
      }
    }

    fetchPlans();
  }, [plansQuery]);

  const { toast } = useToast();
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  const handleUpgrade = (plan: string) => {
    const planPeriod = isAnnual ? "annual" : "monthly";
    startSubscription(plan, planPeriod);
  };

  const handleCancelSubscription = () => {
    if (!subscription) {
      toast({
        title: "No active subscription",
        description: "You don't have an active subscription to cancel.",
      });
      return;
    }
    cancelSubscription(subscription._id);
  };

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
        {plans?.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              "flex flex-col bg-card text-card-foreground relative transition-all duration-300 hover:shadow-lg",
              plan.title.toLowerCase() === "pro" &&
                "border-primary shadow-lg md:scale-105",
            )}
          >
            {plan.title.toLowerCase() === "pro" && (
              <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">
                Most Popular
              </Badge>
            )}
            <CardHeader>
              <CardTitle
                className={cn(
                  "text-2xl font-bold",
                  plan.title.toLowerCase() === "pro" && "text-primary",
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
                  plan.title.toLowerCase() === "pro"
                    ? "text-primary"
                    : "text-foreground",
                )}
              >
                $
                {isAnnual
                  ? plan.prices.annual?.amount
                  : plan.prices.monthly?.amount}
                <span className="text-lg font-normal text-muted-foreground">
                  /{isAnnual ? "year" : "month"}
                </span>
              </p>
              <ul className="space-y-3">
                {plan.features.map((feature: PlanFeature) => (
                  <li key={feature.name} className="flex items-center">
                    {feature.included ? (
                      <Check
                        className={cn(
                          "mr-2 h-5 w-5",
                          plan.title.toLowerCase() === "pro"
                            ? "text-primary"
                            : "text-foreground",
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
                  plan.title.toLowerCase() === "pro"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/90",
                  subscription?.status === "active" &&
                    subscription?.plan === plan.title.toLowerCase() &&
                    hoveredPlan === plan.id &&
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                )}
                onClick={() =>
                  subscription?.status === "active" &&
                  subscription?.plan === plan.title.toLowerCase()
                    ? handleCancelSubscription()
                    : handleUpgrade(plan.id)
                }
                onMouseEnter={() => setHoveredPlan(plan.id)}
                onMouseLeave={() => setHoveredPlan(null)}
                disabled={
                  subscription?.status === "active" &&
                  subscription?.plan === plan.title.toLowerCase() &&
                  hoveredPlan !== plan.id
                }
              >
                {subscription?.status === "active" &&
                subscription?.plan === plan.title.toLowerCase()
                  ? hoveredPlan === plan.id
                    ? "Cancel Plan"
                    : "Current Plan"
                  : plan.buttonText}
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
