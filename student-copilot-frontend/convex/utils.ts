export async function exponentialBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 1000,
): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await operation();
    } catch (error: unknown) {
      console.log("Error: ", error);
      const delay = baseDelay * Math.pow(2, retries);
      console.log(
        `Rate limit reached. Retrying in ${delay}ms... (Attempt ${retries + 1}/${maxRetries})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      retries++;
    }
  }
}

export const getPriceId = (productId: string, period: "monthly" | "annual") => {
  const priceMap: Record<string, { monthly: string; annual: string }> = {
    [process.env.STRIPE_PREMIUM_PRODUCT_ID!]: {
      monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID!,
      annual: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID!,
    },
  };

  return priceMap[productId]?.[period];
};
