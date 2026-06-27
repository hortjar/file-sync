import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import packageJson from "./package.json";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: { port: 5173, host: true },
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(packageJson.version),
  },
});
