export const EVENT_CONFIG = {
  eventName: "Joy of Giving",
  headline: "Share the Joy",
  subtitle: "Take a photo and share the joy of giving.",
  shareText: "Sharing my moment from Joy of Giving ❤️",
  frames: [
    { id: "joy", src: "/frames/joy-of-giving-frame-q92.webp", alt: "Joy of Giving school frame" },
    { id: "frame-2", src: "/frames/frame2-q92.webp", alt: "Joy of Giving frame two" },
    { id: "frame-3", src: "/frames/frame3-q92.webp", alt: "Joy of Giving frame three" },
  ],
  outputWidth: 1080,
  outputHeight: 1350,
  cameraFacingMode: "user" as const,
  mirrorFrontCamera: true,
};
