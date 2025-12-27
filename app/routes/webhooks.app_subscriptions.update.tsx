import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, topic, shop } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  const subscription = payload as any;

  await prisma.subscription.update({
    where: { shop },
    data: {
      status: subscription.status?.toLowerCase() || "active",
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end)
        : undefined,
      currentPeriodStart: subscription.current_period_start
        ? new Date(subscription.current_period_start)
        : undefined,
    },
  });

  return new Response();
};

