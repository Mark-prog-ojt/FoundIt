import "dotenv/config";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  // 1) Roles
  await prisma.role.createMany({
    data: [
      { role_name: "USER" },
      { role_name: "STAFF" },
      { role_name: "ADMIN" },
    ],
    skipDuplicates: true,
  });

  const userRole = await prisma.role.findFirst({ where: { role_name: "USER" } });
  const staffRole = await prisma.role.findFirst({ where: { role_name: "STAFF" } });
  const adminRole = await prisma.role.findFirst({ where: { role_name: "ADMIN" } });

  if (!userRole || !staffRole || !adminRole) {
    throw new Error("Roles not found after seeding.");
  }

  // 2) Categories
  await prisma.category.createMany({
    data: [
      { category_name: "Electronics" },
      { category_name: "IDs & Documents" },
      { category_name: "Accessories" },
      { category_name: "Clothing" },
      { category_name: "School Supplies" },
      { category_name: "Others" },
    ],
    skipDuplicates: true,
  });

  // 3) Locations
  await prisma.location.createMany({
    data: [
      { location_name: "Main Gate", description: "Entrance / guard post" },
      { location_name: "Library", description: "Reading area and help desk" },
      { location_name: "Cafeteria", description: "Food court / dining area" },
      { location_name: "Gymnasium", description: "Sports complex" },
      { location_name: "Engineering Building", description: "Labs and classrooms" },
    ],
    skipDuplicates: true,
  });

  // 4) Demo users (plain text for now; will hash in Auth step)
  await prisma.user.upsert({
    where: { email: "admin@foundit.local" },
    update: {},
    create: {
      role_id: adminRole.role_id,
      full_name: "Demo Admin",
      id_number: "A-0001",
      email: "admin@foundit.local",
      password: "admin123",
      department: "IT",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "staff@foundit.local" },
    update: {},
    create: {
      role_id: staffRole.role_id,
      full_name: "Demo Staff",
      id_number: "S-0001",
      email: "staff@foundit.local",
      password: "staff123",
      department: "Security Office",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "user@foundit.local" },
    update: {},
    create: {
      role_id: userRole.role_id,
      full_name: "Demo User",
      id_number: "U-0001",
      email: "user@foundit.local",
      password: "user123",
      department: "Engineering",
      status: "ACTIVE",
    },
  });

    // 5) Demo found items (posted by Demo Staff)
  const staff = await prisma.user.findUnique({
    where: { email: "staff@foundit.local" },
    select: { user_id: true },
  });
  if (!staff) throw new Error("Demo Staff not found");

  const cat = await prisma.category.findMany({
    select: { category_id: true, category_name: true },
  });
  const loc = await prisma.location.findMany({
    select: { location_id: true, location_name: true },
  });

  const catId = (name: string) => cat.find((c) => c.category_name === name)?.category_id;
  const locId = (name: string) => loc.find((l) => l.location_name === name)?.location_id;

  const electronics = catId("Electronics");
  const idsDocs = catId("IDs & Documents");
  const accessories = catId("Accessories");
  const engBldg = locId("Engineering Building");
  const library = locId("Library");
  const cafeteria = locId("Cafeteria");

  if (!electronics || !idsDocs || !accessories || !engBldg || !library || !cafeteria) {
    throw new Error("Missing seeded categories/locations");
  }

  const seedNames = ["White Earbuds Case", "Student ID (Initials: M.J.)", "Black Wallet"];
  const existing = await prisma.foundItem.count({
    where: { item_name: { in: seedNames } },
  });

  if (existing === 0) {
    await prisma.foundItem.createMany({
      data: [
        {
          user_id: staff.user_id,
          category_id: electronics,
          location_id: engBldg,
          item_name: "White Earbuds Case",
          description: "Found a white earbuds charging case near the lab benches. No earbuds inside.",
          date_found: new Date("2026-01-28T00:00:00.000Z"),
          storage_location: "Security Office - Cabinet A",
          image: null,
          status: "NEWLY_FOUND",
        },
        {
          user_id: staff.user_id,
          category_id: idsDocs,
          location_id: library,
          item_name: "Student ID (Initials: M.J.)",
          description: "Student ID found near library help desk. Initials M.J. on the sleeve.",
          date_found: new Date("2026-01-29T00:00:00.000Z"),
          storage_location: "Library Help Desk",
          image: null,
          status: "NEWLY_FOUND",
        },
        {
          user_id: staff.user_id,
          category_id: accessories,
          location_id: cafeteria,
          item_name: "Black Wallet",
          description: "Black bi-fold wallet found on cafeteria table. Contains no cash.",
          date_found: new Date("2026-01-29T00:00:00.000Z"),
          storage_location: "Security Office - Lost & Found Drawer",
          image: null,
          status: "NEWLY_FOUND",
        },
      ],
    });
  }

  console.log("✅ Seed complete: roles, categories, locations, demo users, demo found items.");

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
