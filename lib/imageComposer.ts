export interface ComposeEventPhotoOptions {
  source: HTMLVideoElement | HTMLImageElement | ImageBitmap;
  frameImage: CanvasImageSource;
  width: number;
  height: number;
  mirror?: boolean;
  type?: "image/jpeg" | "image/png";
  quality?: number;
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

/** Draws a centered object-fit: cover crop, then the full-size transparent frame. */
export async function composeEventPhoto({
  source,
  frameImage,
  width,
  height,
  mirror = false,
  type = "image/jpeg",
  quality = 0.94,
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

  const blob = await exportBlob(canvas, type, quality);
  return {
    blob,
    previewUrl: URL.createObjectURL(blob),
    width,
    height,
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
