export interface TranslatableField {
  field: string;
  value: string;
  type: "text" | "html" | "metafield";
}

export interface TranslatableResource {
  id: string;
  type: "product" | "collection" | "page" | "blog";
  title: string;
  fields: TranslatableField[];
}

export async function fetchProduct(admin: any, productId: string) {
  const response = await admin.graphql(
    `#graphql
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          description
          handle
          metafields(first: 50) {
            edges {
              node {
                id
                key
                namespace
                value
                type
              }
            }
          }
        }
      }`,
    {
      variables: { id: productId },
    }
  );

  const data = await response.json();
  const product = data.data?.product;

  if (!product) return null;

  const fields: TranslatableField[] = [
    { field: "title", value: product.title || "", type: "text" },
    { field: "description", value: product.description || "", type: "html" },
    { field: "handle", value: product.handle || "", type: "text" },
  ];

  // Add metafields
  if (product.metafields?.edges) {
    for (const edge of product.metafields.edges) {
      const metafield = edge.node;
      fields.push({
        field: `metafield.${metafield.namespace}.${metafield.key}`,
        value: metafield.value || "",
        type: metafield.type === "single_line_text_field" ? "text" : "html",
      });
    }
  }

  return {
    id: product.id,
    type: "product" as const,
    title: product.title,
    fields,
  };
}

export async function fetchProducts(admin: any, limit: number = 50) {
  const response = await admin.graphql(
    `#graphql
      query getProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              description
              handle
            }
          }
        }
      }`,
    {
      variables: { first: limit },
    }
  );

  const data = await response.json();
  return data.data?.products?.edges?.map((edge: any) => ({
    id: edge.node.id,
    type: "product" as const,
    title: edge.node.title,
    fields: [
      { field: "title", value: edge.node.title || "", type: "text" },
      {
        field: "description",
        value: edge.node.description || "",
        type: "html",
      },
      { field: "handle", value: edge.node.handle || "", type: "text" },
    ],
  })) || [];
}

export async function fetchCollection(admin: any, collectionId: string) {
  const response = await admin.graphql(
    `#graphql
      query getCollection($id: ID!) {
        collection(id: $id) {
          id
          title
          description
          handle
        }
      }`,
    {
      variables: { id: collectionId },
    }
  );

  const data = await response.json();
  const collection = data.data?.collection;

  if (!collection) return null;

  return {
    id: collection.id,
    type: "collection" as const,
    title: collection.title,
    fields: [
      { field: "title", value: collection.title || "", type: "text" },
      {
        field: "description",
        value: collection.description || "",
        type: "html",
      },
      { field: "handle", value: collection.handle || "", type: "text" },
    ],
  };
}

export async function fetchPage(admin: any, pageId: string) {
  const response = await admin.graphql(
    `#graphql
      query getPage($id: ID!) {
        page(id: $id) {
          id
          title
          body
          handle
        }
      }`,
    {
      variables: { id: pageId },
    }
  );

  const data = await response.json();
  const page = data.data?.page;

  if (!page) return null;

  return {
    id: page.id,
    type: "page" as const,
    title: page.title,
    fields: [
      { field: "title", value: page.title || "", type: "text" },
      { field: "body", value: page.body || "", type: "html" },
      { field: "handle", value: page.handle || "", type: "text" },
    ],
  };
}

