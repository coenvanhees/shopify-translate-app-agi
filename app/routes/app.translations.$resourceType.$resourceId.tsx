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
import { authenticate } from "../../shopify.server";
import {
  getTranslations,
  createTranslation,
  updateTranslation,
} from "../../services/translation.server";
import { fetchProduct, fetchCollection, fetchPage } from "../../services/shopify-content.server";
import { getLanguages } from "../../services/language.server";
import { syncTranslationToShopify } from "../../services/sync.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { resourceType, resourceId } = params;
  const url = new URL(request.url);
  const languageCode = url.searchParams.get("language") || "";

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
    resourceId
  );

  // Get languages
  const languages = await getLanguages(session.shop);

  return json({
    resource,
    translations,
    languages,
    selectedLanguage: languageCode || languages[0]?.code || "",
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
    const translatedValue = formData.get("translatedValue") as string;
    const status = formData.get("status") as string;

    await createTranslation({
      resourceType,
      resourceId,
      field,
      languageCode,
      translatedValue,
      shop: session.shop,
      status: status || "draft",
    });

    return json({ success: true });
  }

  if (action === "sync") {
    const languageCode = formData.get("languageCode") as string;
    const result = await syncTranslationToShopify(
      admin,
      session.shop,
      resourceType,
      resourceId,
      languageCode
    );

    return json(result);
  }

  return json({ success: false });
};

export default function TranslationEditor() {
  const { resource, translations, languages, selectedLanguage } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const appBridge = useAppBridge();
  const navigate = useNavigate();

  const [currentLanguage, setCurrentLanguage] = useState(selectedLanguage);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("draft");

  useEffect(() => {
    // Load existing translations for current language
    const langTranslations = translations.filter(
      (t) => t.languageCode === currentLanguage
    );
    const values: Record<string, string> = {};
    langTranslations.forEach((t) => {
      values[t.field] = t.translatedValue;
      if (t.status === "published") {
        setStatus("published");
      }
    });
    setFieldValues(values);
  }, [currentLanguage, translations]);

  const handleSave = (field: string) => {
    const form = document.createElement("form");
    form.method = "post";
    form.innerHTML = `
      <input type="hidden" name="action" value="save" />
      <input type="hidden" name="field" value="${field}" />
      <input type="hidden" name="languageCode" value="${currentLanguage}" />
      <input type="hidden" name="translatedValue" value="${fieldValues[field] || ""}" />
      <input type="hidden" name="status" value="${status}" />
    `;
    document.body.appendChild(form);
    form.submit();
  };

  const handleSync = () => {
    const form = document.createElement("form");
    form.method = "post";
    form.innerHTML = `
      <input type="hidden" name="action" value="sync" />
      <input type="hidden" name="languageCode" value="${currentLanguage}" />
    `;
    document.body.appendChild(form);
    form.submit();
  };

  useEffect(() => {
    if (fetcher.data?.success) {
      appBridge.toast.show("Translation saved successfully");
    }
  }, [fetcher.data, appBridge]);

  return (
    <Page>
      <TitleBar
        title={`Translate ${resource.type}: ${resource.title}`}
        primaryAction={{
          content: "Sync to Shopify",
          onAction: handleSync,
          loading: fetcher.state === "submitting",
        }}
      />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Select
                label="Target Language"
                options={languages.map((lang) => ({
                  label: lang.name,
                  value: lang.code,
                }))}
                value={currentLanguage}
                onChange={setCurrentLanguage}
              />

              <Divider />

              {resource.fields.map((field) => (
                <BlockStack key={field.field} gap="200">
                  <Text as="h3" variant="headingSm">
                    {field.field}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Original: {field.value.substring(0, 100)}
                    {field.value.length > 100 ? "..." : ""}
                  </Text>
                  <TextField
                    label="Translation"
                    value={fieldValues[field.field] || ""}
                    onChange={(value) =>
                      setFieldValues({ ...fieldValues, [field.field]: value })
                    }
                    multiline={field.type === "html" ? 10 : 3}
                    helpText={`Translate the ${field.field} field`}
                  />
                  <InlineStack gap="200">
                    <Button
                      onClick={() => handleSave(field.field)}
                      loading={fetcher.state === "submitting"}
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
                </BlockStack>
              ))}

              {fetcher.data?.error && (
                <Banner status="critical">{fetcher.data.error}</Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

