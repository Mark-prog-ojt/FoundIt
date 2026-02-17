import "dotenv/config";

import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function ensureHashed(email: string, plain: string) {
  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    console.log(`- Skipped (not found): ${email}`);
    return;
  }

  // bcrypt hashes usually start with $2a$, $2b$, or $2y$
  const alreadyHashed = typeof user.password === "string" && user.password.startsWith("$2");
  if (alreadyHashed) {
    console.log(`- Already hashed: ${email}`);
    return;
  }

  const hashed = await bcrypt.hash(plain, 12);
  await prisma.user.update({
    where: { email },
    data: { password: hashed },
  });

  console.log(`✅ Updated password (hashed): ${email}`);
}

async function main() {
  await ensureHashed("user@foundit.local", "user123");
  await ensureHashed("staff@foundit.local", "staff123");
  await ensureHashed("admin@foundit.local", "admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
