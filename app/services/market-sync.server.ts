import prisma from "../db.server";
import { fetchMarkets } from "./markets.server";

export async function syncMarkets(admin: any, shop: string) {
  const shopifyMarkets = await fetchMarkets(admin);

  // Sync markets to database
  const results = await Promise.all(
    shopifyMarkets.map(async (market) => {
      return prisma.market.upsert({
        where: {
          shop_shopifyId: {
            shop,
            shopifyId: market.id,
          },
        },
        create: {
          shopifyId: market.id,
          name: market.name,
          enabled: market.enabled,
          shop,
        },
        update: {
          name: market.name,
          enabled: market.enabled,
          updatedAt: new Date(),
        },
      });
    })
  );

  return results;
}

export async function getMarkets(shop: string) {
  return prisma.market.findMany({
    where: { shop, enabled: true },
    orderBy: { name: "asc" },
  });
}

