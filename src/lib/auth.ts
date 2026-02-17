import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const secret = process.env.AUTH_SECRET;
if (!secret) throw new Error("Missing AUTH_SECRET in .env");

const key = new TextEncoder().encode(secret);

export async function hashPassword(password: string) {
  // 12 rounds is a good dev/prod default
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashed: string) {
  return bcrypt.compare(password, hashed);
}

// What we store in the session token
export type SessionPayload = {
  userId: number;
  role: "USER" | "STAFF" | "ADMIN";
  email: string;
  name: string;
  avatarUrl?: string | null;
};

export async function createSessionToken(payload: SessionPayload) {
  // 7 days
  const expSeconds = 60 * 60 * 24 * 7;

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${expSeconds}s`)
    .sign(key);
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, key);
  return payload as unknown as SessionPayload;
}
