import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  InlineStack,
  Badge,
  List,
  Divider,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../../shopify.server";
import {
  SUBSCRIPTION_PLANS,
  getSubscription,
} from "../../services/billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const subscription = await getSubscription(session.shop);

  return json({
    plans: SUBSCRIPTION_PLANS,
    currentSubscription: subscription,
  });
};

export default function SubscriptionPlans() {
  const { plans, currentSubscription } = useLoaderData<typeof loader>();

  return (
    <Page>
      <TitleBar title="Choose Your Plan" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Text as="h1" variant="headingLg">
              Translation App Plans
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Select the plan that best fits your translation needs
            </Text>

            <Layout>
              {plans.map((plan) => {
                const isCurrentPlan = currentSubscription?.planId === plan.id;
                const isActive = currentSubscription?.status === "active";

                return (
                  <Layout.Section key={plan.id} variant="oneThird">
                    <Card>
                      <BlockStack gap="400">
                        <InlineStack align="space-between">
                          <Text as="h2" variant="headingMd">
                            {plan.name}
                          </Text>
                          {isCurrentPlan && isActive && (
                            <Badge status="success">Current Plan</Badge>
                          )}
                        </InlineStack>

                        <BlockStack gap="200">
                          <Text as="p" variant="heading2xl">
                            ${plan.price.toFixed(2)}
                            <Text as="span" variant="bodyMd" tone="subdued">
                              /month
                            </Text>
                          </Text>
                          {plan.trialDays && (
                            <Badge>{plan.trialDays} day free trial</Badge>
                          )}
                        </BlockStack>

                        <Divider />

                        <BlockStack gap="300">
                          <List>
                            <List.Item>
                              {plan.features.maxLanguages === -1
                                ? "Unlimited languages"
                                : `${plan.features.maxLanguages} languages`}
                            </List.Item>
                            <List.Item>
                              {plan.features.maxTranslations === -1
                                ? "Unlimited translations"
                                : `Up to ${plan.features.maxTranslations} translations`}
                            </List.Item>
                            <List.Item>
                              {plan.features.maxProducts === -1
                                ? "Unlimited products"
                                : `Up to ${plan.features.maxProducts} products`}
                            </List.Item>
                            {plan.features.autoTranslate && (
                              <List.Item>Auto-translation</List.Item>
                            )}
                            {plan.features.translationMemory && (
                              <List.Item>Translation memory</List.Item>
                            )}
                            {plan.features.prioritySupport && (
                              <List.Item>Priority support</List.Item>
                            )}
                          </List>
                        </BlockStack>

                        <Button
                          primary={!isCurrentPlan}
                          disabled={isCurrentPlan && isActive}
                          url={`/app/subscription/checkout?plan=${plan.id}`}
                        >
                          {isCurrentPlan && isActive
                            ? "Current Plan"
                            : isCurrentPlan
                            ? "Reactivate"
                            : "Get Started"}
                        </Button>
                      </BlockStack>
                    </Card>
                  </Layout.Section>
                );
              })}
            </Layout>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

