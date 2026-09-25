export type SharePhotoResult = "shared" | "unsupported" | "cancelled";

export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export interface SharePhotoOptions {
  blob: Blob;
  filename?: string;
  title?: string;
  text?: string;
}

export function makePhotoFilename(eventName: string, date = new Date()): string {
  const name = eventName
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "event";
  const timestamp = date.toISOString().replace(/[:.]/g, "-");
  return `${name}-photo-${timestamp}.jpg`;
}

function asShareFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
}

/** Checks whether this browser can share the actual image file. */
export function canSharePhoto(blob: Blob, filename = "event-photo.jpg"): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  try {
    const file = asShareFile(blob, filename);
    return typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/** Call directly from a button press so mobile browsers retain user activation. */
export async function sharePhoto({
  blob,
  filename = "event-photo.jpg",
  title = "Event Photo",
  text,
}: SharePhotoOptions): Promise<SharePhotoResult> {
  if (!canSharePhoto(blob, filename)) return "unsupported";

  try {
    await navigator.share({ files: [asShareFile(blob, filename)], title, text });
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "cancelled";
    }
    // Some browsers claim file support but reject an individual share target.
    return "unsupported";
  }
}

/** Starts a local download. No image bytes are sent to a server. */
export function downloadPhoto(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Safari may still be reading the URL immediately after the synthetic click.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
