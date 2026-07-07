import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@ferroscale\/metal-core$/,
        replacement: path.resolve(rootDir, "src/index.ts"),
      },
      {
        find: /^@ferroscale\/metal-core\/(.*)$/,
        replacement: path.resolve(rootDir, "src") + "/$1",
      },
    ],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
