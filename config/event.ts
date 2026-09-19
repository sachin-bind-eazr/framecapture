export const EVENT_CONFIG = {
  eventName: "Joy of Giving",
  headline: "Share the Joy",
  subtitle: "Take a photo and share the joy of giving.",
  instagramHandles: [
    { handle: "@thegoodboxproject", url: "https://www.instagram.com/thegoodboxproject" },
    { handle: "@wittyinternationalschool", url: "https://www.instagram.com/wittyinternationalschool" },
  ],
  shareText: "I shared the joy this Joy of Giving Week. Join the movement and tag @thegoodboxproject and @wittyinternationalschool! ❤️",
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
