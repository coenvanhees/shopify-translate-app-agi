import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  Select,
  InlineStack,
  Banner,
  List,
  Divider,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import { fetchProducts, fetchCollections, fetchPages } from "../services/shopify-content.server";
import { fetchMarkets } from "../services/markets.server";
import { syncMarkets } from "../services/market-sync.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const resourceType = url.searchParams.get("type") || "page"; // Default to pages

  // Fetch resources based on type
  let resources: any[] = [];
  if (resourceType === "product") {
    resources = await fetchProducts(admin, 50);
  } else if (resourceType === "collection") {
    resources = await fetchCollections(admin, 50);
  } else if (resourceType === "page") {
    resources = await fetchPages(admin, 50);
  }

  // Sync and fetch markets
  await syncMarkets(admin, session.shop);
  const markets = await fetchMarkets(admin);

  return json({
    resources,
    markets,
    resourceType,
  });
};

export default function SelectResource() {
  const { resources, markets, resourceType } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [selectedResource, setSelectedResource] = useState("");
  const [selectedMarket, setSelectedMarket] = useState("");

  const handleTranslate = () => {
    if (selectedResource && selectedMarket) {
      navigate(
        `/app/translations/${resourceType}/${selectedResource}?market=${selectedMarket}`
      );
    }
  };

  const resourceOptions = resources.map((resource) => ({
    label: resource.title,
    value: resource.id,
  }));

  const marketOptions = markets.map((market) => ({
    label: `${market.name} ${market.enabled ? "" : "(Disabled)"}`,
    value: market.id,
  }));

  return (
    <Page>
      <TitleBar title="Translate Page for Market" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <BlockStack gap="200">
                <Text as="h2" variant="headingLg">
                  Translate a Page for Your Shopify Market
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Select a page from your store and choose the market you want to translate it for. 
                  Translations will be connected to your Shopify market.
                </Text>
              </BlockStack>

              <Divider />

              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Step 1: Select a Page from Your Store
                </Text>
                <Select
                  label="Choose a page"
                  options={[
                    { label: "Select a page...", value: "" },
                    ...resourceOptions,
                  ]}
                  value={selectedResource}
                  onChange={setSelectedResource}
                  helpText="Select the page you want to translate"
                />
                {selectedResource && (
                  <Banner tone="info">
                    Selected: {resources.find((r) => r.id === selectedResource)?.title}
                  </Banner>
                )}
              </BlockStack>

              <Divider />

              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Step 2: Select Your Shopify Market
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Choose the market where this translated page will be available. 
                  The translation will be connected to this market.
                </Text>
                <Select
                  label="Shopify Market"
                  options={[
                    { label: "Select a market...", value: "" },
                    ...marketOptions.filter((m) => m.value && markets.find((mk) => mk.id === m.value)?.enabled),
                  ]}
                  value={selectedMarket}
                  onChange={setSelectedMarket}
                  helpText="Only enabled markets are shown"
                />
                {selectedMarket && (
                  <Banner tone="success">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      Market: {markets.find((m) => m.id === selectedMarket)?.name}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Translations will be applied to this market
                    </Text>
                  </Banner>
                )}
              </BlockStack>

              <Divider />

              <Button
                variant="primary"
                onClick={handleTranslate}
                disabled={!selectedResource || !selectedMarket}
                fullWidth
                size="large"
              >
                Start Translating for Market
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                How It Works
              </Text>
              <List>
                <List.Item>
                  Select a page from your Shopify store
                </List.Item>
                <List.Item>
                  Choose the Shopify market for your translation
                </List.Item>
                <List.Item>
                  Use AI to auto-translate or translate manually
                </List.Item>
                <List.Item>
                  Review and publish your translations
                </List.Item>
                <List.Item>
                  Translations are synced to your Shopify market
                </List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

