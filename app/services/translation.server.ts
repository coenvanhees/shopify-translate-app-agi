import prisma from "../db.server";
import { incrementUsage } from "./usage.server";

export interface TranslationInput {
  resourceType: string;
  resourceId: string;
  field: string;
  languageCode: string;
  marketId?: string; // Optional market ID for market-specific translations
  translatedValue: string;
  shop: string;
  status?: string;
  autoTranslated?: boolean;
}

export async function createTranslation(input: TranslationInput) {
  // Check if language exists
  const language = await prisma.language.findUnique({
    where: {
      shop_code: {
        shop: input.shop,
        code: input.languageCode,
      },
    },
  });

  if (!language) {
    throw new Error(`Language ${input.languageCode} not found`);
  }

  const translation = await prisma.translation.upsert({
    where: {
      shop_resourceType_resourceId_field_languageCode_marketId: {
        shop: input.shop,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        field: input.field,
        languageCode: input.languageCode,
        marketId: input.marketId || null,
      },
    },
    create: {
      ...input,
      status: input.status || "draft",
      autoTranslated: input.autoTranslated || false,
    },
    update: {
      translatedValue: input.translatedValue,
      status: input.status || "draft",
      autoTranslated: input.autoTranslated || false,
      updatedAt: new Date(),
    },
  });

  // Increment usage
  await incrementUsage(input.shop, "translations", 1);

  return translation;
}

export async function getTranslations(
  shop: string,
  resourceType: string,
  resourceId: string,
  marketId?: string
) {
  return prisma.translation.findMany({
    where: {
      shop,
      resourceType,
      resourceId,
      ...(marketId ? { marketId } : {}),
    },
    include: {
      language: true,
      market: true,
    },
    orderBy: {
      languageCode: "asc",
    },
  });
}

export async function getTranslation(
  shop: string,
  resourceType: string,
  resourceId: string,
  field: string,
  languageCode: string,
  marketId?: string
) {
  return prisma.translation.findUnique({
    where: {
      shop_resourceType_resourceId_field_languageCode_marketId: {
        shop,
        resourceType,
        resourceId,
        field,
        languageCode,
        marketId: marketId || null,
      },
    },
    include: {
      language: true,
      market: true,
    },
  });
}

export async function updateTranslation(
  shop: string,
  resourceType: string,
  resourceId: string,
  field: string,
  languageCode: string,
  translatedValue: string,
  status?: string,
  marketId?: string
) {
  return prisma.translation.update({
    where: {
      shop_resourceType_resourceId_field_languageCode_marketId: {
        shop,
        resourceType,
        resourceId,
        field,
        languageCode,
        marketId: marketId || null,
      },
    },
    data: {
      translatedValue,
      status: status || "draft",
      updatedAt: new Date(),
    },
  });
}

export async function deleteTranslation(
  shop: string,
  resourceType: string,
  resourceId: string,
  field: string,
  languageCode: string,
  marketId?: string
) {
  return prisma.translation.delete({
    where: {
      shop_resourceType_resourceId_field_languageCode_marketId: {
        shop,
        resourceType,
        resourceId,
        field,
        languageCode,
        marketId: marketId || null,
      },
    },
  });
}

export async function bulkCreateTranslations(
  shop: string,
  translations: Omit<TranslationInput, "shop">[]
) {
  const results = await Promise.all(
    translations.map((t) =>
      createTranslation({
        ...t,
        shop,
      })
    )
  );

  return results;
}

export async function getTranslationStats(shop: string) {
  const [total, byStatus, byLanguage] = await Promise.all([
    prisma.translation.count({
      where: { shop },
    }),
    prisma.translation.groupBy({
      by: ["status"],
      where: { shop },
      _count: true,
    }),
    prisma.translation.groupBy({
      by: ["languageCode"],
      where: { shop },
      _count: true,
    }),
  ]);

  return {
    total,
    byStatus: byStatus.reduce(
      (acc: Record<string, number>, item: { status: string; _count: number }) => ({ ...acc, [item.status]: item._count }),
      {} as Record<string, number>
    ),
    byLanguage: byLanguage.reduce(
      (acc: Record<string, number>, item: { languageCode: string; _count: number }) => ({ ...acc, [item.languageCode]: item._count }),
      {} as Record<string, number>
    ),
  };
}

