import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ["recharts"],
          icons: ["@phosphor-icons/react"],
        },
      },
    },
  },
  server: {
    port: Number(process.env.CONSOLE_PORT ?? 5173),
  },
});
