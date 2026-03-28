import { prisma, seedDefaultSkuConfigs } from "./index";

async function main(): Promise<void> {
  await seedDefaultSkuConfigs(prisma);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
