import { useState, useEffect, useCallback, useMemo } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/components/ui/use-toast";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import MobileDrawer from "../mobile-drawer";
import DesktopDialog from "../desktop-dialog";
import { Doc } from "convex/_generated/dataModel";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlanPrice {
  monthly: {
    priceId: string;
    amount: number;
  } | null;
  annual: {
    priceId: string;
    amount: number;
  } | null;
}

interface Plan {
  id: string;
  title: string;
  description: string | null;
  features: string[];
  prices: PlanPrice;
  buttonText: string;
}

const PricingCard = ({
  plan,
  isAnnual,
  subscription,
  hoveredPlan,
  onPlanSelect,
  onHover,
}: {
  plan: Plan;
  isAnnual: boolean;
  subscription: Doc<"subscriptions"> | undefined | null;
  hoveredPlan: string | null;
  onPlanSelect: (planId: string) => void;
  onHover: (planId: string | null) => void;
}) => {
  const isPremium = plan.title.toLowerCase() === "premium";
  const isCurrentPlan =
    subscription?.status === "active" &&
    subscription?.plan === plan.title.toLowerCase();
  const isHovered = hoveredPlan === plan.id;
  const isBasic = plan.title.toLowerCase() === "basic";

  return (
    <Card
      className={cn(
        "flex flex-col bg-card text-card-foreground relative transition-all duration-300 hover:shadow-lg",
        isPremium || (isBasic && "border-primary shadow-lg md:scale-105"),
      )}
    >
      {isPremium && (
        <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">
          Most Popular
        </Badge>
      )}
      <CardHeader>
        <CardTitle
          className={cn(
            "text-2xl font-bold",
            isPremium || (isBasic && "text-primary"),
          )}
        >
          {plan.title}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {plan.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <PriceDisplay plan={plan} isAnnual={isAnnual} />
        <FeaturesList
          features={plan.features}
          isPro={plan.title.toLowerCase() === "pro"}
        />
      </CardContent>
      <CardFooter>
        <PlanButton
          plan={plan}
          isCurrentPlan={isCurrentPlan}
          isHovered={isHovered}
          onPlanSelect={onPlanSelect}
          onHover={onHover}
        />
      </CardFooter>
    </Card>
  );
};

const UpgradePlanModal = () => {
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [isAnnual, setIsAnnual] = useState(false);
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[] | null>(null);

  const { subscription, startSubscription, cancelSubscription } =
    useSubscription();
  const plansQuery = useAction(api.stripe.getPlans);
  const { toast } = useToast();

  // Memoize fetch plans function
  const fetchPlans = useCallback(async () => {
    try {
      const fetchedPlans = await plansQuery({});
      setPlans(fetchedPlans as Plan[]);
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  }, [plansQuery]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleUpgrade = useCallback(
    (planId: string) => {
      const planPeriod = isAnnual ? "annual" : "monthly";
      startSubscription(planId, planPeriod);
    },
    [isAnnual, startSubscription],
  );

  const handleCancelSubscription = useCallback(() => {
    if (!subscription) {
      toast({
        title: "No active subscription",
        description: "You don't have an active subscription to cancel.",
      });
      return;
    }
    cancelSubscription(subscription._id);
  }, [subscription, cancelSubscription, toast]);

  const handlePlanSelection = useCallback(
    (planId: string) => {
      if (
        subscription?.status === "active" &&
        subscription?.plan ===
        plans?.find((p) => p.id === planId)?.title.toLowerCase()
      ) {
        handleCancelSubscription();
      } else {
        handleUpgrade(planId);
      }
    },
    [subscription, plans, handleCancelSubscription, handleUpgrade],
  );

  // Memoize content
  const content = useMemo(
    () => (
      <div className="w-full max-w-5xl mx-auto">
        <BillingToggle isAnnual={isAnnual} onToggle={setIsAnnual} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans?.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isAnnual={isAnnual}
              subscription={subscription}
              hoveredPlan={hoveredPlan}
              onPlanSelect={handlePlanSelection}
              onHover={setHoveredPlan}
            />
          ))}
        </div>
      </div>
    ),
    [plans, isAnnual, subscription, hoveredPlan, handlePlanSelection],
  );

  return isMobile ? (
    <MobileDrawer content={content} triggerText="Compare Plans" />
  ) : (
    <DesktopDialog content={content} triggerText="Compare Plans" />
  );
};

export default UpgradePlanModal;

interface BillingToggleProps {
  isAnnual: boolean;
  onToggle: (value: boolean) => void;
}

const BillingToggle = ({ isAnnual, onToggle }: BillingToggleProps) => {
  return (
    <div className="flex justify-center items-center mb-10">
      <span
        className={cn(
          "mr-3 transition-colors duration-200",
          isAnnual ? "text-muted-foreground" : "text-foreground font-semibold",
        )}
      >
        Monthly
      </span>
      <Switch
        checked={isAnnual}
        onCheckedChange={onToggle}
        aria-label="Toggle annual billing"
      />
      <span
        className={cn(
          "ml-3 transition-colors duration-200",
          isAnnual ? "text-foreground font-semibold" : "text-muted-foreground",
        )}
      >
        Annual (Save 15%)
      </span>
    </div>
  );
};

interface PriceDisplayProps {
  plan: Plan;
  isAnnual: boolean;
}

export const PriceDisplay = ({ plan, isAnnual }: PriceDisplayProps) => {
  const amount = isAnnual
    ? plan.prices.annual?.amount
    : plan.prices.monthly?.amount;
  const period = isAnnual ? "year" : "month";

  return (
    <p
      className={cn(
        "text-4xl font-bold mb-6",
        plan.title.toLowerCase() === "premium" ||
          plan.title.toLowerCase() === "basic"
          ? "text-primary"
          : "text-foreground",
      )}
    >
      ${amount}
      <span className="text-lg font-normal text-muted-foreground">
        /{period}
      </span>
    </p>
  );
};

interface FeaturesListProps {
  features: string[];
  isPro: boolean;
}

const FeaturesList = ({ features, isPro }: FeaturesListProps) => {
  return (
    <ul className="space-y-3">
      {features.map((feature, index) => (
        <li key={index} className="flex items-center gap-2">
          <Check
            className={cn(
              "h-4 w-4",
              isPro ? "text-primary" : "text-foreground",
            )}
          />
          <span className="text-sm text-muted-foreground">{feature}</span>
        </li>
      ))}
    </ul>
  );
};

interface PlanButtonProps {
  plan: Plan;
  isCurrentPlan: boolean;
  isHovered: boolean;
  onPlanSelect: (planId: string) => void;
  onHover: (planId: string | null) => void;
}

const PlanButton = ({
  plan,
  isCurrentPlan,
  isHovered,
  onPlanSelect,
  onHover,
}: PlanButtonProps) => {
  const isPremium = plan.title.toLowerCase() === "premium";

  const isBasic = plan.title.toLowerCase() === "basic";

  const isFree = plan.title.toLowerCase() === "free";

  return (
    <Button
      className={cn(
        "w-full transition-all duration-300",
        isPremium || (isBasic && "bg-primary hover:bg-primary/90"),
        isFree && "bg-secondary",
      )}
      onMouseEnter={() => onHover(plan.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onPlanSelect(plan.id)}
    >
      {isCurrentPlan
        ? isHovered && plan.title.toLowerCase() !== "free"
          ? "Cancel Plan"
          : "Current Plan"
        : plan.buttonText}
    </Button>
  );
};
