import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { compression } from "vite-plugin-compression2";

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),

      compression({
        algorithm: "brotliCompress",
        exclude: [/\.(br)$/, /\.(gz)$/],
      }),

      visualizer({
        filename: "./stats.html",
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
    ],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      // Explicitly define extensions to resolve
      extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
    },

    // Build optimizations
    build: {
      // Reduce chunk size
      chunkSizeWarningLimit: 1000,
      // Enable sourcemaps for debugging
      sourcemap: mode === "development",
      // Minification options
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: mode === "production",
          drop_debugger: mode === "production",
        },
      },
    },

    // Dev server configuration
    server: {
      port: 3000,
      cors: true,
    },

    optimizeDeps: {
      include: ["react", "react-dom"],
      force: true,
    },
  };
});
