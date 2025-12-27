import {
  json,
  redirect,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  Text,
  Button,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../../shopify.server";
import {
  createSubscription,
  SUBSCRIPTION_PLANS,
} from "../../services/billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const planId = url.searchParams.get("plan");

  if (!planId) {
    throw new Response("Plan not found", { status: 404 });
  }

  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
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

    return redirect(confirmationUrl);
  } catch (error: any) {
    return json({ error: error.message }, { status: 400 });
  }
};

export default function Checkout() {
  const { plan } = useLoaderData<typeof loader>();

  return (
    <Page>
      <TitleBar title="Complete Subscription" />
      <Card>
        <Form method="post">
          <input type="hidden" name="planId" value={plan.id} />
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Review Your Plan
            </Text>
            <Banner status="info">
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
            <Button submit primary>
              Continue to Checkout
            </Button>
          </BlockStack>
        </Form>
      </Card>
    </Page>
  );
}

