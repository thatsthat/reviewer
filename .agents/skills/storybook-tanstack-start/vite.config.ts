import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  pack: {
    entry: ["src/index.ts", "src/preview.ts", "src/plugin.ts", "src/mocks/start-stubs.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    external: [
      "react",
      "react-dom",
      "@tanstack/react-router",
      "@storybook/react",
      "storybook",
      "storybook-addon-tanstack-router",
      "storybook-addon-tanstack-router/preview",
      "vite",
    ],
  },
});
