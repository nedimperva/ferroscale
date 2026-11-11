import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(rootDir, "src") },
      {
        find: /^@ferroscale\/metal-core$/,
        replacement: path.resolve(rootDir, "packages/metal-core/src/index.ts"),
      },
      {
        find: /^@ferroscale\/metal-core\/(.*)$/,
        replacement: path.resolve(rootDir, "packages/metal-core/src") + "/$1",
      },
    ],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
