import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createAuditRecord, createPrismaClient, getAuditRecordById, seedDefaultSkuConfigs } from "./index";

const prisma = createPrismaClient();

describe("audit repository", () => {
  beforeAll(async () => {
    await seedDefaultSkuConfigs(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates and reads an audit record", async () => {
    const created = await createAuditRecord(
      {
        action: {
          markdownPercent: 15,
          type: "markdown",
          voriOperation: "update_price",
        },
        analysis: {
          confidence: "high",
          rationale: "minor surface softening",
          score: 7,
          sku: "tomato",
          visibleIssues: ["soft spot"],
        },
        imagePath: "storage/tomato-001.jpg",
        voriItemId: "SKU-TOMATO-001",
        voriResult: "updated",
      },
      prisma,
    );

    const loaded = await getAuditRecordById(created.id, prisma);

    expect(loaded?.sku).toBe("tomato");
    expect(loaded?.markdownPercent).toBe(15);
    expect(loaded?.visibleIssues).toEqual(["soft spot"]);
  });
});
