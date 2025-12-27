import {
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "@remix-run/node";
import { useLoaderData, Form, useFetcher } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  Text,
  Button,
  Banner,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { useEffect } from "react";
import { authenticate } from "../shopify.server";
import {
  createSubscription,
  SUBSCRIPTION_PLANS,
} from "../services/billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const planId = url.searchParams.get("plan");

  if (!planId) {
    throw new Response("Plan not found", { status: 404 });
  }

  const plan = SUBSCRIPTION_PLANS.find((p: any) => p.id === planId);
  if (!plan) {
    throw new Response("Invalid plan", { status: 400 });
  }

  return json({ plan });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const planId = formData.get("planId") as string;

  try {
    const { confirmationUrl } = await createSubscription(
      admin,
      session.shop,
      planId
    );

    // Return the confirmation URL so we can redirect using App Bridge
    return json({ confirmationUrl, success: true });
  } catch (error: any) {
    return json({ error: error.message }, { status: 400 });
  }
};

export default function Checkout() {
  const { plan } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const appBridge = useAppBridge();

  // Handle redirect when confirmation URL is received
  useEffect(() => {
    if (fetcher.data && 'confirmationUrl' in fetcher.data && fetcher.data.confirmationUrl) {
      // The confirmationUrl from Shopify is already authenticated for the current shop
      // Redirect to it - it will handle the subscription confirmation
      // Using top to break out of iframe if needed
      if (window.top) {
        window.top.location.href = fetcher.data.confirmationUrl;
      } else {
        window.location.href = fetcher.data.confirmationUrl;
      }
    }
  }, [fetcher.data]);

  return (
    <Page>
      <TitleBar title="Complete Subscription" />
      <Card>
        <fetcher.Form method="post">
          <input type="hidden" name="planId" value={plan.id} />
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Review Your Plan
            </Text>
            <Banner tone="info">
              You'll be redirected to Shopify to complete your subscription
            </Banner>
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd">
                <strong>Plan:</strong> {plan.name}
              </Text>
              <Text as="p" variant="bodyMd">
                <strong>Price:</strong> ${plan.price.toFixed(2)}/month
              </Text>
              {plan.trialDays && (
                <Text as="p" variant="bodyMd" tone="success">
                  <strong>Free Trial:</strong> {plan.trialDays} days
                </Text>
              )}
            </BlockStack>
            <Button 
              submit 
              variant="primary"
              loading={fetcher.state === "submitting"}
            >
              Continue to Checkout
            </Button>
            {fetcher.data && 'error' in fetcher.data && (
              <Banner tone="critical">
                {String(fetcher.data.error)}
              </Banner>
            )}
          </BlockStack>
        </fetcher.Form>
      </Card>
    </Page>
  );
}

