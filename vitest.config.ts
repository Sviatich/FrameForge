import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
      include: [
        "src/lib/core/{parser,generator,exporter}/**/*.ts",
        "src/lib/figma/{auth,client,mapper}.ts",
        "src/lib/projects/{schema,download-name}.ts",
        "src/app/api/{export/local,figma/load,transform}/route.ts",
        "src/components/import/import-shell.tsx",
      ],
      thresholds: {
        statements: 60,
        branches: 45,
        functions: 65,
        lines: 60,
      },
    },
  },
});
