-- CreateTable
CREATE TABLE "Language" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "shop" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Translation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "translatedValue" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Translation_languageCode_shop_fkey" FOREIGN KEY ("languageCode", "shop") REFERENCES "Language" ("code", "shop") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TranslationJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceIds" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "shopifyChargeId" TEXT,
    "shopifySubscriptionId" TEXT,
    "currentPeriodStart" DATETIME,
    "currentPeriodEnd" DATETIME,
    "trialEndsAt" DATETIME,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UsageLimit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriptionId" TEXT NOT NULL,
    "maxLanguages" INTEGER NOT NULL DEFAULT 1,
    "maxTranslations" INTEGER,
    "maxProducts" INTEGER,
    "autoTranslate" BOOLEAN NOT NULL DEFAULT false,
    "translationMemory" BOOLEAN NOT NULL DEFAULT false,
    "prioritySupport" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UsageLimit_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UsageTracking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "translationsCount" INTEGER NOT NULL DEFAULT 0,
    "languagesCount" INTEGER NOT NULL DEFAULT 0,
    "productsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Language_shop_idx" ON "Language"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "Language_shop_code_key" ON "Language"("shop", "code");

-- CreateIndex
CREATE INDEX "Translation_shop_resourceType_resourceId_idx" ON "Translation"("shop", "resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "Translation_shop_languageCode_idx" ON "Translation"("shop", "languageCode");

-- CreateIndex
CREATE INDEX "Translation_shop_status_idx" ON "Translation"("shop", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Translation_shop_resourceType_resourceId_field_languageCode_key" ON "Translation"("shop", "resourceType", "resourceId", "field", "languageCode");

-- CreateIndex
CREATE INDEX "TranslationJob_shop_status_idx" ON "TranslationJob"("shop", "status");

-- CreateIndex
CREATE INDEX "TranslationJob_shop_createdAt_idx" ON "TranslationJob"("shop", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_shop_key" ON "Subscription"("shop");

-- CreateIndex
CREATE INDEX "Subscription_shop_status_idx" ON "Subscription"("shop", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UsageLimit_subscriptionId_key" ON "UsageLimit"("subscriptionId");

-- CreateIndex
CREATE INDEX "UsageTracking_shop_idx" ON "UsageTracking"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "UsageTracking_shop_period_key" ON "UsageTracking"("shop", "period");

-- CreateIndex
CREATE INDEX "Session_shop_idx" ON "Session"("shop");
