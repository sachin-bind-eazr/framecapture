export interface ComposeEventPhotoOptions {
  source: HTMLVideoElement | HTMLImageElement | ImageBitmap;
  frameImage: CanvasImageSource;
  width: number;
  height: number;
  mirror?: boolean;
  type?: "image/jpeg" | "image/png";
  quality?: number;
  maxBytes?: number;
}

export interface ComposedPhoto {
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
}

export type ComposeUploadedPhotoOptions = Omit<
  ComposeEventPhotoOptions,
  "source"
> & { file: File };

function sourceSize(source: ComposeEventPhotoOptions["source"]): {
  width: number;
  height: number;
} {
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight };
  }
  if (source instanceof HTMLImageElement) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  return { width: source.width, height: source.height };
}

function exportBlob(
  canvas: HTMLCanvasElement,
  type: "image/jpeg" | "image/png",
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not prepare the photo."));
      },
      type,
      quality,
    );
  });
}

async function exportBlobWithinLimit(
  canvas: HTMLCanvasElement,
  type: "image/jpeg" | "image/png",
  quality: number,
  maxBytes?: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  const initial = await exportBlob(canvas, type, quality);
  if (!maxBytes || initial.size <= maxBytes) {
    return { blob: initial, width: canvas.width, height: canvas.height };
  }
  if (type !== "image/jpeg") {
    throw new Error("Only JPEG photos can be compressed to a size limit.");
  }

  let workingCanvas = canvas;
  const minimumQuality = 0.34;

  while (true) {
    const smallest = await exportBlob(workingCanvas, type, minimumQuality);
    if (smallest.size <= maxBytes) {
      let best = smallest;
      let low = minimumQuality;
      let high = Math.min(quality, 0.94);

      // Keep the highest JPEG quality that remains below the upload limit.
      for (let attempt = 0; attempt < 6; attempt++) {
        const candidateQuality = (low + high) / 2;
        const candidate = await exportBlob(workingCanvas, type, candidateQuality);
        if (candidate.size <= maxBytes) {
          best = candidate;
          low = candidateQuality;
        } else {
          high = candidateQuality;
        }
      }
      return { blob: best, width: workingCanvas.width, height: workingCanvas.height };
    }

    if (workingCanvas.width <= 480) break;

    const resized = document.createElement("canvas");
    resized.width = Math.max(480, Math.round(workingCanvas.width * 0.85));
    resized.height = Math.max(600, Math.round(workingCanvas.height * 0.85));
    const context = resized.getContext("2d", { alpha: false });
    if (!context) throw new Error("Could not compress the photo.");
    context.drawImage(workingCanvas, 0, 0, resized.width, resized.height);
    workingCanvas = resized;
  }

  throw new Error("Could not compress the photo below the upload limit.");
}

/** Draws a centered object-fit: cover crop, then the full-size transparent frame. */
export async function composeEventPhoto({
  source,
  frameImage,
  width,
  height,
  mirror = false,
  type = "image/jpeg",
  quality = 0.94,
  maxBytes,
}: ComposeEventPhotoOptions): Promise<ComposedPhoto> {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error("Invalid photo dimensions.");
  }

  const { width: sourceWidth, height: sourceHeight } = sourceSize(source);
  if (!sourceWidth || !sourceHeight) {
    throw new Error("The camera or selected image is not ready yet.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Could not prepare the photo.");

  // Equivalent to object-fit: cover with object-position: center center.
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const cropWidth = width / scale;
  const cropHeight = height / scale;
  const cropX = (sourceWidth - cropWidth) / 2;
  const cropY = (sourceHeight - cropHeight) / 2;

  if (mirror) {
    context.translate(width, 0);
    context.scale(-1, 1);
  }
  context.drawImage(
    source,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    width,
    height,
  );
  if (mirror) context.setTransform(1, 0, 0, 1, 0, 0);

  // Keep frame lettering and logos unmirrored, including for front camera shots.
  context.drawImage(frameImage, 0, 0, width, height);

  const compressed = await exportBlobWithinLimit(canvas, type, quality, maxBytes);
  return {
    blob: compressed.blob,
    previewUrl: URL.createObjectURL(compressed.blob),
    width: compressed.width,
    height: compressed.height,
  };
}

/** Loads a selected photo locally and applies the same crop and frame as capture. */
export async function composeUploadedPhoto({
  file,
  ...options
}: ComposeUploadedPhotoOptions): Promise<ComposedPhoto> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file.");
  }

  const inputUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = inputUrl;
    if (typeof image.decode === "function") {
      await image.decode();
    } else {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Could not open the selected image."));
      });
    }
    return await composeEventPhoto({ source: image, ...options });
  } finally {
    URL.revokeObjectURL(inputUrl);
  }
}
