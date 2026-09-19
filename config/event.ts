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
    { id: "joy-books", src: "/frames/new1.png", alt: "Joy of Giving books and kindness frame" },
    { id: "joy-festival", src: "/frames/joy-festival-frame.png", alt: "Joy of Giving Festival frame" },
  ],
  outputWidth: 1080,
  outputHeight: 1350,
  cameraFacingMode: "user" as const,
  mirrorFrontCamera: true,
};
