import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  InlineStack,
  Badge,
  ProgressBar,
  Button,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getSubscription } from "../services/billing.server";
import { getTranslationStats } from "../services/translation.server";
import { getLanguages } from "../services/language.server";
import { getUsageStats } from "../services/usage.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [subscription, stats, languages, usage] = await Promise.all([
    getSubscription(shop),
    getTranslationStats(shop),
    getLanguages(shop),
    getUsageStats(shop),
  ]);

  return json({
    subscription,
    stats,
    languages,
    usage,
  });
};

export default function Index() {
  const { subscription, stats, languages, usage } = useLoaderData<typeof loader>();

  const publishedCount = stats.byStatus.published || 0;
  const draftCount = stats.byStatus.draft || 0;
  const totalCount = stats.total;
  const completionPercentage =
    totalCount > 0 ? Math.round((publishedCount / totalCount) * 100) : 0;

  return (
    <Page>
      <TitleBar title="Translation Dashboard" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              {/* Subscription Status */}
              {subscription ? (
                <Card>
                  <BlockStack gap="300">
                    <InlineStack align="space-between">
                      <Text as="h2" variant="headingMd">
                        Subscription
                      </Text>
                      <Badge
                        tone={
                          subscription.status === "active"
                            ? "success"
                            : "attention"
                        }
                      >
                        {subscription.status}
                      </Badge>
                    </InlineStack>
                    <Text as="p" variant="bodyMd">
                      Current Plan: <strong>{subscription.planName}</strong>
                    </Text>
                    {subscription.currentPeriodEnd && (
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Renews:{" "}
                        {new Date(
                          subscription.currentPeriodEnd
                        ).toLocaleDateString()}
                      </Text>
                    )}
                    <Button url="/app/subscription/manage" variant="plain">
                      Manage Subscription
                    </Button>
                  </BlockStack>
                </Card>
              ) : (
                <Banner tone="warning">
                  No active subscription.{" "}
                  <a href="/app/subscription/plans">Choose a plan</a> to get
                  started.
                </Banner>
              )}

              {/* Translation Stats */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Translation Overview
                  </Text>
                  <BlockStack gap="300">
                    <InlineStack align="space-between">
                      <Text as="p" variant="bodyMd">
                        Total Translations
                      </Text>
                      <Text as="p" variant="headingMd">
                        {totalCount}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="p" variant="bodyMd">
                        Published
                      </Text>
                      <Text as="p" variant="bodyMd">
                        {publishedCount}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="p" variant="bodyMd">
                        Draft
                      </Text>
                      <Text as="p" variant="bodyMd">
                        {draftCount}
                      </Text>
                    </InlineStack>
                    <ProgressBar progress={completionPercentage} />
                    <Text as="p" variant="bodyMd" tone="subdued">
                      {completionPercentage}% published
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Usage Stats */}
              {usage.limits && (
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      Usage This Month
                    </Text>
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <Text as="p" variant="bodyMd">
                          Languages
                        </Text>
                        <Text as="p" variant="bodyMd">
                          {usage.usage.languagesCount} /{" "}
                          {usage.limits.maxLanguages === -1
                            ? "∞"
                            : usage.limits.maxLanguages}
                        </Text>
                      </InlineStack>
                      <InlineStack align="space-between">
                        <Text as="p" variant="bodyMd">
                          Translations
                        </Text>
                        <Text as="p" variant="bodyMd">
                          {usage.usage.translationsCount} /{" "}
                          {usage.limits.maxTranslations === -1
                            ? "∞"
                            : usage.limits.maxTranslations}
                        </Text>
                      </InlineStack>
                    </BlockStack>
                  </BlockStack>
                </Card>
              )}

              {/* Languages */}
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between">
                    <Text as="h2" variant="headingMd">
                      Languages
                    </Text>
                    <Button url="/app/languages" variant="plain">
                      Manage
                    </Button>
                  </InlineStack>
                  <Text as="p" variant="bodyMd">
                    {languages.length} language{languages.length !== 1 ? "s" : ""}{" "}
                    configured
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Quick Actions
                </Text>
                <Button url="/app/translations/select" fullWidth variant="primary">
                  New Translation
                </Button>
                <Button url="/app/translations" fullWidth>
                  View All Translations
                </Button>
                <Button url="/app/languages" fullWidth>
                  Add Language
                </Button>
                <Button url="/app/subscription/plans" fullWidth>
                  Upgrade Plan
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
