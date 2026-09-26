import {
  clearPhotoAdminSessionCookie,
  createPhotoAdminSessionCookie,
  hasPhotoAdminAccess,
  isPhotoAdminToken,
} from "@/lib/cloudinaryServer";

export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  if (!process.env.PHOTO_ADMIN_TOKEN) {
    return Response.json({ error: "Photo administration is not configured." }, { status: 503, headers: noStoreHeaders });
  }
  if (!hasPhotoAdminAccess(request)) {
    return Response.json({ authenticated: false }, { status: 401, headers: noStoreHeaders });
  }
  return Response.json({ authenticated: true }, { headers: noStoreHeaders });
}

export async function POST(request: Request) {
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== new URL(request.url).origin) {
    return Response.json({ error: "Cross-origin login is not allowed." }, { status: 403, headers: noStoreHeaders });
  }
  if (!process.env.PHOTO_ADMIN_TOKEN) {
    return Response.json({ error: "Photo administration is not configured." }, { status: 503, headers: noStoreHeaders });
  }
  const body = await request.json().catch(() => null) as { token?: unknown } | null;
  if (!body || typeof body.token !== "string" || !isPhotoAdminToken(body.token)) {
    return Response.json({ error: "Incorrect admin token." }, { status: 401, headers: noStoreHeaders });
  }
  return Response.json(
    { authenticated: true },
    { headers: { ...noStoreHeaders, "Set-Cookie": createPhotoAdminSessionCookie() } },
  );
}

export async function DELETE() {
  return new Response(null, {
    status: 204,
    headers: { ...noStoreHeaders, "Set-Cookie": clearPhotoAdminSessionCookie() },
  });
}
