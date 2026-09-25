export type CameraFacingMode = "user" | "environment";

export type CameraErrorCode = "insecure-context" | "unsupported";

/** Errors raised before the browser can request camera access. */
export class CameraAccessError extends Error {
  constructor(public readonly code: CameraErrorCode) {
    super(
      code === "insecure-context"
        ? "Camera access requires a secure connection."
        : "This browser does not support camera access.",
    );
    this.name = "CameraAccessError";
  }
}

/** Call in response to a tap. Stop the current stream before switching cameras. */
export async function startCamera(
  facingMode: CameraFacingMode = "user",
): Promise<MediaStream> {
  if (typeof window === "undefined" || !window.isSecureContext) {
    throw new CameraAccessError("insecure-context");
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new CameraAccessError("unsupported");
  }

  // `ideal` lets a one-camera device remain usable when its facing mode is
  // unknown. Releasing the previous stream first helps iOS Safari switch lenses.
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1920 },
      height: { ideal: 2400 },
    },
  });
}

export function stopCamera(stream?: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

/** Bind a stream to a preview; the attributes are needed for inline iOS playback. */
export async function attachCameraStream(
  video: HTMLVideoElement,
  stream: MediaStream,
): Promise<void> {
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.srcObject = stream;
  await video.play();
}

export function getCameraErrorMessage(error: unknown): string {
  if (error instanceof CameraAccessError) {
    return error.code === "insecure-context"
      ? "Camera access needs a secure connection. Open this page over HTTPS or upload a photo instead."
      : "This browser cannot open the camera. Upload a photo instead.";
  }

  const name = error instanceof Error ? error.name : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      if (typeof navigator !== "undefined" && /CriOS/.test(navigator.userAgent)) {
        return "Chrome cannot access the camera yet. Tap the camera icon beside the address bar and allow this site. If no prompt appears, enable Camera for Chrome in iPhone Settings, then try again.";
      }
      return "Camera access is needed to take your event photo. Allow access in your browser settings or upload a photo instead.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No camera was found on this device. Upload a photo instead.";
    case "NotReadableError":
    case "TrackStartError":
      return "The camera is unavailable right now. Close other apps using it, then try again or upload a photo.";
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return "This camera cannot use the requested settings. Try again or upload a photo instead.";
    case "AbortError":
      return "The camera could not start. Try again or upload a photo instead.";
    default:
      return "The camera could not open. Try again or upload a photo instead.";
  }
}
