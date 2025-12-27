import prisma from "../db.server";
import { incrementUsage } from "./usage.server";
import { checkLanguageLimit } from "../middleware/subscription.server";

export interface LanguageInput {
  code: string;
  name: string;
  shop: string;
  isDefault?: boolean;
}

export async function createLanguage(input: LanguageInput) {
  // Check language limit
  const currentCount = await prisma.language.count({
    where: { shop: input.shop },
  });

  const limitCheck = await checkLanguageLimit(input.shop, currentCount);
  if (!limitCheck.allowed) {
    throw new Error(
      `Language limit reached. Current: ${limitCheck.current}, Limit: ${limitCheck.limit}`
    );
  }

  // If this is set as default, unset other defaults
  if (input.isDefault) {
    await prisma.language.updateMany({
      where: {
        shop: input.shop,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });
  }

  const language = await prisma.language.create({
    data: input,
  });

  await incrementUsage(input.shop, "languages", 1);

  return language;
}

export async function getLanguages(shop: string) {
  return prisma.language.findMany({
    where: { shop },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function getLanguage(shop: string, code: string) {
  return prisma.language.findUnique({
    where: {
      shop_code: {
        shop,
        code,
      },
    },
  });
}

export async function updateLanguage(
  shop: string,
  code: string,
  data: Partial<LanguageInput>
) {
  // If setting as default, unset other defaults
  if (data.isDefault) {
    await prisma.language.updateMany({
      where: {
        shop,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });
  }

  return prisma.language.update({
    where: {
      shop_code: {
        shop,
        code,
      },
    },
    data,
  });
}

export async function deleteLanguage(shop: string, code: string) {
  // Don't allow deleting default language
  const language = await prisma.language.findUnique({
    where: {
      shop_code: {
        shop,
        code,
      },
    },
  });

  if (language?.isDefault) {
    throw new Error("Cannot delete default language");
  }

  // Delete all translations for this language
  await prisma.translation.deleteMany({
    where: {
      shop,
      languageCode: code,
    },
  });

  return prisma.language.delete({
    where: {
      shop_code: {
        shop,
        code,
      },
    },
  });
}

export async function getDefaultLanguage(shop: string) {
  return prisma.language.findFirst({
    where: {
      shop,
      isDefault: true,
    },
  });
}

