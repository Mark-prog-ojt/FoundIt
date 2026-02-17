import { chromium } from "@playwright/test";
import { SignJWT } from "jose";
import fs from "fs";
import path from "path";

const baseURL = "http://127.0.0.1:3000";
const repoRoot = "/Users/markdeleon/foundit/web";

function readEnvValue(key: string) {
  const envPath = path.join(repoRoot, ".env");
  const raw = fs.readFileSync(envPath, "utf8");
  const match = raw.match(new RegExp(`^${key}=(.*)$`, "m"));
  if (!match) throw new Error(`Missing ${key} in .env`);

  let value = match[1].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value;
}

async function buildSessionToken(payload: {
  userId: number;
  role: "USER" | "STAFF" | "ADMIN";
  email: string;
  name: string;
  avatarUrl: string | null;
}) {
  const secret = readEnvValue("AUTH_SECRET");
  const key = new TextEncoder().encode(secret);

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

async function snap(role: "USER" | "STAFF" | "ADMIN", payload: {
  userId: number;
  role: "USER" | "STAFF" | "ADMIN";
  email: string;
  name: string;
  avatarUrl: string | null;
}) {
  const token = await buildSessionToken(payload);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 900 },
  });

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

  const page = await context.newPage();
  await page.goto("/profile", { waitUntil: "networkidle" });
  await page.waitForSelector("text=Personal information", { timeout: 15000 });
  await page.screenshot({ path: `/tmp/profile-${role.toLowerCase()}.png`, fullPage: true });
  await browser.close();
}

async function main() {
  await snap("USER", {
    userId: 3,
    role: "USER",
    email: "user@foundit.local",
    name: "Demo User",
    avatarUrl: null,
  });

  await snap("STAFF", {
    userId: 2,
    role: "STAFF",
    email: "staff@foundit.local",
    name: "Demo Staff",
    avatarUrl: null,
  });

  await snap("ADMIN", {
    userId: 1,
    role: "ADMIN",
    email: "admin@foundit.local",
    name: "Demo Admin",
    avatarUrl: null,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
