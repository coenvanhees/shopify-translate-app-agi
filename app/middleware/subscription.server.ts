import { redirect } from "@remix-run/node";
import { getSubscription } from "../services/billing.server";
import { checkUsageLimits } from "../services/usage.server";

export async function requireActiveSubscription(shop: string) {
  const subscription = await getSubscription(shop);

  if (!subscription || subscription.status !== "active") {
    throw redirect("/app/subscription/plans");
  }

  return subscription;
}

export async function checkFeatureAccess(
  shop: string,
  feature: "autoTranslate" | "translationMemory"
) {
  const result = await checkUsageLimits(shop);

  if (!result.subscription || !result.limits) {
    return false;
  }

  return result.limits[feature] === true;
}

export async function checkLanguageLimit(shop: string, currentCount: number) {
  const result = await checkUsageLimits(shop);

  if (!result.subscription || !result.limits) {
    return { allowed: false, reason: "No active subscription" };
  }

  const limit = result.limits.maxLanguages;
  if (limit === -1) {
    return { allowed: true };
  }

  return {
    allowed: currentCount < limit,
    current: currentCount,
    limit,
  };
}

