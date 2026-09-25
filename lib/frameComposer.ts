import { EVENT_CONFIG } from "@/config/event";

const themes: Record<string, { paper: string; ink: string }> = {
  "giving-books": { paper: "#e9f2d4", ink: "#245735" },
  "helping-someone": { paper: "#e0f2ff", ink: "#205b85" },
  "saving-food": { paper: "#fff3ba", ink: "#42652c" },
  "donating-clothes": { paper: "#eee4f6", ink: "#694184" },
  "helping-learn": { paper: "#ffe7de", ink: "#a6473e" },
  "giving-hero": { paper: "#ddecff", ink: "#21559b" },
  donated: { paper: "#edf5d5", ink: "#38692e" },
  "kindness-star": { paper: "#ffe4f0", ink: "#9d3b72" },
  "made-difference": { paper: "#ddf5ef", ink: "#196e67" },
  "care-share": { paper: "#ffeaef", ink: "#a83c5c" },
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load frame branding."));
    image.src = src;
  });
}

let logosPromise: Promise<HTMLImageElement[]> | undefined;

function loadLogos(): Promise<HTMLImageElement[]> {
  if (!logosPromise) {
    logosPromise = Promise.all([
      loadImage("/frames/Witty_Logo%201.png"),
      loadImage("/frames/Image%20(4).png"),
    ]).catch((error) => {
      logosPromise = undefined;
      throw error;
    });
  }
  return logosPromise;
}

function drawContained(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const imageWidth = image.naturalWidth * scale;
  const imageHeight = image.naturalHeight * scale;
  context.drawImage(image, x + (width - imageWidth) / 2, y + (height - imageHeight) / 2, imageWidth, imageHeight);
}

/** Build one branded overlay used by both live preview and exported photos. */
export async function prepareFrameImage(
  artwork: HTMLImageElement,
  frame: { id: string; alt: string },
): Promise<HTMLImageElement> {
  const [witty, goodBox] = await loadLogos();
  const canvas = document.createElement("canvas");
  canvas.width = EVENT_CONFIG.outputWidth;
  canvas.height = EVENT_CONFIG.outputHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the event frame.");
  const { paper, ink } = themes[frame.id] ?? themes["giving-books"];

  // Work in a fixed design space so alternate output sizes retain the same layout.
  context.scale(canvas.width / 1080, canvas.height / 1350);
  context.imageSmoothingQuality = "high";
  const sourceWidth = artwork.naturalWidth;
  const sourceHeight = artwork.naturalHeight;
  context.fillStyle = paper;
  context.fillRect(0, 64, 76, 1180);
  context.fillRect(1004, 64, 76, 1180);
  // Stretch only the illustrated edge strips, leaving the photo aperture untouched.
  for (const right of [false, true]) {
    context.drawImage(
      artwork,
      right ? sourceWidth * .925 : 0, sourceHeight * .11,
      sourceWidth * .075, sourceHeight * .75,
      right ? 1004 : 0, 64, 76, 1180,
    );
  }

  // Keep branding deterministic: use original logos and real text, not generated lettering.
  context.fillStyle = paper;
  context.fillRect(0, 0, 1080, 64);
  context.fillRect(0, 1244, 1080, 106);
  for (const right of [false, true]) {
    context.drawImage(
      artwork,
      right ? sourceWidth * .82 : 0, 0,
      sourceWidth * .18, sourceHeight * .11,
      right ? 940 : 0, 0, 140, 92,
    );
  }
  context.fillStyle = ink;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "600 30px Arial, sans-serif";
  context.fillText("Joy of Giving", 540, 33);

  drawContained(context, witty, 28, 1272, 185, 50);
  drawContained(context, goodBox, 934, 1254, 110, 86);
  context.font = "700 36px Arial, sans-serif";
  const lines = frame.alt === "I will help someone who needs me."
    ? ["I will help someone", "who needs me."]
    : [frame.alt];
  const maximumWidth = 640;
  let fontSize = 36;
  while (lines.some((line) => context.measureText(line).width > maximumWidth) && fontSize > 24) {
    fontSize--;
    context.font = `700 ${fontSize}px Arial, sans-serif`;
  }
  lines.forEach((line, index) => {
    context.fillText(line, 570, 1297 + (index - (lines.length - 1) / 2) * 40);
  });

  return loadImage(canvas.toDataURL("image/png"));
}
