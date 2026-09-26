import type { Metadata } from "next";
import AdminPhotos from "./AdminPhotos";

export const metadata: Metadata = {
  title: "Campaign Photos | Joy of Giving Admin",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminPhotosPage() {
  return <AdminPhotos/>;
}
