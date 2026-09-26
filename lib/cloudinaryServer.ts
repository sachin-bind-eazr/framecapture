import { createHmac, timingSafeEqual } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

export const CLOUD_PHOTO_FOLDER = "joy-of-giving-week";
export const PHOTO_ADMIN_COOKIE = "joy_admin_session";
const PHOTO_ADMIN_SESSION_SECONDS = 7 * 24 * 60 * 60;

function safeEqual(left: string, right: string) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function signSession(expires: string, secret: string) {
  return createHmac("sha256", secret).update(expires).digest("hex");
}

function readCookie(request: Request, name: string) {
  const cookies = request.headers.get("cookie");
  if (!cookies) return null;
  for (const entry of cookies.split(";")) {
    const [key, ...value] = entry.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

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
  if (!expected) return false;
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ") && safeEqual(authorization.slice(7), expected)) return true;

  const session = readCookie(request, PHOTO_ADMIN_COOKIE);
  if (!session) return false;
  const [expires, signature] = session.split(".");
  if (!expires || !signature || !/^\d+$/.test(expires) || Number(expires) <= Date.now()) return false;
  return safeEqual(signature, signSession(expires, expected));
}

export function isPhotoAdminToken(token: string) {
  const expected = process.env.PHOTO_ADMIN_TOKEN;
  return Boolean(expected && safeEqual(token, expected));
}

export function createPhotoAdminSessionCookie() {
  const secret = process.env.PHOTO_ADMIN_TOKEN;
  if (!secret) throw new Error("Photo administration is not configured.");
  const expires = String(Date.now() + PHOTO_ADMIN_SESSION_SECONDS * 1000);
  const value = `${expires}.${signSession(expires, secret)}`;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${PHOTO_ADMIN_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${PHOTO_ADMIN_SESSION_SECONDS}${secure}`;
}

export function clearPhotoAdminSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${PHOTO_ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export { cloudinary };
