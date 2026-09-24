import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import fs from "fs";

const prisma = new PrismaClient();

async function run() {
  const indicators = await prisma.indicator.findMany({
    include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  console.log("Indicators found:", indicators.length);
  for (const i of indicators) {
    console.log(`- ${i.id}: ${i.name}`);
    const script = i.versions[0]?.script;
    if (script) {
      const safeName = i.name.replace(/[^a-zA-Z0-9_-]/g, "_");
      fs.writeFileSync(`backend-data/${safeName}.pine`, script);
      console.log(`  Saved to backend-data/${safeName}.pine (${script.length} bytes)`);
    }
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
