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

test("admin audit layout feels premium", async ({ page, context }) => {
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

  const fixedNow = new Date("2026-02-05T08:00:00+08:00").valueOf();
  await context.addInitScript((ts) => {
    const OriginalDate = Date;
    class MockDate extends OriginalDate {
      constructor(...args) {
        if (args.length === 0) {
          super(ts);
        } else {
          super(...args);
        }
      }
      static now() {
        return ts;
      }
    }
    // @ts-expect-error override global Date
    window.Date = MockDate;
  }, fixedNow);

  await page.route("**/api/admin/audit**", async (route) => {
    const body = {
      ok: true,
      page: 1,
      totalPages: 1,
      items: [
        {
          audit_id: 101,
          actor_user_id: 12,
          action: "CLAIM_SUBMITTED",
          entity_type: "CLAIM",
          entity_id: 44,
          summary: "Claim submitted for \"Blue Wallet\"",
          meta: { before: { status: "PENDING" }, after: { status: "SUBMITTED" } },
          ip: "203.0.113.10",
          user_agent: "Safari 17.0",
          created_at: "2026-02-05T08:51:00+08:00",
          actor: {
            user_id: 12,
            full_name: "Demo Staff",
            email: "staff@foundit.local",
            role: { role_name: "STAFF" },
          },
        },
        {
          audit_id: 102,
          actor_user_id: 1,
          action: "FOUND_ITEM_UPDATED",
          entity_type: "FOUND_ITEM",
          entity_id: 6,
          summary: "Updated found item \"Brown Wallet\"",
          meta: { before: { status: "STORED" }, after: { status: "CLAIMED" } },
          ip: "203.0.113.10",
          user_agent: "Safari 17.0",
          created_at: "2026-02-05T07:35:00+08:00",
          actor: {
            user_id: 1,
            full_name: "Demo Admin",
            email: "admin@foundit.local",
            role: { role_name: "ADMIN" },
          },
        },
        {
          audit_id: 103,
          actor_user_id: null,
          action: "LOGIN_SUCCESS",
          entity_type: "AUTH",
          entity_id: null,
          summary: "System login event recorded",
          meta: null,
          ip: "198.51.100.5",
          user_agent: "Chrome",
          created_at: "2026-02-04T18:20:00+08:00",
          actor: null,
        },
      ],
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });

  await page.goto("/admin/audit", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Audit Logs" })).toBeVisible();

  const surface = page.getByTestId("admin-audit-surface");
  const list = page.getByTestId("admin-audit-list");

  const surfaceBox = await surface.boundingBox();
  expect(surfaceBox?.width ?? 0).toBeGreaterThan(1000);
  await expect(list).toBeVisible();

  await expect(page).toHaveScreenshot("admin-audit.png", { fullPage: true });
});
