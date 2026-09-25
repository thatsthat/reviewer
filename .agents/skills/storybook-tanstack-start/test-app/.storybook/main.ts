import type { StorybookConfig } from "@storybook/react-vite";
import { tanstackStartPlugin } from "../../dist/plugin.mjs";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  framework: "@storybook/react-vite",
  viteFinal(config) {
    config.plugins = config.plugins ?? [];
    config.plugins.push(tanstackStartPlugin());
    return config;
  },
};

export default config;
