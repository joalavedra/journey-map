import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build works under /apps/journey-map/ or any subpath.
export default defineConfig({ base: "./", plugins: [react()], worker: { format: "es" } });
