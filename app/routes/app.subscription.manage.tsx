import {
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "@remix-run/node";
import { useLoaderData, Form, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  Banner,
  InlineStack,
  Badge,
  Divider,
  List,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  getSubscription,
  cancelSubscription,
  checkSubscriptionStatus,
} from "../services/billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const subscription = await getSubscription(session.shop);

  if (subscription?.shopifySubscriptionId) {
    await checkSubscriptionStatus(admin, session.shop);
  }

  return json({ subscription: await getSubscription(session.shop) });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action") as string;

  if (action === "cancel") {
    await cancelSubscription(admin, session.shop);
    return json({ success: true, message: "Subscription cancelled" });
  }

  return json({ success: false });
};

export default function ManageSubscription() {
  const { subscription } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  if (!subscription) {
    return (
      <Page>
        <TitleBar title="Subscription" />
        <Card>
          <Banner tone="info">
            You don't have an active subscription.{" "}
            <a href="/app/subscription/plans">Choose a plan</a>
          </Banner>
        </Card>
      </Page>
    );
  }

  const isActive = subscription.status === "active";
  const isCancelled = subscription.status === "cancelled";

  return (
    <Page>
      <TitleBar title="Manage Subscription" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    {subscription.planName}
                  </Text>
                  <Badge tone={isActive ? "success" : "attention"}>
                    {subscription.status}
                  </Badge>
                </BlockStack>
                {isActive && (
                  <Button url="/app/subscription/plans">Change Plan</Button>
                )}
              </InlineStack>

              <Divider />

              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">
                  Subscription Details
                </Text>
                <List>
                  <List.Item>
                    <strong>Status:</strong> {subscription.status}
                  </List.Item>
                  {subscription.currentPeriodEnd && (
                    <List.Item>
                      <strong>Renews:</strong>{" "}
                      {new Date(
                        subscription.currentPeriodEnd
                      ).toLocaleDateString()}
                    </List.Item>
                  )}
                  {subscription.trialEndsAt && (
                    <List.Item>
                      <strong>Trial ends:</strong>{" "}
                      {new Date(subscription.trialEndsAt).toLocaleDateString()}
                    </List.Item>
                  )}
                </List>
              </BlockStack>

              {subscription.usageLimits && (
                <>
                  <Divider />
                  <BlockStack gap="300">
                    <Text as="h3" variant="headingSm">
                      Plan Features
                    </Text>
                    <List>
                      <List.Item>
                        {subscription.usageLimits.maxLanguages === -1
                          ? "Unlimited languages"
                          : `${subscription.usageLimits.maxLanguages} languages`}
                      </List.Item>
                      <List.Item>
                        {subscription.usageLimits.maxTranslations === -1
                          ? "Unlimited translations"
                          : `Up to ${subscription.usageLimits.maxTranslations} translations`}
                      </List.Item>
                      {subscription.usageLimits.autoTranslate && (
                        <List.Item>Auto-translation enabled</List.Item>
                      )}
                      {subscription.usageLimits.translationMemory && (
                        <List.Item>Translation memory enabled</List.Item>
                      )}
                    </List>
                  </BlockStack>
                </>
              )}

              {isActive && !isCancelled && (
                <>
                  <Divider />
                  <fetcher.Form method="post">
                    <input type="hidden" name="action" value="cancel" />
                    <Button
                      submit
                      variant="plain"
                      tone="critical"
                      loading={fetcher.state === "submitting"}
                    >
                      Cancel Subscription
                    </Button>
                  </fetcher.Form>
                </>
              )}

              {fetcher.data && 'success' in fetcher.data && fetcher.data.success && (
                <Banner tone="success">{'message' in fetcher.data ? String(fetcher.data.message) : 'Success'}</Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

