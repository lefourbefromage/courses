import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Courses",
    short_name: "Courses",
    description: "Menu de la semaine et liste de courses",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf9f4",
    theme_color: "#14453a",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
