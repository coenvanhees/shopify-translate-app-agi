import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  ResourceList,
  Badge,
  EmptyState,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const resourceType = url.searchParams.get("resourceType") || "all";
  const languageCode = url.searchParams.get("language") || "all";
  const status = url.searchParams.get("status") || "all";

  const where: any = { shop: session.shop };

  if (resourceType !== "all") {
    where.resourceType = resourceType;
  }

  if (languageCode !== "all") {
    where.languageCode = languageCode;
  }

  if (status !== "all") {
    where.status = status;
  }

  const translations = await prisma.translation.findMany({
    where,
    include: {
      language: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 50,
  });

  const languages = await prisma.language.findMany({
    where: { shop: session.shop },
  });

  return json({
    translations,
    languages,
    filters: { resourceType, languageCode, status },
  });
};

export default function Translations() {
  const { translations, languages } = useLoaderData<typeof loader>();

  const resourceItem = (item: any) => {
    const { id, resourceType, resourceId, field, languageCode, status, language } = item;

    return {
      id,
      url: `/app/translations/${resourceType}/${resourceId}?language=${languageCode}`,
      media: <Badge status={status === "published" ? "success" : "attention"}>
        {status}
      </Badge>,
      accessibilityLabel: `${resourceType} ${field} in ${language.name}`,
      name: (
        <BlockStack gap="100">
          <Text as="span" variant="bodyMd" fontWeight="semibold">
            {resourceType} - {field}
          </Text>
          <Text as="span" variant="bodySm" tone="subdued">
            {language.name} ({languageCode})
          </Text>
        </BlockStack>
      ),
    };
  };

  return (
    <Page>
      <TitleBar title="Translations" />
      <Layout>
        <Layout.Section>
          {translations.length === 0 ? (
            <Card>
              <EmptyState
                heading="No translations found"
                action={{
                  content: "Start Translating",
                  url: "/app",
                }}
              >
                <p>Create translations for your products, collections, and pages.</p>
              </EmptyState>
            </Card>
          ) : (
            <Card>
              <ResourceList
                resourceName={{ singular: "translation", plural: "translations" }}
                items={translations}
                renderItem={resourceItem}
              />
            </Card>
          )}
        </Layout.Section>
      </Layout>
    </Page>
  );
}

