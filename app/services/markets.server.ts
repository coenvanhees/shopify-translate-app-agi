export interface ShopifyMarket {
  id: string;
  name: string;
  enabled: boolean;
  regions?: Array<{
    name: string;
  }>;
  languages?: Array<{
    code: string;
    name: string;
  }>;
}

export async function fetchMarkets(admin: any): Promise<ShopifyMarket[]> {
  const response = await admin.graphql(
    `#graphql
      query getMarkets {
        markets(first: 50) {
          edges {
            node {
              id
              name
              enabled
            }
          }
        }
      }`
  );

  const data = await response.json();
  const markets = data.data?.markets?.edges || [];

  return markets.map((edge: any) => ({
    id: edge.node.id,
    name: edge.node.name,
    enabled: edge.node.enabled,
    languages: [], // Languages will be fetched separately if needed
  }));
}

export async function getMarket(admin: any, marketId: string): Promise<ShopifyMarket | null> {
  const response = await admin.graphql(
    `#graphql
      query getMarket($id: ID!) {
        market(id: $id) {
          id
          name
          enabled
        }
      }`,
    {
      variables: { id: marketId },
    }
  );

  const data = await response.json();
  const market = data.data?.market;

  if (!market) return null;

  // Fetch market languages separately using the market's localization settings
  // For now, we'll return empty array and can enhance later if needed
  return {
    id: market.id,
    name: market.name,
    enabled: market.enabled,
    languages: [], // Can be populated from market localization settings if needed
  };
}

