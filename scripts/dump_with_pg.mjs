import pg from "pg";
import fs from "fs";

const connectionString =
  "postgresql://neondb_owner:r67jdFUbTIDe@ep-rapid-water-a49ryv2e-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

const pool = new pg.Pool({ connectionString });

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT i.id, i.name, iv.version, iv.script
      FROM "Indicator" i
      LEFT JOIN "IndicatorVersion" iv ON iv."indicatorId" = i.id
      ORDER BY i."createdAt" DESC, iv."createdAt" DESC
    `);
    console.log("Found rows:", res.rows.length);
    for (const r of res.rows) {
      console.log(`- [${r.id}] ${r.name} (v${r.version}) script len: ${r.script?.length}`);
      if (r.script && r.name.toLowerCase().includes("whale")) {
        const safeName = r.name.replace(/[^a-zA-Z0-9_-]/g, "_");
        fs.writeFileSync(`backend-data/${safeName}.pine`, r.script, "utf-8");
        console.log(`  -> Written to backend-data/${safeName}.pine`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
