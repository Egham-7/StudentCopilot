import { useMutation, useQuery, useAction } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";

export function useSubscription() {
  const navigate = useNavigate();

  const createSubscriptionSession = useAction(
    api.stripe.createSubscriptionSession,
  );

  const deleteSubscription = useMutation(
    api.stripeSubscriptions.deleteSubscription,
  );

  const getSubscription = useQuery(
    api.stripeSubscriptions.getSubscriptionClient,
    {},
  );

  const startSubscription = async (
    plan: string,
    planPeriod: "annual" | "monthly",
  ) => {
    const sessionUrl = await createSubscriptionSession({ plan, planPeriod });

    if (sessionUrl) {
      window.location.href = sessionUrl;
    } else {
      navigate("/subscription-error");
    }
  };

  const cancelSubscription = async (subscriptionId: string) => {
    await deleteSubscription({ subscriptionId });
  };

  return {
    subscription: getSubscription,
    startSubscription,
    cancelSubscription,
  };
}
