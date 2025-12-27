import {
  json,
  redirect,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "@remix-run/node";
import { useLoaderData, Form, useFetcher, useNavigation } from "@remix-run/react";
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
  DataTable,
  Modal,
  TextField,
  Checkbox,
  EmptyState,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import {
  getLanguages,
  createLanguage,
  deleteLanguage,
  updateLanguage,
} from "../services/language.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const languages = await getLanguages(session.shop);

  return json({ languages });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action") as string;

  if (action === "create") {
    const code = formData.get("code") as string;
    const name = formData.get("name") as string;
    const isDefault = formData.get("isDefault") === "true";

    try {
      await createLanguage({
        code,
        name,
        shop: session.shop,
        isDefault,
      });
      return json({ success: true });
    } catch (error: any) {
      return json({ error: error.message }, { status: 400 });
    }
  }

  if (action === "delete") {
    const code = formData.get("code") as string;
    try {
      await deleteLanguage(session.shop, code);
      return json({ success: true });
    } catch (error: any) {
      return json({ error: error.message }, { status: 400 });
    }
  }

  if (action === "setDefault") {
    const code = formData.get("code") as string;
    try {
      await updateLanguage(session.shop, code, { isDefault: true });
      return json({ success: true });
    } catch (error: any) {
      return json({ error: error.message }, { status: 400 });
    }
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

export default function Languages() {
  const { languages } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const navigation = useNavigation();
  const [modalActive, setModalActive] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const isLoading = navigation.state === "loading" || fetcher.state === "submitting";

  const rows = languages.map((lang) => [
    lang.name,
    lang.code.toUpperCase(),
    lang.isDefault ? (
      <Badge status="success">Default</Badge>
    ) : (
      <fetcher.Form method="post" key={lang.code}>
        <input type="hidden" name="action" value="setDefault" />
        <input type="hidden" name="code" value={lang.code} />
        <Button submit plain size="micro">
          Set as default
        </Button>
      </fetcher.Form>
    ),
    <fetcher.Form method="post" key={`delete-${lang.code}`}>
      <input type="hidden" name="action" value="delete" />
      <input type="hidden" name="code" value={lang.code} />
      <Button submit destructive plain size="micro">
        Delete
      </Button>
    </fetcher.Form>,
  ]);

  const handleSubmit = () => {
    const form = document.createElement("form");
    form.method = "post";
    form.innerHTML = `
      <input type="hidden" name="action" value="create" />
      <input type="hidden" name="code" value="${code}" />
      <input type="hidden" name="name" value="${name}" />
      <input type="hidden" name="isDefault" value="${isDefault}" />
    `;
    document.body.appendChild(form);
    form.submit();
  };

  return (
    <Page>
      <TitleBar
        title="Languages"
        primaryAction={{
          content: "Add Language",
          onAction: () => setModalActive(true),
        }}
      />
      <Layout>
        <Layout.Section>
          {languages.length === 0 ? (
            <Card>
              <EmptyState
                heading="No languages configured"
                action={{
                  content: "Add Language",
                  onAction: () => setModalActive(true),
                }}
              >
                <p>Add languages to start translating your content.</p>
              </EmptyState>
            </Card>
          ) : (
            <Card>
              <DataTable
                columnContentTypes={["text", "text", "text", "text"]}
                headings={["Name", "Code", "Default", "Actions"]}
                rows={rows}
              />
            </Card>
          )}

          {fetcher.data?.error && (
            <Banner status="critical" onDismiss={() => {}}>
              {fetcher.data.error}
            </Banner>
          )}

          {fetcher.data?.success && (
            <Banner status="success" onDismiss={() => {}}>
              Operation completed successfully
            </Banner>
          )}

          <Modal
            open={modalActive}
            onClose={() => setModalActive(false)}
            title="Add Language"
            primaryAction={{
              content: "Add",
              onAction: handleSubmit,
              loading: isLoading,
            }}
            secondaryActions={[
              {
                content: "Cancel",
                onAction: () => setModalActive(false),
              },
            ]}
          >
            <Modal.Section>
              <BlockStack gap="400">
                <TextField
                  label="Language Code"
                  value={code}
                  onChange={setCode}
                  helpText="ISO 639-1 code (e.g., 'en', 'fr', 'es')"
                  autoComplete="off"
                />
                <TextField
                  label="Language Name"
                  value={name}
                  onChange={setName}
                  helpText="Display name (e.g., 'English', 'French', 'Spanish')"
                  autoComplete="off"
                />
                <Checkbox
                  label="Set as default language"
                  checked={isDefault}
                  onChange={setIsDefault}
                />
              </BlockStack>
            </Modal.Section>
          </Modal>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

