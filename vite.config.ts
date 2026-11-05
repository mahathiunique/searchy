import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("/recharts/") || id.includes("/d3-")) return "charts";
          if (id.includes("/@radix-ui/") || id.includes("/@floating-ui/")) return "radix-ui";
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/react-router") ||
            id.includes("/scheduler/")
          ) return "react-vendor";
          if (
            id.includes("/zod/") ||
            id.includes("/react-hook-form/") ||
            id.includes("/@hookform/") ||
            id.includes("/@tanstack/")
          ) return "form-data-vendor";
          return undefined;
        },
      },
    },
  },
});
