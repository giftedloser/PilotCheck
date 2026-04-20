import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    // Mirror the Vite build-time define so components that reference the
    // app version (e.g. Sidebar) don't blow up when rendered in jsdom tests.
    __APP_VERSION__: JSON.stringify("test")
  },
  test: {
    globals: true,
    reporters: "default",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"]
    },
    projects: [
      {
        test: {
          name: "unit",
          include: ["test/server/**/*.unit.test.ts", "test/client/**/*.unit.test.ts"]
        }
      },
      {
        test: {
          name: "api",
          include: ["test/server/**/*.api.test.ts"]
        }
      },
      {
        define: {
          // Also set here — vitest's top-level `define` does not cascade
          // into project configs.
          __APP_VERSION__: JSON.stringify("test")
        },
        test: {
          name: "e2e",
          environment: "jsdom",
          setupFiles: ["test/client/setup.ts"],
          include: ["test/client/**/*.e2e.test.tsx"]
        }
      }
    ]
  }
});
