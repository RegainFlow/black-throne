import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BLACK THRONE",
    short_name: "Black Throne",
    description: "heavy sound. dark truth.",
    start_url: "/",
    display: "standalone",
    background_color: "#070505",
    theme_color: "#070505",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
  };
}
