import prisma from "../db.server";

export async function checkUsageLimits(shop: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { shop },
    include: { usageLimits: true },
  });

  if (!subscription || !subscription.usageLimits) {
    return { allowed: false, reason: "No active subscription" };
  }

  const limits = subscription.usageLimits;
  const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM

  // Get or create usage tracking
  const usage = await prisma.usageTracking.upsert({
    where: {
      shop_period: {
        shop,
        period: currentPeriod,
      },
    },
    create: {
      shop,
      period: currentPeriod,
    },
    update: {},
  });

  // Check limits
  const checks = {
    languages:
      limits.maxLanguages === -1 ||
      usage.languagesCount < limits.maxLanguages,
    translations:
      limits.maxTranslations === null || limits.maxTranslations === -1 ||
      usage.translationsCount < (limits.maxTranslations || 0),
    products:
      limits.maxProducts === null || limits.maxProducts === -1 || usage.productsCount < (limits.maxProducts || 0),
  };

  const allowed = Object.values(checks).every((check) => check);

  return {
    allowed,
    subscription,
    limits,
    usage,
    checks,
  };
}

export async function incrementUsage(
  shop: string,
  type: "languages" | "translations" | "products",
  amount: number = 1
) {
  const currentPeriod = new Date().toISOString().slice(0, 7);

  await prisma.usageTracking.upsert({
    where: {
      shop_period: {
        shop,
        period: currentPeriod,
      },
    },
    create: {
      shop,
      period: currentPeriod,
      [`${type}Count`]: amount,
    },
    update: {
      [`${type}Count`]: {
        increment: amount,
      },
    },
  });
}

export async function getUsageStats(shop: string) {
  const currentPeriod = new Date().toISOString().slice(0, 7);

  const usage = await prisma.usageTracking.findUnique({
    where: {
      shop_period: {
        shop,
        period: currentPeriod,
      },
    },
  });

  const subscription = await prisma.subscription.findUnique({
    where: { shop },
    include: { usageLimits: true },
  });

  return {
    usage: usage || {
      translationsCount: 0,
      languagesCount: 0,
      productsCount: 0,
    },
    limits: subscription?.usageLimits || null,
  };
}

