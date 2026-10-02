import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// Makes the site installable as an app ("Add to Home Screen" / "Install app").
// Icons are built from the logo by scripts/make-app-icons.mjs.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: site.name,
    short_name: "West Finance",
    description: site.description,
    // Opens straight into online banking; signed-out visitors land on the login page.
    start_url: "/dashboard?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Navy matches the app's own loading screen, so launch is one seamless colour.
    background_color: "#0f1b33",
    theme_color: "#0f1b33",
    categories: ["finance"],
    icons: [
      { src: "/app/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Move money", url: "/dashboard/move", icons: [{ src: "/app/icon-192.png", sizes: "192x192" }] },
      { name: "Activity", url: "/dashboard/activity", icons: [{ src: "/app/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
