import { getTranslations } from "./translation.server";

export async function syncTranslationToShopify(
  admin: any,
  shop: string,
  resourceType: string,
  resourceId: string,
  languageCode: string,
  marketId?: string
) {
  const translations = await getTranslations(shop, resourceType, resourceId, marketId);
  const languageTranslations = translations.filter(
    (t: any) => t.languageCode === languageCode && t.status === "published"
  );

  if (languageTranslations.length === 0) {
    return { success: false, message: "No published translations found" };
  }

  try {
    if (resourceType === "product") {
      return await syncProductTranslation(
        admin,
        resourceId,
        languageTranslations,
        marketId
      );
    } else if (resourceType === "collection") {
      return await syncCollectionTranslation(
        admin,
        resourceId,
        languageTranslations,
        marketId
      );
    } else if (resourceType === "page") {
      return await syncPageTranslation(admin, resourceId, languageTranslations, marketId);
    }

    return { success: false, message: "Unsupported resource type" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

async function syncProductTranslation(
  admin: any,
  productId: string,
  translations: any[]
) {
  const titleTranslation = translations.find((t) => t.field === "title");
  const descriptionTranslation = translations.find(
    (t) => t.field === "description"
  );

  const updates: any = {};

  if (titleTranslation) {
    updates.title = titleTranslation.translatedValue;
  }

  if (descriptionTranslation) {
    updates.descriptionHtml = descriptionTranslation.translatedValue;
  }

  if (Object.keys(updates).length === 0) {
    return { success: false, message: "No translatable fields found" };
  }

  // For now, we'll use metafields or a simpler approach
  // Product updates via GraphQL can be complex - this is a simplified version
  const response = await admin.graphql(
    `#graphql
      mutation productUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            title
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        input: {
          id: productId,
          ...(updates.title && { title: updates.title }),
          ...(updates.descriptionHtml && { descriptionHtml: updates.descriptionHtml }),
        },
      },
    }
  );

  const data = await response.json();
  const errors = data.data?.productUpdate?.userErrors || [];

  if (errors.length > 0) {
    return {
      success: false,
      message: errors.map((e: any) => e.message).join(", "),
    };
  }

  return { success: true, message: "Product translation synced" };
}

async function syncCollectionTranslation(
  admin: any,
  collectionId: string,
  translations: any[]
) {
  const titleTranslation = translations.find((t) => t.field === "title");
  const descriptionTranslation = translations.find(
    (t) => t.field === "description"
  );

  const updates: any = {};

  if (titleTranslation) {
    updates.title = titleTranslation.translatedValue;
  }

  if (descriptionTranslation) {
    updates.descriptionHtml = descriptionTranslation.translatedValue;
  }

  if (Object.keys(updates).length === 0) {
    return { success: false, message: "No translatable fields found" };
  }

  const response = await admin.graphql(
    `#graphql
      mutation collectionUpdate($input: CollectionInput!) {
        collectionUpdate(input: $input) {
          collection {
            id
            title
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        input: {
          id: collectionId,
          ...updates,
        },
      },
    }
  );

  const data = await response.json();
  const errors = data.data?.collectionUpdate?.userErrors || [];

  if (errors.length > 0) {
    return {
      success: false,
      message: errors.map((e: any) => e.message).join(", "),
    };
  }

  return { success: true, message: "Collection translation synced" };
}

async function syncPageTranslation(
  admin: any,
  pageId: string,
  translations: any[],
  marketId?: string
) {
  const titleTranslation = translations.find((t) => t.field === "title");
  const bodyTranslation = translations.find((t) => t.field === "body");

  const updates: any = {};

  if (titleTranslation) {
    updates.title = titleTranslation.translatedValue;
  }

  if (bodyTranslation) {
    updates.body = bodyTranslation.translatedValue;
  }

  if (Object.keys(updates).length === 0) {
    return { success: false, message: "No translatable fields found" };
  }

  // For pages with market context, we can use metafields or market-specific content
  // For now, we'll update the page directly. In the future, this could use
  // Shopify's localization features for market-specific content
  
  const response = await admin.graphql(
    `#graphql
      mutation pageUpdate($id: ID!, $page: PageUpdateInput!) {
        pageUpdate(id: $id, page: $page) {
          page {
            id
            title
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        id: pageId,
        page: updates,
      },
    }
  );

  const data = await response.json();
  const errors = data.data?.pageUpdate?.userErrors || [];

  if (errors.length > 0) {
    return {
      success: false,
      message: errors.map((e: any) => e.message).join(", "),
    };
  }

  const marketInfo = marketId ? ` for market ${marketId}` : "";
  return { success: true, message: `Page translation synced${marketInfo}` };
}

