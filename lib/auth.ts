import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, createHmac, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const cookieName = "incident_hub_session";
const sessionMaxAgeSeconds = 8 * 60 * 60;

function computeLegacyToken(username: string, secret: string): string {
  return createHmac("sha256", secret).update(username).digest("hex");
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds
  });
}

function signSessionToken(payload: string) {
  return createHmac("sha256", env.SESSION_SECRET).update(payload).digest("base64url");
}

async function issueDatabaseSession(
  user: { id: string; email: string },
  options?: { userAgent?: string | null; ipAddress?: string | null }
) {
  const expiresAt = new Date(Date.now() + sessionMaxAgeSeconds * 1000);
  const payload = `v2.${user.id}.${expiresAt.getTime()}.${randomBytes(24).toString("base64url")}`;
  const token = `${payload}.${signSessionToken(payload)}`;
  await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId: user.id,
      expiresAt,
      userAgent: options?.userAgent,
      ipAddress: options?.ipAddress
    }
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });
  await setSessionCookie(token);
}

export async function createSession(
  username: string,
  password: string,
  options?: { userAgent?: string | null; ipAddress?: string | null }
) {
  const normalized = username.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      isActive: true,
      OR: [{ email: normalized }, { name: username.trim() }]
    }
  });

  if (user) {
    if (!(await bcrypt.compare(password, user.passwordHash))) return false;
    await issueDatabaseSession(user, options);
    return true;
  }

  const passwordMatches =
    password === env.ADMIN_PASSWORD ||
    (env.ADMIN_PASSWORD.startsWith("$2") && (await bcrypt.compare(password, env.ADMIN_PASSWORD)));
  if (username !== env.ADMIN_USERNAME || !passwordMatches) return false;

  await setSessionCookie(computeLegacyToken(env.ADMIN_USERNAME, env.SESSION_SECRET));
  return true;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(cookieName)?.value;
  if (session) {
    await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(session) } });
  }
  cookieStore.delete(cookieName);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get(cookieName)?.value;
  if (!session) return null;

  const dbSession = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(session) },
    include: { user: true }
  });
  if (dbSession) {
    if (dbSession.expiresAt <= new Date() || !dbSession.user.isActive) {
      await prisma.session.delete({ where: { id: dbSession.id } }).catch(() => null);
      return null;
    }
    return dbSession.user;
  }

  const expected = computeLegacyToken(env.ADMIN_USERNAME, env.SESSION_SECRET);
  if (session === expected) {
    return {
      id: "legacy-env-admin",
      email: env.ADMIN_USERNAME,
      name: env.ADMIN_USERNAME,
      role: "admin" as const,
      isActive: true
    };
  }

  return null;
}

export async function isAuthenticated() {
  return Boolean(await getCurrentUser());
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(roles: Array<"admin" | "operator" | "viewer">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect("/dashboard?error=forbidden");
  return user;
}
