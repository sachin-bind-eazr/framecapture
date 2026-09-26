import { CLOUD_PHOTO_FOLDER, cloudinary, configureCloudinary, hasPhotoAdminAccess } from "@/lib/cloudinaryServer";

export const runtime = "nodejs";

interface DownloadRequest {
  publicId?: unknown;
  version?: unknown;
  format?: unknown;
}

export async function POST(request: Request) {
  if (!process.env.PHOTO_ADMIN_TOKEN) {
    return Response.json({ error: "Photo administration is not configured." }, { status: 503 });
  }
  if (!hasPhotoAdminAccess(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!configureCloudinary()) {
    return Response.json({ error: "Cloud photo storage is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as DownloadRequest | null;
  const publicId = body?.publicId;
  const version = body?.version;
  const format = body?.format;
  if (
    typeof publicId !== "string" ||
    !publicId.startsWith(`${CLOUD_PHOTO_FOLDER}/`) ||
    typeof version !== "number" ||
    !Number.isInteger(version) ||
    typeof format !== "string" ||
    !/^[a-z0-9]{2,5}$/i.test(format)
  ) {
    return Response.json({ error: "Invalid download request." }, { status: 400 });
  }

  const signedUrl = cloudinary.url(publicId, {
    resource_type: "image",
    type: "authenticated",
    secure: true,
    sign_url: true,
    version,
    format,
  });

  try {
    const cloudResponse = await fetch(signedUrl, { cache: "no-store" });
    if (!cloudResponse.ok || !cloudResponse.body) {
      return Response.json({ error: "The photo could not be downloaded." }, { status: 502 });
    }
    const baseName = publicId.slice(publicId.lastIndexOf("/") + 1).replace(/[^a-z0-9_-]/gi, "-");
    return new Response(cloudResponse.body, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${baseName}.${format}"`,
        "Content-Type": cloudResponse.headers.get("content-type") || `image/${format}`,
      },
    });
  } catch (error) {
    console.error("Cloudinary photo download failed", error);
    return Response.json({ error: "The photo could not be downloaded." }, { status: 502 });
  }
}
