import { timingSafeEqual } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

export const CLOUD_PHOTO_FOLDER = "joy-of-giving-week";

export function configureCloudinary() {
  const cloudName = process.env.CLOUD_NAME;
  const apiKey = process.env.API_KEY;
  const apiSecret = process.env.API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return false;
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  return true;
}

export function hasPhotoAdminAccess(request: Request) {
  const expected = process.env.PHOTO_ADMIN_TOKEN;
  const authorization = request.headers.get("authorization");
  if (!expected || !authorization?.startsWith("Bearer ")) return false;
  const supplied = authorization.slice(7);
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

export { cloudinary };
