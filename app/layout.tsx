import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./frame-controls.css";
import "./welcome.css";

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
  return <html lang="en"><head><link rel="preload" href="/frames/giving-books.png" as="image" type="image/png" /></head><body suppressHydrationWarning>{children}</body></html>;
}
