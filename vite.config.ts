import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseOrigin = (env.VITE_SUPABASE_URL || "").replace(/\/$/, "");

  return {
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    /** Same-origin proxy so Edge Function calls avoid browser "Failed to fetch" to *.supabase.co during local dev */
    ...(supabaseOrigin
      ? {
          proxy: {
            "/functions/v1": {
              target: supabaseOrigin,
              changeOrigin: true,
              secure: true,
            },
          },
        }
      : {}),
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};
});
