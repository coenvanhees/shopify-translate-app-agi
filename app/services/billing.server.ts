import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: "EVERY_30_DAYS" | "ANNUAL";
  trialDays?: number;
  features: {
    maxLanguages: number;
    maxTranslations?: number;
    maxProducts?: number;
    autoTranslate: boolean;
    translationMemory: boolean;
    prioritySupport: boolean;
  };
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "basic",
    name: "Basic",
    price: 9.99,
    interval: "EVERY_30_DAYS",
    trialDays: 14,
    features: {
      maxLanguages: 2,
      maxTranslations: 100,
      maxProducts: 50,
      autoTranslate: false,
      translationMemory: false,
      prioritySupport: false,
    },
  },
  {
    id: "pro",
    name: "Pro",
    price: 29.99,
    interval: "EVERY_30_DAYS",
    trialDays: 14,
    features: {
      maxLanguages: 5,
      maxTranslations: 1000,
      maxProducts: 500,
      autoTranslate: true,
      translationMemory: true,
      prioritySupport: false,
    },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 99.99,
    interval: "EVERY_30_DAYS",
    features: {
      maxLanguages: -1, // unlimited
      maxTranslations: -1,
      maxProducts: -1,
      autoTranslate: true,
      translationMemory: true,
      prioritySupport: true,
    },
  },
];

export async function createSubscription(
  admin: any,
  shop: string,
  planId: string
) {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error("Invalid plan");

  // Create Shopify app subscription
  const response = await admin.graphql(
    `#graphql
      mutation appSubscriptionCreate($subscription: AppSubscriptionInput!) {
        appSubscriptionCreate(subscription: $subscription) {
          appSubscription {
            id
            name
            status
            currentPeriodEnd
            lineItems {
              id
              plan {
                pricingDetails {
                  ... on AppRecurringPricing {
                    price {
                      amount
                      currencyCode
                    }
                    interval
                  }
                }
              }
            }
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        subscription: {
          name: plan.name,
          lineItems: [
            {
              plan: {
                appRecurringPricingDetails: {
                  price: { amount: plan.price, currencyCode: "USD" },
                  interval: plan.interval,
                },
              },
            },
          ],
          trialDays: plan.trialDays,
          returnUrl: `${process.env.SHOPIFY_APP_URL}/app/subscription/success`,
        },
      },
    }
  );

  const data = await response.json();
  const subscription = data.data?.appSubscriptionCreate?.appSubscription;
  const confirmationUrl = data.data?.appSubscriptionCreate?.confirmationUrl;

  if (!subscription) {
    const errors = data.data?.appSubscriptionCreate?.userErrors || [];
    throw new Error(
      errors.map((e: any) => e.message).join(", ") || "Failed to create subscription"
    );
  }

  // Store in database
  const dbSubscription = await prisma.subscription.upsert({
    where: { shop },
    create: {
      shop,
      planId: plan.id,
      planName: plan.name,
      status: "pending",
      shopifySubscriptionId: subscription.id,
      trialEndsAt: plan.trialDays
        ? new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000)
        : null,
    },
    update: {
      planId: plan.id,
      planName: plan.name,
      shopifySubscriptionId: subscription.id,
    },
  });

  // Create usage limits
  await prisma.usageLimit.upsert({
    where: { subscriptionId: dbSubscription.id },
    create: {
      subscriptionId: dbSubscription.id,
      ...plan.features,
    },
    update: {
      ...plan.features,
    },
  });

  return { subscription: dbSubscription, confirmationUrl };
}

export async function getSubscription(shop: string) {
  return prisma.subscription.findUnique({
    where: { shop },
    include: { usageLimits: true },
  });
}

export async function checkSubscriptionStatus(admin: any, shop: string) {
  const dbSubscription = await getSubscription(shop);
  if (!dbSubscription?.shopifySubscriptionId) return null;

  const response = await admin.graphql(
    `#graphql
      query appSubscription($id: ID!) {
        appSubscription(id: $id) {
          id
          status
          currentPeriodEnd
          lineItems {
            id
            plan {
              pricingDetails {
                ... on AppRecurringPricing {
                  price {
                    amount
                    currencyCode
                  }
                  interval
                }
              }
            }
          }
        }
      }`,
    {
      variables: { id: dbSubscription.shopifySubscriptionId },
    }
  );

  const data = await response.json();
  const subscription = data.data?.appSubscription;

  if (subscription) {
    await prisma.subscription.update({
      where: { shop },
      data: {
        status: subscription.status.toLowerCase(),
        currentPeriodEnd: new Date(subscription.currentPeriodEnd),
      },
    });
  }

  return subscription;
}

export async function cancelSubscription(admin: any, shop: string) {
  const dbSubscription = await getSubscription(shop);
  if (!dbSubscription?.shopifySubscriptionId) return null;

  const response = await admin.graphql(
    `#graphql
      mutation appSubscriptionCancel($id: ID!) {
        appSubscriptionCancel(id: $id) {
          appSubscription {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: { id: dbSubscription.shopifySubscriptionId },
    }
  );

  const data = await response.json();
  const subscription = data.data?.appSubscriptionCancel?.appSubscription;

  if (subscription) {
    await prisma.subscription.update({
      where: { shop },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
      },
    });
  }

  return subscription;
}

