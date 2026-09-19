import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Share the Joy | Joy of Giving",
  description: "Take and share your framed event photo in seconds.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#102d28",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><head><link rel="preload" href="/frames/joy-of-giving-frame-q92.webp" as="image" type="image/webp" /></head><body suppressHydrationWarning>{children}</body></html>;
}
