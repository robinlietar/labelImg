import type { MetadataRoute } from "next";
import { APP } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "app.chessmates",
    name: APP.name,
    short_name: APP.name,
    description: APP.description,
    categories: ["social", "sports", "games"],
    start_url: "/",
    display: "standalone",
    background_color: "#f7f4ee",
    theme_color: "#2a5c43",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
