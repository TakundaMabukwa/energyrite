import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Energy Rite",
    short_name: "EnergyRite",
    description: "Comprehensive fleet management and fuel monitoring system",
    start_url: "/auth/login",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1e3a5f",
    orientation: "portrait",
    icons: [
      {
        src: "/energyease_logo_green_orange_1m.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/energyease_logo_green_orange_1m.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/energyease_logo_green_orange_1m.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

