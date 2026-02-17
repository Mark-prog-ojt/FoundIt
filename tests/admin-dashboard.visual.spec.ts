import { test, expect } from "@playwright/test";
import { SignJWT } from "jose";
import fs from "fs";
import path from "path";

function readEnvValue(key: string) {
  if (process.env[key]) return String(process.env[key]);

  const envPath = path.join(process.cwd(), ".env");
  const raw = fs.readFileSync(envPath, "utf8");
  const match = raw.match(new RegExp(`^${key}=(.*)$`, "m"));
  if (!match) throw new Error(`Missing ${key} in .env`);

  let value = match[1].trim();
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value;
}

async function buildAdminSessionToken() {
  const secret = readEnvValue("AUTH_SECRET");
  const key = new TextEncoder().encode(secret);

  const payload = {
    userId: 1,
    role: "ADMIN",
    email: "admin@foundit.local",
    name: "Demo Admin",
    avatarUrl: null,
  } as const;

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

test("admin dashboard layout is full width", async ({ page, context }) => {
  const token = await buildAdminSessionToken();
  await context.addCookies([
    {
      name: "foundit_session",
      value: token,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/admin/dashboard", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();

  const grid = page.getByTestId("admin-dashboard-grid");
  const mainCol = page.getByTestId("admin-dashboard-main");
  const sideCol = page.getByTestId("admin-dashboard-sidebar");

  const gridBox = await grid.boundingBox();
  const mainBox = await mainCol.boundingBox();
  const sideBox = await sideCol.boundingBox();

  expect(gridBox?.width ?? 0).toBeGreaterThan(1100);
  expect(mainBox?.width ?? 0).toBeGreaterThan(700);
  expect(sideBox?.width ?? 0).toBeGreaterThan(260);
  if (mainBox && sideBox) {
    expect(sideBox.x).toBeGreaterThan(mainBox.x + mainBox.width - 10);
  }

  await expect(page).toHaveScreenshot("admin-dashboard.png", { fullPage: true });
});
