import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  Text,
  Button,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getSubscription } from "../services/billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const subscription = await getSubscription(session.shop);

  return json({ subscription });
};

export default function SubscriptionSuccess() {
  const { subscription } = useLoaderData<typeof loader>();

  return (
    <Page>
      <TitleBar title="Subscription Activated" />
      <Card>
        <BlockStack gap="400">
          <Banner tone="success" title="Subscription Activated!">
            Your {subscription?.planName} plan is now active.
          </Banner>
          <Text as="p" variant="bodyMd">
            You can now start using all the features included in your plan.
          </Text>
          <Button url="/app" variant="primary">
            Go to Dashboard
          </Button>
        </BlockStack>
      </Card>
    </Page>
  );
}

