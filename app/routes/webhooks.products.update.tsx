import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, topic, shop } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  // Handle product update
  // You can sync translations or mark them as needing update
  // For now, just log
  console.log("Product updated:", payload);

  return new Response();
};

