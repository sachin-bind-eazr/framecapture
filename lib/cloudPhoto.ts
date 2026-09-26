export const MAX_CLOUD_PHOTO_BYTES = 500_000;
export const TARGET_CLOUD_PHOTO_BYTES = 480_000;

interface CloudPhotoResult {
  publicId: string;
  bytes: number;
}

export async function uploadPhotoToCloud(blob: Blob, frameId: string): Promise<CloudPhotoResult> {
  if (blob.size > MAX_CLOUD_PHOTO_BYTES) {
    throw new Error("The compressed photo exceeds the 500 KB upload limit.");
  }

  const formData = new FormData();
  formData.append("photo", blob, `joy-of-giving-${Date.now()}.jpg`);
  formData.append("frameId", frameId);

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch("/api/photos", {
      method: "POST",
      body: formData,
      credentials: "same-origin",
      signal: controller.signal,
    });
    const result = await response.json().catch(() => null) as (CloudPhotoResult & { error?: string }) | null;
    if (!response.ok || !result) {
      throw new Error(result?.error || "The cloud upload failed.");
    }
    return result;
  } finally {
    window.clearTimeout(timeout);
  }
}
