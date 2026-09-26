import type { UploadApiResponse } from "cloudinary";
import { EVENT_CONFIG } from "@/config/event";
import { MAX_CLOUD_PHOTO_BYTES } from "@/lib/cloudPhoto";
import { CLOUD_PHOTO_FOLDER, cloudinary, configureCloudinary, hasPhotoAdminAccess } from "@/lib/cloudinaryServer";

export const runtime = "nodejs";

const allowedFrameIds = new Set(EVENT_CONFIG.frames.map((frame) => frame.id));

async function uploadToCloudinary(file: File, frameId: string): Promise<UploadApiResponse> {
  const bytes = Buffer.from(await file.arrayBuffer());
  return new Promise((resolve, reject) => {
    try {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: CLOUD_PHOTO_FOLDER,
          public_id: `photo-${Date.now()}-${crypto.randomUUID()}`,
          resource_type: "image",
          type: "authenticated",
          overwrite: false,
          tags: ["joy-of-giving", frameId],
          context: { frame: frameId },
        },
        (error, result) => {
          if (error || !result) reject(error || new Error("Cloudinary returned no upload result."));
          else resolve(result);
        },
      );
      stream.end(bytes);
    } catch (error) {
      reject(error);
    }
  });
}

export async function POST(request: Request) {
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== new URL(request.url).origin) {
    return Response.json({ error: "Cross-origin uploads are not allowed." }, { status: 403 });
  }

  if (!configureCloudinary()) {
    return Response.json({ error: "Cloud photo storage is not configured." }, { status: 503 });
  }

  const contentLength = Number.parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_CLOUD_PHOTO_BYTES + 32_000) {
    return Response.json({ error: "The upload request is too large." }, { status: 413 });
  }

  const formData = await request.formData();
  const photo = formData.get("photo");
  const frameId = formData.get("frameId");
  if (!(photo instanceof File) || typeof frameId !== "string" || !allowedFrameIds.has(frameId)) {
    return Response.json({ error: "Invalid photo upload." }, { status: 400 });
  }
  if (photo.type !== "image/jpeg") {
    return Response.json({ error: "Only JPEG photos are accepted." }, { status: 415 });
  }
  if (!photo.size || photo.size > MAX_CLOUD_PHOTO_BYTES) {
    return Response.json({ error: "Photos must be 500 KB or smaller." }, { status: 413 });
  }

  try {
    const uploaded = await uploadToCloudinary(photo, frameId);
    return Response.json({ publicId: uploaded.public_id, bytes: uploaded.bytes }, { status: 201 });
  } catch (error) {
    console.error("Cloudinary photo upload failed", error);
    return Response.json({ error: "The photo could not be stored in the cloud." }, { status: 502 });
  }
}

export async function GET(request: Request) {
  if (!process.env.PHOTO_ADMIN_TOKEN) {
    return Response.json({ error: "Photo administration is not configured." }, { status: 503 });
  }
  if (!hasPhotoAdminAccess(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!configureCloudinary()) {
    return Response.json({ error: "Cloud photo storage is not configured." }, { status: 503 });
  }

  const url = new URL(request.url);
  const requestedLimit = Number.parseInt(url.searchParams.get("maxResults") || "50", 10);
  const maxResults = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 50;
  const nextCursor = url.searchParams.get("nextCursor") || undefined;

  try {
    const result = await cloudinary.api.resources({
      resource_type: "image",
      type: "authenticated",
      prefix: `${CLOUD_PHOTO_FOLDER}/`,
      max_results: maxResults,
      next_cursor: nextCursor,
      direction: "desc",
      context: true,
      tags: true,
    });
    const photos = result.resources.map((resource: {
      public_id: string;
      version: number;
      format: string;
      bytes: number;
      width: number;
      height: number;
      created_at: string;
      tags?: string[];
      context?: { custom?: Record<string, string> };
    }) => ({
      publicId: resource.public_id,
      url: cloudinary.url(resource.public_id, {
        resource_type: "image",
        type: "authenticated",
        secure: true,
        sign_url: true,
        version: resource.version,
        format: resource.format,
      }),
      bytes: resource.bytes,
      version: resource.version,
      format: resource.format,
      width: resource.width,
      height: resource.height,
      createdAt: resource.created_at,
      frameId: resource.context?.custom?.frame || null,
      tags: resource.tags || [],
    }));

    return Response.json(
      { photos, nextCursor: result.next_cursor || null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Cloudinary photo listing failed", error);
    return Response.json({ error: "Cloud photos could not be loaded." }, { status: 502 });
  }
}
