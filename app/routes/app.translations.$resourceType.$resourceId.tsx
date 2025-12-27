import {
  json,
  redirect,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "@remix-run/node";
import { useLoaderData, Form, useFetcher, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  TextField,
  Banner,
  InlineStack,
  Select,
  Divider,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { useState, useEffect } from "react";
import { authenticate } from "../shopify.server";
import {
  getTranslations,
  createTranslation,
  updateTranslation,
} from "../services/translation.server";
import { fetchProduct, fetchCollection, fetchPage } from "../services/shopify-content.server";
import { getLanguages } from "../services/language.server";
import { syncTranslationToShopify } from "../services/sync.server";
import { fetchMarkets, getMarket } from "../services/markets.server";
import { translateText } from "../services/ai-translate.server";
import { syncMarkets } from "../services/market-sync.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { resourceType, resourceId } = params;
  const url = new URL(request.url);
  const languageCode = url.searchParams.get("language") || "";
  const marketId = url.searchParams.get("market") || "";

  if (!resourceType || !resourceId) {
    throw new Response("Invalid resource", { status: 400 });
  }

  // Fetch Shopify resource
  let resource = null;
  if (resourceType === "product") {
    resource = await fetchProduct(admin, resourceId);
  } else if (resourceType === "collection") {
    resource = await fetchCollection(admin, resourceId);
  } else if (resourceType === "page") {
    resource = await fetchPage(admin, resourceId);
  }

  if (!resource) {
    throw new Response("Resource not found", { status: 404 });
  }

  // Get existing translations
  const translations = await getTranslations(
    session.shop,
    resourceType,
    resourceId,
    marketId || undefined
  );

  // Get languages
  const languages = await getLanguages(session.shop);

  // Sync and fetch markets
  await syncMarkets(admin, session.shop);
  const markets = await fetchMarkets(admin);
  const selectedMarket = marketId ? await getMarket(admin, marketId) : null;

  return json({
    resource,
    translations,
    languages,
    markets,
    selectedMarket,
    selectedLanguage: languageCode || languages[0]?.code || "",
    marketId: marketId || null,
  });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { resourceType, resourceId } = params;
  const formData = await request.formData();
  const action = formData.get("action") as string;

  if (!resourceType || !resourceId) {
    throw new Response("Invalid resource", { status: 400 });
  }

  if (action === "save") {
    const field = formData.get("field") as string;
    const languageCode = formData.get("languageCode") as string;
    const marketId = formData.get("marketId") as string;
    const translatedValue = formData.get("translatedValue") as string;
    const status = formData.get("status") as string;
    const autoTranslated = formData.get("autoTranslated") === "true";

    await createTranslation({
      resourceType,
      resourceId,
      field,
      languageCode,
      marketId: marketId || undefined,
      translatedValue,
      shop: session.shop,
      status: status || "draft",
      autoTranslated,
    });

    return json({ success: true });
  }

  if (action === "ai-translate") {
    const field = formData.get("field") as string;
    const sourceLanguage = formData.get("sourceLanguage") as string;
    const targetLanguage = formData.get("targetLanguage") as string;
    const sourceText = formData.get("sourceText") as string;
    const marketId = formData.get("marketId") as string;

    try {
      const result = await translateText({
        sourceLanguage,
        targetLanguage,
        text: sourceText,
        context: `${resourceType} ${field}`,
      });

      // Save the AI-translated text
      await createTranslation({
        resourceType,
        resourceId,
        field,
        languageCode: targetLanguage,
        marketId: marketId || undefined,
        translatedValue: result.translatedText,
        shop: session.shop,
        status: "draft",
        autoTranslated: true,
      });

      return json({ success: true, translatedText: result.translatedText });
    } catch (error: any) {
      return json({ error: error.message }, { status: 400 });
    }
  }

  if (action === "sync") {
    const languageCode = formData.get("languageCode") as string;
    const marketId = formData.get("marketId") as string;
    const result = await syncTranslationToShopify(
      admin,
      session.shop,
      resourceType,
      resourceId,
      languageCode,
      marketId || undefined
    );

    return json(result);
  }

  return json({ success: false });
};

export default function TranslationEditor() {
  const { resource, translations, languages, markets, selectedMarket, marketId, selectedLanguage } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const appBridge = useAppBridge();
  const navigate = useNavigate();

  const [currentLanguage, setCurrentLanguage] = useState(selectedLanguage);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("draft");
  const [translatingField, setTranslatingField] = useState<string | null>(null);

  useEffect(() => {
    // Load existing translations for current language
    const langTranslations = translations.filter(
      (t: any) => t.languageCode === currentLanguage
    );
    const values: Record<string, string> = {};
    langTranslations.forEach((t: any) => {
      values[t.field] = t.translatedValue;
      if (t.status === "published") {
        setStatus("published");
      }
    });
    setFieldValues(values);
  }, [currentLanguage, translations]);

  const handleSave = (field: string) => {
    const formData = new FormData();
    formData.append("action", "save");
    formData.append("field", field);
    formData.append("languageCode", currentLanguage);
    formData.append("marketId", marketId || "");
    formData.append("translatedValue", fieldValues[field] || "");
    formData.append("status", status);
    formData.append("autoTranslated", "false");
    fetcher.submit(formData, { method: "post" });
  };

  const handleAITranslate = async (field: any) => {
    setTranslatingField(field.field);
    const defaultLanguage = languages.find((l: any) => l.isDefault) || languages[0];
    
    const formData = new FormData();
    formData.append("action", "ai-translate");
    formData.append("field", field.field);
    formData.append("sourceLanguage", defaultLanguage?.code || "en");
    formData.append("targetLanguage", currentLanguage);
    formData.append("sourceText", field.value);
    formData.append("marketId", marketId || "");
    fetcher.submit(formData, { method: "post" });
  };

  const handleSync = () => {
    const formData = new FormData();
    formData.append("action", "sync");
    formData.append("languageCode", currentLanguage);
    formData.append("marketId", marketId || "");
    fetcher.submit(formData, { method: "post" });
  };

  useEffect(() => {
    if (fetcher.data && 'success' in fetcher.data && fetcher.data.success) {
      if ('translatedText' in fetcher.data) {
        // AI translation completed
        const field = translatingField;
        if (field) {
          setFieldValues({ ...fieldValues, [field]: fetcher.data.translatedText });
          setTranslatingField(null);
          appBridge.toast.show("AI translation completed");
        }
      } else {
        appBridge.toast.show("Translation saved successfully");
      }
    }
  }, [fetcher.data, appBridge, translatingField, fieldValues]);

  // Get default language for source
  const defaultLanguage = languages.find((l: any) => l.isDefault) || languages[0];

  return (
    <Page>
      <TitleBar title={`Translate ${resource.type}: ${resource.title}`} />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              {/* Market Information */}
              {selectedMarket && (
                <Banner tone="info">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    Translating for: {selectedMarket.name}
                  </Text>
                  {selectedMarket.languages && selectedMarket.languages.length > 0 && (
                    <Text as="p" variant="bodySm" tone="subdued">
                      Languages: {selectedMarket.languages.map((l: any) => l.name).join(", ")}
                    </Text>
                  )}
                </Banner>
              )}

              <InlineStack gap="300" align="space-between">
                <BlockStack gap="200">
                  <Select
                    label="Target Language"
                    options={languages.map((lang: any) => ({
                      label: lang.name,
                      value: lang.code,
                    }))}
                    value={currentLanguage}
                    onChange={setCurrentLanguage}
                  />
                  {selectedMarket && (
                    <Text as="p" variant="bodySm" tone="subdued">
                      Market: {selectedMarket.name}
                    </Text>
                  )}
                </BlockStack>
                <Button
                  onClick={handleSync}
                  loading={fetcher.state === "submitting"}
                  variant="primary"
                >
                  Sync to Shopify
                </Button>
              </InlineStack>

              <Divider />

              {resource.fields.map((field: any) => (
                <BlockStack key={field.field} gap="200">
                  <Text as="h3" variant="headingSm">
                    {field.field}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Original: {field.value.substring(0, 100)}
                    {field.value.length > 100 ? "..." : ""}
                  </Text>
                  {field.type === "html" ? (
                    <TextField
                      label="Translation"
                      value={fieldValues[field.field] || ""}
                      onChange={(value) =>
                        setFieldValues({ ...fieldValues, [field.field]: value })
                      }
                      multiline={10}
                      helpText={`Translate the ${field.field} field`}
                    />
                  ) : (
                    <TextField
                      label="Translation"
                      value={fieldValues[field.field] || ""}
                      onChange={(value) =>
                        setFieldValues({ ...fieldValues, [field.field]: value })
                      }
                      helpText={`Translate the ${field.field} field`}
                    />
                  )}
                  <InlineStack gap="200" align="space-between">
                    <InlineStack gap="200">
                      <Button
                        onClick={() => handleAITranslate(field)}
                        loading={fetcher.state === "submitting" && translatingField === field.field}
                        variant="secondary"
                      >
                        {translatingField === field.field ? "Translating..." : "🤖 AI Translate"}
                      </Button>
                      <Button
                        onClick={() => handleSave(field.field)}
                        loading={fetcher.state === "submitting" && translatingField !== field.field}
                      >
                        Save
                      </Button>
                      <Select
                        label=""
                        labelHidden
                        options={[
                          { label: "Draft", value: "draft" },
                          { label: "Review", value: "review" },
                          { label: "Published", value: "published" },
                        ]}
                        value={status}
                        onChange={setStatus}
                      />
                    </InlineStack>
                  </InlineStack>
                </BlockStack>
              ))}

              {fetcher.data && 'error' in fetcher.data && (
                <Banner tone="critical">{String(fetcher.data.error)}</Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

