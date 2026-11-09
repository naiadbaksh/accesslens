import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Send /api calls to the Node server, so the browser sees one origin in development.
    proxy: { "/api": "http://localhost:3001" },
  },
});
