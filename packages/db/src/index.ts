import { PrismaClient } from "@prisma/client";
import { auditRecordSchema, supportedSkuSchema, type AuditRecord, type FreshnessAnalysis, type PricingAction } from "@mmhack/shared";

export type CreateAuditRecordInput = {
  action: PricingAction;
  analysis: FreshnessAnalysis;
  imagePath: string;
  voriItemId: string;
  voriResult?: string | null;
};

declare global {
  var __mmhackPrisma: PrismaClient | undefined;
}

export function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}

export const prisma = globalThis.__mmhackPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__mmhackPrisma = prisma;
}

export async function seedDefaultSkuConfigs(client: PrismaClient = prisma): Promise<void> {
  const seeds = [
    { currentPriceCents: 129, defaultPriceCents: 129, displayName: "Banana", sku: "banana", voriItemId: "SKU-BANANA-001" },
    { currentPriceCents: 149, defaultPriceCents: 149, displayName: "Apple", sku: "apple", voriItemId: "SKU-APPLE-001" },
    { currentPriceCents: 199, defaultPriceCents: 199, displayName: "Tomato", sku: "tomato", voriItemId: "SKU-TOMATO-001" },
  ] as const;

  await Promise.all(
    seeds.map((seed) =>
      client.skuConfig.upsert({
        create: seed,
        update: {
          currentPriceCents: seed.currentPriceCents,
          defaultPriceCents: seed.defaultPriceCents,
          displayName: seed.displayName,
        },
        where: {
          sku: seed.sku,
        },
      }),
    ),
  );
}

export async function createAuditRecord(
  input: CreateAuditRecordInput,
  client: PrismaClient = prisma,
): Promise<AuditRecord> {
  supportedSkuSchema.parse(input.analysis.sku);

  const created = await client.auditRecord.create({
    data: {
      actionType: input.action.type,
      confidence: input.analysis.confidence,
      imagePath: input.imagePath,
      markdownPercent: input.action.markdownPercent,
      rationale: input.analysis.rationale,
      score: input.analysis.score,
      sku: input.analysis.sku,
      visibleIssues: JSON.stringify(input.analysis.visibleIssues),
      voriItemId: input.voriItemId,
      voriOperation: input.action.voriOperation,
      voriResult: input.voriResult ?? null,
    },
  });

  return auditRecordSchema.parse({
    actionType: created.actionType,
    confidence: created.confidence,
    createdAt: created.createdAt,
    id: created.id,
    imagePath: created.imagePath,
    markdownPercent: created.markdownPercent ?? undefined,
    rationale: created.rationale,
    score: created.score,
    sku: created.sku,
    visibleIssues: JSON.parse(created.visibleIssues) as string[],
    voriItemId: created.voriItemId,
    voriOperation: created.voriOperation,
    voriResult: created.voriResult,
  });
}

export async function getAuditRecordById(id: string, client: PrismaClient = prisma): Promise<AuditRecord | null> {
  const record = await client.auditRecord.findUnique({
    where: { id },
  });

  if (!record) {
    return null;
  }

  return auditRecordSchema.parse({
    actionType: record.actionType,
    confidence: record.confidence,
    createdAt: record.createdAt,
    id: record.id,
    imagePath: record.imagePath,
    markdownPercent: record.markdownPercent ?? undefined,
    rationale: record.rationale,
    score: record.score,
    sku: record.sku,
    visibleIssues: JSON.parse(record.visibleIssues) as string[],
    voriItemId: record.voriItemId,
    voriOperation: record.voriOperation,
    voriResult: record.voriResult,
  });
}
