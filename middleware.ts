import { NextRequest, NextResponse } from "next/server";

const PROTECTED_API_PREFIXES = [
  "/api/incidents",
  "/api/status-page",
  "/api/templates",
  "/api/settings",
  "/api/dev",
];

function addSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return response;
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function computeHmac(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function isValidSessionToken(token: string, secret: string, username: string) {
  const legacy = await computeHmac(secret, username);
  if (constantTimeEqual(token, legacy)) return true;

  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== "v2") return false;
  const payload = parts.slice(0, 4).join(".");
  const expiresAt = Number(parts[2]);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;
  const expected = await computeHmac(secret, payload);
  return constantTimeEqual(parts[4], btoa(String.fromCharCode(...hexToBytes(expected))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""));
}

function hexToBytes(hex: string) {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return bytes;
}

function requestHasTrustedOrigin(request: NextRequest) {
  const method = request.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return true;
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api/webhooks/")) return true;

  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!requestHasTrustedOrigin(request)) {
    return addSecurityHeaders(NextResponse.json({ error: "Invalid request origin" }, { status: 403 }));
  }

  const needsAuth = PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!needsAuth) return addSecurityHeaders(NextResponse.next());

  const session = request.cookies.get("incident_hub_session")?.value;
  if (!session) {
    return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const username = process.env.ADMIN_USERNAME ?? "admin";
  const secret = process.env.SESSION_SECRET ?? "local-session-secret";
  if (!(await isValidSessionToken(session, secret, username))) {
    return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
