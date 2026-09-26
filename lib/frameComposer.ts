import { EVENT_CONFIG } from "@/config/event";

/** Preserve the finalized artwork and branding identically in preview and capture. */
export async function prepareFrameImage(
  artwork: HTMLImageElement,
): Promise<HTMLImageElement> {
  const canvas = document.createElement("canvas");
  canvas.width = EVENT_CONFIG.outputWidth;
  canvas.height = EVENT_CONFIG.outputHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the event frame.");
  context.imageSmoothingQuality = "high";

  // Generated artwork has a small transparent trim around its perimeter.
  // Bleed it past the canvas so the visible frame sits flush on every edge.
  const horizontalBleed = 24;
  const topBleed = 42;
  const bottomBleed = 28;
  context.drawImage(
    artwork,
    -horizontalBleed,
    -topBleed,
    canvas.width + horizontalBleed * 2,
    canvas.height + topBleed + bottomBleed,
  );

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not prepare the event frame."));
    image.src = canvas.toDataURL("image/png");
  });
}
